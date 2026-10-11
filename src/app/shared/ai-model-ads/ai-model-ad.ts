/**
 * The data behind the NeverBeen AI Models advertisement — the sponsored rail panel on the
 * Community Home page and the sponsored cards that rotate through the Journey feed.
 *
 * Both advertisements sell the model portfolios published on `/ai-models`, so every value shown
 * here comes from the same generated catalog (`ai-model-data.ts`) the studio page uses: the
 * portrait, the name, the city/country and the availability note. Only the *selection* is random,
 * and it is drawn from a seeded generator so a card keeps the same model and the same photographs
 * for the whole visit instead of changing on every change-detection pass.
 */
import { AiModelProfile } from '../../pages/ai-models/ai-model-data';

export type AiModelAvailabilityState = 'available' | 'unavailable' | 'future';

/** Availability note of a model, in the three states the studio directory filters by. */
export interface AiModelAvailability {
  state: AiModelAvailabilityState;
  /** Full label shown on the advertisement card, e.g. "Available for Contract". */
  label: string;
  /** Compact label for the tight right-rail cards, e.g. "Available". */
  short: string;
}

/** One model prepared for advertising: everything a sponsored card renders. */
export interface AiModelAd {
  slug: string;
  name: string;
  handle: string;
  /** City as published on the model's portfolio header. */
  city: string;
  /** Country as published on the model's portfolio header. */
  country: string;
  /** "City, Country" exactly as the studio directory prints it. */
  location: string;
  /** Portfolio profile photograph (the model's cover). */
  photo: string;
  /**
   * Album photographs for the Journey advertisement: four when her folder holds four or more,
   * otherwise the single photograph she has (never an empty slot).
   */
  photos: string[];
  availability: AiModelAvailability;
}

const UNAVAILABLE_NOTE = /unavailable|fully booked|not accepting/;
const FUTURE_NOTE = /future|looking for|coming soon/;

/**
 * Maps the portfolio's free-form availability note onto the three states the advertisement
 * shows. Anything that is not explicitly unavailable or future-facing counts as available,
 * matching the studio directory's own reading of an open note.
 */
export function availabilityOf(model: AiModelProfile): AiModelAvailability {
  const note = (model.availability || '').trim().toLocaleLowerCase();
  if (UNAVAILABLE_NOTE.test(note)) {
    return { state: 'unavailable', label: 'Currently Unavailable', short: 'Unavailable' };
  }
  if (FUTURE_NOTE.test(note)) {
    return { state: 'future', label: 'Looking for Future Contract', short: 'Future contract' };
  }
  return { state: 'available', label: 'Available for Contract', short: 'Available' };
}

/** Splits the published "City, Country" location into the two lines the cards show. */
export function splitLocation(location: string): { city: string; country: string } {
  const trimmed = (location || '').trim();
  const comma = trimmed.indexOf(',');
  if (comma === -1) return { city: trimmed, country: '' };
  return { city: trimmed.slice(0, comma).trim(), country: trimmed.slice(comma + 1).trim() };
}

/** mulberry32 — a small deterministic generator so a visit's arrangement can be replayed. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mixes integer parts into one seed (FNV-style), so slots never repeat in lockstep. */
export function hashSeed(...parts: number[]): number {
  let hash = 0x811c9dc5;
  for (const part of parts) {
    hash ^= Math.trunc(part) & 0xffffffff;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** A fresh copy shuffled with `random` (Fisher–Yates). */
export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function albumPhotos(model: AiModelProfile): string[] {
  const album = (model.photos ?? [])
    .map((photo) => photo.src)
    .filter((src): src is string => !!src);
  const portrait = model.cover || album[0] || '';
  if (!portrait) return album.slice(0, 4);
  // The cover is the portfolio portrait; album frames follow it, de-duplicated.
  return [portrait, ...album.filter((src) => src !== portrait)];
}

/**
 * The photographs the Journey advertisement puts in its mosaic: four random frames from the
 * model's own folder when the folder holds four or more, otherwise the single frame she has.
 */
export function advertisementPhotos(model: AiModelProfile, random: () => number): string[] {
  const album = albumPhotos(model);
  if (album.length >= 4) return shuffled(album, random).slice(0, 4);
  return album.length ? [album[0]] : [];
}

/** Prepares one catalog profile for the advertisement surfaces. */
export function toAdvertisement(model: AiModelProfile, random: () => number): AiModelAd {
  const { city, country } = splitLocation(model.location);
  return {
    slug: model.slug,
    name: model.name,
    handle: model.handle,
    city,
    country,
    location: model.location,
    photo: model.cover || model.photos?.[0]?.src || '',
    photos: advertisementPhotos(model, random),
    availability: availabilityOf(model),
  };
}

/**
 * Picks `count` distinct models for one advertisement surface. The roster is shuffled and then
 * repeated (reshuffled every pass) when more slots than models are asked for, so a surface never
 * shows the same face twice while every model in the studio stays in the advertising pool.
 */
export function pickAdModels(
  models: readonly AiModelProfile[],
  count: number,
  random: () => number,
): AiModelProfile[] {
  if (models.length === 0 || count <= 0) return [];
  const picked: AiModelProfile[] = [];
  while (picked.length < count) {
    for (const model of shuffled(models, random)) {
      if (picked.length >= count) break;
      picked.push(model);
    }
    if (models.length === 1) break;
  }
  return picked;
}
