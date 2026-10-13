#!/usr/bin/env python3
"""Verifies neverbeen-database-model-live-chat-count.patch and .sql.

  A  the patch applies to an empty schema.sql (git apply --unidiff-zero) and
     the result equals the .sql file
  B  the script is idempotent: every CREATE is guarded by IF NOT EXISTS and
     every ALTER TABLE ... ADD COLUMN by IF NOT EXISTS (upgrades in place)
  C  the table keeps the same slug rule as the API (CHECK on "ModelSlug"),
     and carries the live/past split columns ("SessionKey", "EndedAtUtc")

Run:  python3 neverbeen-database-model-live-chat-count-verification.py
"""

import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
PATCH = os.path.join(HERE, 'neverbeen-database-model-live-chat-count.patch')
SQL = os.path.join(HERE, 'neverbeen-database-model-live-chat-count.sql')
failures = []


def check(label, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + label + ('' if ok or not detail else f'  -- {detail}'))
    if not ok:
        failures.append(label)


tmp = tempfile.mkdtemp(prefix='db-live-chat-')
run = lambda args: subprocess.run(args, cwd=tmp, capture_output=True, text=True)
run(['git', 'init', '-q'])
open(os.path.join(tmp, 'schema.sql'), 'w').close()
run(['git', 'add', 'schema.sql'])

r = run(['git', 'apply', '--unidiff-zero', PATCH])
check('A  patch applies to schema.sql', r.returncode == 0, r.stderr.strip())
with open(os.path.join(tmp, 'schema.sql'), encoding='utf-8') as fh:
    applied = fh.read()
with open(SQL, encoding='utf-8') as fh:
    script = fh.read()
check('A  applied schema equals the .sql', applied == script)

creates = re.findall(r'CREATE\s+(TABLE|INDEX|UNIQUE INDEX)\s+(IF NOT EXISTS\s+)?', script)
check('B  every CREATE is idempotent', creates and all(guard for _, guard in creates))
alters = re.findall(r'ADD\s+COLUMN\s+(IF NOT EXISTS\s+)?', script)
check('B  every ADD COLUMN is idempotent', alters and all(alters))
check('C  slug CHECK matches the API rule', "'^[a-z0-9]+(-[a-z0-9]+)*$'" in script)
check('C  "SessionKey" column present', '"SessionKey"   varchar(64)' in script)
check('C  "EndedAtUtc" column present', '"EndedAtUtc"   timestamptz' in script)

print('\nALL CHECKS PASSED' if not failures else f'\n{len(failures)} CHECK(S) FAILED')
sys.exit(1 if failures else 0)
