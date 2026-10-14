#!/usr/bin/env node
/**
 * PersonalityBiographyScript — writes the Live Chat's `personality/biography.json` for every
 * NeverBeen AI model: who she is (her own profile) and the story of her life (her biography), in
 * one file the AI Chat sends to the backend with every turn.
 *
 *   node PersonalityBiographyScript.mjs                      → every model (only changed files are written)
 *   node PersonalityBiographyScript.mjs --model "Fiadh Dara" → one model (name, album folder or slug)
 *   node PersonalityBiographyScript.mjs --force              → also regenerate chat-only life stories
 *   node PersonalityBiographyScript.mjs --check              → exit 1 if any file is missing or stale
 *   npm run personality:biography -- --model "Fiadh Dara"
 *
 * The file lives next to the character database, in
 * `public/NeverBeenModels/<ModelNameNoSpaces>/personality/biography.json`, and has three blocks:
 *
 * - `meta`      — whose file it is, where the biography came from, and the conflict rule.
 * - `profile`   — her card exactly as the website shows it: name, handle, city and country, age,
 *                 height, weight, body shape, measurements, introduction, tags, availability, rate
 *                 per photograph, and the size of her portfolio. It is read from the same
 *                 `buildProfiles()` that writes the portfolio manifest
 *                 (`scripts/generate-ai-models.mjs`), so it can never disagree with her page.
 * - `biography` — the details of her fictional life: birth details, general information, summary,
 *                 early life, education, career, achievements, personal life and family, hobbies,
 *                 interests, passions, ambitions, final notes, quotes and memories.
 *
 * Where the biography comes from:
 *
 * - A model with a written `Biography/biography.json` (her public biography page) gets that
 *   biography, without the image-generation prompts, which are of no use to a conversation.
 * - A model without one gets a life story written by the same offline engine as
 *   `BiographyScript.mjs` (`makeBiography`), **for Live Chat only**: nothing is written into her
 *   `Biography/` folder, so her public pages do not change. `meta.biographySource` says which.
 *   Because that engine dates the story from the day it runs, a chat-only story is written once
 *   and then kept: a later run refreshes her profile but leaves the story alone unless `--force`
 *   is given. When a real `Biography/biography.json` appears later, the next run switches to it.
 *
 * The profile wins over the biography wherever the two disagree (`meta.conflictRule`). Files are
 * only rewritten when their content changes, so the run is safe to repeat. The website loads the
 * file through `src/app/pages/ai-models/chat/chat-biography.ts`; the structure is documented in
 * `docs/ai-model-biography.md`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProfiles } from './scripts/generate-ai-models.mjs';
import { findModel, makeBiography } from './BiographyScript.mjs';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const albumsDir = join(projectRoot, 'public', 'NeverBeenModels');
const personalityFolder = 'personality';
const biographyFile = 'biography.json';
const SCHEMA_VERSION = '1.0';

/** `meta.biographySource` values. */
const SOURCE_WRITTEN = 'Biography/biography.json';
const SOURCE_GENERATED = 'generated-for-live-chat';

/** The biography sections a conversation can use, in reading order. */
const BIOGRAPHY_SECTIONS = [
  'title',
  'birthDetails',
  'generalInformation',
  'summary',
  'earlyLife',
  'educationalBackground',
  'career',
  'achievements',
  'personalLife',
  'hobbies',
  'interests',
  'passions',
  'ambitions',
  'finalNotes',
  'quotes',
  'memories',
  'fictionalNotice',
];

// --------------------------------------------------------------------- helpers

function readJson(file) {
  if (!existsSync(file)) return null;
  try {
    const value = JSON.parse(readFileSync(file, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch (error) {
    throw new Error(`Could not parse ${file}: ${error.message}`);
  }
}

function text(value) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function looseKey(value) {
  return text(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/** A value with every empty string, empty list and empty object left out. */
function compact(value) {
  if (Array.isArray(value)) {
    return value.map(compact).filter((entry) => entry !== undefined);
  }
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, entry] of Object.entries(value)) {
      const cleaned = compact(entry);
      if (cleaned === undefined) continue;
      if (typeof cleaned === 'string' && cleaned.length === 0) continue;
      result[key] = cleaned;
    }
    return result;
  }
  return value === null ? undefined : value;
}

/** "Darjeeling, India" → { city: "Darjeeling", country: "India" }. */
function splitLocation(location) {
  const parts = text(location)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return { city: parts[0] ?? '', country: parts.slice(1).join(', ') };
}

/** The introduction without the typographic quotation marks it is published in. */
function plainBio(value) {
  return text(value)
    .replace(/^[“"]+|[”"]+$/g, '')
    .trim();
}

/** "INR 545 per photograph" — the rate exactly as the booking pop-up quotes it. */
function rateFor(profile) {
  if (!Number.isFinite(profile.photoRate) || profile.photoRate <= 0) return undefined;
  return {
    amount: profile.photoRate,
    currency: 'INR',
    unit: 'per photograph',
    note: text(profile.photoNote),
  };
}

// ------------------------------------------------------------------ the blocks

/** Her card, exactly as the website shows it. */
function profileBlock(profile) {
  const { city, country } = splitLocation(profile.location);
  return compact({
    _doc: 'Her own profile, exactly as the website shows it on her portfolio page (data/ai-models/profiles.json merged with her album profile.json). These facts win over anything in the biography block.',
    name: profile.name,
    handle: profile.handle,
    slug: profile.slug,
    album: profile.album,
    location: profile.location,
    city,
    country,
    age: profile.age,
    height: profile.height,
    weight: profile.weight,
    bodyShape: profile.bodyShape,
    measurements: { bust: profile.bust, waist: profile.waist, hip: profile.hip },
    introduction: plainBio(profile.bio),
    tags: profile.tags,
    availability: profile.availability,
    rate: rateFor(profile),
    portfolio: {
      photographs: profile.photos.length,
      videos: profile.videos.length,
      portfolioDocument: profile.portfolio
        ? { fileName: profile.portfolio.fileName, pages: profile.portfolio.pages }
        : undefined,
    },
    profilePage: `/ai-models/${profile.slug}`,
    illustrative: profile.illustrative,
  });
}

/**
 * The parts of a biography a conversation can use. The image-generation prompts, the signature
 * styling and the file names of the memory photographs are left out.
 */
function biographyBlock(source, origin) {
  const block = {
    _doc:
      origin === SOURCE_WRITTEN
        ? 'The details of her fictional NeverBeen life, from her written biography (Biography/biography.json, also shown on her public biography page).'
        : 'The details of her fictional NeverBeen life, written for Live Chat by the BiographyScript engine because she has no written biography yet. It is not shown on the website.',
  };
  for (const section of BIOGRAPHY_SECTIONS) {
    if (!(section in source)) continue;
    if (section === 'memories') {
      block.memories = (Array.isArray(source.memories) ? source.memories : []).map((memory) => ({
        id: memory.id,
        period: memory.period,
        timestamp: memory.timestamp,
        caption: memory.caption,
      }));
    } else {
      block[section] = source[section];
    }
  }
  return compact(block);
}

/** The biography for one model, and where it came from. */
function biographyFor(profile, existing, force) {
  const written = readJson(join(albumsDir, profile.album, 'Biography', 'biography.json'));
  if (written) {
    return {
      origin: SOURCE_WRITTEN,
      generatedAt: text(written.generatedAt),
      block: biographyBlock(written, SOURCE_WRITTEN),
    };
  }

  // A chat-only story is written once and then kept: the engine dates it from the day it runs.
  if (!force && existing?.meta?.biographySource === SOURCE_GENERATED && existing.biography) {
    return {
      origin: SOURCE_GENERATED,
      generatedAt: text(existing.meta.biographyGeneratedAt),
      block: existing.biography,
    };
  }

  const generated = makeBiography(findModel(profile.album));
  return {
    origin: SOURCE_GENERATED,
    generatedAt: text(generated.generatedAt),
    block: biographyBlock(generated, SOURCE_GENERATED),
  };
}

function buildBiographyFile(profile, existing, force, now) {
  const biography = biographyFor(profile, existing, force);
  return {
    meta: compact({
      _doc: 'Live Chat sends this file to the backend (POST /neverbeen-api/api/ai-chat) with every message, together with the visitor’s words and her character database (characterdatabase.json). The character database says how she talks; this file says who she is and what her life has been. Written by PersonalityBiographyScript.mjs — rerun it after editing her profile or biography.',
      schemaVersion: SCHEMA_VERSION,
      id: `${profile.slug}-biography`,
      model: {
        name: profile.name,
        handle: profile.handle,
        slug: profile.slug,
        album: profile.album,
      },
      language: 'en',
      fictional: true,
      universe: 'NeverBeen Multiverse',
      biographySource: biography.origin,
      biographyGeneratedAt: biography.generatedAt,
      conflictRule: 'profile-wins',
      createdAt: text(existing?.meta?.createdAt) || now,
      updatedAt: text(existing?.meta?.updatedAt) || now,
    }),
    profile: profileBlock(profile),
    biography: biography.block,
  };
}

/** Content equality, ignoring `meta.updatedAt` — so an unchanged file is never rewritten. */
function sameContent(a, b) {
  if (!a || !b) return false;
  const strip = (value) => ({ ...value, meta: { ...value.meta, updatedAt: '' } });
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

/**
 * The files are committed, so they are written in the project's Prettier style. Prettier is
 * optional: if it cannot be loaded the plain JSON is written instead.
 */
async function formatJson(source, file) {
  try {
    const prettier = await import('prettier');
    const config = (await prettier.resolveConfig(file)) ?? {};
    return await prettier.format(source, { ...config, filepath: file });
  } catch {
    return source;
  }
}

// ------------------------------------------------------------------------- the run

function parseArgs(argv) {
  const args = { model: '', force: false, check: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--force') args.force = true;
    else if (arg === '--check') args.check = true;
    else if (arg === '--model' || arg === '--album' || arg === '--slug')
      args.model = text(argv[++i]);
    else if (arg.startsWith('--model=')) args.model = text(arg.slice('--model='.length));
    else if (arg === '--help' || arg === '-h') args.help = true;
  }
  return args;
}

function matchesModel(profile, wanted) {
  const key = looseKey(wanted);
  return [profile.name, profile.album, profile.slug].some((value) => looseKey(value) === key);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      'Usage: node PersonalityBiographyScript.mjs [--model "Model Name"] [--force] [--check]',
    );
    return;
  }

  // Only album models have a personality folder; legacy loose portraits have no album.
  const profiles = buildProfiles().filter((profile) => profile.album);
  const selected = args.model ? profiles.filter((p) => matchesModel(p, args.model)) : profiles;
  if (selected.length === 0) {
    throw new Error(`No model matches “${args.model}”. Use her name, album folder or slug.`);
  }

  const now = new Date().toISOString();
  let written = 0;
  let unchanged = 0;
  const stale = [];

  for (const profile of selected) {
    const folder = join(albumsDir, profile.album, personalityFolder);
    const file = join(folder, biographyFile);
    const existing = readJson(file);
    const next = buildBiographyFile(profile, existing, args.force, now);

    if (sameContent(existing, next)) {
      unchanged += 1;
      continue;
    }
    if (args.check) {
      stale.push(profile.album);
      continue;
    }

    next.meta.updatedAt = now;
    mkdirSync(folder, { recursive: true });
    writeFileSync(file, await formatJson(`${JSON.stringify(next, null, 2)}\n`, file), 'utf8');
    written += 1;
    console.log(
      `[biography.json] ${profile.name}: wrote ${personalityFolder}/${biographyFile} (${next.meta.biographySource})`,
    );
  }

  if (args.check) {
    if (stale.length > 0) {
      console.error(`[biography.json] Missing or stale: ${stale.join(', ')}`);
      console.error('[biography.json] Run `npm run personality:biography` to refresh them.');
      process.exitCode = 1;
    } else {
      console.log(`[biography.json] All ${unchanged} files are up to date.`);
    }
    return;
  }
  console.log(`[biography.json] ${written} written, ${unchanged} already up to date.`);
}

main().catch((error) => {
  console.error(`[biography.json] ${error.message}`);
  process.exitCode = 1;
});
