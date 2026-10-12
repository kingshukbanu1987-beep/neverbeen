#!/usr/bin/env node
/**
 * The style systems of the NeverBeen model portfolio.
 *
 * Every model draws one style from this bank with a seed taken from her name,
 * and each style keeps several layout variants of its own, so two portfolios
 * never read the same way: different palettes, different type treatments,
 * different motifs, different headlines and a different running order of the
 * photo pages.
 *
 * Each style is a plain data object — the page builders in portfolio-pages.mjs
 * interpret it — which keeps the whole look of a portfolio editable here.
 */

/** Vibrant gradient pairs, used for rules, chips, headline washes and orbs. */
export const GRADIENTS = {
  magentaNoir: ['#FF2D95', '#8A2BE2'],
  solarFlare: ['#FFC93C', '#FF3D6E'],
  auroraChrome: ['#00D2A8', '#00C2FF'],
  cobaltVelvet: ['#2B6CFF', '#B621FE'],
  emberRose: ['#FF8A00', '#E8116B'],
  jadeObsidian: ['#3EE6A0', '#0E9F8A'],
  ultraViolet: ['#7597DE', '#6C1BC0'],
  neonMango: ['#FF6B00', '#FFD166'],
};

export const STYLES = [
  {
    id: 'obsidian-muse',
    name: 'Obsidian Muse',
    mood: 'couture noir with a magenta pulse',
    gradient: GRADIENTS.magentaNoir,
    accents: ['#FF2D95', '#8A2BE2', '#00C2FF'],
    displayFont: 'Display',
    displayCase: 'upper',
    displaySpacing: 1.2,
    coverLayout: 'full-bleed',
    statsLayout: 'dials',
    motif: 'arcs',
    headlines: {
      cover: [
        'THE FACE\nTHE CAMERA\nKEEPS',
        'LIGHT\nLEARNS HER\nNAME',
        'SHE IS THE\nSTORY THE\nLENS TELLS',
      ],
      intro: [
        'Some faces are photographed. Hers are remembered.',
        'Every frame she enters leaves a little brighter than it found it.',
        'A presence composed of stillness, colour and nerve.',
      ],
      editorial: [
        'Velvet hours, sharper light.',
        'She wears the dark like couture.',
        'One look, and the room re-frames itself.',
        'Poise you can hear.',
        'The muse who edits the light.',
      ],
      quote: ['Beauty is a decision she makes before sunrise.'],
      closing: ['Book the light before it books her.'],
    },
  },
  {
    id: 'solar-editorial',
    name: 'Solar Editorial',
    mood: 'sunlit gloss, gold on black',
    gradient: GRADIENTS.solarFlare,
    accents: ['#FFC93C', '#FF3D6E', '#FF8A00'],
    displayFont: 'DisplayBlack',
    displayCase: 'title',
    displaySpacing: 0.2,
    coverLayout: 'split',
    statsLayout: 'cards',
    motif: 'slashes',
    headlines: {
      cover: ['GOLDEN\nHOUR HAS\nA MUSE', 'SHE ARRIVES\nLIKE\nSUNRISE', 'WARM LIGHT\nCOOL\nNERVE'],
      intro: [
        'She turns an ordinary afternoon into an editorial.',
        'Sunlight follows her from city to city, and so do we.',
        'Warmth with a spine of steel — that is her signature.',
      ],
      editorial: [
        'Amber, ash and appetite.',
        'The sun signs her frames.',
        'Heat, held perfectly still.',
        'A wardrobe of daylight.',
        'She seasons every shoot with gold.',
      ],
      quote: ['Confidence is the only accessory she never removes.'],
      closing: ['Her calendar fills at the speed of light.'],
    },
  },
  {
    id: 'aurora-chrome',
    name: 'Aurora Chrome',
    mood: 'liquid metal and polar light',
    gradient: GRADIENTS.auroraChrome,
    accents: ['#00D2A8', '#00C2FF', '#7FD8FF'],
    displayFont: 'BodyBlack',
    displayCase: 'upper',
    displaySpacing: 3.2,
    coverLayout: 'framed',
    statsLayout: 'ladder',
    motif: 'dots',
    headlines: {
      cover: ['SIGNAL\nFROM THE\nNORTH', 'CHROME\nAND\nAURORA', 'FUTURE\nCAST IN\nHER FACE'],
      intro: [
        'A silhouette from the next decade, photographed today.',
        'Cool light, clean lines, zero compromise.',
        'She is the frequency every art director searches for.',
      ],
      editorial: [
        'Polar light, tropical nerve.',
        'Chrome never looked this warm.',
        'Precision with a pulse.',
        'The aurora answers to her.',
        'Clean geometry, wild heart.',
      ],
      quote: ['Modernity is not a season. It is a posture.'],
      closing: ['Reserve the future while it is still available.'],
    },
  },
  {
    id: 'cobalt-velvet',
    name: 'Cobalt Velvet',
    mood: 'deep blue hour, velvet shadows',
    gradient: GRADIENTS.cobaltVelvet,
    accents: ['#2B6CFF', '#B621FE', '#FF2D95'],
    displayFont: 'DisplayItalic',
    displayCase: 'title',
    displaySpacing: 0,
    coverLayout: 'diptych',
    statsLayout: 'dials',
    motif: 'rings',
    headlines: {
      cover: [
        'Blue hour\nbelongs\nto her',
        'Velvet\nnights,\nvelvet gaze',
        'The city\ndims for\nher entrance',
      ],
      intro: [
        'She carries the blue hour with her, wherever she lands.',
        'Softness and voltage in the same frame.',
        'A voice of velvet in a room of noise.',
      ],
      editorial: [
        'Indigo moods, electric poise.',
        'She lets the shadows do the talking.',
        'Velvet, but make it voltage.',
        'The night keeps her secrets well.',
        'Blue, and unbothered, and brilliant.',
      ],
      quote: ['Elegance is the art of leaving room for mystery.'],
      closing: ['The blue hour is booking now.'],
    },
  },
  {
    id: 'ember-rose',
    name: 'Ember & Rose',
    mood: 'burnt orange romance on black',
    gradient: GRADIENTS.emberRose,
    accents: ['#FF8A00', '#E8116B', '#FFC93C'],
    displayFont: 'Display',
    displayCase: 'title',
    displaySpacing: 0.4,
    coverLayout: 'full-bleed',
    statsLayout: 'cards',
    motif: 'arcs',
    headlines: {
      cover: [
        'Embers\nremember\nher name',
        'A rose\ngrown in\nfirelight',
        'Warm as\na rumour,\nsharp as truth',
      ],
      intro: [
        'She arrives like the last hour of a bonfire — impossible to leave.',
        'Romance with an edge; warmth with a witness.',
        'Her frames glow long after the studio cools.',
      ],
      editorial: [
        'Smoke, silk and certainty.',
        'She keeps the ember in every editorial.',
        'Rose by name, fire by nature.',
        'Glow first, ask later.',
        'The warmth she leaves is the story.',
      ],
      quote: ['A photograph is a fire you are allowed to keep.'],
      closing: ['Catch her light while it is still warm.'],
    },
  },
  {
    id: 'jade-obsidian',
    name: 'Jade Obsidian',
    mood: 'emerald calm over volcanic black',
    gradient: GRADIENTS.jadeObsidian,
    accents: ['#3EE6A0', '#0E9F8A', '#00C2FF'],
    displayFont: 'BodyBlack',
    displayCase: 'upper',
    displaySpacing: 2.4,
    coverLayout: 'framed',
    statsLayout: 'ladder',
    motif: 'dots',
    headlines: {
      cover: ['STILL WATER\nDEEP\nGAZE', 'JADE ON\nOBSIDIAN\nGLASS', 'CALM IS\nHER\nLOUDEST LOOK'],
      intro: [
        'Quiet on the surface, oceanic underneath.',
        'She photographs like a secret the camera promised to keep.',
        'Composure so complete it reads as couture.',
      ],
      editorial: [
        'Emerald calm, obsidian nerve.',
        'She makes stillness look expensive.',
        'Green light, golden discipline.',
        'The calm before the campaign.',
        'Depth she never has to announce.',
      ],
      quote: ['Stillness is a language, and she is fluent.'],
      closing: ['Her stillness is available — briefly.'],
    },
  },
  {
    id: 'ultra-violet',
    name: 'Ultra Violet',
    mood: 'orchid haze and midnight plum',
    gradient: GRADIENTS.ultraViolet,
    accents: ['#B621FE', '#6C1BC0', '#FF9BC4'],
    displayFont: 'DisplayItalic',
    displayCase: 'title',
    displaySpacing: 0,
    coverLayout: 'diptych',
    statsLayout: 'dials',
    motif: 'rings',
    headlines: {
      cover: [
        'Orchid\nhours and\nviolet air',
        'She dreams\nin ultra\nviolet',
        'Plum night,\nporcelain\nlight',
      ],
      intro: [
        'A daydream with a boarding pass — that is her portfolio.',
        'Violet is not a colour here; it is a climate.',
        'She makes the surreal feel like home.',
      ],
      editorial: [
        'Orchid light, iron poise.',
        'She curates the haze around her.',
        'Violet, and proud of it.',
        'Dreams, delivered on time.',
        'The plum hour is her office.',
      ],
      quote: ['Colour is a mood she packs first.'],
      closing: ['Step into her violet before it fades.'],
    },
  },
  {
    id: 'neon-mango',
    name: 'Neon Mango',
    mood: 'tropical voltage, street-gloss shine',
    gradient: GRADIENTS.neonMango,
    accents: ['#FF6B00', '#FFD166', '#FF2D95'],
    displayFont: 'DisplayBlack',
    displayCase: 'upper',
    displaySpacing: 1.6,
    coverLayout: 'split',
    statsLayout: 'cards',
    motif: 'slashes',
    headlines: {
      cover: ['STREET GLOSS\nTROPIC\nSOUL', 'MANGO\nNEON AND\nNERVE', 'SHE MAKES\nTHE CITY\nBLUSH'],
      intro: [
        'Half runway, half street corner, entirely herself.',
        'She brings the tropics to every cold studio.',
        'Neon is her native light.',
      ],
      editorial: [
        'Citrus light, concrete cool.',
        'She turns sidewalks into runways.',
        'Neon mango, zero apology.',
        'The street learns her walk.',
        'Gloss you can taste.',
      ],
      quote: ['Style is a street she never leaves.'],
      closing: ['Her season is now — book the glow.'],
    },
  },
];

/** Deterministic 32-bit hash so a model always draws the same style. */
export function hash(value) {
  let result = 2166136261;
  for (const character of String(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

/**
 * Resolves everything that makes one model's portfolio hers: the style, the
 * seeded pick inside every headline bank, and the page-variant offsets.
 * `styleId` forces a particular style; without it the seed decides.
 */
export function resolveDesign(modelKey, styleId = '') {
  const seed = hash(modelKey);
  const style = STYLES.find((entry) => entry.id === styleId) ?? STYLES[seed % STYLES.length];
  const variant = (offset) => (seed + offset * 7919) % 1000;
  const pick = (values, offset) => values[variant(offset) % values.length];

  return {
    seed,
    style,
    variant,
    pick,
    accent: style.accents[seed % style.accents.length],
    accent2: style.accents[(seed + 1) % style.accents.length],
    accent3: style.accents[(seed + 2) % style.accents.length],
    coverHeadline: pick(style.headlines.cover, 1),
    introLine: pick(style.headlines.intro, 2),
    quote: pick(style.headlines.quote, 3),
    closingLine: pick(style.headlines.closing, 4),
    /** Headlines for the photo-led pages, in running order. */
    editorialHeadlines: shuffleDeterministic(style.headlines.editorial, seed),
  };
}

function shuffleDeterministic(values, seed) {
  const list = [...values];
  let current = seed;
  for (let index = list.length - 1; index > 0; index -= 1) {
    current = (current * 1103515245 + 12345) >>> 0;
    const swap = current % (index + 1);
    [list[index], list[swap]] = [list[swap], list[index]];
  }
  return list;
}

/**
 * Fills `{name}`, `{first}`, `{city}` … in a copy string so every headline and
 * paragraph speaks about this model in particular.
 */
export function fill(template, context) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) => context[key] ?? match);
}
