#!/usr/bin/env node
/**
 * Files the photographs attached in Arena chat — or dropped straight into a model's album through the
 * GitHub web uploader — into `public/NeverBeenModels/<ModelName>/`.
 *
 * The script is safe to run repeatedly: a photograph that is already in the album (matched by content,
 * whatever it is called) is never copied twice, and a UUID-named file left by an upload is renamed to
 * its readable portfolio name. Frame order and captions are recorded in `<album>/profile.json`, and
 * the manifest is regenerated, so nothing has to be edited by hand.
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
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const defaultMapFile = join(projectRoot, 'scripts', 'model-ingest-map.json');
const albumsRoot = join(projectRoot, 'public', 'NeverBeenModels');
const sourceDir = process.argv[2] ?? '/home/user/uploads';
const mapFile = process.argv[3] ?? defaultMapFile;
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif']);

const map = JSON.parse(readFileSync(mapFile, 'utf8'));
const albums = Array.isArray(map) ? map : (map.albums ?? []);

function isImage(fileName) {
  return imageExtensions.has(extname(fileName).toLowerCase());
}

function listImages(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isImage(entry.name))
    .map((entry) => join(directory, entry.name));
}

function hashOf(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function findWithBaseName(directory, baseName) {
  if (!existsSync(directory)) return null;
  for (const extension of imageExtensions) {
    const candidate = join(directory, baseName + extension);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function findInSource(uuid) {
  return findWithBaseName(sourceDir, uuid);
}

/** A photograph uploaded through the GitHub web UI sits in the album as `<uuid>.<ext>`. */
function uuidNamedInAlbums(uuid) {
  for (const album of albums) {
    const found = findWithBaseName(join(albumsRoot, album.album), uuid);
    if (found) return found;
  }
  return null;
}

const sourceAvailable = existsSync(sourceDir);
const anyUploadedAlready = albums.some((album) =>
  (album.entries ?? []).some((entry) => uuidNamedInAlbums(entry.uuid)),
);

if (!sourceAvailable && !anyUploadedAlready) {
  console.error(
    `[ai-models] Attachment folder not found: ${sourceDir}\n` +
      `[ai-models] The photographs attached in chat were not delivered to this workspace.\n` +
      `[ai-models] Re-attach them in Arena (or pass another folder) and run: npm run ingest:model-photos`,
  );
  process.exit(1);
}

let renamed = 0;
let copied = 0;
let skipped = 0;
const missing = [];

for (const album of albums) {
  const albumDir = join(albumsRoot, album.album);
  mkdirSync(albumDir, { recursive: true });

  const frames = [];
  const captions = {};

  for (const entry of album.entries ?? []) {
    const destination = join(albumDir, entry.file);
    const existing = listImages(albumDir);
    const byContent = new Map(existing.map((file) => [hashOf(file), file]));
    const uploaded = uuidNamedInAlbums(entry.uuid);
    const source = findInSource(entry.uuid);

    let frameFile = null;

    if (existsSync(destination) && (!source || hashOf(source) === hashOf(destination))) {
      // Already filed — either this exact frame, or a re-upload of the same photograph.
      frameFile = entry.file;
      skipped += 1;
    } else if (uploaded) {
      // The photograph was uploaded straight into the album under its attachment name.
      if (destination !== uploaded) {
        renameSync(uploaded, destination);
        renamed += 1;
      }
      frameFile = entry.file;
    } else if (source) {
      const duplicate = byContent.get(hashOf(source));
      if (duplicate) {
        // The same photograph is already in the album under another name — reuse it.
        frameFile = duplicate.split('/').pop();
        skipped += 1;
      } else {
        copyFileSync(source, destination);
        copied += 1;
        frameFile = entry.file;
      }
    } else {
      missing.push(`${album.album}/${entry.file}`);
      continue;
    }

    if (!frames.includes(frameFile)) frames.push(frameFile);
    if (entry.caption) captions[frameFile] = entry.caption;
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
  profile.photos = [...(cover ? [cover] : []), ...frames.filter((frame) => frame !== cover)];
  profile.captions = { ...(profile.captions ?? {}), ...captions };

  writeFileSync(profileFile, JSON.stringify(profile, null, 2) + '\n', 'utf8');
}

execFileSync('node', ['scripts/generate-ai-models.mjs'], { cwd: projectRoot, stdio: 'inherit' });

console.log(
  `[ai-models] Ingested ${copied} new, ${renamed} renamed, ${skipped} already present, ` +
    `${missing.length} missing.`,
);
if (missing.length > 0) {
  console.warn(`[ai-models] Missing attachments (first 5): ${missing.slice(0, 5).join(', ')}`);
  console.warn('[ai-models] Everything found was filed; the rest can be re-attached or uploaded.');
}
