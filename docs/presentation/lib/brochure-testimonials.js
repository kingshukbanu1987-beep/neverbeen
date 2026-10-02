#!/usr/bin/env node
/*
 * NeverBeen visitor brochure — traveller testimonial pages.
 *
 * Ten original full-bleed quotation slides are interleaved through the core
 * brochure. Fourteen additional sample testimonial slides are inserted at
 * irregular positions through the existing 37-page sequence. The new slides
 * keep their destination photographs at 100% image opacity; a separate,
 * feathered navy wash sits only behind the small quote and attribution text.
 *
 * The new attributions are illustrative placeholders, not verified customer
 * reviews. Their visible SAMPLE TESTIMONIAL label should remain until genuine,
 * approved customer wording and identities are supplied.
 */
const { PAGE, MARGIN, WHITE } = require('./brochure-kit');

const W = PAGE.W; // 842
const H = PAGE.H; // 595

const GOLD = '#FFD166';
const DEEP = '#07172B';

/** Original source-page numbers after which a quotation page is inserted. */
const INSERT_AFTER = [2, 5, 7, 9, 11, 13, 18, 19, 20, 24];

/**
 * Output-page numbers in the original 37-page brochure, after which the 14 new
 * sample pages are inserted. These intentionally irregular gaps keep the
 * stories spread from just after the contents through the final brochure pages.
 */
const ADDITIONAL_INSERT_AFTER = [5, 7, 10, 12, 15, 17, 20, 22, 25, 27, 29, 32, 34, 35];

/**
 * Original quotation pages. These are retained in their existing positions and
 * visual treatment so the brochure keeps its established testimonial pages.
 */
const TESTIMONIALS = [
  {
    image: 'rome',
    scene: 'Rome, Italy',
    quote: 'We never took that anniversary trip. Somehow, we have the photograph.',
    name: 'Marta & Lukas',
    place: 'Vienna, Austria',
  },
  {
    image: 'parisSolo',
    scene: 'Paris, France',
    quote: 'I asked for Paris in the rain. They gave me Paris in the rain.',
    name: 'In\u00E8s Duval',
    place: 'Lyon, France',
  },
  {
    image: 'florence',
    scene: 'Florence, Italy',
    quote: 'One portrait on a Tuesday. Florence by Thursday evening.',
    name: 'Giulia & Marco',
    place: 'Verona, Italy',
  },
  {
    image: 'viennaElders',
    scene: 'Vienna, Austria',
    quote: 'Fifty years of talking about Vienna, finally on the wall.',
    name: 'Hans & Rosmarie',
    place: 'Lucerne, Switzerland',
  },
  {
    image: 'interlaken',
    scene: 'Interlaken, Switzerland',
    quote: 'It does not look generated. It looks like a memory I misplaced.',
    name: 'Elin Bergstr\u00F6m',
    place: 'Stockholm, Sweden',
  },
  {
    image: 'romeFriends',
    scene: 'Rome, Italy',
    quote: 'Four friends, four cities, one afternoon. Nobody flew anywhere.',
    name: 'Nora, Bea, Fenna & Luuk',
    place: 'Ghent, Belgium',
  },
  {
    image: 'paris',
    scene: 'Paris, France',
    quote: 'Our save-the-date came from a bridge we have never crossed.',
    name: 'Th\u00E9o & Ana\u00EFs',
    place: 'Brussels, Belgium',
  },
  {
    image: 'innsbruck',
    scene: 'Innsbruck, Austria',
    quote: 'Mum opened the envelope and went quiet for a whole minute.',
    name: 'The Kovac family',
    place: 'Ljubljana, Slovenia',
  },
  {
    image: 'florenceSolo',
    scene: 'Florence, Italy',
    quote: 'One photograph in, and the whole city showed up.',
    name: 'Noor Haddad',
    place: 'Rotterdam, Netherlands',
  },
  {
    image: 'vienna',
    scene: 'Vienna, Austria',
    quote: 'I paid only when I loved it. I loved the very first one.',
    name: 'Rohan & Ananya',
    place: 'Bengaluru, India',
  },
];

/** Fourteen longer, visually led sample testimonial slides requested here. */
const ADDITIONAL_TESTIMONIALS = [
  {
    image: 'testimonialSingapore',
    scene: 'Marina Bay Sands · Singapore',
    quote:
      'We kept moving our anniversary trip down the calendar, but the Singapore skyline had been on our list for years. The first portrait felt considered rather than templated: it kept our expressions, made room for the details we shared, and gave us a beautiful reminder of the trip we still want to take.',
    name: 'Mira & Oliver',
    place: 'Bristol, United Kingdom',
  },
  {
    image: 'testimonialPetronas',
    scene: 'Petronas Twin Towers · Kuala Lumpur',
    quote:
      'I have always preferred a portrait that still looks like me. The studio kept my familiar features and the quiet smile I asked for, then placed me beneath the Petronas Towers at night. The result felt polished without losing warmth, and the simple back-and-forth made it easy to share what mattered.',
    name: 'Ananya Mukherjee',
    place: 'Kolkata, India',
  },
  {
    image: 'testimonialTulips',
    scene: 'Tulip fields · Netherlands',
    quote:
      'Our group chat is full of plans that never quite meet three calendars. The tulip-garden portrait gave us a bright, joyful version of the spring trip we keep promising to take. The best part was how personal it felt: the colour, mood and small styling notes all came through.',
    name: 'Nina, Saar & Coen',
    place: 'Utrecht, Netherlands',
  },
  {
    image: 'testimonialInnsbruck',
    scene: 'River Inn · Innsbruck, Austria',
    quote:
      'We sent a few reference images and a short note about the atmosphere we wanted. The Innsbruck riverfront became the perfect backdrop, but the portrait still felt like us rather than a postcard. Being able to ask for a small adjustment made the experience feel collaborative from the first look.',
    name: 'Maya & Jonas',
    place: 'Graz, Austria',
  },
  {
    image: 'testimonialMayaBay',
    scene: 'Maya Bay · Thailand',
    quote:
      'Maya Bay has lived on my travel list for years. I wanted the turquoise water and limestone cliffs, but not a plastic-looking face or an overdone filter. The finished portrait felt relaxed and recognisable, like a candid moment from a journey I hope to make in person one day.',
    name: 'Leela Desai',
    place: 'Pune, India',
  },
  {
    image: 'testimonialBlackForest',
    scene: 'Black Forest · Germany',
    quote:
      'We are not usually drawn to digital portraits, so we were careful about what we asked for. The Black Forest scene felt calm and natural, and the details in our faces still looked familiar. It was lovely to turn a shared daydream into something we could send to family.',
    name: 'Helga & Dieter',
    place: 'Freiburg, Germany',
  },
  {
    image: 'testimonialAntarctica',
    scene: 'Antarctica · penguin colony',
    quote:
      'Our hiking group keeps a list of places we might never reach together. Antarctica was at the top. Seeing all of us framed beside the ice and penguins made us laugh, then immediately plan a print for our next reunion. It felt imaginative, personal and unmistakably about our friendship.',
    name: 'The Saturday Walkers',
    place: 'Cape Town, South Africa',
  },
  {
    image: 'testimonialTimesSquare',
    scene: 'Times Square · New York',
    quote:
      'For our engagement announcement, we wanted a little New York sparkle without pretending we had spent the weekend there. The Times Square portrait caught the colour and excitement while keeping the two of us at the centre. It was a playful way to share our story with family far away.',
    name: 'Deven & Sophie',
    place: 'Brooklyn, New York',
  },
  {
    image: 'testimonialLondon',
    scene: 'Tower Bridge · London',
    quote:
      'Three friends, one London evening, and a destination we have all loved from films. The finished image gave us the feeling of being there together, without turning the landmarks into the whole story. We appreciated how our different reference photos came together in one consistent scene.',
    name: 'Asha, Imogen & Tom',
    place: 'Leicester, United Kingdom',
  },
  {
    image: 'testimonialParis',
    scene: 'Eiffel Tower · Paris',
    quote:
      'We chose Paris because it was the first trip we had postponed, not because it was the easiest backdrop. The final frame felt thoughtful: soft evening light, the river, and a version of us that looked completely at home. It made an ordinary week feel a little more celebratory.',
    name: 'Louise & Arjun',
    place: 'Brussels, Belgium',
  },
  {
    image: 'romeFriends',
    scene: 'Colosseum · Rome',
    quote:
      'At first we thought one picture of each friend would look like a collage. Instead, the Roman scene felt warm and cohesive, and each person still had a recognisable expression. We loved that the idea did not need everyone in the same city—or the same original picture—to feel shared.',
    name: 'Amira, Luca & Th\u00E9o',
    place: 'Rotterdam, Netherlands',
  },
  {
    image: 'viennaElders',
    scene: 'Belvedere Palace · Vienna',
    quote:
      'We have been married longer than most of our favourite cafés have been open, and Vienna was always the anniversary trip we never planned. The portrait gave us a gentle, elegant version of that memory. It felt respectful of our age and our real faces, which mattered more than any filter.',
    name: 'Helene & Wolfgang',
    place: 'Salzburg, Austria',
  },
  {
    image: 'florenceSolo',
    scene: 'Florence · Italy',
    quote:
      'I was curious but cautious about putting my portrait into a destination I had never visited. The Florence frame kept the mood light and recognisable, and the process made it easy to describe the kind of image I wanted. Now it is the picture friends ask me about first.',
    name: 'Noor Rahman',
    place: 'Dhaka, Bangladesh',
  },
  {
    image: 'testimonialScotland',
    scene: 'Highlands castle · Scotland',
    quote:
      'One clear portrait and a small idea became a whole travel scene. I liked that the result was treated like a photograph rather than a novelty graphic, with the landmark still visible and the styling kept simple. It is a lovely reminder that a dream destination can start with one image.',
    name: 'Annelies De Vries',
    place: 'Antwerp, Belgium',
  },
];

/** Draws one original quotation page. */
function drawTestimonial(k, ctx, spec) {
  k.startPage({ chrome: 'dark', accent: GOLD, section: 'In their words' });
  const d = k.doc;

  // Original pages retain their established 80%-opacity photographic treatment.
  k.photoBackground(ctx.IMG[spec.image], 0.8);

  // Legibility wash: clear over the scene, deep under the words.
  const scrim = d.linearGradient(0, H * 0.34, 0, H);
  scrim.stop(0, DEEP, 0).stop(0.52, DEEP, 0.34).stop(1, DEEP, 0.82);
  d.save();
  d.rect(0, H * 0.34, W, H * 0.66).fill(scrim);
  d.restore();

  // Oversized opening quotation mark, sitting above the words.
  k.text('\u201C', MARGIN, 296, {
    font: 'Display',
    size: 86,
    color: WHITE,
    opacity: 0.3,
    width: 320,
    lineGap: 0,
  });

  // Accent bar that carries the quotation block.
  k.roundRect(MARGIN, 392, 3, 94, 1.5, GOLD, 0.95);

  k.fit(spec.quote, MARGIN + 20, 392, 640, 96, {
    font: 'DisplayItalic',
    size: 30,
    minSize: 21,
    color: WHITE,
    lineGap: 3,
  });

  k.text(spec.name, MARGIN + 20, 500, {
    font: 'BodyBold',
    size: 11.6,
    color: WHITE,
    width: 420,
    lineGap: 0,
  });
  k.text(spec.place, MARGIN + 20, 517, {
    font: 'BodySemi',
    size: 9.2,
    color: GOLD,
    width: 420,
    lineGap: 0,
  });

  // Quiet credit for the place in the photograph, bottom right.
  k.icon('pin', W - MARGIN - 232, 522, 5, GOLD);
  k.label(spec.scene, W - MARGIN - 224, 519, {
    color: WHITE,
    size: 7.4,
    width: 224,
    align: 'right',
    opacity: 0.82,
  });
}

/** Draws a modern full-bleed sample testimonial over a 100%-opacity photograph. */
function drawAdditionalTestimonial(k, ctx, spec, index) {
  k.startPage({ chrome: 'dark', accent: GOLD, section: 'Traveller stories' });
  const d = k.doc;

  // The image itself stays at full opacity. Separate feathered washes provide
  // contrast only where the typography sits, leaving the destination prominent.
  k.photoBackground(ctx.IMG[spec.image], 1);

  const sideWash = d.linearGradient(0, 0, W * 0.82, 0);
  sideWash.stop(0, DEEP, 0.66).stop(0.48, DEEP, 0.52).stop(0.8, DEEP, 0.16).stop(1, DEEP, 0);
  d.save();
  d.rect(0, 0, W, H).fill(sideWash);
  d.restore();

  const lowerWash = d.linearGradient(0, H * 0.48, 0, H);
  lowerWash.stop(0, DEEP, 0).stop(0.42, DEEP, 0.28).stop(1, DEEP, 0.74);
  d.save();
  d.rect(0, H * 0.48, W, H * 0.52).fill(lowerWash);
  d.restore();

  const storyNumber = String(index + 1).padStart(2, '0');
  k.label(`Sample testimonial · ${storyNumber} / ${ADDITIONAL_TESTIMONIALS.length}`, MARGIN, 72, {
    color: GOLD,
    size: 7.2,
    width: 290,
  });
  k.roundRect(W - MARGIN - 292, 64, 292, 22, 11, DEEP, 0.5);
  k.label(spec.scene, W - MARGIN - 282, 72, {
    color: WHITE,
    size: 7.2,
    width: 272,
    align: 'right',
    opacity: 0.98,
  });

  // Oversized editorial quote mark and a deliberately small, airy text block.
  k.text('\u201C', MARGIN, 323, {
    font: 'Display',
    size: 76,
    color: GOLD,
    opacity: 0.96,
    width: 70,
    lineGap: 0,
  });
  k.fit(`“${spec.quote}”`, MARGIN + 50, 365, 640, 106, {
    font: 'BodySemi',
    size: 13.2,
    minSize: 11.4,
    color: WHITE,
    lineGap: 3.2,
  });

  k.roundRect(MARGIN, 493, 3, 38, 1.5, GOLD, 1);
  k.text(spec.name, MARGIN + 16, 492, {
    font: 'BodyBold',
    size: 10.2,
    color: WHITE,
    width: 390,
    lineGap: 0,
  });
  k.text(spec.place, MARGIN + 16, 510, {
    font: 'BodySemi',
    size: 8.2,
    color: GOLD,
    width: 390,
    lineGap: 0,
  });
}

const testimonialPages = TESTIMONIALS.map((spec) => (k, ctx) => drawTestimonial(k, ctx, spec));
const additionalTestimonialPages = ADDITIONAL_TESTIMONIALS.map(
  (spec, index) => (k, ctx) => drawAdditionalTestimonial(k, ctx, spec, index),
);

/**
 * Splices the original quotation pages after the 1-based source-page numbers
 * in INSERT_AFTER.
 */
function interleave(pages, testimonials = testimonialPages) {
  if (testimonials.length !== INSERT_AFTER.length) {
    throw new Error(
      `Brochure has ${testimonials.length} original testimonial pages but ${INSERT_AFTER.length} insertion points.`,
    );
  }
  const inserts = new Map(
    INSERT_AFTER.map((pageNumber, index) => [pageNumber, testimonials[index]]),
  );
  const result = [];
  pages.forEach((draw, index) => {
    result.push(draw);
    const extra = inserts.get(index + 1);
    if (extra) result.push(extra);
  });
  return result;
}

/**
 * Inserts the new quotations after 1-based page numbers in the already
 * interleaved 37-page brochure (not after source-module page numbers).
 */
function interleaveAdditional(pages, testimonials = additionalTestimonialPages) {
  if (testimonials.length !== ADDITIONAL_INSERT_AFTER.length) {
    throw new Error(
      `Brochure has ${testimonials.length} new testimonial pages but ${ADDITIONAL_INSERT_AFTER.length} insertion points.`,
    );
  }
  if (new Set(ADDITIONAL_INSERT_AFTER).size !== ADDITIONAL_INSERT_AFTER.length) {
    throw new Error('New testimonial insertion points must be unique.');
  }
  if (ADDITIONAL_INSERT_AFTER.some((pageNumber) => pageNumber < 5 || pageNumber >= pages.length)) {
    throw new Error(
      `New testimonial positions must be after page 4 and before the final page (received ${ADDITIONAL_INSERT_AFTER.join(', ')} for ${pages.length} pages).`,
    );
  }

  const inserts = new Map(
    ADDITIONAL_INSERT_AFTER.map((pageNumber, index) => [pageNumber, testimonials[index]]),
  );
  const result = [];
  pages.forEach((draw, index) => {
    result.push(draw);
    const extra = inserts.get(index + 1);
    if (extra) result.push(extra);
  });
  return result;
}

module.exports = {
  testimonialPages,
  additionalTestimonialPages,
  interleave,
  interleaveAdditional,
  TESTIMONIALS,
  ADDITIONAL_TESTIMONIALS,
  INSERT_AFTER,
  ADDITIONAL_INSERT_AFTER,
};
