#!/usr/bin/env node
/**
 * Builds the NeverBeen AI Models portfolio manifest.
 *
 * Add one cover image per model to `public/ai-model-assets/portraits`. The cover's
 * filename (without its extension) becomes the model name. Optional model facts
 * live in `data/ai-models/profiles.json`; additional photos live in the gallery folder.
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
const portraitsDir = join(modelsDir, 'portraits');
const galleryDir = join(modelsDir, 'gallery');
const profilesFile = join(projectRoot, 'data', 'ai-models', 'profiles.json');
const outputFile = join(projectRoot, 'src', 'app', 'pages', 'ai-models', 'ai-model-data.ts');
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

function listImages(directory) {
  if (!existsSync(directory)) return [];

  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...listImages(absolute));
    } else if (entry.isFile() && imageExtensions.has(extname(entry.name).toLowerCase())) {
      found.push(absolute);
    }
  }
  return found;
}

function readProfiles() {
  if (!existsSync(profilesFile)) return {};

  try {
    const parsed = JSON.parse(readFileSync(profilesFile, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('The top level must be a JSON object keyed by cover filename.');
    }
    return parsed;
  } catch (error) {
    console.error(`[ai-models] Could not read data/ai-models/profiles.json: ${error.message}`);
    process.exit(1);
  }
}

function text(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  return '';
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

function publicUrl(absolutePath) {
  const urlPath = relative(publicDir, absolutePath)
    .split(sep)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `/${urlPath}`;
}

function galleryUrls(entries, modelName, coverFile) {
  if (!Array.isArray(entries)) return [];

  const seen = new Set([coverFile]);
  const result = [];
  for (const entry of entries) {
    if (typeof entry !== 'string' || !entry.trim()) continue;

    const normalized = entry.trim().replaceAll('\\', '/');
    const absolutePath = resolve(galleryDir, normalized);
    if (absolutePath !== galleryDir && !absolutePath.startsWith(`${galleryDir}${sep}`)) {
      console.warn(
        `[ai-models] Ignoring gallery path outside public/ai-model-assets/gallery for ${modelName}.`,
      );
      continue;
    }
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
      console.warn(`[ai-models] Missing gallery photograph for ${modelName}: ${normalized}`);
      continue;
    }
    if (!imageExtensions.has(extname(absolutePath).toLowerCase()) || seen.has(absolutePath))
      continue;

    seen.add(absolutePath);
    result.push(publicUrl(absolutePath));
  }
  return result;
}

function buildProfiles() {
  const profileData = readProfiles();
  const images = listImages(portraitsDir).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  );
  const usedSlugs = new Set();

  return images.map((coverPath) => {
    const coverFile = relative(portraitsDir, coverPath).split(sep).join('/');
    const fileName = coverFile.split('/').pop();
    const name = fileName.replace(/\.[^.]+$/, '');
    const baseName = name;
    const initialSlug = slugify(name);
    let slug = initialSlug;
    let suffix = 2;
    while (usedSlugs.has(slug)) slug = `${initialSlug}-${suffix++}`;
    usedSlugs.add(slug);

    const rawProfile =
      profileData[coverFile] ?? profileData[fileName] ?? profileData[baseName] ?? {};
    const profile =
      rawProfile && typeof rawProfile === 'object' && !Array.isArray(rawProfile) ? rawProfile : {};
    const additionalPhotos = galleryUrls(profile.gallery, name, coverPath);

    return {
      slug,
      name,
      cover: publicUrl(coverPath),
      location: text(profile.location),
      age: text(profile.age),
      height: text(profile.height),
      weight: text(profile.weight),
      bodyShape: text(profile.bodyShape),
      bio: text(profile.bio ?? profile.shortInfo ?? profile.description),
      gallery: additionalPhotos,
    };
  });
}

function renderTypeScript(profiles) {
  const entries = profiles.map((profile) => `  ${JSON.stringify(profile)},`).join('\n');
  return `/**
 * Generated by scripts/generate-ai-models.mjs — do not edit by hand.
 * Regenerate with: npm run generate:ai-models
 */

export interface AiModelProfile {
  /** URL-safe path segment derived from the cover image filename. */
  slug: string;
  /** Cover filename without its extension. */
  name: string;
  /** Main portfolio cover image. */
  cover: string;
  location: string;
  age: string;
  height: string;
  weight: string;
  bodyShape: string;
  /** Short profile introduction. */
  bio: string;
  /** Additional gallery images, beyond the cover. */
  gallery: string[];
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
