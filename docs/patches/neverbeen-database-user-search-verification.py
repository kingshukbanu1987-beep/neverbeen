#!/usr/bin/env python3
"""Verifies the member-search index changes to neverbeen-database
(see neverbeen-database-user-search.patch).

There is no PostgreSQL server in this sandbox, so this script is the automated
evidence that the changed DDL behaves as intended: a structural audit of the
patched schema.sql plus the patch-applicability check.

  A  the patch applies cleanly to the neverbeen-database checkout
  B  schema.sql carries the search indexes the API's GET /api/users/search
     relies on: IX_Users_Status plus GIN trigram indexes on FullName /
     FirstName / LastName
  C  every index is idempotent (IF NOT EXISTS) and the pg_trgm extension and
     the trigram indexes are wrapped in exception-tolerant DO blocks — a
     database where pg_trgm cannot be created still runs the whole schema
     (the search degrades to sequential scans instead of failing)
  D  the new block is safe to run twice: nothing after the first run can
     raise (DO blocks catch, IF NOT EXISTS skips), and the existing schema
     (tables, unique indexes, the UniqueId trigger) is untouched

Run:  python3 neverbeen-database-user-search-verification.py [path-to-neverbeen-database]
"""

import os
import re
import subprocess
import sys
import tempfile

DB_DIR = sys.argv[1] if len(sys.argv) > 1 else '/tmp/db-repo'
PATCH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     'neverbeen-database-user-search.patch')

failures = []


def check(name, cond, detail=''):
    status = 'PASS' if cond else 'FAIL'
    print(f'  [{status}] {name}' + (f' — {detail}' if detail and not cond else ''))
    if not cond:
        failures.append(name)


# ---------------------------------------------------------------------------
# A. the patch applies cleanly to the database checkout
# ---------------------------------------------------------------------------
print('A. patch applies cleanly to the neverbeen-database checkout')

with tempfile.TemporaryDirectory() as tmp:
    work = os.path.join(tmp, 'db')
    if os.path.isdir(DB_DIR):
        subprocess.run(['git', 'clone', '--quiet', DB_DIR, work], check=True)
    else:
        subprocess.run(['git', 'clone', '--quiet',
                        'https://github.com/kingshukbanu1987-beep/neverbeen-database',
                        work], check=True)
    base = None
    for candidate in ('origin/main', 'origin/master'):
        ref = subprocess.run(['git', '-C', work, 'rev-parse', '--verify', '--quiet', candidate],
                             capture_output=True, text=True)
        if ref.returncode == 0:
            base = candidate
            break
    if base:
        subprocess.run(['git', '-C', work, 'checkout', '--quiet', base], check=True)
    applied = subprocess.run(['git', '-C', work, 'apply', '--check', PATCH],
                             capture_output=True, text=True)
    check(f'git apply --check against {base or "HEAD"}', applied.returncode == 0,
          applied.stderr.strip())
    subprocess.run(['git', '-C', work, 'apply', PATCH], check=True)

    schema = open(os.path.join(work, 'schema.sql'), encoding='utf-8').read()
    readme = open(os.path.join(work, 'README.md'), encoding='utf-8').read()

    # -------------------------------------------------------------------
    # B. the indexes the member search relies on
    # -------------------------------------------------------------------
    print('B. schema.sql carries the search indexes')

    check('IX_Users_Status exists (the search filters Status = Active)',
          re.search(r'CREATE INDEX IF NOT EXISTS "IX_Users_Status" ON "Users" \("Status"\)',
                    schema) is not None)
    for column in ('FullName', 'FirstName', 'LastName'):
        check(f'GIN trigram index on Users.{column}',
              re.search(rf'CREATE INDEX IF NOT EXISTS "IX_Users_{column}_Trgm"\s+ON "Users" '
                        rf'USING gin \("{column}"\s+gin_trgm_ops\)', schema) is not None)

    check('the new block sits next to the other Users indexes (before the UniqueId trigger)',
          schema.index('IX_Users_Status') < schema.index('TR_Users_UniqueId'))

    # -------------------------------------------------------------------
    # C. degraded mode: pg_trgm is optional, never fatal
    # -------------------------------------------------------------------
    print('C. the schema still runs where pg_trgm cannot be created')

    check('pg_trgm is created idempotently',
          'CREATE EXTENSION IF NOT EXISTS pg_trgm;' in schema)

    do_blocks = re.findall(r'DO \$\$(.*?)\$\$;', schema, re.S)
    check('two DO blocks wrap the extension and the trigram indexes',
          len(do_blocks) >= 2, f'found {len(do_blocks)}')

    extension_block = next((b for b in do_blocks if 'CREATE EXTENSION' in b), '')
    index_block = next((b for b in do_blocks if 'gin_trgm_ops' in b), '')

    for label, block in (('extension', extension_block), ('index', index_block)):
        check(f'the {label} DO block catches every error (EXCEPTION WHEN OTHERS)',
              'EXCEPTION WHEN OTHERS THEN' in block and 'RAISE NOTICE' in block,
              'an unhandled error here would abort the whole schema run')
        check(f'the {label} DO block is balanced (BEGIN / END)',
              re.search(r'\bBEGIN\b', block) is not None
              and re.search(r'\bEND\b\s*$', block.strip()) is not None)

    check('every CREATE INDEX is idempotent (IF NOT EXISTS)',
          all('IF NOT EXISTS' in line
              for line in schema.splitlines()
              if line.strip().upper().startswith('CREATE INDEX')
              or line.strip().upper().startswith('CREATE UNIQUE INDEX')))

    # $$ dollar-quoting must stay balanced for psql / Supabase SQL editor runs.
    check('dollar quoting stays balanced across schema.sql',
          schema.count('$$') % 2 == 0)

    # -------------------------------------------------------------------
    # D. nothing existing is changed or duplicated
    # -------------------------------------------------------------------
    print('D. the existing schema is untouched and the run is repeatable')

    for kept in ('CREATE TABLE IF NOT EXISTS "Users"',
                 'CREATE UNIQUE INDEX IF NOT EXISTS "UX_Users_Email"',
                 'CREATE UNIQUE INDEX IF NOT EXISTS "UX_Users_UniqueId"',
                 'CREATE TRIGGER "TR_Users_UniqueId"',
                 'CREATE TABLE IF NOT EXISTS "Companionships"',
                 'CREATE TABLE IF NOT EXISTS "Follows"'):
        check(f'still present: {kept}', kept in schema)

    check('each new index is created exactly once',
          all(schema.count(f'"IX_Users_{c}_Trgm"') == 1
              for c in ('FullName', 'FirstName', 'LastName'))
          and schema.count('"IX_Users_Status"') == 1)

    check('README documents the search indexes and the degraded mode',
          'Member search indexes' in readme and 'pg_trgm' in readme)

print()
if failures:
    print(f'{len(failures)} check(s) FAILED:')
    for f in failures:
        print(f'  - {f}')
    sys.exit(1)
print('All checks passed — the search indexes are safe, idempotent and optional.')
