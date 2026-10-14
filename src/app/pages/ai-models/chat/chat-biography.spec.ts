import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiModelProfiles } from '../ai-model-data';
import {
  biographyFromProfile,
  clearModelBiographyCache,
  loadModelBiography,
  modelBiographyUrl,
  normalizeModelBiography,
} from './chat-biography';

const alisha = aiModelProfiles.find((model) => model.slug === 'alisha-bhattacharya')!;

/** A biography file shaped like the ones `PersonalityBiographyScript.mjs` writes. */
const FILE = {
  meta: {
    _doc: 'editor notes are never sent',
    schemaVersion: '1.0',
    id: 'alisha-bhattacharya-biography',
    model: { name: 'Someone Else', handle: '@else', slug: 'someone-else', album: 'Else' },
    biographySource: 'Biography/biography.json',
    conflictRule: 'profile-wins',
  },
  profile: {
    _doc: 'her card',
    name: 'Alisha Bhattacharya',
    city: 'Darjeeling',
    country: 'India',
    age: '25',
    measurements: { bust: '84 cm', waist: '63 cm', hip: '90 cm' },
  },
  biography: {
    _doc: 'her life',
    summary: 'A fictional NeverBeen life.',
    personalLife: { relationshipStatus: 'Single', parents: [{ name: 'Mira Bhattacharya' }] },
  },
};

/** A fetch stub that answers with `payload` (or a 404 when it is `null`). */
function fetcherFor(payload: unknown) {
  return vi.fn(async () => ({ ok: payload !== null, json: async () => payload }));
}

describe('the model biography file for Live Chat', () => {
  beforeEach(() => clearModelBiographyCache());

  it('lives in the personality folder of the model album, next to the character database', () => {
    expect(modelBiographyUrl('AlishaBhattacharya')).toBe(
      '/NeverBeenModels/AlishaBhattacharya/personality/biography.json',
    );
    expect(modelBiographyUrl("Shirina O'Brien")).toBe(
      "/NeverBeenModels/Shirina%20O'Brien/personality/biography.json",
    );
  });

  it('loads her profile and her biography, without the editor notes', async () => {
    const fetcher = fetcherFor(FILE);
    const file = await loadModelBiography(alisha, fetcher);

    expect(fetcher).toHaveBeenCalledWith(
      '/NeverBeenModels/AlishaBhattacharya/personality/biography.json',
    );
    expect(file.profile['city']).toBe('Darjeeling');
    expect(file.profile['measurements']).toEqual({ bust: '84 cm', waist: '63 cm', hip: '90 cm' });
    expect(file.biography?.['summary']).toBe('A fictional NeverBeen life.');
    expect(JSON.stringify(file)).not.toContain('_doc');
    expect(file.meta.biographySource).toBe('Biography/biography.json');
  });

  it('always speaks for the model it was loaded for', async () => {
    const file = await loadModelBiography(alisha, fetcherFor(FILE));
    expect(file.meta.model).toEqual({
      name: alisha.name,
      handle: alisha.handle,
      slug: alisha.slug,
      album: alisha.album,
    });
    expect(file.meta.conflictRule).toBe('profile-wins');
  });

  it('loads each album once and then answers from memory', async () => {
    const fetcher = fetcherFor(FILE);
    await loadModelBiography(alisha, fetcher);
    await loadModelBiography(alisha, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rebuilds the file from her website profile when it is missing', async () => {
    const file = await loadModelBiography(alisha, fetcherFor(null));

    expect(file.meta.biographySource).toBe('website-profile');
    expect(file.profile['name']).toBe(alisha.name);
    expect(file.profile['age']).toBe(alisha.age);
    expect(file.profile['city']).toBe('Darjeeling');
    expect(file.profile['country']).toBe('India');
    expect(file.profile['introduction']).not.toMatch(/^[“"]/);
    // Alisha has a written biography on the website, so it travels too.
    expect(file.biography?.['summary']).toBe(alisha.biography!.summary);
    expect(JSON.stringify(file.biography)).not.toContain('signatureStyle');
  });

  it('rebuilds the file when it cannot be read or is not a biography file', async () => {
    const broken = vi.fn(async () => {
      throw new Error('offline');
    });
    expect((await loadModelBiography(alisha, broken)).meta.biographySource).toBe('website-profile');

    clearModelBiographyCache();
    expect(
      (await loadModelBiography(alisha, fetcherFor({ hello: 'world' }))).meta.biographySource,
    ).toBe('website-profile');
    expect(normalizeModelBiography(['not', 'an', 'object'], alisha)).toBeNull();
  });

  it('keeps a model without a written biography speaking from her profile', () => {
    const withoutStory = { ...alisha, biography: null };
    const file = biographyFromProfile(withoutStory);
    expect(file.biography).toBeNull();
    expect(file.profile['rate']).toEqual({
      amount: alisha.photoRate,
      currency: 'INR',
      unit: 'per photograph',
      note: alisha.photoNote,
    });
  });
});
