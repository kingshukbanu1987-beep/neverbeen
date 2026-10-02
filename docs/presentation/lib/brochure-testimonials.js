/*
 * NeverBeen visitor brochure — traveller testimonial pages.
 *
 * Ten full-bleed quotation slides that are spliced into the brochure between
 * the opening covers (page 02) and the questions page (page 24). Each one is
 * mostly photograph: a scenic travel frame washed over deep navy at 80%
 * opacity, with a short quotation, the speaker's name and their city. The copy
 * is deliberately small so the destination photograph stays the hero.
 *
 * The pages are exported as one array and interleaved by `interleave`, which
 * drops them in after the 1-based page numbers listed in INSERT_AFTER — a
 * shuffled order, so the quotations turn up through the brochure rather than
 * as one block.
 */
const { PAGE, MARGIN, WHITE } = require('./brochure-kit');

const W = PAGE.W; // 842
const H = PAGE.H; // 595

const GOLD = '#FFD166';
const DEEP = '#07172B';

/**
 * Original (pre-testimonial) page numbers after which a quotation page is
 * inserted: ten gaps spread between page 02 and page 25, skipping the ranges
 * the contents page prints as spans (the atlas, and the website walkthrough).
 */
const INSERT_AFTER = [2, 5, 7, 9, 11, 13, 18, 19, 20, 24];

/**
 * One entry per quotation page.
 *   image — key in ctx.IMG (scenic travel photograph used as the background)
 *   scene — the place shown in the photograph, printed as a quiet credit
 *   quote — the words, kept short on purpose
 *   name  — who said it
 *   place — where they are from
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

/** Draws one quotation page: photograph first, words second. */
function drawTestimonial(k, ctx, spec) {
  k.startPage({ chrome: 'dark', accent: GOLD, section: 'In their words' });
  const d = k.doc;

  // 80% photograph over deep navy — the destination is the subject of the page.
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

const testimonialPages = TESTIMONIALS.map((spec) => (k, ctx) => drawTestimonial(k, ctx, spec));

/**
 * Splices the quotation pages into the brochure: `pages` stays in order and
 * each testimonial is inserted after the original page number it is paired
 * with in INSERT_AFTER.
 */
function interleave(pages, testimonials = testimonialPages) {
  if (testimonials.length !== INSERT_AFTER.length) {
    throw new Error(
      `Brochure has ${testimonials.length} testimonial pages but ${INSERT_AFTER.length} insertion points.`,
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

module.exports = { testimonialPages, interleave, TESTIMONIALS, INSERT_AFTER };
