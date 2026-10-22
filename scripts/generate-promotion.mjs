#!/usr/bin/env node
/**
 * Builds the memo manifest for "The NeverBeen Multiverse Studio" slideshow on
 * the Home page.
 *
 * Drop images into `public/promotion` (flat, or into sub-folders) and re-run
 * `npm run generate:promotion` — or simply `npm start` / `npm run build`, which
 * run this script first.
 *
 * Optional memos: create `public/promotion/captions.json` shaped like
 *
 *   {
 *     "Ads1.jpg": {
 *       "tag": "The Studio",
 *       "header": "Every frame is a parallel life you almost lived.",
 *       "copy": "Somewhere between a photograph and a memory sits NeverBeen."
 *     }
 *   }
 *
 * Every key is optional. Photographs without an override take the next memo
 * from the curated pool below, walking the pool in a fixed stride so two
 * neighbouring slides never carry the same words.
 *
 * Output: `src/app/home/multiverse/promotion-slides.ts` (generated — do not
 * edit by hand).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const promotionDir = join(projectRoot, 'public', 'promotion');
const captionsFile = join(promotionDir, 'captions.json');
const outputFile = join(projectRoot, 'src', 'app', 'home', 'multiverse', 'promotion-slides.ts');

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

/** Curated studio memos. `tag` labels the memo, `header` is the big line. */
const memoPool = [
  {
    tag: 'Parallel Universe',
    header: 'Every frame is a parallel life you almost lived.',
    copy: 'Somewhere between a photograph and a memory sits NeverBeen — the studio where a trip you postponed becomes a picture you can hold.',
  },
  {
    tag: 'The Studio',
    header: 'We do not fake the place. We remember it for you.',
    copy: 'Each portrait is built from a real destination, real light and your own face, so the story reads true to everyone who sees it.',
  },
  {
    tag: 'On Belonging',
    header: 'You were always meant to stand in this picture.',
    copy: 'The backdrop changes. The light changes. The person in the middle of it is still unmistakably you.',
  },
  {
    tag: 'The Dream Archive',
    header: 'A passport is optional. The memory is not.',
    copy: 'Browse the places that stayed in your imagination and step into one of them before the year turns over.',
  },
  {
    tag: 'Light Studies',
    header: 'Golden hour, arranged around your schedule.',
    copy: 'Our models study the sun, the shadows and the little imperfections that make a photograph feel found rather than made.',
  },
  {
    tag: 'The Multiverse',
    header: 'One life. Several very good versions of it.',
    copy: 'Santorini on a Tuesday. Kyoto in the rain. The same person, a hundred different chapters, all equally believable.',
  },
  {
    tag: 'Studio Notes',
    header: 'Realism is a series of small, patient decisions.',
    copy: 'Skin texture, lens falloff, the way fabric folds in sea wind — detail is where an imagined holiday becomes a keepsake.',
  },
  {
    tag: 'The Promise',
    header: 'No one should be able to tell. And they will not.',
    copy: 'Every set is tested against the detectors studios fear most before a single photograph reaches your album.',
  },
  {
    tag: 'On Wanderlust',
    header: 'The best trips begin long before the airport.',
    copy: 'Picture the version of you that already went. Then let us put that traveller in the frame.',
  },
  {
    tag: 'The Green Room',
    header: 'Where the imagination gets dressed for the evening.',
    copy: 'A quiet room, a good lens and a hundred ideas about where you might appear next.',
  },
  {
    tag: 'Frames & Friends',
    header: 'Photographs make better souvenirs than itineraries.',
    copy: 'The plan fades. The picture on the wall keeps telling the story long after the unpacking is done.',
  },
  {
    tag: 'The Backdrop',
    header: 'A wall of names, waiting for one more traveller.',
    copy: 'Every person who walks past it leaves with a place they have never been and a memory that behaves like one.',
  },
  {
    tag: 'Studio Ritual',
    header: 'We start with your face, never with a filter.',
    copy: 'Your bone structure, your freckles, your particular smile — the destination is added around you, not painted over you.',
  },
  {
    tag: 'The Horizon Line',
    header: 'Somewhere out there is your next favourite memory.',
    copy: 'Choose a coastline, a skyline or a quiet street, and we will build the version of it that belongs to you.',
  },
  {
    tag: 'After Hours',
    header: 'The dreams keep working while the studio sleeps.',
    copy: 'Requests queue up overnight, are composed at first light and arrive looking like they were always waiting for you.',
  },
  {
    tag: 'The Keepsake',
    header: 'A holiday you can frame, not just remember.',
    copy: 'Prints, albums and quiet digital keepsakes from journeys that never needed a boarding pass.',
  },
  {
    tag: 'Portrait of Elsewhere',
    header: 'Same eyes. New continent.',
    copy: 'The trick is not the scenery. It is keeping every familiar thing about you exactly where it belongs.',
  },
  {
    tag: 'The Invitation',
    header: 'Come as you are. Leave somewhere else.',
    copy: 'One upload, one destination and a short wait — then the door to a parallel holiday opens.',
  },
  {
    tag: 'Impossible Itineraries',
    header: 'Three countries in an afternoon. No jet lag.',
    copy: 'When the map is imaginary, the schedule finally becomes generous.',
  },
  {
    tag: 'The Studio Floor',
    header: 'Cinema light, ordinary joy, extraordinary places.',
    copy: 'The mood of a film set with the warmth of a group photograph taken by someone who knows you.',
  },
  {
    tag: 'On Keeping Time',
    header: 'Years from now, this will look like the good part.',
    copy: 'Photographs decide which seasons we remember. Choose a bright one.',
  },
  {
    tag: 'The Open Door',
    header: 'The world is smaller when you can borrow it.',
    copy: 'NeverBeen gives you the faraway on an ordinary evening, with none of the queues and all of the view.',
  },
  {
    tag: 'Small Details',
    header: 'Look closely. That is the whole point.',
    copy: 'Catchlights, grain, a frayed strap on your bag — the imperfections are the proof, and the beauty.',
  },
  {
    tag: 'The Gathering',
    header: 'Good company travels well, even in imagination.',
    copy: 'Add the people you love to the frame and the memory stops being a picture and starts being an evening.',
  },
  {
    tag: 'Midnight Studio',
    header: 'Every great trip is planned at a slightly unreasonable hour.',
    copy: 'That is when the best ideas arrive. We keep the lights on for them.',
  },
  {
    tag: 'The Parallel Postcard',
    header: 'Wish you were here. You very nearly were.',
    copy: 'A postcard from a place that exists, sent by a version of you that already went.',
  },
  {
    tag: 'Made to Be Believed',
    header: 'The story only works if the light agrees.',
    copy: 'Destinations are matched to the hour, the weather and the mood of the original photograph.',
  },
  {
    tag: 'The Family Album',
    header: 'Some memories deserve a better backdrop.',
    copy: 'Anniversaries, birthdays and ordinary Tuesdays — all of them can happen somewhere remarkable.',
  },
  {
    tag: 'Studio Weather',
    header: 'Rain in Paris, without the wet shoes.',
    copy: 'We keep the atmosphere and leave out everything that makes travel tiring.',
  },
  {
    tag: 'The Long View',
    header: 'Dream further than your next holiday.',
    copy: 'The collection is a lifetime of destinations, arranged so you never run out of somewhere to go.',
  },
  {
    tag: 'New Arrivals',
    header: 'Fresh places, added while you were looking away.',
    copy: 'The atlas grows quietly each month with coastlines, capitals and corners worth standing in.',
  },
  {
    tag: 'The Encore',
    header: 'The best photographs ask you to stay a moment longer.',
    copy: 'Take your time with this one. There is no gate closing and no last train home.',
  },
];

function listImages(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...listImages(absolute));
      continue;
    }
    if (imageExtensions.has(extname(entry.name).toLowerCase())) {
      found.push(absolute);
    }
  }
  return found;
}

function readCaptions() {
  if (!existsSync(captionsFile)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(captionsFile, 'utf8'));
  } catch (error) {
    console.warn(`[promotion] Ignoring unreadable captions.json: ${error.message}`);
    return {};
  }
}

/** A pool stride of 11 is coprime with the pool length, so the whole pool is used before any repeat. */
const MEMO_STRIDE = 11;

function buildSlides() {
  const captions = readCaptions();
  const compare = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  const files = listImages(promotionDir).sort((a, b) => compare(relative(promotionDir, a), relative(promotionDir, b)));

  return files.map((file, index) => {
    const posixPath = relative(promotionDir, file).split(sep).join('/');
    const baseName = posixPath.split('/').pop();
    const overrides = captions[posixPath] ?? captions[baseName] ?? {};
    const memo = memoPool[(index * MEMO_STRIDE) % memoPool.length];

    return {
      src: `/promotion/${posixPath}`,
      tag: overrides.tag ?? memo.tag,
      header: overrides.header ?? memo.header,
      copy: overrides.copy ?? memo.copy,
      alt: overrides.alt ?? `${memo.tag} — ${memo.header} NeverBeen Multiverse Studio promotion photograph`,
    };
  });
}

function renderTypeScript(slides, source) {
  const entries = slides
    .map((slide) => {
      const fields = ['src', 'tag', 'header', 'copy', 'alt']
        .map((key) => `    ${key}: ${JSON.stringify(slide[key]).replace(/"/g, "'")},`)
        .join('\n');
      return `  {\n${fields}\n  },`;
    })
    .join('\n');

  return `/* eslint-disable */
/**
 * Generated by scripts/generate-promotion.mjs — do not edit by hand.
 * Source: ${source}
 * Regenerate with: npm run generate:promotion
 */

export interface PromotionSlide {
  /** Public URL of the photograph. */
  src: string;
  /** Small label shown above the headline. */
  tag: string;
  /** Big headline set in Calibri. */
  header: string;
  /** Supporting sentence set in Calibri. */
  copy: string;
  /** Accessible description. */
  alt: string;
}

export const promotionSlides: PromotionSlide[] = [
${entries}
];
`;
}

const slides = buildSlides();
mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, renderTypeScript(slides, `${slides.length} photograph(s) found in public/promotion`), 'utf8');
console.log(
  `[promotion] Wrote ${relative(projectRoot, outputFile)} — ${slides.length} memo slide(s) from public/promotion.`,
);
