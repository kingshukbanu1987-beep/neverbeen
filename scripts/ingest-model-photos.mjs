#!/usr/bin/env node
/**
 * Copies the photographs attached in Arena chat into their model album under
 * `public/NeverBeenModels/<ModelName>/`.
 *
 * Arena saves message attachments to `/home/user/uploads/<uuid>.png`. This script renames each of
 * them to its portfolio filename, drops it into the album folder, records the album's frame order
 * and captions in `<album>/profile.json` and regenerates the portfolio manifest.
 *
 * Usage:
 *   npm run ingest:model-photos                      # reads /home/user/uploads
 *   node scripts/ingest-model-photos.mjs /some/dir [map.json]
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const defaultMapFile = join(projectRoot, 'scripts', 'model-ingest-map.json');
const albumsRoot = join(projectRoot, 'public', 'NeverBeenModels');
const sourceDir = process.argv[2] ?? '/home/user/uploads';
const mapFile = process.argv[3] ?? defaultMapFile;
const sourceExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif'];

if (!existsSync(sourceDir)) {
  console.error(
    `[ai-models] Attachment folder not found: ${sourceDir}\n` +
      `[ai-models] The photographs attached in chat were not delivered to this workspace.\n` +
      `[ai-models] Re-attach them in Arena (or pass another folder) and run: npm run ingest:model-photos`,
  );
  process.exit(1);
}

const map = JSON.parse(readFileSync(mapFile, 'utf8'));
const albums = Array.isArray(map) ? map : (map.albums ?? []);

function findSource(uuid) {
  for (const extension of sourceExtensions) {
    const candidate = join(sourceDir, uuid + extension);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

let copied = 0;
let skipped = 0;
const missing = [];

for (const album of albums) {
  const albumDir = join(albumsRoot, album.album);
  mkdirSync(albumDir, { recursive: true });

  const frames = [];
  const captions = {};

  for (const entry of album.entries ?? []) {
    const source = findSource(entry.uuid);
    if (!source) {
      missing.push(`${album.album}/${entry.file}`);
      continue;
    }

    const destination = join(albumDir, entry.file);
    if (existsSync(destination) && statSync(destination).size === statSync(source).size) {
      skipped += 1;
    } else {
      copyFileSync(source, destination);
      copied += 1;
    }

    frames.push(entry.file);
    if (entry.caption) captions[entry.file] = entry.caption;
  }

  if (frames.length === 0) continue;

  // Keep the album's existing details, then record the intended frame order and captions.
  const profileFile = join(albumDir, 'profile.json');
  let profile = {};
  if (existsSync(profileFile)) {
    try {
      profile = JSON.parse(readFileSync(profileFile, 'utf8'));
    } catch (error) {
      console.error(`[ai-models] Could not read ${album.album}/profile.json: ${error.message}`);
      profile = {};
    }
  }

  const cover = album.cover ?? profile.cover ?? '';
  if (cover) profile.cover = cover;
  profile.photos = [...(cover ? [cover] : []), ...frames];
  profile.captions = { ...(profile.captions ?? {}), ...captions };

  writeFileSync(profileFile, JSON.stringify(profile, null, 2) + '\n', 'utf8');
}

execFileSync('node', ['scripts/generate-ai-models.mjs'], { cwd: projectRoot, stdio: 'inherit' });

console.log(
  `[ai-models] Ingested ${copied} photograph(s), ${skipped} already present, ${missing.length} missing from ${sourceDir}.`,
);
if (missing.length > 0) {
  console.warn(`[ai-models] Missing attachments (first 5): ${missing.slice(0, 5).join(', ')}`);
  process.exitCode = 1;
}
