#!/usr/bin/env node
/**
 * Builds the NeverBeen AI Models portfolio manifest.
 *
 * Every model owns one album folder inside `public/NeverBeenModels/<ModelNameNoSpaces>`.
 * Drop any number of photographs into that folder — the first image (or the one named
 * `cover.*`, or the `cover` field of the album's `profile.json`) becomes the portfolio
 * avatar/cover, and every image in the folder becomes a post in the Instagram-style grid.
 *
 * Optional per-model facts live in `<album>/profile.json`; the shared
 * `data/ai-models/profiles.json` remains supported and can be keyed by cover filename,
 * model name or album folder. The legacy `public/ai-model-assets/portraits` folder and
 * `public/ai-model-assets/gallery` photographs remain supported.
 *
 * The generated TypeScript is rebuilt by `npm start` / `npm run build` and can
 * also be refreshed directly with `npm run generate:ai-models`.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const publicDir = join(projectRoot, 'public');
const modelsDir = join(publicDir, 'ai-model-assets');
const albumsDir = join(publicDir, 'NeverBeenModels');
const legacyPortraitsDir = join(modelsDir, 'portraits');
const legacyGalleryDir = join(modelsDir, 'gallery');
const profilesFile = join(projectRoot, 'data', 'ai-models', 'profiles.json');
const outputFile = join(projectRoot, 'src', 'app', 'pages', 'ai-models', 'ai-model-data.ts');
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

function isImage(fileName) {
  return imageExtensions.has(extname(fileName).toLowerCase());
}

function listImages(directory) {
  if (!existsSync(directory)) return [];

  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...listImages(absolute));
    } else if (entry.isFile() && isImage(entry.name)) {
      found.push(absolute);
    }
  }
  return found;
}

function listAlbumDirectories() {
  if (!existsSync(albumsDir)) return [];

  return readdirSync(albumsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/** Images sitting directly in public/NeverBeenModels (outside every album folder). */
function listLooseAlbumImages() {
  if (!existsSync(albumsDir)) return [];

  return naturalSort(
    readdirSync(albumsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && isImage(entry.name))
      .map((entry) => join(albumsDir, entry.name)),
  );
}

function naturalSort(paths) {
  return [...paths].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  );
}

function readJson(file, { strict = false } = {}) {
  if (!existsSync(file)) return {};

  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('The top level must be a JSON object.');
    }
    return parsed;
  } catch (error) {
    console.error(`[ai-models] Could not read ${relative(projectRoot, file)}: ${error.message}`);
    if (strict) process.exit(1);
    return {};
  }
}

function text(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  return '';
}

function textList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => text(entry)).filter(Boolean);
}

function slugify(value) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'model';
}

/** Loose comparison key: `Fatima Sana Hussaini`, `FatimaSanaHussaini` and `fatima-sana`-style keys align. */
function looseKey(value) {
  return text(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/** `NourhanDurrani` / `nourhan-durrani` -> `Nourhan Durrani`. */
function humanizeFolderName(folderName) {
  const spaced = folderName
    .replaceAll('_', ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced || folderName;
}

/** `Nourhan Durrani` -> `@nourhan.durrani`. */
function defaultHandle(name) {
  const handle = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return handle ? `@${handle}` : '';
}

function normalizeHandle(value, name) {
  const raw = text(value);
  if (!raw) return defaultHandle(name);
  return raw.startsWith('@') ? raw : `@${raw.replace(/^@+/, '')}`;
}

function publicUrl(absolutePath) {
  const urlPath = relative(publicDir, absolutePath)
    .split(sep)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `/${urlPath}`;
}

function imageStem(fileName) {
  return fileName.replace(/\.[^.]+$/, '');
}

function baseName(value) {
  return text(value).replaceAll(String.fromCharCode(92), '/').split('/').pop() ?? '';
}

/**
 * Resolves a photograph reference (a file name inside an album, or a path relative to the
 * legacy gallery folder) to an absolute path that stays inside the allowed root.
 */
function resolveInside(root, reference) {
  const normalized = text(reference).replaceAll(String.fromCharCode(92), '/');
  if (!normalized) return null;

  const absolutePath = resolve(root, normalized);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${sep}`)) return null;
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) return null;
  if (!isImage(absolutePath)) return null;
  return absolutePath;
}

function readProfiles() {
  const parsed = readJson(profilesFile, { strict: true });
  return parsed;
}

/** Profiles.json entries are accepted by cover filename, model name or album folder. */
function profilesEntryFor(profileData, { name, folderName, coverFileNames = [] }) {
  const keys = [name, humanizeFolderName(folderName), folderName, ...coverFileNames].map(looseKey);
  for (const [key, value] of Object.entries(profileData)) {
    if (
      keys.includes(looseKey(imageStem(baseName(key)))) ||
      keys.includes(looseKey(baseName(key)))
    ) {
      return { key, value };
    }
  }
  return null;
}

function normalizePhotoEntries(entries) {
  if (!Array.isArray(entries)) return [];

  const photos = [];
  for (const entry of entries) {
    if (typeof entry === 'string') {
      if (entry.trim()) photos.push({ file: entry.trim(), caption: '' });
      continue;
    }
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const file = text(entry.file ?? entry.src ?? entry.photo);
      if (file) photos.push({ file, caption: text(entry.caption) });
    }
  }
  return photos;
}

function albumPhotos({ albumDir, coverPath, preferredOrder, captions, modelName }) {
  const files = naturalSort(listImages(albumDir));
  const seen = new Set();
  const ordered = [];

  const push = (absolutePath, caption) => {
    if (!absolutePath || seen.has(absolutePath)) return;
    seen.add(absolutePath);
    ordered.push({ absolutePath, caption: caption ?? captions.get(absolutePath) ?? '' });
  };

  push(coverPath);

  for (const entry of preferredOrder) {
    const resolved = resolveInside(albumDir, entry.file);
    if (!resolved) {
      console.warn(`[ai-models] Missing photograph for ${modelName}: ${entry.file}`);
      continue;
    }
    push(resolved, entry.caption);
  }

  for (const file of files) push(file);

  return ordered;
}

function buildAlbumProfile({ folderName, profileData, usedSlugs, fallbackCover = null }) {
  const albumDir = join(albumsDir, folderName);
  const albumData = readJson(join(albumDir, 'profile.json'));

  const albumImages = naturalSort(listImages(albumDir));
  const albumImageNames = albumImages.map((imagePath) => imagePath.split(sep).pop());
  const shared = profilesEntryFor(profileData, {
    name: text(albumData.name),
    folderName,
    coverFileNames: albumImageNames,
  });
  const sharedProfile = shared?.value ?? {};

  // Prefer a filename that matches the album folder (`Zeina Al-Sabbagh.png` in
  // `ZeinaAlSabbagh/`), then fall back to the folder name itself, which is the model name.
  const nameFromImage = albumImageNames
    .map((fileName) => imageStem(fileName))
    .find(
      (stem) =>
        looseKey(stem) === looseKey(folderName) ||
        looseKey(stem) === looseKey(humanizeFolderName(folderName)),
    );

  const name =
    text(albumData.name) ||
    text(sharedProfile.name) ||
    nameFromImage ||
    humanizeFolderName(folderName);

  // Album-level `profile.json` wins over the shared `data/ai-models/profiles.json` entry.
  const merged = { ...sharedProfile, ...albumData };

  let slug = slugify(name);
  let suffix = 2;
  while (usedSlugs.has(slug)) slug = `${slug}-${suffix++}`;
  usedSlugs.add(slug);

  const coverCandidate =
    resolveInside(albumDir, merged.cover) ??
    albumImages.find(
      (imagePath) => imageStem(imagePath.split(sep).pop()).toLowerCase() === 'cover',
    ) ??
    albumImages.find(
      (imagePath) => looseKey(imageStem(imagePath.split(sep).pop())) === looseKey(name),
    ) ??
    albumImages[0] ??
    fallbackCover ??
    null;

  const captions = new Map();
  if (merged.captions && typeof merged.captions === 'object' && !Array.isArray(merged.captions)) {
    for (const [file, caption] of Object.entries(merged.captions)) {
      const resolved = resolveInside(albumDir, file);
      if (resolved) captions.set(resolved, text(caption));
    }
  }

  const preferredOrder = [
    ...normalizePhotoEntries(merged.photos),
    ...normalizePhotoEntries(merged.gallery),
  ];

  const albumEntries = albumPhotos({
    albumDir,
    coverPath: coverCandidate,
    preferredOrder,
    captions,
    modelName: name,
  });

  const photos = albumEntries.map((entry) => ({
    src: publicUrl(entry.absolutePath),
    caption: entry.caption,
  }));
  const cover = coverCandidate ? publicUrl(coverCandidate) : '';

  return {
    slug,
    name,
    cover,
    album: folderName,
    location: text(merged.location),
    age: text(merged.age),
    height: text(merged.height),
    weight: text(merged.weight),
    bodyShape: text(merged.bodyShape),
    handle: normalizeHandle(merged.handle, name),
    tags: textList(merged.tags),
    availability: text(merged.availability),
    bio: text(merged.bio ?? merged.shortInfo ?? merged.description),
    illustrative: merged.illustrative === true,
    gallery: photos.slice(1).map((photo) => photo.src),
    photos,
  };
}

function buildFlatProfile({ name, coverPath, rawProfile, usedSlugs, extraPhotos = [] }) {
  let slug = slugify(name);
  let suffix = 2;
  while (usedSlugs.has(slug)) slug = `${slug}-${suffix++}`;
  usedSlugs.add(slug);

  const profile =
    rawProfile && typeof rawProfile === 'object' && !Array.isArray(rawProfile) ? rawProfile : {};

  const photos = [];
  const seen = new Set();
  const push = (absolutePath, caption = '') => {
    if (!absolutePath || seen.has(absolutePath)) return;
    seen.add(absolutePath);
    photos.push({ src: publicUrl(absolutePath), caption });
  };

  push(coverPath);

  for (const entry of [
    ...normalizePhotoEntries(profile.photos),
    ...normalizePhotoEntries(profile.gallery),
  ]) {
    const resolved = resolveInside(legacyGalleryDir, entry.file);
    if (!resolved) {
      console.warn(`[ai-models] Missing gallery photograph for ${name}: ${entry.file}`);
      continue;
    }
    push(resolved, entry.caption);
  }

  for (const absolutePath of extraPhotos) push(absolutePath);

  return {
    slug,
    name,
    cover: coverPath ? publicUrl(coverPath) : '',
    album: '',
    location: text(profile.location),
    age: text(profile.age),
    height: text(profile.height),
    weight: text(profile.weight),
    bodyShape: text(profile.bodyShape),
    handle: normalizeHandle(profile.handle, name),
    tags: textList(profile.tags),
    availability: text(profile.availability),
    bio: text(profile.bio ?? profile.shortInfo ?? profile.description),
    illustrative: profile.illustrative === true,
    gallery: photos.slice(1).map((photo) => photo.src),
    photos,
  };
}

function buildProfiles() {
  const profileData = readProfiles();
  const usedSlugs = new Set();
  const usedImages = new Set();
  const profiles = [];

  const albumFolders = listAlbumDirectories();
  const consumedAlbums = new Set();
  const albumByKey = new Map();
  for (const folderName of albumFolders) {
    albumByKey.set(looseKey(folderName), folderName);
    albumByKey.set(looseKey(humanizeFolderName(folderName)), folderName);
  }

  /** Album photographs are claimed by their album, so they never become loose profiles. */
  const claimAlbum = (folderName) => {
    consumedAlbums.add(folderName);
    for (const imagePath of listImages(join(albumsDir, folderName))) usedImages.add(imagePath);

    // A loose cover image in the album root still works while the folder is being filled.
    const fallbackCover =
      looseAlbumImages.find((imagePath) => {
        if (usedImages.has(imagePath)) return false;
        const stem = imageStem(imagePath.split(sep).pop());
        return (
          looseKey(stem) === looseKey(folderName) ||
          looseKey(stem) === looseKey(humanizeFolderName(folderName))
        );
      }) ?? null;
    if (fallbackCover) usedImages.add(fallbackCover);

    profiles.push(buildAlbumProfile({ folderName, profileData, usedSlugs, fallbackCover }));
  };

  const legacyPortraits = naturalSort(listImages(legacyPortraitsDir));
  const looseAlbumImages = listLooseAlbumImages();
  const albumImages = naturalSort(listImages(albumsDir));

  const claimLegacyPortrait = (matcher) => {
    const match = legacyPortraits.find((absolutePath) => {
      if (usedImages.has(absolutePath)) return false;
      const stem = imageStem(absolutePath.split(sep).pop());
      return matcher(stem);
    });
    if (match) usedImages.add(match);
    return match ?? null;
  };

  // 1. Shared metadata order first, so `data/ai-models/profiles.json` keeps steering the directory.
  for (const [profileKey, rawProfile] of Object.entries(profileData)) {
    const fileName = baseName(profileKey);
    const name = imageStem(fileName);
    if (!name) continue;

    const matchingAlbum = albumByKey.get(looseKey(name));
    if (matchingAlbum && !consumedAlbums.has(matchingAlbum)) {
      claimAlbum(matchingAlbum);
      continue;
    }

    const matchingImage = claimLegacyPortrait((stem) => looseKey(stem) === looseKey(name)) ?? null;
    const legacyProfile = rawProfile && typeof rawProfile === 'object' ? rawProfile : {};
    const legacyGallery = [
      ...normalizePhotoEntries(legacyProfile.photos),
      ...normalizePhotoEntries(legacyProfile.gallery),
    ]
      .map((entry) => resolveInside(legacyGalleryDir, entry.file))
      .filter(Boolean);

    profiles.push(
      buildFlatProfile({
        name,
        coverPath: matchingImage,
        rawProfile,
        usedSlugs,
        extraPhotos: legacyGallery,
      }),
    );
    for (const absolutePath of legacyGallery) usedImages.add(absolutePath);
  }

  // 2. Albums without a shared metadata entry, ordered by folder name.
  for (const folderName of albumFolders) {
    if (consumedAlbums.has(folderName)) continue;
    claimAlbum(folderName);
  }

  // 3. Loose images sitting directly in the album root or the legacy portraits folder.
  for (const coverPath of [...albumImages, ...legacyPortraits]) {
    if (usedImages.has(coverPath)) continue;
    const fileName = coverPath.split(sep).pop();
    const name = imageStem(fileName);
    if (!name) continue;

    const shared = profilesEntryFor(profileData, {
      name,
      folderName: name,
      coverFileNames: [fileName],
    });
    usedImages.add(coverPath);
    profiles.push(
      buildFlatProfile({
        name,
        coverPath,
        rawProfile: shared?.value ?? {},
        usedSlugs,
      }),
    );
  }

  return profiles;
}

function renderTypeScript(profiles) {
  const entries = profiles.map((profile) => `  ${JSON.stringify(profile)},`).join('\n');
  return `/**
 * Generated by scripts/generate-ai-models.mjs — do not edit by hand.
 * Regenerate with: npm run generate:ai-models
 */

export interface AiModelPhoto {
  /** Public URL of the photograph. */
  src: string;
  /** Optional caption shown in the portfolio lightbox. */
  caption: string;
}

export interface AiModelProfile {
  /** URL-safe path segment derived from the model name. */
  slug: string;
  /** Model name, taken from the album profile or cover filename. */
  name: string;
  /** Cover/avatar photograph used by the directory and portfolio header. */
  cover: string;
  /** Album folder inside public/NeverBeenModels. */
  album: string;
  location: string;
  age: string;
  height: string;
  weight: string;
  bodyShape: string;
  /** Instagram-style handle shown on the portfolio header. */
  handle: string;
  /** Portfolio tags, shown as chips on the header. */
  tags: string[];
  /** Optional booking/availability line. */
  availability: string;
  /** Short profile introduction. */
  bio: string;
  /** Whether profile details are illustrative placeholders pending verification. */
  illustrative: boolean;
  /** Photographs beyond the cover, kept for backwards compatibility. */
  gallery: string[];
  /** Every photograph in the album, cover first — the Instagram-style grid. */
  photos: AiModelPhoto[];
}

export const aiModelProfiles: AiModelProfile[] = [
${entries}
];
`;
}

const profiles = buildProfiles();
mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, renderTypeScript(profiles), 'utf8');
console.log(
  `[ai-models] Wrote ${relative(projectRoot, outputFile)} — ${profiles.length} model portfolio${profiles.length === 1 ? '' : 's'}.`,
);
for (const profile of profiles) {
  console.log(
    `[ai-models]   ${profile.name}: ${profile.photos.length} photograph${profile.photos.length === 1 ? '' : 's'}${profile.album ? ` (public/NeverBeenModels/${profile.album})` : ''}`,
  );
}
