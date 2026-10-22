/**
 * The two automatic previews that sit behind the top of the Home page.
 *
 * 1. `HERO_BROCHURE_PREVIEW_SLIDES` — the closing pages of
 *    `public/assets/documentation/NeverBeen_Brochure.pdf` (pages 52 and 53),
 *    rendered to stills so the hero can show them as a soft background
 *    slideshow without loading a 20 MB PDF. Re-render them with
 *    `npm run generate:brochure` whenever the brochure's last pages change.
 *
 * 2. `HERO_PEOPLE_SLIDES` — every photograph dropped into `public/banner`,
 *    shown as the second preview: "Meet the People. Even When They Don't
 *    Exists outside NeverBeen Multiverse".
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

export const HERO_PEOPLE_SLIDES: readonly HeroSlide[] = [
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
