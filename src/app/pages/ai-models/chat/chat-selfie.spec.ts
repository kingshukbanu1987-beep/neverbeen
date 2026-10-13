import { describe, expect, it } from 'vitest';
import { aiModelProfiles } from '../ai-model-data';
import {
  SELFIE_REQUEST_PATTERN,
  VIDEO_REQUEST_PATTERN,
  pickChatSelfie,
  selfieCaption,
} from './chat-selfie';

const alisha = aiModelProfiles.find((model) => model.slug === 'alisha-bhattacharya')!;

describe('pickChatSelfie', () => {
  it('sends one of her own frames, taken on a phone, flaws and all (requirement E)', () => {
    const seed = 'alisha|selfie';
    const shot = pickChatSelfie(alisha, seed)!;

    expect(shot).not.toBeNull();
    expect(alisha.photos.map((photo) => photo.src)).toContain(shot.photo);
    // She does not change her mind about what she just sent.
    expect(pickChatSelfie(alisha, seed)!.photo).toBe(shot.photo);
    // A moment and a flaw, because it is a phone photograph and not a studio one.
    expect(shot.place.length).toBeGreaterThan(5);
    expect(shot.flaw.length).toBeGreaterThan(5);
    expect(`${shot.place} ${shot.flaw}`).toMatch(
      /light|lamp|dark|blur|crooked|grain|angle|makeup|hair|squint|shadow|café|lift|kitchen|balcony|room|roof|window|car|stairs/i,
    );
  });

  it('never sends the same frame twice in one session', () => {
    const first = pickChatSelfie(alisha, 'alisha|selfie|1')!;
    const second = pickChatSelfie(alisha, 'alisha|selfie|2', [first.photo])!;

    expect(second.photo).not.toBe(first.photo);
  });
});

describe('selfieCaption', () => {
  it('says where and how it was taken, and uses the visitor’s first name', () => {
    const seed = 'alisha|selfie';
    const shot = pickChatSelfie(alisha, seed)!;
    const caption = selfieCaption(alisha, shot, seed, 'Rahul');

    expect(caption).toContain('Rahul');
    expect(caption).toContain(shot.place);
    expect(caption).toContain(shot.flaw);
    expect(caption).toMatch(/minute ago|just now|🙈/);
  });
});

describe('the request patterns', () => {
  it('hears a selfie request and a video request, and leaves an ordinary question alone', () => {
    expect(SELFIE_REQUEST_PATTERN.test('send me a selfie')).toBe(true);
    expect(SELFIE_REQUEST_PATTERN.test('can I see your photos?')).toBe(true);
    expect(SELFIE_REQUEST_PATTERN.test('show me yourself')).toBe(true);
    expect(SELFIE_REQUEST_PATTERN.test('what is your rate per photograph?')).toBe(false);

    expect(VIDEO_REQUEST_PATTERN.test('send me a video')).toBe(true);
    expect(VIDEO_REQUEST_PATTERN.test('do you have any reels?')).toBe(true);
    expect(VIDEO_REQUEST_PATTERN.test('your videos please')).toBe(true);
    expect(VIDEO_REQUEST_PATTERN.test('I like your portraits')).toBe(false);
  });
});
