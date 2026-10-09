#!/usr/bin/env python3
"""Verifies the circle-photo and request-notification changes to neverbeen-database
(see neverbeen-database-community-live-fixes.patch and the standalone
neverbeen-database-community-live-fixes.sql migration).

  A  the patch applies cleanly to the neverbeen-database checkout (4f892e8)
  B  schema.sql: Circles.PhotoUrl is text, with an idempotent ALTER for databases
     created from the old schema; the Notifications (UserId, FromUserId, Type)
     index is created with IF NOT EXISTS
  C  live PostgreSQL run (needs `pip install pgserver psycopg[binary]`):
       - the ORIGINAL schema rejects a 1 MB circle photo (the reported bug)
       - the migration runs twice without error and makes the 1 MB photo save
       - the updated schema.sql runs on a fresh database and re-runs cleanly
       - the migration is a no-op on a database built from the updated schema
     Without those packages this check is reported as skipped, not passed.

Run:  python3 neverbeen-database-community-live-fixes-verification.py [path-to-neverbeen-database]
"""

import os
import re
import shutil
import subprocess
import sys
import tempfile
import warnings

HERE = os.path.dirname(os.path.abspath(__file__))
PATCH = os.path.join(HERE, 'neverbeen-database-community-live-fixes.patch')
MIGRATION = os.path.join(HERE, 'neverbeen-database-community-live-fixes.sql')
DB_DIR = sys.argv[1] if len(sys.argv) > 1 else '/tmp/db-repo'

failures = []


def check(label, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + label + ('' if ok or not detail else f'  -- {detail}'))
    if not ok:
        failures.append(label)


# ---------------------------------------------------------------- A: patch applies
work = tempfile.mkdtemp(prefix='db-community-live-fixes-')
try:
    clone = os.path.join(work, 'db')
    subprocess.run(['git', 'clone', '-q', DB_DIR, clone], check=True)
    subprocess.run(['git', '-C', clone, 'checkout', '-q', '4f892e8'], check=True)
    r = subprocess.run(['git', '-C', clone, 'apply', '--check', PATCH], capture_output=True, text=True)
    check('A  patch applies to neverbeen-database 4f892e8', r.returncode == 0, r.stderr.strip())
    subprocess.run(['git', '-C', clone, 'apply', PATCH], check=True)
    schema_new = open(os.path.join(clone, 'schema.sql'), encoding='utf-8').read()
    schema_old = subprocess.run(['git', '-C', clone, 'show', '4f892e8:schema.sql'],
                                capture_output=True, text=True, check=True).stdout

    # ------------------------------------------------------------ B: structural audit
    circles_block = schema_new[schema_new.index('CREATE TABLE IF NOT EXISTS "Circles"'):]
    circles_block = circles_block[:circles_block.index(');')]
    check('B  Circles.PhotoUrl is text in the CREATE TABLE',
          re.search(r'"PhotoUrl"\s+text\b', circles_block) is not None and 'varchar(1024)' not in circles_block)
    check('B  idempotent ALTER converts an existing Circles.PhotoUrl to text',
          'ALTER TABLE "Circles" ALTER COLUMN "PhotoUrl" TYPE text;' in schema_new)
    check('B  request-notification index uses IF NOT EXISTS',
          'CREATE INDEX IF NOT EXISTS "IX_Notifications_User_From_Type" ON "Notifications" ("UserId", "FromUserId", "Type");' in schema_new)
    check('B  standalone migration carries the same two statements',
          os.path.exists(MIGRATION) and
          'ALTER TABLE "Circles" ALTER COLUMN "PhotoUrl" TYPE text;' in open(MIGRATION, encoding='utf-8').read() and
          'IX_Notifications_User_From_Type' in open(MIGRATION, encoding='utf-8').read())

    # ------------------------------------------------------------ C: live PostgreSQL
    try:
        warnings.filterwarnings('ignore')
        import psycopg
        import pgserver
        has_pg = True
    except ImportError:
        has_pg = False

    if not has_pg:
        print('SKIP C  live PostgreSQL checks (pip install pgserver "psycopg[binary]")')
    else:
        data_dir = os.path.join(work, 'pgdata')
        pgserver.get_server(data_dir, cleanup_mode='stop')
        host = data_dir

        def conn(db='postgres'):
            return psycopg.connect(dbname=db, user='postgres', host=host, autocommit=True)

        def reset(db):
            with conn() as c:
                c.execute(f'DROP DATABASE IF EXISTS "{db}" WITH (FORCE)')
                c.execute(f'CREATE DATABASE "{db}"')

        def run(db, sql):
            with conn(db) as c:
                c.execute(sql)

        def col_type(db):
            with conn(db) as c:
                return c.execute("select data_type, character_maximum_length from information_schema.columns "
                                 "where table_name='Circles' and column_name='PhotoUrl'").fetchone()

        def seed(db):
            run(db, """insert into "Users" ("Id","FullName","Email","Status") values
                       (1,'Owner','owner@x.test','Active'), (2,'Friend','friend@x.test','Active')
                       on conflict do nothing""")

        def insert_circle(db, photo):
            with conn(db) as c:
                c.execute('insert into "Circles" ("Name","OwnerId","PhotoUrl") values (%s,1,%s)', ('Trip', photo))

        big = 'data:image/jpeg;base64,' + 'A' * 1_400_000
        migration_sql = open(MIGRATION, encoding='utf-8').read()

        reset('orig')
        run('orig', schema_old)
        seed('orig')
        check('C  original schema: PhotoUrl is varchar(1024)', col_type('orig') == ('character varying', 1024), str(col_type('orig')))
        try:
            insert_circle('orig', big)
            check('C  original schema rejects a 1 MB circle photo (reported bug)', False, 'insert succeeded')
        except psycopg.Error as e:
            check('C  original schema rejects a 1 MB circle photo (reported bug)', 'too long' in str(e), str(e).splitlines()[0])

        try:
            run('orig', migration_sql)
            run('orig', migration_sql)
            check('C  migration runs twice without error', True)
        except psycopg.Error as e:
            check('C  migration runs twice without error', False, str(e))
        check('C  after migration: PhotoUrl is text', col_type('orig') == ('text', None), str(col_type('orig')))
        insert_circle('orig', big)
        with conn('orig') as c:
            n = c.execute('select length("PhotoUrl") from "Circles"').fetchone()[0]
        check('C  after migration: 1 MB circle photo is saved intact', n == len(big), str(n))

        reset('fresh')
        try:
            run('fresh', schema_new)
            run('fresh', schema_new)
            check('C  updated schema.sql runs on a fresh database and re-runs cleanly', True)
        except psycopg.Error as e:
            check('C  updated schema.sql runs on a fresh database and re-runs cleanly', False, str(e).splitlines()[0])
        check('C  fresh schema: PhotoUrl is text', col_type('fresh') == ('text', None), str(col_type('fresh')))
        seed('fresh')
        insert_circle('fresh', big)
        run('fresh', migration_sql)
        check('C  migration is a no-op on a database built from the updated schema', col_type('fresh') == ('text', None))
finally:
    shutil.rmtree(work, ignore_errors=True)

print()
if failures:
    print(f'{len(failures)} check(s) failed')
    sys.exit(1)
print('All checks passed')
