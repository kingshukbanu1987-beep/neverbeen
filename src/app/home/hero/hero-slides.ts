import { BANNER_IMAGE_SOURCES } from './banner-images';
import { TRAVEL_IMAGE_SOURCES } from './travel-images';

/**
 * The two automatic previews that sit behind the top of the Home page.
 *
 * 1. `HERO_TRAVEL_SLIDES` — every photograph dropped into `public/travel`,
 *    shown as the first preview: "Imagine Yourself Anywhere, Even Where You’ve
 *    Never Been."
 *    Re-run `npm run generate:travel` whenever the travel folder changes.
 *
 * 2. `HERO_PEOPLE_SLIDES` — every photograph dropped into `public/banner`,
 *    shown as the second preview: "Meet the Souls Hidden between the
 *    Dimensions of Multiverse".
 *
 * Both lists drive a five-second cross-fade slideshow.
 */

export interface HeroSlide {
  /** Public URL of the photograph. */
  src: string;
  /** Accessible description (the slideshow itself is decorative, but a
   *  meaningful alt keeps screen readers and search engines honest). */
  alt: string;
}

/**
 * The closing pages of the NeverBeen brochure (pages 52 and 53), kept as a
 * graceful stand-in for the first preview until the first travel photograph
 * lands in `public/travel`. The hero swaps to `HERO_TRAVEL_SLIDES` the moment
 * the generated travel list is non-empty.
 */
export const HERO_BROCHURE_PREVIEW_SLIDES: readonly HeroSlide[] = [
  {
    src: '/assets/brochure-preview/neverbeen-brochure-page-52.jpg',
    alt: 'Closing page of the NeverBeen brochure: an airliner over a sunset sky, with the line “Not everyone can fly. But everyone deserves to see the world through their dreams.”',
  },
  {
    src: '/assets/brochure-preview/neverbeen-brochure-page-53.jpg',
    alt: 'Final page of the NeverBeen brochure: an expedition ship in an Antarctic bay, with the line “Not everyone can Sail. But everyone deserves to see the world through their dreams.”',
  },
];

const TRAVEL_ALT = 'A destination photograph from the NeverBeen travel collection.';

/** Include every travel image while retaining a meaningful description. */
export const HERO_TRAVEL_SLIDES: readonly HeroSlide[] = TRAVEL_IMAGE_SOURCES.map((src) => ({
  src,
  alt: TRAVEL_ALT,
}));

const PEOPLE_DESCRIPTIONS: readonly HeroSlide[] = [
  {
    src: '/banner/-4m0Xo-3Bi2T_Jx02NGRzs7UHpON4yT8TsZr1ss7OvQ.jpg',
    alt: 'A woman resting with her eyes closed on a rooftop terrace, a city skyline blurred behind her.',
  },
  {
    src: '/banner/BsoM1hCYXWDoTMGTOoemuYBBJ5yNeSZuJVgiUkpaHjo.jpg',
    alt: 'A smiling woman in a pink floral outfit beneath the glass dome and waterfall of Jewel Changi, Singapore.',
  },
  {
    src: '/banner/IbIW2HUq08hGaT2wHtGHEPHWO2lkp6CzU40pXMGWs1c.jpg',
    alt: 'A woman in a pink embroidered outfit on a rooftop, a ferris wheel and mountains out of focus behind her.',
  },
  {
    src: '/banner/VZ5gGZHAVgJ3yT6KSTKcCvvKKRb8d_te14WfrhIrwug.jpg',
    alt: 'A woman in a magenta off-shoulder dress turning towards the camera, a lakeside ferris wheel behind her.',
  },
  {
    src: '/banner/z8lZkQ7GMVkWeKr5j7zIBkT6waiGB1TcJhTKk17JauU.jpg',
    alt: 'A laughing woman in a teal dress at golden hour on a rooftop promenade above a city.',
  },
  {
    src: '/banner/QRSk2vzkQuSi8aiaq5btZS4MqNW_CL16LAlRBQaomj0.png',
    alt: 'Studio portrait of a woman in a tiger-stripe coat against a soft white backdrop.',
  },
  {
    src: '/banner/aHRZ0DzkmSyW5hW5BVKuMNQy6beR3evMc7kOxftZq5c.png',
    alt: 'A laughing woman in crimson at a golden floral celebration, marigold garlands behind her.',
  },
];

/** Include every banner image while retaining the curated descriptions. */
export const HERO_PEOPLE_SLIDES: readonly HeroSlide[] = BANNER_IMAGE_SOURCES.map((src) => ({
  src,
  alt: PEOPLE_DESCRIPTIONS.find((slide) => slide.src === src)?.alt
    ?? 'A portrait from the NeverBeen Multiverse.',
}));
