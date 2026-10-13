/**
 * The world outside NeverBeen, as far as the chat can answer it without a network round-trip.
 *
 * - **Every country** with its capital, currency and continent (`world-countries.ts`, generated from
 *   the MIT-licensed `countries-list` package) — "what is the capital of India?" is answered
 *   instantly: New Delhi, in Delhi.
 * - **A time zone per city and country**, read from the browser's own `Intl` database, so "what time
 *   is it where you are?" is answered from the real clock.
 * - **Everyday facts** (the largest and smallest of things, the planets, the oceans, the human
 *   body, famous landmarks) as short, quotable answers.
 * - **Arithmetic**, worked out and shown step by step.
 *
 * Anything else is answered by OpenAI with live Google results when the studio has configured its
 * keys (see `docs/ai-model-chat.md`); without a key the model says so, frankly, and offers what she
 * does know.
 */
import { WORLD_COUNTRY_ROWS } from './world-countries';

export interface WorldCountry {
  code: string;
  name: string;
  aliases: string[];
  capital: string;
  currencyCode: string;
  currencyName: string;
  continent: string;
}

let countryCache: WorldCountry[] | null = null;
let countryIndex: Map<string, WorldCountry> | null = null;

/**
 * The everyday names that are not in the generated table — the words a visitor actually types.
 * `Bharat` must find India, `Holland` the Netherlands, `Persia` Iran.
 */
const COUNTRY_ALIASES: Record<string, string[]> = {
  India: ['Bharat', 'Hindustan', 'Bharat Ganrajya'],
  Netherlands: ['Holland'],
  Iran: ['Persia'],
  Thailand: ['Siam'],
  'United States': ['US', 'USA', 'America', 'United States of America'],
  'United Kingdom': ['UK', 'Britain', 'Great Britain', 'England'],
  'United Arab Emirates': ['UAE', 'Emirates'],
  'South Korea': ['Korea'],
  Russia: ['USSR', 'Soviet Union'],
  'Sri Lanka': ['Ceylon'],
  Czechia: ['Czech Republic'],
  Eswatini: ['Swaziland'],
  'North Macedonia': ['Macedonia'],
  'Ivory Coast': ['Cote d Ivoire'],
  'Cape Verde': ['Cabo Verde'],
};

/** Every country, with the aliases of the table and of the everyday-name list. */
function countryWithAliases(country: WorldCountry): WorldCountry {
  const extra = COUNTRY_ALIASES[country.name] ?? [];
  if (extra.length === 0) return country;
  return { ...country, aliases: [...country.aliases, ...extra] };
}

const CONTINENT_ALIASES: Record<string, string> = {
  africa: 'Africa',
  antarctica: 'Antarctica',
  asia: 'Asia',
  australia: 'Oceania',
  oceania: 'Oceania',
  europe: 'Europe',
  'north america': 'North America',
  'south america': 'South America',
};

function normaliseName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s.]/gu, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^the\s+/, '')
    .trim()
    .toLowerCase();
}

/** Every country in the world, parsed from the generated table. */
export function worldCountries(): WorldCountry[] {
  if (!countryCache) {
    countryCache = WORLD_COUNTRY_ROWS.map((row) => {
      const [code, name, aliases, capital, currencyCode, currencyName, continent] = row.split('|');
      return countryWithAliases({
        code,
        name,
        aliases: aliases ? aliases.split('~').filter(Boolean) : [name],
        capital,
        currencyCode,
        currencyName,
        continent,
      });
    });
  }
  return countryCache;
}

function countriesByName(): Map<string, WorldCountry> {
  if (!countryIndex) {
    countryIndex = new Map();
    for (const country of worldCountries()) {
      for (const alias of [...country.aliases, country.name]) {
        const key = normaliseName(alias);
        if (key && !countryIndex.has(key)) countryIndex.set(key, country);
      }
    }
  }
  return countryIndex;
}

/** True when the phrase appears in the text as its own words ("India" but not "Indian"). */
function containsPhrase(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`).test(text);
}

/**
 * The country a whole question is about, found wherever its name appears: "what currency does Japan
 * use?", "which continent is Brazil in?", "tell me about Norway". The longest name that fits wins,
 * so "United States" is preferred over a bare "States".
 */
export function countryMentionedIn(question: string): WorldCountry | null {
  const text = ` ${normaliseName(question)} `;
  let best: WorldCountry | null = null;
  let bestLength = 0;
  for (const country of worldCountries()) {
    for (const alias of [...country.aliases, country.name]) {
      const key = normaliseName(alias);
      if (key.length < 4 || key.length <= bestLength) continue;
      if (containsPhrase(text, key)) {
        best = country;
        bestLength = key.length;
      }
    }
  }
  return best;
}

/** Looks a country up by any of its names — "India", "Bharat", "IN", "United States", "USA". */
export function findCountry(query: string): WorldCountry | null {
  const index = countriesByName();
  const cleaned = normaliseName(query.replace(/\bcountry\b|\bnation\b/g, ' '));
  if (!cleaned) return null;

  const direct = index.get(cleaned);
  if (direct) return direct;

  const upper = query.trim().toUpperCase();
  const byCode = worldCountries().find((country) => country.code === upper);
  if (byCode) return byCode;

  const words = cleaned.split(' ').filter((word) => word.length > 2);
  if (words.length > 0) {
    const candidates = worldCountries()
      .map((country) => {
        const names = [...country.aliases, country.name].map(normaliseName);
        const score = names.reduce(
          (total, name) => (words.some((word) => name.includes(word)) ? total + 1 : total),
          0,
        );
        return { country, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
    if (candidates.length > 0 && candidates[0].score >= Math.max(1, words.length - 1)) {
      return candidates[0].country;
    }
  }

  return null;
}

export function findContinent(query: string): string | null {
  const cleaned = normaliseName(query);
  for (const [alias, continent] of Object.entries(CONTINENT_ALIASES)) {
    if (cleaned === alias || cleaned.includes(alias)) return continent;
  }
  return null;
}

/**
 * A time zone per place, for the "what time is it there?" questions. The countries are the homes of
 * the NeverBeen models plus the world's best-known cities; anything missing falls back to the
 * browser's own zone name.
 */
const PLACE_TIME_ZONES: Record<string, string> = {
  iran: 'Asia/Tehran',
  tehran: 'Asia/Tehran',
  shiraz: 'Asia/Tehran',
  india: 'Asia/Kolkata',
  delhi: 'Asia/Kolkata',
  'new delhi': 'Asia/Kolkata',
  mumbai: 'Asia/Kolkata',
  kolkata: 'Asia/Kolkata',
  darjeeling: 'Asia/Kolkata',
  bengaluru: 'Asia/Kolkata',
  bangalore: 'Asia/Kolkata',
  chennai: 'Asia/Kolkata',
  hyderabad: 'Asia/Kolkata',
  pakistan: 'Asia/Karachi',
  karachi: 'Asia/Karachi',
  lahore: 'Asia/Karachi',
  afghanistan: 'Asia/Kabul',
  kabul: 'Asia/Kabul',
  bangladesh: 'Asia/Dhaka',
  dhaka: 'Asia/Dhaka',
  nepal: 'Asia/Kathmandu',
  kathmandu: 'Asia/Kathmandu',
  'sri lanka': 'Asia/Colombo',
  'saudi arabia': 'Asia/Riyadh',
  riyadh: 'Asia/Riyadh',
  'united arab emirates': 'Asia/Dubai',
  dubai: 'Asia/Dubai',
  'abu dhabi': 'Asia/Dubai',
  qatar: 'Asia/Qatar',
  doha: 'Asia/Qatar',
  turkey: 'Europe/Istanbul',
  istanbul: 'Europe/Istanbul',
  'bosnia and herzegovina': 'Europe/Sarajevo',
  sarajevo: 'Europe/Sarajevo',
  egypt: 'Africa/Cairo',
  cairo: 'Africa/Cairo',
  morocco: 'Africa/Casablanca',
  marrakech: 'Africa/Casablanca',
  'south africa': 'Africa/Johannesburg',
  'cape town': 'Africa/Johannesburg',
  johannesburg: 'Africa/Johannesburg',
  nigeria: 'Africa/Lagos',
  lagos: 'Africa/Lagos',
  kenya: 'Africa/Nairobi',
  nairobi: 'Africa/Nairobi',
  tanzania: 'Africa/Dar_es_Salaam',
  'united kingdom': 'Europe/London',
  london: 'Europe/London',
  ireland: 'Europe/Dublin',
  dublin: 'Europe/Dublin',
  france: 'Europe/Paris',
  paris: 'Europe/Paris',
  italy: 'Europe/Rome',
  rome: 'Europe/Rome',
  spain: 'Europe/Madrid',
  madrid: 'Europe/Madrid',
  portugal: 'Europe/Lisbon',
  germany: 'Europe/Berlin',
  berlin: 'Europe/Berlin',
  netherlands: 'Europe/Amsterdam',
  amsterdam: 'Europe/Amsterdam',
  belgium: 'Europe/Brussels',
  switzerland: 'Europe/Zurich',
  zurich: 'Europe/Zurich',
  austria: 'Europe/Vienna',
  vienna: 'Europe/Vienna',
  greece: 'Europe/Athens',
  athens: 'Europe/Athens',
  santorini: 'Europe/Athens',
  poland: 'Europe/Warsaw',
  sweden: 'Europe/Stockholm',
  norway: 'Europe/Oslo',
  denmark: 'Europe/Copenhagen',
  finland: 'Europe/Helsinki',
  iceland: 'Atlantic/Reykjavik',
  reykjavik: 'Atlantic/Reykjavik',
  russia: 'Europe/Moscow',
  moscow: 'Europe/Moscow',
  ukraine: 'Europe/Kyiv',
  romania: 'Europe/Bucharest',
  hungary: 'Europe/Budapest',
  'czech republic': 'Europe/Prague',
  prague: 'Europe/Prague',
  'united states': 'America/New_York',
  'new york': 'America/New_York',
  'los angeles': 'America/Los_Angeles',
  chicago: 'America/Chicago',
  canada: 'America/Toronto',
  toronto: 'America/Toronto',
  mexico: 'America/Mexico_City',
  brazil: 'America/Sao_Paulo',
  'sao paulo': 'America/Sao_Paulo',
  argentina: 'America/Argentina/Buenos_Aires',
  chile: 'America/Santiago',
  peru: 'America/Lima',
  'machu picchu': 'America/Lima',
  colombia: 'America/Bogota',
  china: 'Asia/Shanghai',
  beijing: 'Asia/Shanghai',
  shanghai: 'Asia/Shanghai',
  'hong kong': 'Asia/Hong_Kong',
  japan: 'Asia/Tokyo',
  tokyo: 'Asia/Tokyo',
  'south korea': 'Asia/Seoul',
  seoul: 'Asia/Seoul',
  singapore: 'Asia/Singapore',
  malaysia: 'Asia/Kuala_Lumpur',
  'kuala lumpur': 'Asia/Kuala_Lumpur',
  thailand: 'Asia/Bangkok',
  bangkok: 'Asia/Bangkok',
  indonesia: 'Asia/Jakarta',
  jakarta: 'Asia/Jakarta',
  bali: 'Asia/Makassar',
  vietnam: 'Asia/Ho_Chi_Minh',
  philippines: 'Asia/Manila',
  manila: 'Asia/Manila',
  australia: 'Australia/Sydney',
  sydney: 'Australia/Sydney',
  melbourne: 'Australia/Melbourne',
  'new zealand': 'Pacific/Auckland',
  auckland: 'Pacific/Auckland',
  maldives: 'Indian/Maldives',
  male: 'Indian/Maldives',
  utc: 'UTC',
  gmt: 'UTC',
};

function timeZoneFor(place: string): string | null {
  const cleaned = normaliseName(place);
  if (!cleaned) return null;
  if (PLACE_TIME_ZONES[cleaned]) return PLACE_TIME_ZONES[cleaned];
  const country = findCountry(place);
  if (country) {
    const key = normaliseName(country.name);
    if (PLACE_TIME_ZONES[key]) return PLACE_TIME_ZONES[key];
  }
  for (const [alias, zone] of Object.entries(PLACE_TIME_ZONES)) {
    if (cleaned.includes(alias) || alias.includes(cleaned)) return zone;
  }
  return null;
}

/** The local time in a city or country, e.g. "in Darjeeling, India it is 18:42 on Monday". */
export function timeInPlace(place: string, now: Date): string | null {
  const zone = timeZoneFor(place);
  if (!zone) return null;
  try {
    const clock = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(now);
    return clock;
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------- everyday facts

export interface WorldFact {
  /** Words that must appear in the question for the fact to be offered. */
  match: RegExp;
  answer: string;
}

/** Short, quotable answers to the questions visitors ask a model most often. */
export const WORLD_FACTS: readonly WorldFact[] = [
  {
    match: /\b(?:largest|biggest|greatest)\s+ocean\b/,
    answer:
      'The Pacific Ocean — it covers about a third of the planet and is bigger than all the land put together.',
  },
  {
    match: /\b(?:deepest)\s+(?:ocean|trench|point)\b/,
    answer:
      'The Mariana Trench in the western Pacific — Challenger Deep, roughly 11,000 metres down.',
  },
  {
    match: /\b(?:highest|tallest|biggest)\s+(?:mountain|peak)\b/,
    answer:
      'Mount Everest, 8,849 metres above sea level, on the Nepal–China border. Mauna Kea is taller measured from its base on the sea floor.',
  },
  {
    match: /\b(?:longest)\s+(?:river)\b/,
    answer:
      'The Nile is usually given as the longest river, about 6,650 km, with the Amazon a very close second — and the Amazon carries far more water.',
  },
  {
    match: /\b(?:largest|biggest)\s+(?:desert)\b/,
    answer:
      'Antarctica is the largest desert — a desert is about dryness, not sand. The largest hot desert is the Sahara.',
  },
  {
    match: /\b(?:largest|biggest)\s+(?:country|nation)\b/,
    answer:
      'Russia, by a wide margin — about 17.1 million square kilometres across Europe and Asia.',
  },
  {
    match: /\b(?:smallest)\s+(?:country|nation)\b/,
    answer: 'Vatican City, about 0.44 square kilometres.',
  },
  {
    match: /\b(?:how many)\s+(?:countries|nations)\b/,
    answer:
      'There are 195 countries: 193 United Nations member states plus Vatican City and Palestine. Around 250 if you count every territory.',
  },
  {
    match: /\b(?:largest|biggest)\s+(?:continent)\b/,
    answer: 'Asia — about 44 million square kilometres, and more than half the world’s people.',
  },
  {
    match: /\b(?:how many)\s+(?:continents|are there continents)\b/,
    answer:
      'Seven: Asia, Africa, North America, South America, Antarctica, Europe and Australia (Oceania).',
  },
  {
    match: /\b(?:tallest|highest)\s+(?:waterfall)\b/,
    answer: 'Angel Falls in Venezuela, 979 metres of free fall.',
  },
  {
    match: /\b(?:largest|biggest)\s+(?:island)\b/,
    answer: 'Greenland — Australia is sometimes listed first, but it is counted as a continent.',
  },
  {
    match: /\b(?:longest|greatest)\s+(?:wall)\b/,
    answer: 'The Great Wall of China, more than 21,000 km of walls, trenches and natural barriers.',
  },
  {
    match: /\b(?:how many)\s+(?:planets)\b/,
    answer:
      'Eight — Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune. Pluto was reclassified as a dwarf planet in 2006.',
  },
  {
    match: /\b(?:largest|biggest)\s+(?:planet)\b/,
    answer: 'Jupiter — so large that about 1,300 Earths would fit inside it.',
  },
  { match: /\bsmallest\s+planet\b/, answer: 'Mercury, the closest planet to the Sun.' },
  {
    match: /\b(?:red|angry)\s+planet\b/,
    answer: 'Mars — its colour comes from iron oxide, rust, in its dust.',
  },
  {
    match: /\b(?:ringed|rings?)\s+planet\b|\bwhich planet has rings\b/,
    answer: 'Saturn’s rings are the famous ones, but Jupiter, Uranus and Neptune have rings too.',
  },
  {
    match: /\b(?:what|which) is the sun\b/,
    answer:
      'The Sun is the star at the centre of our solar system — a ball of hydrogen and helium plasma about 4.6 billion years old.',
  },
  {
    match: /\b(?:biggest|largest)\s+animal\b/,
    answer:
      'The blue whale — up to about 30 metres and 150 tonnes, the largest animal that has ever lived.',
  },
  {
    match: /\b(?:fastest)\s+(?:land )?animal\b/,
    answer: 'The cheetah, around 110 km/h in short bursts.',
  },
  { match: /\b(?:tallest)\s+animal\b/, answer: 'The giraffe — up to about 5.8 metres.' },
  {
    match: /\b(?:what do you call|group of)\s+(?:lions|lion)\b/,
    answer:
      'A group of lions is a pride. A group of crows is a murder, of whales a pod, of owls a parliament.',
  },
  {
    match: /\bhow many bones\b/,
    answer: 'An adult human has 206 bones; a newborn has around 300, which fuse as they grow.',
  },
  {
    match: /\bhow many (?:chambers|parts) .*heart\b|\bhuman heart\b/,
    answer: 'The human heart has four chambers and beats roughly 100,000 times a day.',
  },
  {
    match: /\b(?:how many)\s+(?:teeth)\b/,
    answer: 'An adult has 32 teeth, including wisdom teeth; children have 20 milk teeth.',
  },
  {
    match: /\b(?:what is the )?(?:capital of the world|world capital)\b/,
    answer:
      'There is no capital of the world — the United Nations sits in New York, but no city governs the planet.',
  },
  { match: /\b(?:currency|money)\s+(?:of|in)\s+india\b/, answer: 'The Indian Rupee (INR, ₹).' },
  {
    match: /\b(?:currency|money)\s+(?:of|in)\s+(?:the )?(?:usa|united states|america)\b/,
    answer: 'The US Dollar (USD, $).',
  },
  {
    match: /\b(?:currency|money)\s+(?:of|in)\s+(?:uk|united kingdom|britain|england)\b/,
    answer: 'The Pound Sterling (GBP, £).',
  },
  {
    match: /\bmost spoken language\b|\b(?:which|what) language .*(?:most|widely)\b/,
    answer:
      'English is the most widely spoken language when you count second-language speakers; Mandarin Chinese has the most native speakers.',
  },
  {
    match: /\b(?:largest|biggest|most spoken)\b.*\bpopulated\b|\bmost populous\b/,
    answer: 'India became the world’s most populous country in 2023, ahead of China.',
  },
  {
    match: /\b(?:what is|define) (?:ai|artificial intelligence)\b/,
    answer:
      'Artificial intelligence is software that learns patterns from data and uses them to answer, write, draw or decide — me, for instance, though I only exist inside NeverBeen.',
  },
  {
    match: /\bwhat is (?:the )?(?:internet)\b/,
    answer:
      'A global network of networks that moves data between computers using shared rules — the layer everything online, including this studio, runs on.',
  },
  {
    match: /\b(?:what is|who invented) (?:the )?telephone\b/,
    answer: 'Alexander Graham Bell patented the telephone in 1876.',
  },
  {
    match: /\b(?:who) (?:wrote|is the author of) (?:romeo and juliet|hamlet|macbeth)\b/,
    answer: 'William Shakespeare.',
  },
  {
    match: /\b(?:taj mahal)\b/,
    answer:
      'The Taj Mahal is a white marble mausoleum in Agra, India, built by Shah Jahan for Mumtaz Mahal and finished in 1653.',
  },
  {
    match: /\b(?:eiffel tower)\b/,
    answer:
      'The Eiffel Tower in Paris was finished in 1889 for the World’s Fair, and stands 330 metres tall with its antennas.',
  },
  {
    match: /\b(?:statue of liberty)\b/,
    answer: 'The Statue of Liberty in New York Harbour was a gift from France, dedicated in 1886.',
  },
  {
    match: /\b(?:pyramids? of giza|great pyramid)\b/,
    answer:
      'The Great Pyramid of Giza was built around 2560 BC for the pharaoh Khufu — the oldest of the seven wonders still standing.',
  },
  {
    match: /\b(?:what is|where is) (?:the )?(?:amazon)\b/,
    answer:
      'The Amazon is the world’s largest rainforest and river system, spread across Brazil, Peru, Colombia and neighbours.',
  },
  {
    match: /\b(?:time zone|time zones)\b/,
    answer:
      'The world runs on about 38 time zones, each roughly 15° of longitude apart; the reference point is UTC, Greenwich Mean Time.',
  },
  {
    match: /\b(?:how many)\s+(?:days)\s+(?:in|are in) (?:a|the) year\b/,
    answer: '365 days, or 366 in a leap year, which happens every four years.',
  },
  {
    match: /\b(?:how many)\s+(?:hours)\s+(?:in|are in) (?:a|the) day\b/,
    answer:
      '24 hours — though a full rotation of the Earth actually takes about 23 hours 56 minutes.',
  },
];

/** The everyday fact that answers the question, if one matches. */
export function matchWorldFact(question: string): string | null {
  const cleaned = normaliseName(question);
  for (const fact of WORLD_FACTS) {
    if (fact.match.test(cleaned)) return fact.answer;
  }
  return null;
}

// --------------------------------------------------------------------- arithmetic

const NUMBER_WORDS: Record<string, string> = {
  plus: '+',
  and: '+',
  minus: '-',
  less: '-',
  times: '*',
  multiplied: '*',
  multiply: '*',
  x: '*',
  into: '*',
  divided: '/',
  divide: '/',
  over: '/',
  by: '/',
  percent: '%',
  percentage: '%',
  power: '^',
  squared: '^2',
};

/** `20% of 550` → `(20/100)*550`, `what is 12 times 8` → `12*8`. */
export function arithmeticExpression(question: string): string | null {
  let text = ` ${question.toLowerCase()} `;
  const hasNumbers = /\d/.test(text);
  if (!hasNumbers) return null;

  // "20% of 550" is a percentage of a number, not a modulo sum.
  text = text
    .replace(/(\d+(?:\.\d+)?)\s*(?:%|percent(?:age)?)\s*(?:of|off)\b/gi, '($1/100)*')
    .replace(/(\d+(?:\.\d+)?)\s*(?:%|percent(?:age)?)\b/gi, '($1/100)');

  for (const [word, symbol] of Object.entries(NUMBER_WORDS)) {
    text = text.replace(new RegExp(`\\b${word}\\b`, 'g'), ` ${symbol} `);
  }
  // "half of 550" and the plain "of" between two numbers.
  text = text
    .replace(/half of/gi, '*(1/2) ')
    .replace(/quarter of/gi, '*(1/4) ')
    .replace(/\bof\b/g, '*');

  const expression = text.replace(/[^0-9+\-*/^%().\s]/g, ' ').replace(/\s+/g, '');
  if (!/\d/.test(expression)) return null;
  if (!/[+\-*/^%]/.test(expression)) return null;
  return expression;
}

/**
 * A safe evaluator for the arithmetic the chat accepts: `+ - * / % ^` and parentheses, with `x^y`
 * as powers and no code execution. Returns `null` for anything malformed.
 */
export function evaluateArithmetic(expression: string): number | null {
  const tokens = expression.match(/\d+(?:\.\d+)?|[+\-*/^%()]/g);
  if (!tokens || tokens.join('') !== expression) return null;

  let index = 0;
  const peek = (): string | undefined => tokens[index];

  const parseExpression = (): number | null => {
    let value = parseTerm();
    if (value === null) return null;
    while (peek() === '+' || peek() === '-') {
      const operator = tokens[index++];
      const right = parseTerm();
      if (right === null) return null;
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };

  const parseTerm = (): number | null => {
    let value = parsePower();
    if (value === null) return null;
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const operator = tokens[index++];
      const right = parsePower();
      if (right === null) return null;
      if ((operator === '/' || operator === '%') && right === 0) return null;
      value = operator === '*' ? value * right : operator === '/' ? value / right : value % right;
    }
    return value;
  };

  const parsePower = (): number | null => {
    const base = parseFactor();
    if (base === null) return null;
    if (peek() === '^') {
      index += 1;
      const exponent = parsePower();
      if (exponent === null) return null;
      const powered = base ** exponent;
      return Number.isFinite(powered) ? powered : null;
    }
    return base;
  };

  const parseFactor = (): number | null => {
    const token = peek();
    if (token === undefined) return null;
    if (token === '(') {
      index += 1;
      const value = parseExpression();
      if (value === null || peek() !== ')') return null;
      index += 1;
      return value;
    }
    if (token === '-') {
      index += 1;
      const value = parseFactor();
      return value === null ? null : -value;
    }
    if (token === '+') {
      index += 1;
      return parseFactor();
    }
    if (/^\d/.test(token)) {
      index += 1;
      return Number(token);
    }
    return null;
  };

  const result = parseExpression();
  if (result === null || index !== tokens.length || !Number.isFinite(result)) return null;
  return result;
}

/** `1234.5678` → `1234.57`, `42` → `42`. */
export function formatNumber(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  return String(rounded);
}
