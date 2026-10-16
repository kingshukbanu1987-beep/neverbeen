import { AiModelPhoto } from '../ai-model-data';

/** Defence in depth: preview never accepts premium paths, even from a misconfigured caller. */
export function publicPreviewPhotos(photos: readonly AiModelPhoto[]): AiModelPhoto[] {
  const unique = new Map<string, AiModelPhoto>();
  for (const photo of photos) {
    let path: string;
    try {
      path = decodeURIComponent(photo.src.split(/[?#]/)[0]);
    } catch {
      continue;
    }
    if (!photo.src || /(?:^|\/)premiumcontent(?:\/|$)/i.test(path)) continue;
    if (!unique.has(photo.src)) unique.set(photo.src, photo);
  }
  return [...unique.values()];
}

/** Fisher–Yates: exhaust a complete round before drawing another; avoid a boundary repeat. */
export function previewRound(photos: readonly AiModelPhoto[], previousSrc = ''): AiModelPhoto[] {
  const round = [...photos];
  for (let i = round.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [round[i], round[j]] = [round[j], round[i]];
  }
  if (round.length > 1 && round[0].src === previousSrc) {
    const j = 1 + Math.floor(Math.random() * (round.length - 1));
    [round[0], round[j]] = [round[j], round[0]];
  }
  return round;
}
