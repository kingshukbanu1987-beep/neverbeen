/**
 * F — the model looks at the photograph the visitor sends her.
 *
 * The window cannot borrow the studio's vision model for a picture that never leaves the browser,
 * so it reads the photograph itself: the shape of the frame, how much light there was, how warm or
 * cold it is, what colour it is mostly made of, and whether a person is actually in it. Those five
 * facts are enough for her to answer like somebody who has seen the picture — "that came out dark,
 * I can barely make you out" — instead of thanking them for a file.
 *
 * When the studio *does* have its OpenAI key, the same picture is sent to the endpoint as well and
 * the real vision model describes it; this analysis is the answer that always works.
 */
import { seededPick } from './chat-random';

export interface ChatPhotoFacts {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape' | 'square';
  /** Average luminance, 0 (black) … 1 (white). */
  brightness: number;
  /** How colourful the frame is, 0 (grey) … 1 (vivid). */
  saturation: number;
  /** -1 (cold blue) … 1 (warm orange). */
  warmth: number;
  /** The colour the frame is mostly made of, in a word. */
  dominant: string;
  /** Share of skin-toned pixels — a rough "is there a person in this frame". */
  skin: number;
}

const SKIN_LOW = 0.06;
const SKIN_HIGH = 0.2;

function orientationOf(width: number, height: number): ChatPhotoFacts['orientation'] {
  if (width === height) return 'square';
  return height > width ? 'portrait' : 'landscape';
}

/** The colour word for an average RGB triple. */
function colourName(red: number, green: number, blue: number): string {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const chroma = max - min;

  if (max < 46) return 'near-black';
  if (min > 214 && chroma < 26) return 'near-white';
  if (chroma < 22) return max > 140 ? 'soft grey' : 'grey';
  if (red >= green && green >= blue) {
    if (red - blue < 40) return 'warm brown';
    return red > 150 && green > 110 && blue < 90 ? 'sunset orange' : 'warm brown';
  }
  if (blue >= green && green >= red) return blue - red > 45 ? 'blue' : 'cool grey';
  if (green >= red && green >= blue) return 'green';
  if (red >= blue && blue >= green) return 'purple';
  return 'pink';
}

/** The statistics of one drawn photograph, from its pixels. Pure, so it can be tested. */
export function photoFactsFromPixels(
  pixels: ArrayLike<number>,
  width: number,
  height: number,
): ChatPhotoFacts {
  let red = 0;
  let green = 0;
  let blue = 0;
  let luminance = 0;
  let saturation = 0;
  let skin = 0;
  const total = Math.max(1, Math.floor(pixels.length / 4));

  for (let index = 0; index < total; index += 1) {
    const r = pixels[index * 4] ?? 0;
    const g = pixels[index * 4 + 1] ?? 0;
    const b = pixels[index * 4 + 2] ?? 0;
    red += r;
    green += g;
    blue += b;
    luminance += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    saturation += max === 0 ? 0 : (max - min) / max;

    if (r > 95 && g > 40 && b > 20 && max - min > 15 && Math.abs(r - g) > 15 && r > g && r > b) {
      skin += 1;
    }
  }

  const averageRed = red / total;
  const averageGreen = green / total;
  const averageBlue = blue / total;

  return {
    width,
    height,
    orientation: orientationOf(width, height),
    brightness: luminance / total,
    saturation: saturation / total,
    warmth: (averageRed - averageBlue) / 255,
    dominant: colourName(averageRed, averageGreen, averageBlue),
    skin: skin / total,
  };
}

/**
 * Reads the facts of a picture the visitor attached. Returns `null` when the picture cannot be
 * drawn — a document, a browser without a canvas, or an image that never loads — and the answer
 * then stays the honest "I have it, tell me about it" one.
 */
export async function readChatPhotoFacts(dataUrl: string): Promise<ChatPhotoFacts | null> {
  if (!dataUrl || typeof document === 'undefined') return null;

  try {
    const image = await loadImage(dataUrl);
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    if (!Number.isFinite(longestSide) || longestSide <= 0) return null;

    const scale = Math.min(1, 96 / longestSide);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return null;

    context.drawImage(image, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    return photoFactsFromPixels(data, image.naturalWidth, image.naturalHeight);
  } catch {
    return null;
  }
}

/** How long a picture is given to load before she answers without it. */
const PHOTO_LOAD_MS = 1_500;

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const giveUp = setTimeout(() => reject(new Error('picture never loaded')), PHOTO_LOAD_MS);
    image.onload = () => {
      clearTimeout(giveUp);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(giveUp);
      reject(new Error('unreadable picture'));
    };
    image.src = dataUrl;
  });
}

/**
 * What she says about the photograph, in her own voice: what she can see in it, what she likes
 * about it, and one thing she wants to know.
 */
export function photoObservation(
  facts: ChatPhotoFacts,
  options: { name: string; seed: string; soft?: boolean },
): string {
  const { name, seed } = options;
  const observations: string[] = [];

  if (facts.brightness < 0.26) {
    observations.push(
      seededPick(
        [
          'That came out really dark — I can just about make you out.',
          'It is almost black in that one, so I am mostly guessing where you are.',
        ],
        `${seed}|dark`,
      ),
    );
  } else if (facts.brightness > 0.78) {
    observations.push(
      seededPick(
        [
          'The light in that one is beautiful — you are glowing, and I am a little jealous.',
          'That is a bright, honest photograph. Whatever you were standing in, keep going back there.',
        ],
        `${seed}|bright`,
      ),
    );
  }

  if (facts.orientation === 'portrait') {
    observations.push(
      seededPick(
        [
          'Phone held up over your head too — very flattering angle, we all do it.',
          'A vertical one. You know what you are doing.',
        ],
        `${seed}|portrait`,
      ),
    );
  } else if (facts.orientation === 'landscape') {
    observations.push(
      seededPick(
        [
          'I like that you did not pose for it.',
          'Wide frame, so there is more world in it than you.',
        ],
        `${seed}|landscape`,
      ),
    );
  }

  if (facts.skin > SKIN_HIGH) {
    observations.push(
      seededPick(
        [
          'And yes, you are properly in the frame — good, I wanted to see you.',
          'Close to the camera. Bold, I like it.',
        ],
        `${seed}|skin-high`,
      ),
    );
  } else if (facts.skin <= SKIN_LOW) {
    observations.push(
      seededPick(
        [
          'No face in it, so this must be the view rather than you.',
          'You are not in that one at all, are you.',
        ],
        `${seed}|skin-low`,
      ),
    );
  }

  if (facts.saturation < 0.12) {
    observations.push('It is almost black and white — very moody of you.');
  } else if (facts.saturation > 0.55) {
    observations.push(`So much colour in it. That ${facts.dominant} is doing all the work.`);
  } else if (/green|blue/.test(facts.dominant)) {
    observations.push(`The whole frame is ${facts.dominant} — were you outside when you took it?`);
  } else if (/warm|orange/.test(facts.dominant)) {
    observations.push('Everything in it is warm — evening light, or a room with a lamp.');
  }

  const lead = observations.length > 0 ? observations.join(' ') : 'I looked at it properly.';
  const address = name && facts.skin > SKIN_HIGH ? ` ${name},` : '';
  return `${lead}${address} ${photoQuestion(seed)}`;
}

/** The one thing she wants to know about a picture the visitor sent, whoever described it. */
export function photoQuestion(seed: string): string {
  return seededPick(
    [
      'Where was that taken?',
      'What were you doing right before you took it?',
      'Was that a good day?',
      'Who took it — you, or somebody who loves you?',
    ],
    `${seed}|ask`,
  );
}
