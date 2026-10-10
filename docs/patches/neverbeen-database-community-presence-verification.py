#!/usr/bin/env python3
"""Verifies the member-presence change to neverbeen-database
(see neverbeen-database-community-presence.patch and the standalone
neverbeen-database-community-presence.sql migration).

Presence: the Web API records when a member last used the community
(Users.LastSeenUtc, timestamptz). Away is shown after 15 minutes without use, and
Inactive after sign-out; both are worked out from this column and the status.

  A  the patch applies cleanly to the neverbeen-database checkout (4f892e8)
  B  schema.sql: Users.LastSeenUtc is a nullable timestamptz in the CREATE TABLE,
     and an idempotent ADD COLUMN IF NOT EXISTS covers databases created earlier;
     the standalone migration carries the same statement
  C  live PostgreSQL run (needs `pip install pgserver "psycopg[binary]"`):
       - the ORIGINAL schema has no Users.LastSeenUtc
       - the migration runs twice without error and adds the column (timestamptz, nullable)
       - existing members get NULL (no backfill: Away until they next use the community)
       - the updated schema.sql runs on a fresh database and re-runs cleanly
       - the migration is a no-op on a database built from the updated schema
       - the presence statements the Web API issues (heartbeat, sign-out, sign-in)
         store and read back the value, and never touch Users.ActiveStatus on a heartbeat
     Without those packages this check is reported as skipped, not passed.

Run:  python3 neverbeen-database-community-presence-verification.py [path-to-neverbeen-database]
"""

import os
import re
import shutil
import subprocess
import sys
import tempfile
import warnings

HERE = os.path.dirname(os.path.abspath(__file__))
PATCH = os.path.join(HERE, 'neverbeen-database-community-presence.patch')
MIGRATION = os.path.join(HERE, 'neverbeen-database-community-presence.sql')
DB_DIR = sys.argv[1] if len(sys.argv) > 1 else '/tmp/db-repo'
BASE = '4f892e8'

failures = []


def check(label, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + label + ('' if ok or not detail else f'  -- {detail}'))
    if not ok:
        failures.append(label)


# ---------------------------------------------------------------- A: patch applies
work = tempfile.mkdtemp(prefix='db-community-presence-')
try:
    clone = os.path.join(work, 'db')
    subprocess.run(['git', 'clone', '-q', DB_DIR, clone], check=True)
    subprocess.run(['git', '-C', clone, 'checkout', '-q', BASE], check=True)
    r = subprocess.run(['git', '-C', clone, 'apply', '--check', PATCH], capture_output=True, text=True)
    check(f'A  patch applies to neverbeen-database {BASE}', r.returncode == 0, r.stderr.strip())
    if r.returncode != 0:
        print('     cannot apply patch, stopping')
        sys.exit(1)
    subprocess.run(['git', '-C', clone, 'apply', PATCH], check=True)
    schema_new = open(os.path.join(clone, 'schema.sql'), encoding='utf-8').read()
    schema_old = subprocess.run(['git', '-C', clone, 'show', f'{BASE}:schema.sql'],
                                capture_output=True, text=True, check=True).stdout
    migration_sql = open(MIGRATION, encoding='utf-8').read()

    # ------------------------------------------------------------ B: structural audit
    patch_text = open(PATCH, encoding='utf-8').read()
    touched = sorted(set(re.findall(r'^\+\+\+ b/(.+)$', patch_text, re.M)))
    check('B  patch touches only schema.sql', touched == ['schema.sql'], ', '.join(touched))

    users = schema_new[schema_new.index('CREATE TABLE IF NOT EXISTS "Users"'):]
    users = users[:users.index(');')]
    check('B  Users.LastSeenUtc is a nullable timestamptz in the CREATE TABLE',
          re.search(r'"LastSeenUtc"\s+timestamptz\s*,', users) is not None
          and 'NOT NULL' not in users[users.index('"LastSeenUtc"'):users.index('"LastSeenUtc"') + 80])
    check('B  idempotent ALTER adds Users.LastSeenUtc to databases created earlier',
          'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "LastSeenUtc" timestamptz;' in schema_new)
    check('B  standalone migration carries the same statement',
          'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "LastSeenUtc" timestamptz;' in migration_sql)
    check('B  the change does not alter ActiveStatus or the presence defaults',
          '"ActiveStatus"              varchar(20)  NOT NULL DEFAULT \'Active\'' in schema_new
          and 'ALTER TABLE "Users" ALTER COLUMN "ActiveStatus"' not in migration_sql)

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

        def col(db):
            with conn(db) as c:
                return c.execute("select data_type, is_nullable from information_schema.columns "
                                 "where table_name='Users' and column_name='LastSeenUtc'").fetchone()

        def seed(db):
            run(db, """insert into "Users" ("Id","FullName","Email","Status","ActiveStatus") values
                       (1,'Ananya','ananya@x.test','Active','Busy'), (2,'Chloe','chloe@x.test','Active','Active')
                       on conflict do nothing""")

        reset('orig')
        try:
            run('orig', schema_old)
            seed('orig')
            check('C  original schema has no Users.LastSeenUtc', col('orig') is None, str(col('orig')))
            run('orig', migration_sql)
            run('orig', migration_sql)
            check('C  migration runs twice without error', True)
        except psycopg.Error as e:
            check('C  migration runs twice without error', False, str(e).splitlines()[0])
        check('C  after migration: LastSeenUtc is a nullable timestamptz',
              col('orig') == ('timestamp with time zone', 'YES'), str(col('orig')))
        with conn('orig') as c:
            nulls = c.execute('select count(*) from "Users" where "LastSeenUtc" is null').fetchone()[0]
        check('C  existing members get NULL (no backfill)', nulls == 2, f'{nulls} null rows')

        # The statements the Web API issues (PresenceController and AuthController).
        with conn('orig') as c:
            c.execute('update "Users" set "LastSeenUtc" = %s where "Id" = %s',
                      ('2026-10-10T12:00:00+00:00', 1))  # heartbeat: records last use
            row = c.execute('select "ActiveStatus", "LastSeenUtc" from "Users" where "Id" = 1').fetchone()
        check('C  heartbeat stores last use and keeps the chosen status (Busy)',
              row[0] == 'Busy' and row[1] is not None and row[1].year == 2026 and row[1].hour == 12, str(row))
        with conn('orig') as c:
            c.execute('update "Users" set "ActiveStatus" = %s, "LastSeenUtc" = now() where "Id" = 1', ('Inactive',))
            row = c.execute('select "ActiveStatus" from "Users" where "Id" = 1').fetchone()
        check('C  sign-out stores Inactive and the time', row[0] == 'Inactive')
        with conn('orig') as c:
            c.execute('update "Users" set "ActiveStatus" = %s, "LastSeenUtc" = now() where "Id" = 1', ('Active',))
            row = c.execute('select "ActiveStatus", "LastSeenUtc" is not null from "Users" where "Id" = 1').fetchone()
        check('C  sign-in stores Active and the time', row == ('Active', True), str(row))

        reset('fresh')
        try:
            run('fresh', schema_new)
            run('fresh', schema_new)
            check('C  updated schema.sql runs on a fresh database and re-runs cleanly', True)
        except psycopg.Error as e:
            check('C  updated schema.sql runs on a fresh database and re-runs cleanly', False,
                  str(e).splitlines()[0])
        check('C  fresh schema: LastSeenUtc is a nullable timestamptz',
              col('fresh') == ('timestamp with time zone', 'YES'), str(col('fresh')))
        seed('fresh')
        run('fresh', migration_sql)
        check('C  migration is a no-op on a database built from the updated schema',
              col('fresh') == ('timestamp with time zone', 'YES'))
finally:
    shutil.rmtree(work, ignore_errors=True)

print()
if failures:
    print(f'{len(failures)} check(s) failed')
    sys.exit(1)
print('All checks passed')
