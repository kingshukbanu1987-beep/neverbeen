import { BANNER_IMAGE_SOURCES } from './banner-images';
import { TRAVEL_IMAGE_SOURCES } from './travel-images';

/**
 * The two automatic previews that sit behind the top of the Home page.
 *
 * 1. `HERO_TRAVEL_SLIDES` — every photograph dropped into `public/travel`,
 *    shown as the first preview: "Go Anywhere. Even Where You've Never Been".
 *    `npm run generate:travel` (run automatically by `npm start` and
 *    `npm run build`) keeps the list in sync with the folder.
 *
 * 2. `HERO_PEOPLE_SLIDES` — every photograph dropped into `public/banner`,
 *    shown as the second preview: "Meet the People. Even When They Don't
 *    Exists outside NeverBeen Multiverse".
 *
 * Both lists drive the same five-second cross-fade slideshow.
 */

export interface HeroSlide {
  /** Public URL of the photograph. */
  src: string;
  /** Accessible description (the slideshow itself is decorative, but a
   *  meaningful alt keeps screen readers and search engines honest). */
  alt: string;
}

const TRAVEL_DESCRIPTIONS: readonly HeroSlide[] = [
  {
    src: '/travel/AQ_WU6hQUGKIg0e5ue7b25gaVTvL-1L1aaZax5CdmhY.jpg',
    alt: 'The Atlantic Ocean Road winding across a rocky archipelago beneath a storm-lit sunset in Norway.',
  },
  {
    src: '/travel/CZVZYTaGnZsDrJwN4xA8IokLStTInp2EGRS1aOSYtMs.jpg',
    alt: 'The tail flukes of a humpback whale rising from a still polar sea, icebergs and snow-covered mountains behind.',
  },
  {
    src: '/travel/FCN_dSsK6cWBwUekLQmYFIJUhb4E3JgJ3RVnFVyeN5I.jpg',
    alt: 'The Chapel Bridge and its stone water tower lit at dusk in Lucerne, Switzerland, snow-capped Alps beyond.',
  },
  {
    src: '/travel/QWzxF_v8hLwX3Z7C-CCDdKXrosQ4MkVI5q7NcGf-Yb0.jpg',
    alt: 'An aerial view of a vast glacier braided with turquoise meltwater rivers, icebergs floating in the sea beyond.',
  },
  {
    src: '/travel/VrisE3pljycGetjhvq0XGuGSprDOfrGfzM-LEZ-9P9E.jpg',
    alt: 'A lone walker in a red coat on Iceland’s Reynisfjara black-sand beach, sea stacks and basalt cliffs behind.',
  },
  {
    src: '/travel/Vvswh-aBMgkbbp3-xEgjWZgUDEm7eQjtDny_1de7k1g.jpg',
    alt: 'Clear blue icebergs scattered across a black volcanic beach at Diamond Beach, Iceland.',
  },
  {
    src: '/travel/if07sostcu0RrutG9iAHWgztwEZqOSg7l8cSMJvm4EU.jpg',
    alt: 'The Lauterbrunnen valley in Switzerland: wooden chalets and green meadows below sheer cliffs and waterfalls.',
  },
  {
    src: '/travel/ohZaLTYwT9lfs4eHTT1Gm76O1jFDecnKux0iSw0lUl0.jpg',
    alt: 'A traveller crossing a hanging bridge through the misty canopy of a tropical rainforest.',
  },
  {
    src: '/travel/wS1lwTCPrF9ReqQlJupVPTuvXG4qHuphUduNmwm8AoQ.jpg',
    alt: 'A reindeer with tall antlers standing in a snow-covered Lapland forest at sunrise.',
  },
];

/** Include every travel image while retaining the curated descriptions. */
export const HERO_TRAVEL_SLIDES: readonly HeroSlide[] = TRAVEL_IMAGE_SOURCES.map((src) => ({
  src,
  alt: TRAVEL_DESCRIPTIONS.find((slide) => slide.src === src)?.alt
    ?? 'A travel photograph from the NeverBeen Multiverse.',
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
