/**
 * The model's **biography file** for Live Chat:
 * `public/NeverBeenModels/<Album>/personality/biography.json`, written by
 * `PersonalityBiographyScript.mjs`.
 *
 * It holds who she is and what her life has been, in two blocks:
 *
 * - `profile` — her card exactly as the website shows it (city and country, age, height, weight,
 *   body shape, measurements, introduction, rate per photograph, portfolio size);
 * - `biography` — the details of her fictional NeverBeen life (birth details, family, studies,
 *   career, achievements, hobbies, interests, ambitions, quotes and memories).
 *
 * The AI Chat sends it to the backend (`POST /neverbeen-api/api/ai-chat`) with every message,
 * together with the visitor's words and her character database (`characterdatabase.json`): the
 * character database says how she talks, this file says who she is.
 *
 * Loading never fails. A missing or unreadable file is replaced by the same two blocks built from
 * the profile the website already carries (`biographyFromProfile`), so every turn still travels
 * with her biography. The editor's `_doc` notes are dropped before anything is sent, and
 * `meta.model` is always stamped from the profile that was handed in, so the file can never speak
 * for another model.
 */
import type { AiModelProfile } from '../ai-model-data';
import { stripAnnotationKeys } from './character-database';

/** Who the file belongs to. */
export interface ModelBiographyMeta {
  schemaVersion: string;
  id: string;
  model: { name: string; handle: string; slug: string; album: string };
  fictional: boolean;
  /** `Biography/biography.json`, `generated-for-live-chat`, or `website-profile` (the fallback). */
  biographySource: string;
  /** The profile wins wherever the profile and the biography disagree. */
  conflictRule: 'profile-wins';
  [key: string]: unknown;
}

/** The whole biography file, as the chat sends it. */
export interface ModelBiographyFile {
  meta: ModelBiographyMeta;
  /** Her card, as the website shows it. */
  profile: Record<string, unknown>;
  /** The details of her fictional life; `null` only when no biography exists anywhere. */
  biography: Record<string, unknown> | null;
}

/** The parts of the profile the biography file needs. */
export type BiographyModel = Pick<
  AiModelProfile,
  | 'album'
  | 'name'
  | 'handle'
  | 'slug'
  | 'location'
  | 'age'
  | 'height'
  | 'weight'
  | 'bodyShape'
  | 'bust'
  | 'waist'
  | 'hip'
  | 'bio'
  | 'tags'
  | 'availability'
  | 'photoRate'
  | 'photoNote'
  | 'illustrative'
  | 'photos'
  | 'videos'
> &
  Partial<Pick<AiModelProfile, 'biography' | 'portfolio'>>;

/** Anything shaped enough to stand in for the network fetch — the specs hand in a stub. */
export type ModelBiographyFetcher = (
  url: string,
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

const defaultFetcher: ModelBiographyFetcher = async (url) => {
  const response = await fetch(url);
  return { ok: response.ok, json: () => response.json() as Promise<unknown> };
};

/** Where a model's biography file lives, relative to the site root. */
export function modelBiographyUrl(album: string): string {
  const folder = album.split('/').map(encodeURIComponent).join('/');
  return `/NeverBeenModels/${folder}/personality/biography.json`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Drops every empty string, empty list and empty object, as the generator script does. */
function compact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(compact).filter((entry) => entry !== undefined);
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      const cleaned = compact(entry);
      if (cleaned === undefined || cleaned === '') continue;
      result[key] = cleaned;
    }
    return result;
  }
  return value === null ? undefined : value;
}

/**
 * The fallback: the same two blocks, built from the profile the website already carries — used
 * when the file is missing or unreadable, so a turn never travels without her biography.
 */
export function biographyFromProfile(model: BiographyModel): ModelBiographyFile {
  const [city = '', ...rest] = model.location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const profile = compact({
    name: model.name,
    handle: model.handle,
    slug: model.slug,
    album: model.album,
    location: model.location,
    city,
    country: rest.join(', '),
    age: model.age,
    height: model.height,
    weight: model.weight,
    bodyShape: model.bodyShape,
    measurements: { bust: model.bust, waist: model.waist, hip: model.hip },
    introduction: model.bio.replace(/^[“"]+|[”"]+$/g, '').trim(),
    tags: model.tags,
    availability: model.availability,
    rate:
      model.photoRate > 0
        ? {
            amount: model.photoRate,
            currency: 'INR',
            unit: 'per photograph',
            note: model.photoNote,
          }
        : undefined,
    portfolio: {
      photographs: model.photos.length,
      videos: model.videos.length,
      portfolioDocument: model.portfolio
        ? { fileName: model.portfolio.fileName, pages: model.portfolio.pages }
        : undefined,
    },
    profilePage: `/ai-models/${model.slug}`,
    illustrative: model.illustrative,
  }) as Record<string, unknown>;

  let biography: Record<string, unknown> | null = null;
  if (model.biography) {
    const {
      version: _version,
      generatedAt: _generatedAt,
      name: _name,
      signature: _signature,
      signatureStyle: _signatureStyle,
      signatureImage: _signatureImage,
      memories,
      ...story
    } = model.biography;
    biography = compact({
      ...story,
      memories: memories.map((memory) => ({
        id: memory.id,
        period: memory.period,
        timestamp: memory.timestamp,
        caption: memory.caption,
      })),
    }) as Record<string, unknown>;
  }

  return {
    meta: {
      schemaVersion: '1.0',
      id: `${model.slug}-biography`,
      model: { name: model.name, handle: model.handle, slug: model.slug, album: model.album },
      fictional: true,
      biographySource: 'website-profile',
      conflictRule: 'profile-wins',
    },
    profile,
    biography,
  };
}

/**
 * Turns whatever the album's file held into a `ModelBiographyFile`, or `null` when it is not one
 * (no `profile` block). The editor's `_doc` notes are dropped at every depth.
 */
export function normalizeModelBiography(
  raw: unknown,
  model: BiographyModel,
): ModelBiographyFile | null {
  const cleaned = stripAnnotationKeys(raw);
  if (!isPlainObject(cleaned) || !isPlainObject(cleaned['profile'])) return null;
  const meta = isPlainObject(cleaned['meta']) ? cleaned['meta'] : {};
  return {
    meta: {
      ...meta,
      schemaVersion: typeof meta['schemaVersion'] === 'string' ? meta['schemaVersion'] : '1.0',
      id: typeof meta['id'] === 'string' ? meta['id'] : `${model.slug}-biography`,
      // The file always speaks for the model it was loaded for.
      model: { name: model.name, handle: model.handle, slug: model.slug, album: model.album },
      fictional: true,
      biographySource:
        typeof meta['biographySource'] === 'string' ? meta['biographySource'] : 'unknown',
      conflictRule: 'profile-wins',
    },
    profile: cleaned['profile'],
    biography: isPlainObject(cleaned['biography']) ? cleaned['biography'] : null,
  };
}

const cache = new Map<string, Promise<ModelBiographyFile>>();

/** Forgets every loaded biography — the specs, and a studio tool that rewrites the files. */
export function clearModelBiographyCache(): void {
  cache.clear();
}

/**
 * The model's biography file, loaded from her album's `personality/biography.json` and cached per
 * album. A missing or broken file is never an error: the profile the website carries stands in.
 */
export function loadModelBiography(
  model: BiographyModel,
  fetcher: ModelBiographyFetcher = defaultFetcher,
): Promise<ModelBiographyFile> {
  const cached = cache.get(model.album);
  if (cached) return cached;

  const pending = (async (): Promise<ModelBiographyFile> => {
    try {
      const response = await fetcher(modelBiographyUrl(model.album));
      if (response.ok) {
        const loaded = normalizeModelBiography(await response.json(), model);
        if (loaded) return loaded;
      }
    } catch {
      // Offline or unreadable: the profile below answers instead.
    }
    return biographyFromProfile(model);
  })();

  cache.set(model.album, pending);
  return pending;
}
