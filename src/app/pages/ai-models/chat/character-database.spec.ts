import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  JOYFUL_CHARACTER_DATABASE,
  CharacterDatabase,
  adultChatAllowed,
  characterDatabaseUrl,
  clearCharacterDatabaseCache,
  explicitSexChatAllowed,
  loadCharacterDatabase,
  mergeCharacterDatabase,
  normalizeCharacterDatabase,
  sexChatToEndAllowed,
  strikesFor,
  stripAnnotationKeys,
  suggestiveBanterAllowed,
} from './character-database';

const alisha = {
  album: 'AlishaBhattacharya',
  name: 'Alisha Bhattacharya',
  handle: '@alisha.bhattacharya',
  slug: 'alisha-bhattacharya',
};

/** A fetch stub that answers with `payload` (or a 404 when it is `null`). */
function fetcherFor(payload: unknown) {
  return vi.fn(async () => ({
    ok: payload !== null,
    json: async () => payload,
  }));
}

describe('the model character database', () => {
  beforeEach(() => clearCharacterDatabaseCache());

  it('points at the personality folder inside the model album', () => {
    expect(characterDatabaseUrl('AlishaBhattacharya')).toBe(
      '/NeverBeenModels/AlishaBhattacharya/personality/characterdatabase.json',
    );
    expect(characterDatabaseUrl("Shirina O'Brien Album")).toBe(
      "/NeverBeenModels/Shirina%20O'Brien%20Album/personality/characterdatabase.json",
    );
  });

  it('strips the editor annotations but keeps every real value', () => {
    const stripped = stripAnnotationKeys({
      _doc: 'a note',
      meta: { _doc: 'another note', schemaVersion: '1.0' },
      list: [{ _modeOptions: 'a | b', mode: 'few-sentences' }],
    }) as any;
    expect(stripped).toEqual({
      meta: { schemaVersion: '1.0' },
      list: [{ mode: 'few-sentences' }],
    });
  });

  it('deep-merges a partial album file over the built-in default', () => {
    const merged = mergeCharacterDatabase(
      { a: { b: 1, c: 2 }, list: [1, 2, 3], keep: 'yes' },
      { a: { c: 9 }, list: [7] },
    );
    expect(merged).toEqual({ a: { b: 1, c: 9 }, list: [7], keep: 'yes' });
  });

  it('treats an explicit null as a value of its own', () => {
    const merged = mergeCharacterDatabase({ interjection: 'achha' }, { interjection: null });
    expect(merged.interjection).toBeNull();
  });

  it('completes a broken or missing file with the joyful default', () => {
    const fromNull = normalizeCharacterDatabase(null);
    expect(fromNull.adultContentPolicy.adultChatEnabled).toBe(false);
    expect(fromNull.corePersonality.traits.cheerfulness).toBe(0.95);
    expect(fromNull.hardLimits.absolute).toBe(true);
  });

  it('falls back to the built-in default when the album file is not there', async () => {
    const fetcher = fetcherFor(null);
    const database = await loadCharacterDatabase(alisha, fetcher);
    expect(fetcher).toHaveBeenCalledWith(characterDatabaseUrl(alisha.album));
    expect(database.meta.personaTemplate).toBe('generic-joyful');
    expect(database.meta.model).toEqual({ ...alisha });
  });

  it('stamps meta.model from the profile even when the file names someone else', async () => {
    const fetcher = fetcherFor({
      meta: { model: { name: 'Somebody Else', album: 'WrongAlbum' } },
    });
    const database = await loadCharacterDatabase(alisha, fetcher);
    expect(database.meta.model).toEqual({ ...alisha });
  });

  it('loads a per-model edit and caches it per album', async () => {
    const fetcher = fetcherFor({
      meta: { personaName: 'Midnight Tease' },
      adultContentPolicy: { adultChatEnabled: true, explicitSexChatAllowed: true },
    });
    const first = await loadCharacterDatabase(alisha, fetcher);
    const second = await loadCharacterDatabase(alisha, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(first.meta.personaName).toBe('Midnight Tease');
    // untouched sections still come from the joyful default
    expect(first.communicationStyle.emojiUsage.perMessageRate).toBe(
      JOYFUL_CHARACTER_DATABASE.communicationStyle.emojiUsage.perMessageRate,
    );
  });

  describe('the rule engine reads', () => {
    it('keeps the generic ban while adult chat is disabled', () => {
      const database: CharacterDatabase = normalizeCharacterDatabase(null);
      expect(adultChatAllowed(database)).toBe(false);
      expect(explicitSexChatAllowed(database)).toBe(false);
      expect(sexChatToEndAllowed(database)).toBe(false);
      expect(suggestiveBanterAllowed(database)).toBe(true);
      expect(strikesFor(database, 'explicit-sexual')).toBe(2);
      expect(strikesFor(database, 'suggestive')).toBe(0);
      expect(strikesFor(database, 'flirting')).toBe(0);
    });

    it('lifts the ban when the character database enables adult chat', () => {
      const database: CharacterDatabase = normalizeCharacterDatabase({
        adultContentPolicy: {
          adultChatEnabled: true,
          explicitSexChatAllowed: true,
          canContinueSexChatToEnd: true,
          respondsToOrgasmChat: true,
        },
      });
      expect(adultChatAllowed(database)).toBe(true);
      expect(explicitSexChatAllowed(database)).toBe(true);
      expect(sexChatToEndAllowed(database)).toBe(true);
      expect(strikesFor(database, 'explicit-sexual')).toBe(0);
    });

    it('needs every flag for the sex chat to run to its end', () => {
      const database: CharacterDatabase = normalizeCharacterDatabase({
        adultContentPolicy: { adultChatEnabled: true, explicitSexChatAllowed: true },
      });
      expect(explicitSexChatAllowed(database)).toBe(true);
      expect(sexChatToEndAllowed(database)).toBe(false);
    });

    it('never lets a persona edit disable or shrink the hard limits', () => {
      const database: CharacterDatabase = normalizeCharacterDatabase({
        hardLimits: { absolute: false, neverAllowed: ['one extra studio rule'] },
      });
      expect(database.hardLimits.absolute).toBe(true);
      expect(database.hardLimits.neverAllowed).toContain('one extra studio rule');
      for (const floor of JOYFUL_CHARACTER_DATABASE.hardLimits.neverAllowed) {
        expect(database.hardLimits.neverAllowed, floor).toContain(floor);
      }
    });
  });
});
