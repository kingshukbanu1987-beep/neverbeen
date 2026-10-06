#!/usr/bin/env node
/**
 * Builds the NeverBeen AI Models portfolio manifest.
 *
 * Every model owns one album folder inside `public/NeverBeenModels/<ModelNameNoSpaces>`.
 * Drop any number of photographs into that folder — the first image (or the one named
 * `cover.*`, or the `cover` field of the album's `profile.json`) becomes the portfolio
 * avatar/cover, and every image in the folder becomes a post in the Instagram-style grid.
 *
 * The videos of the same model live in the album's own video sub-folder,
 * `public/NeverBeenModels/<ModelNameNoSpaces>/video/`. Every clip dropped in there appears in
 * the portfolio's video reel, just below the model's personal details, and plays in the
 * portfolio's full-screen player (play/pause, stop, seek, volume, speed, full screen and
 * download). `videos/` is accepted as an alias of `video/`.
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
/**
 * The clips a browser can play back with its native <video> element, mapped to the MIME type the
 * portfolio advertises for them.
 */
const videoExtensions = new Map([
  ['.mp4', 'video/mp4'],
  ['.m4v', 'video/mp4'],
  ['.webm', 'video/webm'],
  ['.ogv', 'video/ogg'],
  ['.ogg', 'video/ogg'],
  ['.mov', 'video/quicktime'],
]);

/** Where a model's clips are looked for, inside her own album folder. `video/` is canonical. */
const videoFolderNames = ['video', 'videos'];

function isImage(fileName) {
  return imageExtensions.has(extname(fileName).toLowerCase());
}

function isVideo(fileName) {
  return videoExtensions.has(extname(fileName).toLowerCase());
}

function videoType(fileName) {
  return videoExtensions.get(extname(fileName).toLowerCase()) ?? '';
}

/** Collects every file under `directory` that the predicate accepts. */
function listFiles(directory, accepts) {
  if (!existsSync(directory)) return [];

  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...listFiles(absolute, accepts));
    } else if (entry.isFile() && accepts(entry.name)) {
      found.push(absolute);
    }
  }
  return found;
}

function listImages(directory) {
  return listFiles(directory, isImage);
}

function listVideos(directory) {
  return listFiles(directory, isVideo);
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

function numberValue(value) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(text(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * The model's own rate for one photograph, in INR. Every model quotes her own number; a model
 * without one (0) still takes enquiries and the Rent form says the rate is being finalised.
 */
function photoRateValue(profile) {
  const direct = numberValue(
    profile.photoRate ?? profile.ratePerPhoto ?? profile.perPhoto ?? profile.rate,
  );
  if (direct > 0) return Math.round(direct);

  // Older data priced whole booking terms — fall back to the cheapest published term.
  if (Array.isArray(profile.rates)) {
    const prices = profile.rates
      .map((entry) => (entry && typeof entry === 'object' ? numberValue(entry.usd) : 0))
      .filter((price) => price > 0);
    if (prices.length > 0) return Math.round(Math.min(...prices));
  }

  return 0;
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
 * Resolves a media reference (a file name inside an album, or a path relative to the legacy
 * gallery folder) to an absolute path that stays inside the allowed root. Photographs are the
 * default; `accepts` widens that to video clips where a video is expected.
 */
function resolveInside(root, reference, accepts = isImage) {
  const normalized = text(reference).replaceAll(String.fromCharCode(92), '/');
  if (!normalized) return null;

  const absolutePath = resolve(root, normalized);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${sep}`)) return null;
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) return null;
  if (!accepts(absolutePath)) return null;
  return absolutePath;
}

/**
 * Resolves a reference that may be written relative to the album folder (`video/reel.mp4`) or
 * relative to the album's video sub-folder (`reel.mp4` / `posters/reel.jpg`).
 */
function resolveInAlbum(albumDir, reference, accepts) {
  const roots = [albumDir, ...videoFolderNames.map((folder) => join(albumDir, folder))];
  for (const root of roots) {
    const resolved = resolveInside(root, reference, accepts);
    if (resolved) return resolved;
  }
  return null;
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

/**
 * `videos` entries accept a bare file name or an object, mirroring `photos`:
 * `"reel-01.mp4"` / `{ "file": "reel-01.mp4", "caption": "…", "poster": "reel-01.jpg" }`.
 */
function normalizeVideoEntries(entries) {
  if (!Array.isArray(entries)) return [];

  const videos = [];
  for (const entry of entries) {
    if (typeof entry === 'string') {
      if (entry.trim()) videos.push({ file: entry.trim(), caption: '', poster: '' });
      continue;
    }
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const file = text(entry.file ?? entry.src ?? entry.video);
      if (file) {
        videos.push({
          file,
          caption: text(entry.caption),
          poster: text(entry.poster ?? entry.thumbnail ?? entry.image),
        });
      }
    }
  }
  return videos;
}

/** `videoCaptions` / `videoPosters` maps, keyed by any path that reaches the file. */
function mediaMap(albumDir, value, accepts) {
  const map = new Map();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return map;

  for (const [reference, mapped] of Object.entries(value)) {
    const resolved = resolveInAlbum(albumDir, reference, accepts);
    if (resolved) map.set(resolved, text(mapped));
    else
      console.warn(
        `[ai-models] Could not match the album entry "${reference}" — check the file name.`,
      );
  }
  return map;
}

/**
 * Every clip in the album's `video/` sub-folder, `profile.json` order first (then natural file
 * order), each with its caption, its poster frame and the MIME type to advertise.
 */
function albumVideos({ albumDir, modelName, merged }) {
  const files = naturalSort(
    videoFolderNames.flatMap((folder) => listVideos(join(albumDir, folder))),
  );
  const captions = mediaMap(albumDir, merged.videoCaptions, isVideo);
  const posters = mediaMap(albumDir, merged.videoPosters, isImage);
  const seen = new Set();
  const ordered = [];

  const push = (absolutePath, caption, poster) => {
    if (!absolutePath || seen.has(absolutePath)) return;
    seen.add(absolutePath);
    ordered.push({
      absolutePath,
      caption: caption || captions.get(absolutePath) || '',
      posterPath: poster ? resolveInAlbum(albumDir, poster, isImage) : null,
    });
  };

  for (const entry of normalizeVideoEntries(merged.videos)) {
    const resolved = resolveInAlbum(albumDir, entry.file, isVideo);
    if (!resolved) {
      console.warn(`[ai-models] Missing video for ${modelName}: ${entry.file}`);
      continue;
    }
    push(resolved, entry.caption, entry.poster);
  }

  for (const file of files) {
    push(file, '', posters.get(file) ?? '');
  }

  return ordered.map((entry) => ({
    src: publicUrl(entry.absolutePath),
    fileName: entry.absolutePath.split(sep).pop(),
    caption: entry.caption,
    poster: entry.posterPath
      ? publicUrl(entry.posterPath)
      : (posters.get(entry.absolutePath) ?? ''),
    type: videoType(entry.absolutePath),
  }));
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

  const videos = albumVideos({ albumDir, modelName: name, merged });

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
    bust: text(merged.bust),
    waist: text(merged.waist),
    hip: text(merged.hip),
    handle: normalizeHandle(merged.handle, name),
    tags: textList(merged.tags),
    availability: text(merged.availability),
    order: numberValue(merged.order),
    photoRate: photoRateValue(merged),
    photoNote: text(merged.photoNote ?? merged.rateNote),
    bio: text(merged.bio ?? merged.shortInfo ?? merged.description),
    illustrative: merged.illustrative === true,
    gallery: photos.slice(1).map((photo) => photo.src),
    photos,
    /** Clips from `public/NeverBeenModels/<album>/video/`, played in the portfolio's reel. */
    videos,
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
    bust: text(profile.bust),
    waist: text(profile.waist),
    hip: text(profile.hip),
    handle: normalizeHandle(profile.handle, name),
    tags: textList(profile.tags),
    availability: text(profile.availability),
    order: numberValue(profile.order),
    photoRate: photoRateValue(profile),
    photoNote: text(profile.photoNote ?? profile.rateNote),
    bio: text(profile.bio ?? profile.shortInfo ?? profile.description),
    illustrative: profile.illustrative === true,
    gallery: photos.slice(1).map((photo) => photo.src),
    photos,
    // Flat (legacy) profiles have no album folder, so they carry no video folder either.
    videos: [],
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

  // `order` (1, 2, 3…) is the display order of the directory; models without one keep their
  // discovery order after the numbered ones. Array#sort is stable, so ties stay put.
  return profiles
    .map((profile, index) => ({ profile, index }))
    .sort((a, b) => {
      const left = a.profile.order > 0 ? a.profile.order : Number.MAX_SAFE_INTEGER;
      const right = b.profile.order > 0 ? b.profile.order : Number.MAX_SAFE_INTEGER;
      return left - right || a.index - b.index;
    })
    .map((entry) => entry.profile);
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

export interface AiModelVideo {
  /** Public URL of the video clip inside the model's album. */
  src: string;
  /** File name on disk, offered as the download name in the player. */
  fileName: string;
  /** Optional caption shown under the clip and in the player. */
  caption: string;
  /** Optional poster frame URL; empty when the player should use the clip's first frame. */
  poster: string;
  /** MIME type of the clip, e.g. "video/mp4". */
  type: string;
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
  /** Body shape, e.g. "Hourglass". */
  bodyShape: string;
  /** Bust measurement, e.g. "84 cm". */
  bust: string;
  /** Waist measurement, e.g. "64 cm". */
  waist: string;
  /** Hip measurement, e.g. "90 cm". */
  hip: string;
  /** Instagram-style handle shown on the portfolio header. */
  handle: string;
  /** Portfolio tags, shown as chips on the header. */
  tags: string[];
  /** Optional booking/availability line. */
  availability: string;
  /** Directory display position (1-based); 0 when unspecified. */
  order: number;
  /** Rate for a single photograph in INR — every model quotes her own. 0 when unpublished. */
  photoRate: number;
  /** Note shown with the rate in the booking pop-up. */
  photoNote: string;
  /** Short profile introduction. */
  bio: string;
  /** Whether profile details are illustrative placeholders pending verification. */
  illustrative: boolean;
  /** Photographs beyond the cover, kept for backwards compatibility. */
  gallery: string[];
  /** Every photograph in the album, cover first — the Instagram-style grid. */
  photos: AiModelPhoto[];
  /**
   * Every clip in the album's video/ sub-folder, in album order — the video reel shown just
   * below the model's personal details.
   */
  videos: AiModelVideo[];
}

export const aiModelProfiles: AiModelProfile[] = [
${entries}
];
`;
}

/**
 * The manifest is committed, so it is written in the project's Prettier style: without this every
 * `npm start`/`npm run build` would leave the same file looking modified. Prettier is optional — if
 * it cannot be loaded the raw manifest is written instead.
 */
async function formatSource(source) {
  try {
    const prettier = await import('prettier');
    const config = (await prettier.resolveConfig(outputFile)) ?? {};
    return await prettier.format(source, { ...config, filepath: outputFile });
  } catch {
    return source;
  }
}

const profiles = buildProfiles();
mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, await formatSource(renderTypeScript(profiles)), 'utf8');
console.log(
  `[ai-models] Wrote ${relative(projectRoot, outputFile)} — ${profiles.length} model portfolio${profiles.length === 1 ? '' : 's'}.`,
);
for (const profile of profiles) {
  const videoNote =
    profile.videos.length > 0
      ? `, ${profile.videos.length} video${profile.videos.length === 1 ? '' : 's'} in video/`
      : '';
  console.log(
    `[ai-models]   ${profile.name}: ${profile.photos.length} photograph${profile.photos.length === 1 ? '' : 's'}${videoNote}${profile.album ? ` (public/NeverBeenModels/${profile.album})` : ''}`,
  );
}
