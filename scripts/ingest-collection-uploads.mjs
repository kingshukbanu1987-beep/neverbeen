#!/usr/bin/env node
/**
 * Copies the photographs attached in Arena chat into `public/collection`.
 *
 * Arena saves message attachments to `/home/user/uploads/<uuid>.jpg`. This
 * script renames each of them to its human-readable name, writes
 * `public/collection/captions.json` (titles, captions, alt text, albums) and
 * regenerates the page manifest.
 *
 * Usage:
 *   npm run ingest:collection                 # reads /home/user/uploads
 *   node scripts/ingest-collection-uploads.mjs /some/other/dir
 */
import { copyFileSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const mapFile = join(projectRoot, 'scripts', 'collection-ingest-map.json');
const collectionDir = join(projectRoot, 'public', 'collection');
const captionsFile = join(collectionDir, 'captions.json');
const sourceDir = process.argv[2] ?? '/home/user/uploads';

const map = JSON.parse(readFileSync(mapFile, 'utf8'));

if (!existsSync(sourceDir)) {
  console.error(
    `[collection] Attachment folder not found: ${sourceDir}\n` +
      `[collection] The photographs attached in chat were not delivered to this workspace.\n` +
      `[collection] Re-attach them in Arena (or pass another folder) and run: npm run ingest:collection`,
  );
  process.exit(1);
}

function findSource(uuid) {
  for (const extension of ['.jpg', '.jpeg', '.png', '.webp']) {
    const candidate = join(sourceDir, uuid + extension);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

let copied = 0;
let skipped = 0;
const missing = [];

for (const entry of map) {
  const destination = join(collectionDir, entry.file);
  const source = findSource(entry.uuid);

  if (!source) {
    missing.push(entry.uuid);
    continue;
  }

  if (existsSync(destination) && statSync(destination).size === statSync(source).size) {
    skipped += 1;
    continue;
  }

  copyFileSync(source, destination);
  copied += 1;
}

const captions = {};
for (const entry of map) {
  if (existsSync(join(collectionDir, entry.file))) {
    captions[entry.file] = {
      title: entry.title,
      caption: entry.caption,
      alt: entry.alt,
      album: entry.album,
    };
  }
}
writeFileSync(captionsFile, JSON.stringify(captions, null, 2) + '\n', 'utf8');

execSync('node scripts/generate-collection.mjs', { cwd: projectRoot, stdio: 'inherit' });

console.log(
  `[collection] Ingested ${copied} photograph(s), ${skipped} already present, ${missing.length} missing from ${sourceDir}.`,
);
if (missing.length > 0) {
  console.warn(`[collection] Missing attachments (first 5): ${missing.slice(0, 5).join(', ')}`);
  process.exitCode = 1;
}
