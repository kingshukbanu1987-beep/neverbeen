#!/usr/bin/env python3
"""Verifies the AI model advertisement changes to neverbeen-database
(see neverbeen-database-model-advertisement.patch and -model-advertisement.sql).

There is no PostgreSQL server in this sandbox, so this script is the automated evidence that the
new DDL behaves as intended: a structural audit of the patched schema.sql, a cross-repository check
that the seeded advertising pool matches the website's model catalog, and the patch-applicability
check.

  A  the patch applies cleanly to the neverbeen-database checkout
  B  schema.sql carries the two new tables with the constraints, indexes and column types the
     neverbeen-api ModelAdsController / AppDbContext expect (slug unique, weight 1..10,
     non-negative counters, event type and surface enums, viewer FK that nulls out)
  C  the pool seed lists every model of the website catalog (data/ai-models/profiles.json) exactly
     once, so the two repositories cannot drift apart
  D  the block is safe to run twice and touches nothing that already exists: every CREATE is
     guarded by IF NOT EXISTS, the seed ends in ON CONFLICT DO NOTHING, and no DROP / ALTER /
     DELETE statement appears in the new block

Run:  python3 neverbeen-database-model-advertisement-verification.py [path-to-neverbeen-database]
"""

import json
import os
import re
import subprocess
import sys
import tempfile

DB_DIR = sys.argv[1] if len(sys.argv) > 1 else '/tmp/neverbeen-database'
HERE = os.path.dirname(os.path.abspath(__file__))
PATCH = os.path.join(HERE, 'neverbeen-database-model-advertisement.patch')
STANDALONE_SQL = os.path.join(HERE, 'neverbeen-database-model-advertisement.sql')
WEBSITE_CATALOG = os.path.join(HERE, '..', '..', 'src', 'app', 'pages', 'ai-models',
                                'ai-model-data.ts')

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
    standalone = open(STANDALONE_SQL, encoding='utf-8').read()

    # the runnable copy must be the same DDL as the schema block
    schema_block = schema[schema.index('-- NeverBeen AI model advertisement'):]
    schema_block = schema_block[:schema_block.index('ON CONFLICT ("ModelSlug") DO NOTHING;') + len('ON CONFLICT ("ModelSlug") DO NOTHING;')]
    standalone_block = standalone[standalone.index('-- NeverBeen AI model advertisement'):]
    check('the standalone .sql file carries the same DDL as schema.sql',
          schema_block.strip() == standalone_block.strip())

    # -------------------------------------------------------------------
    # B. tables, constraints, indexes
    # -------------------------------------------------------------------
    print('B. schema.sql carries the advertisement tables')

    check('ModelAds table exists',
          'CREATE TABLE IF NOT EXISTS "ModelAds"' in schema)
    check('ModelAdEvents table exists',
          'CREATE TABLE IF NOT EXISTS "ModelAdEvents"' in schema)
    check('the pool row is identified by its model slug',
          'UNIQUE' in schema and 'CREATE UNIQUE INDEX IF NOT EXISTS "UX_ModelAds_ModelSlug" ON "ModelAds" ("ModelSlug")' in schema)
    check('rotation weight is bounded 1..10',
          'CHECK ("Weight" >= 1 AND "Weight" <= 10)' in schema)
    check('counters can never go negative',
          'CHECK ("ImpressionCount" >= 0 AND "ClickCount" >= 0)' in schema)
    check('a slug must look like a portfolio slug',
          schema.count("""CHECK ("ModelSlug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')""") == 2)
    check('an event is either an impression or a click',
          """CHECK ("EventType" IN ('impression', 'click'))""" in schema)
    check('an event surface is the rail or the feed',
          """CHECK ("Surface" IN ('rail', 'feed'))""" in schema)
    check('the viewer reference nulls out so history survives a deleted member',
          'REFERENCES "Users" ("Id") ON DELETE SET NULL' in schema)
    for index in ('"IX_ModelAds_IsActive_Weight"', '"IX_ModelAdEvents_ModelSlug_CreatedAtUtc"',
                  '"IX_ModelAdEvents_Surface_CreatedAtUtc"', '"IX_ModelAdEvents_ViewerId"'):
        check(f'index {index} exists', index in schema)

    check('the new block sits with the other community tables, before the updated_at triggers',
          schema.index('CREATE TABLE IF NOT EXISTS "ModelAds"')
          < schema.index('updated_at maintenance'))

    # -------------------------------------------------------------------
    # C. the seeded pool matches the website catalog
    # -------------------------------------------------------------------
    print('C. the seeded pool matches the website model catalog')

    catalog_ts = open(WEBSITE_CATALOG, encoding='utf-8').read()
    catalog_slugs = sorted(set(re.findall(r"slug: '([a-z0-9-]+)'", catalog_ts)))
    seed_block = schema_block[schema_block.index('INSERT INTO "ModelAds"'):]
    seeded = re.findall(r"\('([a-z0-9-]+)', '", seed_block)
    check(f'the seed lists every catalog model ({len(catalog_slugs)})',
          len(seeded) == len(catalog_slugs),
          f'seed has {len(seeded)}, catalog has {len(catalog_slugs)}')
    check('every seeded slug is unique', len(set(seeded)) == len(seeded))
    check('the seed equals the website catalog slugs', sorted(seeded) == catalog_slugs,
          f'only in seed: {sorted(set(seeded) - set(catalog_slugs))[:5]}; '
          f'only in catalog: {sorted(set(catalog_slugs) - set(seeded))[:5]}')

    # -------------------------------------------------------------------
    # D. idempotent, non-destructive
    # -------------------------------------------------------------------
    print('D. the run is repeatable and changes nothing existing')

    statements = [line.strip() for line in schema_block.splitlines()
                  if line.strip().upper().startswith(('CREATE', 'INSERT', 'DROP', 'ALTER', 'DELETE', 'UPDATE'))]
    check('every CREATE is guarded by IF NOT EXISTS',
          all('IF NOT EXISTS' in line for line in statements if line.upper().startswith('CREATE')),
          '; '.join(line for line in statements
                    if line.upper().startswith('CREATE') and 'IF NOT EXISTS' not in line))
    check('the seed is idempotent (ON CONFLICT DO NOTHING)',
          schema_block.rstrip().endswith('ON CONFLICT ("ModelSlug") DO NOTHING;'))
    check('nothing is dropped, altered or deleted by the new block',
          not any(line.upper().startswith(('DROP', 'ALTER', 'DELETE', 'UPDATE')) for line in statements))

    for kept in ('CREATE TABLE IF NOT EXISTS "Users"',
                 'CREATE TABLE IF NOT EXISTS "JourneyPosts"',
                 'CREATE TABLE IF NOT EXISTS "HiddenPosts"',
                 'CREATE OR REPLACE FUNCTION neverbeen_set_updated_at()'):
        check(f'still present: {kept}', kept in schema)

    check('each new table is created exactly once',
          schema.count('CREATE TABLE IF NOT EXISTS "ModelAds"') == 1
          and schema.count('CREATE TABLE IF NOT EXISTS "ModelAdEvents"') == 1)

print()
if failures:
    print(f'{len(failures)} check(s) failed:')
    for name in failures:
        print(f'  - {name}')
    sys.exit(1)
print('All checks passed.')
