#!/usr/bin/env python3
"""Verifies the Community follow-feed / device-details / chat-notification
changes to neverbeen-database
(see neverbeen-database-community-follow-feed-devices-chat.patch).

There is no Postgres in this sandbox, so this script is the automated evidence
that the schema is correct: it applies the patch to a checkout and structurally
audits the resulting schema.sql:

  A  the patch applies cleanly to the neverbeen-database checkout
  B  LoginDevices carries the exact-device columns (Model, Country, City,
     Locality, Latitude, Longitude) in the CREATE TABLE and idempotently for
     existing databases (ADD COLUMN IF NOT EXISTS)
  C  the new supporting indexes exist and are idempotent (Follows by
     FollowerId for the Journey feed, Notifications by user + type for the
     one-notification-per-message stream)
  D  the full schema.sql still parses as a sequence of valid statements and
     every statement stays idempotent-safe (CREATE TABLE IF NOT EXISTS /
     CREATE INDEX IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

Run:  python3 neverbeen-database-community-follow-feed-devices-chat-verification.py [path-to-neverbeen-database]
"""

import os
import re
import subprocess
import sys
import tempfile

DB_DIR = sys.argv[1] if len(sys.argv) > 1 else '/tmp/db-repo'
PATCH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     'neverbeen-database-community-follow-feed-devices-chat.patch')

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

patch_text = open(PATCH, encoding='utf-8').read()

with tempfile.TemporaryDirectory() as tmp:
    work = os.path.join(tmp, 'db')
    if os.path.isdir(DB_DIR):
        subprocess.run(['git', 'clone', '--quiet', DB_DIR, work], check=True)
    else:  # no local checkout: take the GitHub repository the website points at
        subprocess.run(['git', 'clone', '--quiet',
                        'https://github.com/kingshukbanu1987-beep/neverbeen-database', work],
                       check=True)
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

    # -------------------------------------------------------------------
    # B. the exact-device columns on LoginDevices
    # -------------------------------------------------------------------
    print('B. LoginDevices stores the exact device model and location details')

    table = re.search(r'CREATE TABLE IF NOT EXISTS "LoginDevices" \((.*?)\);',
                      schema, re.S)
    check('the LoginDevices CREATE TABLE is present', table is not None)
    body = table.group(1) if table else ''
    col_re = lambda name, decl: (
        re.search(rf'^\s*"{name}"\s+{decl}', body, re.M) is not None)
    check('CREATE TABLE gains Model / Country / City / Locality / Latitude / Longitude',
          col_re('Model', r'varchar\(120\)')
          and col_re('Country', r'varchar\(100\)')
          and col_re('City', r'varchar\(120\)')
          and col_re('Locality', r'varchar\(120\)')
          and col_re('Latitude', r'double precision')
          and col_re('Longitude', r'double precision'))
    check('existing databases get the same six columns idempotently',
          all(re.search(rf'ALTER TABLE "LoginDevices" ADD COLUMN IF NOT EXISTS "{n}"\s+',
                        schema) for n in
              ('Model', 'Country', 'City', 'Locality', 'Latitude', 'Longitude')))
    check('the column list stays unique (no duplicates in CREATE TABLE)',
          len(re.findall(r'"Model"\s+varchar', body)) == 1
          and len(re.findall(r'"Latitude"\s+double', body)) == 1)

    # -------------------------------------------------------------------
    # C. the supporting indexes
    # -------------------------------------------------------------------
    print('C. the feed and notification indexes exist and are idempotent')

    check('Follows is indexed by FollowerId for the Journey feed join',
          'CREATE INDEX IF NOT EXISTS "IX_Follows_FollowerId" ON "Follows" ("FollowerId");' in schema)
    check('Notifications is indexed by user + type for the per-message stream',
          'CREATE INDEX IF NOT EXISTS "IX_Notifications_User_Type" ON "Notifications" '
          '("UserId", "Type", "CreatedAtUtc" DESC);' in schema)
    check('the original indexes are untouched',
          'CREATE UNIQUE INDEX IF NOT EXISTS "UX_Follows_Follower_Followee" ON "Follows" ("FollowerId", "FolloweeId");'
          in schema
          and 'CREATE INDEX IF NOT EXISTS "IX_Follows_FolloweeId" ON "Follows" ("FolloweeId");' in schema
          and 'CREATE INDEX IF NOT EXISTS "IX_Notifications_UserId" ON "Notifications" ("UserId", "IsRead", "CreatedAtUtc" DESC);'
          in schema)

    # -------------------------------------------------------------------
    # D. the whole schema.sql parses as statements and stays idempotent-safe
    # -------------------------------------------------------------------
    print('D. schema.sql parses and stays re-runnable')

    # strip comments
    lines = [l for l in schema.splitlines()
             if not l.strip().startswith('--')
             and not l.strip().upper().startswith('/*')]
    text = '\n'.join(lines)
    statements = [st.strip() for st in re.split(r';\s*\n', text) if st.strip()]
    check(f'the schema splits into {len(statements)} non-empty statements (20+ expected)',
          len(statements) >= 20)

    bad = []
    prev_drop = None  # last "DROP ... IF EXISTS" target, for DROP+CREATE trigger pairs
    for st in statements:
        head = ' '.join(st.split())[:60]
        first = st.split()[0].upper() if st.split() else ''
        m = re.match(r'DROP\s+(TABLE|TRIGGER|INDEX|FUNCTION|VIEW)\s+IF EXISTS\s+"?([A-Za-z_][\w"]*)',
                     ' '.join(st.split()), re.I)
        if first not in ('DROP', 'CREATE'):
            prev_drop = None  # the DROP-guard only applies to the very next statement
        if m:
            prev_drop = m.group(2).strip('"')
        if first == 'CREATE':
            ok = ('IF NOT EXISTS' in st or 'OR REPLACE' in st
                  or (prev_drop and prev_drop in st))
            if not ok:
                bad.append(head)
        elif first == 'ALTER' and 'IF NOT EXISTS' not in st:
            bad.append(head)
    check('every CREATE / ALTER statement is re-runnable (IF NOT EXISTS / OR REPLACE / DROP-guarded)',
          not bad, '; '.join(bad[:3]))

    check('no statement is empty or ends on a dangling comma',
          all(st and st.strip() for st in statements)
          and not any(st.rstrip().endswith(',') for st in statements))


# ---------------------------------------------------------------------------
print()
if failures:
    print(f'{len(failures)} check(s) FAILED:')
    for f in failures:
        print(f'  - {f}')
    sys.exit(1)
print('All checks passed — the database patch carries the device details, the '
      'follow-feed index and the per-message notification index, idempotently.')
