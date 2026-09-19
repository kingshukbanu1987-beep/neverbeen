#!/usr/bin/env node
/**
 * Builds the photograph manifest for the /collection page.
 *
 * Drop photographs into `public/collection` (flat, or into sub-folders which
 * become album headings) and re-run `npm run generate:collection` — or simply
 * `npm start` / `npm run build`, which run this script first.
 *
 * Optional captions: create `public/collection/captions.json` shaped like
 *
 *   {
 *     "santorini-sunset.jpg": {
 *       "title": "Santorini at sunset",
 *       "caption": "Blue domes above the caldera",
 *       "alt": "White houses and blue domes above the Aegean at golden hour"
 *     },
 *     "greece/oia-morning.jpg": { "title": "Oia in the morning" }
 *   }
 *
 * Every key is optional; anything missing is derived from the file name.
 *
 * Output: `src/app/pages/collection/collection-photos.ts` (generated — do not
 * edit by hand). When `public/collection` holds no photographs yet, the sample
 * studio photographs are emitted instead so the page is never empty.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const collectionDir = join(projectRoot, 'public', 'collection');
const captionsFile = join(collectionDir, 'captions.json');
const outputFile = join(projectRoot, 'src', 'app', 'pages', 'collection', 'collection-photos.ts');

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

/** Used until real photographs are added to `public/collection`. */
const seedPhotographs = [
  { src: '/audience/couples.jpg', title: 'Couples', album: 'Audience stories' },
  { src: '/audience/families.jpg', title: 'Families', album: 'Audience stories' },
  { src: '/audience/birthday.jpg', title: 'Birthday gifts', album: 'Audience stories' },
  { src: '/audience/social.jpg', title: 'Social media show-offs', album: 'Audience stories' },
  {
    src: '/audience/dream-destinations.jpg',
    title: 'Dream destinations',
    album: 'Audience stories',
  },
  { src: '/audience/creators.jpg', title: 'Content creators', album: 'Audience stories' },
  { src: '/audience/golden-years.jpg', title: 'Golden years', album: 'Audience stories' },
  { src: '/audience/privacy.jpg', title: 'Your privacy, in writing', album: 'Studio' },
];

function listImages(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...listImages(absolute));
      continue;
    }
    if (imageExtensions.has(extname(entry.name).toLowerCase())) {
      found.push(absolute);
    }
  }
  return found;
}

function humanize(value) {
  const words = value
    .replace(/\.[^.]+$/, '')
    .replace(/[-_+]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function readCaptions() {
  if (!existsSync(captionsFile)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(captionsFile, 'utf8'));
  } catch (error) {
    console.warn(`[collection] Ignoring unreadable captions.json: ${error.message}`);
    return {};
  }
}

function albumNameFor(relativePath) {
  const parts = relativePath.split(sep);
  return parts.length > 1 ? humanize(parts.slice(0, -1).join(' ')) : '';
}

function buildPhotographs() {
  const captions = readCaptions();
  const files = listImages(collectionDir);

  if (files.length === 0) {
    return {
      photographs: seedPhotographs.map((seed) => ({
        src: seed.src,
        title: seed.title,
        caption: 'Sample studio photograph',
        alt: `${seed.title} — NeverBeen sample photograph`,
        album: seed.album,
      })),
      source: `sample photographs from public/audience (public/collection is empty)`,
    };
  }

  const compare = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

  const photographs = files
    .map((file) => {
      const relativePath = relative(collectionDir, file);
      const posixPath = relativePath.split(sep).join('/');
      const baseName = posixPath.split('/').pop();
      const meta = captions[posixPath] ?? captions[baseName] ?? {};
      const title = meta.title ?? humanize(baseName);

      return {
        src: `/collection/${posixPath}`,
        title,
        caption: meta.caption ?? title,
        alt: meta.alt ?? `${title} — NeverBeen collection photograph`,
        album: meta.album ?? albumNameFor(relativePath),
      };
    })
    // Album first (photographs without an album lead), then file name.
    .sort((a, b) => compare(a.album, b.album) || compare(a.src, b.src));

  return {
    photographs,
    source: `${photographs.length} photograph${photographs.length === 1 ? '' : 's'} found in public/collection`,
  };
}

function renderTypeScript(photographs, source) {
  const entries = photographs
    .map((photo) => {
      const fields = ['src', 'title', 'caption', 'alt', 'album']
        .map((key) => `    ${key}: ${JSON.stringify(photo[key]).replace(/"/g, "'")},`)
        .join('\n');
      return `  {\n${fields}\n  },`;
    })
    .join('\n');

  return `/* eslint-disable */
/**
 * Generated by scripts/generate-collection.mjs — do not edit by hand.
 * Source: ${source}
 * Regenerate with: npm run generate:collection
 */

export interface CollectionPhoto {
  /** Public URL of the photograph. */
  src: string;
  /** Short display name. */
  title: string;
  /** One-line description shown under the enlarged photograph. */
  caption: string;
  /** Accessible description. */
  alt: string;
  /** Album heading; empty string keeps the photograph in the main grid. */
  album: string;
}

export const collectionPhotos: CollectionPhoto[] = [
${entries}
];
`;
}

const { photographs, source } = buildPhotographs();
mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, renderTypeScript(photographs, source), 'utf8');

const albums = new Set(photographs.map((photo) => photo.album).filter(Boolean));
console.log(
  `[collection] Wrote ${relative(projectRoot, outputFile)} — ${photographs.length} photograph(s)${
    albums.size ? ` in ${albums.size} album(s)` : ''
  }. ${source}.`,
);
