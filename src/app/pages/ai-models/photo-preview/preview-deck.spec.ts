import { AiModelPhoto } from '../ai-model-data';
import { previewRound, publicPreviewPhotos } from './preview-deck';

const photos: AiModelPhoto[] = Array.from({ length: 40 }, (_, i) => ({
  src: `/NeverBeenModels/Test/frame-${i}.jpg`,
  caption: '',
}));

describe('cinematic preview deck', () => {
  it('includes each photograph exactly once in every complete shuffled round', () => {
    let previous = '';
    for (let i = 0; i < 100; i++) {
      const round = previewRound(photos, previous);
      expect(round).toHaveLength(photos.length);
      expect(new Set(round.map((p) => p.src)).size).toBe(photos.length);
      expect([...round].sort((a, b) => a.src.localeCompare(b.src))).toEqual(
        [...photos].sort((a, b) => a.src.localeCompare(b.src)),
      );
      expect(round[0].src).not.toBe(previous);
      previous = round.at(-1)!.src;
    }
    expect(photos[0].src).toContain('frame-0');
  });

  it('handles one-photo and empty albums', () => {
    expect(previewRound([])).toEqual([]);
    expect(previewRound([photos[0]], photos[0].src)).toEqual([photos[0]]);
  });

  it('filters premium paths (also encoded and nested), invalid URLs, and duplicate photos', () => {
    const pool = publicPreviewPhotos([
      photos[0],
      photos[0],
      photos[1],
      { src: '/NeverBeenModels/Test/PremiumContent/private.jpg', caption: '' },
      { src: '/NeverBeenModels/Test/sets/premiumcontent/private.jpg', caption: '' },
      { src: '/NeverBeenModels/Test/%50remiumContent/private.jpg', caption: '' },
      { src: '/NeverBeenModels/Test/%broken.jpg', caption: '' },
      { src: '', caption: '' },
    ]);
    expect(pool).toEqual(photos.slice(0, 2));
  });
});
