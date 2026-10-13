import { describe, expect, it } from 'vitest';
import { photoFactsFromPixels, photoObservation } from './chat-photo';

/** RGBA pixels, the way `getImageData` hands them over. */
function pixels(colours: readonly (readonly number[])[]): number[] {
  return colours.flatMap(([red, green, blue]) => [red, green, blue, 255]);
}

describe('readChatPhotoFacts', () => {
  it('reads the frame the visitor sent the way a person looks at a photograph (requirement F)', () => {
    const portrait = photoFactsFromPixels(pixels([[200, 170, 140]]), 1, 1);
    expect(portrait.orientation).toBe('square');
    expect(portrait.dominant).toBe('warm brown');
    expect(portrait.warmth).toBeGreaterThan(0);
    expect(portrait.brightness).toBeGreaterThan(0.5);
    // A face-toned frame: she can tell there is a person in it.
    expect(portrait.skin).toBeGreaterThan(0);
  });

  it('knows a dark picture, a bright one and a colourful one apart', () => {
    const night = photoFactsFromPixels(pixels([[10, 10, 12]]), 1, 2);
    expect(night.brightness).toBeLessThan(0.12);
    expect(night.dominant).toBe('near-black');
    expect(night.orientation).toBe('portrait');

    const daylight = photoFactsFromPixels(pixels([[240, 242, 244]]), 2, 1);
    expect(daylight.brightness).toBeGreaterThan(0.9);
    expect(daylight.dominant).toBe('near-white');
    expect(daylight.orientation).toBe('landscape');

    const sea = photoFactsFromPixels(pixels([[30, 80, 200]]), 3, 1);
    expect(sea.dominant).toBe('blue');
    expect(sea.saturation).toBeGreaterThan(0.5);
    expect(sea.warmth).toBeLessThan(0);
  });
});

describe('photoObservation', () => {
  it('writes what she can see in it, in her own voice, and never twice the same way', () => {
    const facts = photoFactsFromPixels(pixels([[200, 170, 140]]), 1, 2);
    const observation = photoObservation(facts, { name: 'Rahul', seed: 'alisha|1|photo' });

    expect(photoObservation(facts, { name: 'Rahul', seed: 'alisha|1|photo' })).toBe(observation);
    expect(observation.length).toBeGreaterThan(30);
    expect(observation).toMatch(/you|your/i);

    const night = photoFactsFromPixels(pixels([[10, 10, 12]]), 1, 2);
    const dark = photoObservation(night, { name: 'Rahul', seed: 'alisha|2|photo' });
    expect(dark).not.toBe(observation);
    expect(dark.toLowerCase()).toMatch(/dark|black/);
  });

  it('keeps it kind when the picture is a hard one to look at', () => {
    const facts = photoFactsFromPixels(pixels([[10, 10, 12]]), 1, 2);
    const soft = photoObservation(facts, { name: 'Rahul', seed: 'alisha|3', soft: true });
    expect(soft.length).toBeGreaterThan(20);
    expect(soft).not.toMatch(/terrible|awful|ugly/i);
  });
});
