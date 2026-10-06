#!/usr/bin/env node
/**
 * Watches `public/NeverBeenModels` and regenerates the AI model manifest whenever photographs or
 * videos are added, replaced or removed — so a photo dropped into a model's album folder, or a
 * clip dropped into her `video/` sub-folder, appears on that model's portfolio page without any
 * further command or code change.
 *
 * `npm start` runs this next to `ng serve`; the Angular dev server then rebuilds and reloads the
 * page by itself. Run it on its own with:
 *
 *   node scripts/watch-ai-models.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync, watch } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const albumsDir = join(projectRoot, 'public', 'NeverBeenModels');
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
/** The clip formats the portfolio's video reel can play. */
const videoExtensions = new Set(['.mp4', '.m4v', '.webm', '.ogv', '.ogg', '.mov']);
const debounceMs = 300;

let timer = null;
let generating = false;
let regenerateAgain = false;

function runGenerator(reason) {
  if (generating) {
    regenerateAgain = true;
    return;
  }

  generating = true;
  console.log(`[ai-models] ${reason} — refreshing the portfolio manifest…`);

  try {
    execFileSync('node', ['scripts/generate-ai-models.mjs'], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  } catch (error) {
    console.error(`[ai-models] Manifest refresh failed: ${error.message}`);
  } finally {
    generating = false;
    if (regenerateAgain) {
      regenerateAgain = false;
      runGenerator('Changes arrived during the refresh');
    }
  }
}

function schedule(reason) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    runGenerator(reason);
  }, debounceMs);
}

/** Fingerprint of the album tree, used when recursive watching is unavailable. */
function fingerprint(directory) {
  if (!existsSync(directory)) return '';

  const parts = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      parts.push(fingerprint(absolute));
    } else {
      const stats = statSync(absolute);
      parts.push(
        `${relative(albumsDir, absolute).split(sep).join('/')}:${stats.size}:${stats.mtimeMs}`,
      );
    }
  }
  return parts.sort().join('|');
}

function watchWithPolling(reason) {
  let previous = fingerprint(albumsDir);
  setInterval(() => {
    const current = fingerprint(albumsDir);
    if (current === previous) return;
    previous = current;
    schedule(reason);
  }, 3000);
}

if (!existsSync(albumsDir)) {
  console.error(`[ai-models] Album folder not found: ${albumsDir}`);
  process.exit(1);
}

let watchingEvents = false;
try {
  watch(albumsDir, { recursive: true }, (eventType, fileName) => {
    const extension = fileName ? extname(fileName).toLowerCase() : '';
    if (
      fileName &&
      !imageExtensions.has(extension) &&
      !videoExtensions.has(extension) &&
      fileName !== 'profile.json'
    ) {
      return;
    }
    schedule(
      fileName ? `public/NeverBeenModels/${fileName} ${eventType}d` : 'Album folders changed',
    );
  });
  watchingEvents = true;
} catch {
  // Recursive watching is not available on every platform/filesystem — fall back to a light scan.
  watchWithPolling('Album folders changed');
}

console.log(
  "[ai-models] Watching public/NeverBeenModels — drop photographs into a model's folder, or " +
    'videos into her video/ sub-folder, and ' +
    `${watchingEvents ? 'they appear' : 'they appear (scan mode)'} on that portfolio page ` +
    'automatically.',
);

function shutdown() {
  if (timer) clearTimeout(timer);
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
