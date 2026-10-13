/**
 * `livechatselfiesandphotos` — the live-chat selfie and photo service.
 *
 * When the visitor asks the model for a **selfie** in the live chat, the window calls this service
 * (`POST /api/livechatselfiesandphotos`) and it generates **two fresh photographs of her** — the
 * same outfit and the same ambience in both, but a different pose and a different style — which go
 * straight into the chat as her response. Nothing is ever written to disk or to a bucket: every
 * photo travels back as a `data:` URL, lives only in the browser, and is dropped from the window
 * when the chat session ends.
 *
 * The service is intelligent about the moment it photographs her in:
 *
 *   - **Her own clock.** The model's country and city decide her time zone, so a model in India at
 *     22:00 IST is photographed at night even when the visitor's browser is in another zone. The
 *     hour picks the light: morning and day are shot inside the house or out on the streets,
 *     markets, shops and gardens; evening and night are shot indoors with the lamps on or outside
 *     in the evening ambience.
 *   - **Her own surroundings.** The country and city flavour the setting — a bazaar lane in India,
 *     a Persian courtyard in Iran, a corniche in the Gulf, old-town cobbles in the Balkans.
 *   - **Like it was just clicked.** A current timestamp is stamped on the bottom-right corner of
 *     every photo together with the latest trending phone's camera watermark (for example
 *     `Shot on iPhone 18 Pro`), both rendered into the picture itself.
 *   - **Like she took it herself.** The photos carry real photography flaws — a slight tilt,
 *     uneven framing, motion blur, grain, a lens smudge flare — and the phone is never visible:
 *     shot at arm's length, no mirror, no hand holding a device in frame. Both photos share one
 *     expression (a smile, a funny face or a slightly serious one, picked for the request) so the
 *     pair matches, while the poses and the angle differ.
 *
 *   Gemini image model  `GEMINI_API_KEY`, `GEMINI_IMAGE_MODEL`
 *                       (default `gemini-2.5-flash-image`)
 *   Phone watermark      `LIVECHAT_PHONE_WATERMARK`
 *                       (default `Shot on iPhone 18 Pro`)
 *
 * Without a key the endpoint answers `503 { ok: false, error: 'selfies-unavailable' }` and the chat
 * window falls back the way it always used to: one frame from her own album goes out instead, so a
 * visitor who asks for a photograph always gets one.
 */
import {
  GEMINI_DEFAULT_IMAGE_MODEL,
  cleanSelfieText,
  extractGeneratedImage,
} from './ai-selfie-core.mjs';

export const LIVE_CHAT_SELFIES_ENDPOINT = '/api/livechatselfiesandphotos';

/** Her profile photograph travels with the request, so the body is a little larger than a turn. */
export const MAX_LIVE_CHAT_BODY_BYTES = 8 * 1024 * 1024;

/** The largest likeness the service will accept as the reference (about 5 MB of base64). */
export const MAX_LIVE_CHAT_REFERENCE_BYTES = 5 * 1024 * 1024;

/** How many photographs every request answers with: two, same outfit and ambience, new poses. */
export const LIVE_CHAT_PHOTO_COUNT = 2;

/** The latest trending phone's camera watermark, stamped into the bottom-right of every photo. */
export const LIVE_CHAT_PHONE_WATERMARK_DEFAULT = 'Shot on iPhone 18 Pro';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

const LIMITS = {
  name: 120,
  handle: 80,
  location: 160,
  age: 20,
  place: 240,
  flaw: 240,
  look: 400,
  timezone: 64,
  seed: 120,
};

/**
 * The time zones of the countries the studio's models belong to — the service's own knowledge, so
 * it knows the model's current time even when the window cannot name a zone. The window sends an
 * IANA zone when it knows one; this map is what makes the service intelligent on its own.
 */
export const COUNTRY_TIME_ZONES = {
  argentina: 'America/Argentina/Buenos_Aires',
  azerbaijan: 'Asia/Baku',
  'bosnia and herzegovina': 'Europe/Sarajevo',
  bosnia: 'Europe/Sarajevo',
  canada: 'America/Toronto',
  chile: 'America/Santiago',
  china: 'Asia/Shanghai',
  colombia: 'America/Bogota',
  egypt: 'Africa/Cairo',
  france: 'Europe/Paris',
  georgia: 'Asia/Tbilisi',
  germany: 'Europe/Berlin',
  greece: 'Europe/Athens',
  india: 'Asia/Kolkata',
  indonesia: 'Asia/Jakarta',
  iran: 'Asia/Tehran',
  iraq: 'Asia/Baghdad',
  ireland: 'Europe/Dublin',
  israel: 'Asia/Jerusalem',
  italy: 'Europe/Rome',
  jordan: 'Asia/Amman',
  japan: 'Asia/Tokyo',
  kenya: 'Africa/Nairobi',
  kuwait: 'Asia/Kuwait',
  lebanon: 'Asia/Beirut',
  malaysia: 'Asia/Kuala_Lumpur',
  mexico: 'America/Mexico_City',
  morocco: 'Africa/Casablanca',
  nepal: 'Asia/Kathmandu',
  netherlands: 'Europe/Amsterdam',
  nigeria: 'Africa/Lagos',
  oman: 'Asia/Muscat',
  pakistan: 'Asia/Karachi',
  philippines: 'Asia/Manila',
  poland: 'Europe/Warsaw',
  portugal: 'Europe/Lisbon',
  qatar: 'Asia/Qatar',
  romania: 'Europe/Bucharest',
  russia: 'Europe/Moscow',
  'saudi arabia': 'Asia/Riyadh',
  singapore: 'Asia/Singapore',
  'south africa': 'Africa/Johannesburg',
  'south korea': 'Asia/Seoul',
  spain: 'Europe/Madrid',
  'sri lanka': 'Asia/Colombo',
  sudan: 'Africa/Khartoum',
  sweden: 'Europe/Stockholm',
  switzerland: 'Europe/Zurich',
  syria: 'Asia/Damascus',
  türkiye: 'Europe/Istanbul',
  turkey: 'Europe/Istanbul',
  uae: 'Asia/Dubai',
  'united arab emirates': 'Asia/Dubai',
  'united kingdom': 'Europe/London',
  uk: 'Europe/London',
  usa: 'America/New_York',
  'united states': 'America/New_York',
  uruguay: 'America/Montevideo',
  vietnam: 'Asia/Ho_Chi_Minh',
};

/** The city aliases the map also knows — a model's card names her city before her country. */
const CITY_TIME_ZONES = {
  mumbai: 'Asia/Kolkata',
  delhi: 'Asia/Kolkata',
  'new delhi': 'Asia/Kolkata',
  kolkata: 'Asia/Kolkata',
  darjeeling: 'Asia/Kolkata',
  shantiniketan: 'Asia/Kolkata',
  bengaluru: 'Asia/Kolkata',
  bangalore: 'Asia/Kolkata',
  chennai: 'Asia/Kolkata',
  goa: 'Asia/Kolkata',
  jaipur: 'Asia/Kolkata',
  shiraz: 'Asia/Tehran',
  tehran: 'Asia/Tehran',
  isfahan: 'Asia/Tehran',
  alexandria: 'Africa/Cairo',
  cairo: 'Africa/Cairo',
  muscat: 'Asia/Muscat',
  doha: 'Asia/Qatar',
  dubai: 'Asia/Dubai',
  sharjah: 'Asia/Dubai',
  riyadh: 'Asia/Riyadh',
  jeddah: 'Asia/Riyadh',
  'kuwait city': 'Asia/Kuwait',
  sarajevo: 'Europe/Sarajevo',
  baghdad: 'Asia/Baghdad',
  amman: 'Asia/Amman',
  beirut: 'Asia/Beirut',
  damascus: 'Asia/Damascus',
  istanbul: 'Europe/Istanbul',
  dublin: 'Europe/Dublin',
  london: 'Europe/London',
  'kuala lumpur': 'Asia/Kuala_Lumpur',
};

function normaliseKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when the runtime accepts this IANA zone. */
function isUsableZone(zone) {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** The city and country maps with their keys written the way `normaliseKey` writes them. */
let zoneIndexCache = null;
function normalisedZoneIndex() {
  if (!zoneIndexCache) {
    zoneIndexCache = new Map();
    for (const [alias, zone] of Object.entries({ ...CITY_TIME_ZONES, ...COUNTRY_TIME_ZONES })) {
      const key = normaliseKey(alias);
      if (key && !zoneIndexCache.has(key)) zoneIndexCache.set(key, zone);
    }
  }
  return zoneIndexCache;
}

/**
 * The model's own time zone: the zone the window sent when it knew one, otherwise the city or the
 * country on her card, read against the maps above. `''` when nothing is known, and the service
 * then works from the clock it has.
 */
export function resolveModelTimeZone(location, timezone) {
  if (isUsableZone(timezone)) return timezone;
  const raw = String(location ?? '')
    .split('·')[0]
    .trim();
  if (!raw) return '';
  const [rawCity = '', rawCountry = ''] = raw.split(',');
  const city = normaliseKey(rawCity);
  const country = normaliseKey(rawCountry);
  const index = normalisedZoneIndex();
  if (city && index.has(city)) return index.get(city);
  if (country && index.has(country)) return index.get(country);
  const cleaned = normaliseKey(raw);
  for (const [alias, zone] of index) {
    if (alias && cleaned.includes(alias)) return zone;
  }
  return '';
}

/** The hour bands of a day, and the light each one is photographed in. */
export function phaseForHour(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

/**
 * The model's current moment: her local hour, the phase of light that hour brings, and the
 * timestamp that gets stamped on the photographs — all read in **her** time zone, so a night-time
 * chat in Delhi is photographed at night in Delhi.
 */
export function modelLocalMoment({ location = '', timezone = '', now = new Date() } = {}) {
  const zone = resolveModelTimeZone(location, timezone);
  let hour = now.getHours();
  let minute = now.getMinutes();
  let day = now.getDate();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();

  if (zone) {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: false,
      }).formatToParts(now);
      const read = (type) => Number(parts.find((part) => part.type === type)?.value ?? 0);
      hour = read('hour') % 24;
      minute = read('minute');
      day = read('day');
      month = read('month');
      year = read('year');
    } catch {
      // An unusable zone falls back to the service's own clock rather than failing the request.
    }
  }

  const pad = (value) => String(value).padStart(2, '0');
  return {
    zone,
    hour,
    minute,
    phase: phaseForHour(hour),
    /** `22:07` — her clock, for the prompt and the caption. */
    timeLabel: `${pad(hour)}:${pad(minute)}`,
    /** `13/10/2026 22:07` — the stamp on the bottom-right corner of both photographs. */
    timestamp: `${pad(day)}/${pad(month)}/${year} ${pad(hour)}:${pad(minute)}`,
  };
}

/** Every *outdoor* setting the model's home country and city can put her in by day or night. */
const COUNTRY_SURROUNDINGS = {
  india: [
    'a lively neighbourhood street with tea stalls, flower shops and auto-rickshaws going past',
    'a bazaar lane crowded with shops, colour and evening chatter',
    'a small garden or terrace with mango and neem trees and crows on the wall',
  ],
  iran: [
    'a Persian house courtyard with a small fountain and tiled walls',
    'a bazaar lane with carpet stalls, copper shops and the smell of saffron',
    'a tree-lined boulevard with café terraces',
  ],
  oman: [
    'a corniche promenade along the water with the city behind her',
    'a bright shopping mall with glass and palm planters',
    'a whitewashed lane near the old market',
  ],
  qatar: [
    'a corniche walkway with the towers across the bay',
    'a souq lane with lanterns and spice shops',
    'a rooftop with the city lights coming on',
  ],
  'united arab emirates': [
    'a boulevard of cafés under the palms',
    'a marina walkway with the water and the towers',
    'a gold-souq lane busy with shoppers',
  ],
  'saudi arabia': [
    'a new district boulevard with cafés and planters',
    'a traditional market lane with hanging lanterns',
    'a green park with date palms',
  ],
  kuwait: [
    'a seaside promenade with the towers behind her',
    'a market street with shops and shawarma counters',
    'a park with palm trees and sprinklers',
  ],
  egypt: [
    'a corniche café terrace with the water and the traffic below',
    'a busy market street with carts, colours and calls to prayer',
    'a rooftop with laundry lines and the city spread out',
  ],
  'bosnia and herzegovina': [
    'old-town cobbles by the river with cafés spilling onto the street',
    'a bridge lane with photographers and pigeons',
    'a cobbled square with trams going past',
  ],
  iraq: [
    'a date-palm street with tea stalls and children on bicycles',
    'a market lane with spice mounds and copper pots',
    'a riverside walkway at dusk',
  ],
  ireland: [
    'a wet Georgian street with painted doors and a chip shop sign',
    'a pub-front lane with bicycles and rain on the pavement',
    'a green park with a duck pond',
  ],
  malaysia: [
    'a shophouse street with kopitiam tables and scooters parked at an angle',
    'a night-market lane of noodles, fruit and string lights',
    'a garden with frangipani and wet paths after rain',
  ],
};

/** And the inside of her own home, when the hour (or the weather) keeps her indoors. */
const COUNTRY_HOUSES = {
  india: 'her own house — a narrow staircase, a clothesline balcony, a tube light in the corridor',
  iran: 'her apartment — a rug, a low table, a curtain letting the light through',
  oman: 'her house — a majlis room with cushions and a slow ceiling fan',
  qatar: 'her apartment — floor-to-ceiling glass and the skyline behind her',
  'united arab emirates': 'her flat — a balcony over the city and a wall of air-conditioned quiet',
  'saudi arabia': 'her house — a modern majlis with cushions and warm lamps',
  kuwait: 'her flat — sheer curtains, a cool tiled floor, the city humming outside',
  egypt: 'her house — a balcony with geraniums and a whirring fan',
  'bosnia and herzegovina': 'her flat — wooden shutters, a radiator, mountain light at the window',
  iraq: 'her house — a floor cushion, a patterned curtain, a warm lamp',
  ireland: 'her flat — a bay window, grey daylight, a cup of tea going cold',
  malaysia: 'her flat — a grille window, a fan, the hum of the city outside',
};

const GENERIC_SURROUNDINGS = [
  'a neighbourhood street with small shops and people going about their evening',
  'a café corner with a window seat and terrible overhead light',
  'a garden or park path with benches and untidy trees',
];

const GENERIC_HOUSE = 'her own house — a slightly messy room, a lamp, a curtain half open';

function countryOf(location) {
  const parts = String(location ?? '')
    .split('·')[0]
    .split(',');
  return parts.slice(1).join(',').trim() || parts[0].trim();
}

function cityOf(location) {
  const head = String(location ?? '')
    .split('·')[0]
    .split(',')[0];
  return cleanSelfieText(head, 60);
}

/** A stable hash, so the same request always photographs her in the same setting. */
function seedHash(seed) {
  let hash = 0;
  for (const character of String(seed ?? ''))
    hash = (hash * 31 + character.charCodeAt(0)) % 1000003;
  return hash;
}

/**
 * Where she is standing for this request — the ambience that matches her country and city **and**
 * the light of her own current hour. Night and evening are shot inside the house or outside in the
 * evening glow; morning and afternoon are shot inside or out on the streets, markets, shops and
 * gardens. The same setting is used for both photographs of the pair.
 */
export function ambienceFor({ location, moment, seed = '' }) {
  const city = cityOf(location);
  const country = countryOf(location);
  const countryKey = normaliseKey(country);
  const phase = moment.phase;
  // Only the *outdoor* settings live in these lists — the indoor ones are written per hour above.
  const surroundings = COUNTRY_SURROUNDINGS[countryKey] ?? GENERIC_SURROUNDINGS;
  const pick = surroundings[seedHash(`${seed}|${countryKey}|${phase}`) % surroundings.length];

  const home = COUNTRY_HOUSES[countryKey] ?? GENERIC_HOUSE;
  const indoorByPhase = {
    morning: `in her room with the morning light coming through the window — ${home}`,
    afternoon: `inside the house, out of the harsh afternoon sun, one window doing all the work — ${home}`,
    evening: `inside with the lamps just switched on, the last daylight at the window — ${home}`,
    night: `in her room at night, one warm lamp and the rest of the house asleep — ${home}`,
  };
  const outdoorByPhase = {
    morning: 'outside in the morning — the street, the market or the garden waking up around her',
    afternoon:
      'outside in the daytime — streets, shops and the market in full daylight, people passing behind her',
    evening: 'outside in the evening ambience — the sky going orange, street lights just on',
    night: 'outside at night — the street still glowing, shutters down, light from a shop window',
  };

  // Half of the requests are indoors and half outdoors, chosen from the seed so both photographs
  // of one pair stand in exactly the same place.
  const indoor = seedHash(`${seed}|side|${location}`) % 2 === 0;
  const where = indoor ? indoorByPhase[phase] : outdoorByPhase[phase];
  const whereText = indoor ? where : `${where}, specifically ${pick}`;

  const place = city ? `${whereText} in ${city}` : whereText;
  const localTime = moment.timeLabel;
  const flavour = country ? ` in ${city ? `${city}, ` : ''}${country}` : '';

  return {
    place,
    phase,
    timeLabel: localTime,
    text: `It is ${localTime}${flavour}, ${phase} light. She is ${whereText}.`,
  };
}

/** The expression both photographs share, so the pair reads like one short burst of selfies. */
export const SELFIE_EXPRESSIONS = [
  'a warm, easy smile — the kind she keeps when she likes the person she is sending it to',
  'a big toothy grin, like something genuinely made her laugh a second ago',
  'a slightly serious, deadpan look with just the corner of her mouth giving in',
  'a playful funny face — raised eyebrow and a half-pout, not taking herself seriously at all',
];

/** The poses and styles: every request takes two of them, and they are never the same two. */
export const SELFIE_POSES = [
  'phone held high above eye level, chin tucked, looking up into the lens, shoulders angled away',
  'phone held low at chest height, head tilted, one shoulder forward, looking slightly down the lens',
  'arm stretched out to the side, body turned three-quarters away, glancing back over her shoulder',
  'close in and wide-eyed, face filling most of the frame, a hand half in her hair',
  'leaning against a wall or doorframe, phone at hip height, one knee up, casual and unhurried',
  'mid-movement, caught stepping towards the camera, hair a little flying, not quite in position',
  'straight down the lens from slightly behind, over her own shoulder, phone completely out of sight',
  'candid-style, eyes starting away and arriving on the lens last, shoulders loose and crooked',
];

/** The flaws every photograph is asked for — real phone-camera mistakes, not studio perfection. */
export const SELFIE_PHOTOGRAPHY_FLAWS = [
  'the horizon is tilted a few degrees — she did not straighten it and never would',
  'slightly soft focus and a little motion blur, as if her hand was still moving',
  'visible grain in the darker parts, like an old phone pushing its ISO too far',
  'a lens smudge throwing a greasy flare across one corner of the frame',
  'the framing is clumsy — part of her head cropped at the top, too much ceiling at the bottom',
  'mixed light: a warm bulb on one side of her face and cold daylight on the other',
  'one patch of the photo is blown out or too dark, because she metered for nothing at all',
];

function pickFrom(list, seed) {
  return list[seedHash(seed) % list.length];
}

/** The setting, the expression and the two poses of one request — shared by both photographs. */
export function liveChatSelfieScene({ location, moment, seed }) {
  const ambience = ambienceFor({ location, moment, seed });
  const expression = pickFrom(SELFIE_EXPRESSIONS, `${seed}|expression|${location}`);
  const flawIndex = seedHash(`${seed}|flaw-a`) % SELFIE_PHOTOGRAPHY_FLAWS.length;
  const flaws = [
    SELFIE_PHOTOGRAPHY_FLAWS[flawIndex],
    SELFIE_PHOTOGRAPHY_FLAWS[
      (flawIndex + 1 + (seedHash(`${seed}|flaw-b`) % (SELFIE_PHOTOGRAPHY_FLAWS.length - 1))) %
        SELFIE_PHOTOGRAPHY_FLAWS.length
    ],
  ];
  // Two different poses for the pair — never the same one twice in a row.
  const first = seedHash(`${seed}|pose-a`) % SELFIE_POSES.length;
  const second =
    (first + 1 + (seedHash(`${seed}|pose-b`) % (SELFIE_POSES.length - 1))) % SELFIE_POSES.length;
  const poses = [SELFIE_POSES[first], SELFIE_POSES[second]];

  return {
    ambience,
    expression,
    flaws,
    poses,
    /** The flaw she admits to in her caption — the first one, in her own words. */
    flaw: flaws[0],
  };
}

/**
 * The prompt of one photograph: the woman from the reference image, the shared outfit and
 * ambience, this variant's pose, the shared expression, the flaws, no phone anywhere in the
 * frame, and the timestamp-plus-watermark stamp in the bottom-right corner.
 */
export function buildLiveChatSelfiePrompt(request, variant) {
  const who = request.model.name || 'the woman in the reference photograph';
  const look = request.look
    ? `Keep her the woman in the reference image — her face, her features, her hair, her skin, her age and the outfit she is wearing in it. She is ${request.look}.`
    : 'Keep her the woman in the reference image — her face, her features, her hair, her skin, her age and the exact outfit she is wearing in it.';
  const place = variant.ambience.place;
  const stamp = variant.timestamp;
  const watermark = variant.watermark;

  return [
    `Take ONE new casual selfie of ${who} — the exact woman in the reference photograph, wearing exactly the same outfit as in that photograph.`,
    look,
    `The setting for this photograph: ${place}. ${variant.ambience.text}`,
    `Her expression in this photograph: ${variant.expression}.`,
    `Pose and style for THIS photograph (it is one of a pair taken a moment apart, in the same place and the same outfit, so the setting and the outfit match but this pose is its own): ${variant.pose}.`,
    'She is taking it herself, at arm’s length, on her own phone — the phone and her hand holding it must NEVER be visible anywhere in the frame. No mirror, no phone screen, no reflected device, nobody else taking it for her. Portrait orientation, head to waist, imperfect and immediate.',
    `Make it look like a real, unedited phone snapshot with honest photography flaws: ${variant.flaw}. It must NOT look like a studio photograph, an airbrushed portrait or an advert — real skin texture, real light, real mistakes, and the frame slightly tilted.`,
    `In the bottom-right corner of the photograph, stamp the camera roll the way a phone camera app does: the exact timestamp "${stamp}" and directly beneath it the phone camera watermark "${watermark}", in small clean semi-transparent white type, as part of the picture.`,
    'No other text, no captions, no logos, no emoji, no collage, no borders, no extra people. One single photograph of one single woman.',
  ].join(' ');
}

/** The Gemini body: this variant's prompt and her own profile photograph as the likeness. */
export function buildGeminiLiveChatSelfiesBody(request, variant) {
  const prompt = buildLiveChatSelfiePrompt(request, variant);
  const parts = [{ text: prompt }];

  if (request.reference) {
    const comma = request.reference.indexOf(',');
    const meta = comma > 0 ? request.reference.slice(5, comma) : '';
    const base64 = comma > 0 ? request.reference.slice(comma + 1) : '';
    if (base64) {
      parts.push({ inlineData: { mimeType: meta.split(';')[0] || 'image/jpeg', data: base64 } });
    }
  }

  return {
    contents: [{ role: 'user', parts }],
    generationConfig: { responseModalities: ['IMAGE'] },
  };
}

/** Validates the window's request. Returns the parsed request, or a message naming the problem. */
export function validateLiveChatSelfiesRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { error: 'invalid-payload' };
  }

  const model = payload.model && typeof payload.model === 'object' ? payload.model : {};
  const moment = payload.moment && typeof payload.moment === 'object' ? payload.moment : {};
  const reference = typeof payload.reference === 'string' ? payload.reference : '';
  const usableReference =
    reference.startsWith('data:image/') && reference.length <= MAX_LIVE_CHAT_REFERENCE_BYTES;
  if (!usableReference) return { error: 'reference-required' };

  return {
    request: {
      model: {
        slug: cleanSelfieText(model.slug, LIMITS.name),
        name: cleanSelfieText(model.name, LIMITS.name),
        handle: cleanSelfieText(model.handle, LIMITS.handle),
        location: cleanSelfieText(model.location, LIMITS.location),
        age: cleanSelfieText(model.age, LIMITS.age),
      },
      moment: {
        place: cleanSelfieText(moment.place, LIMITS.place),
        flaw: cleanSelfieText(moment.flaw, LIMITS.flaw),
      },
      look: cleanSelfieText(payload.look, LIMITS.look),
      timezone: cleanSelfieText(payload.timezone, LIMITS.timezone),
      seed: cleanSelfieText(payload.seed, LIMITS.seed),
      reference: usableReference ? reference : '',
    },
  };
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/**
 * `POST /api/livechatselfiesandphotos` — two fresh photographs of the model, taken at the moment
 * the chat is in. Answers JSON:
 *
 *   { ok: true, provider: "gemini", images: ["data:image/png;base64,…", "data:image/png;base64,…"],
 *     place: "…", flaw: "…", timestamp: "13/10/2026 22:07", watermark: "Shot on iPhone 18 Pro" }
 *
 * The photographs are generated server-side and come back as `data:` URLs: nothing is stored
 * anywhere, and the window drops them from the transcript the moment the chat session ends.
 */
export async function createLiveChatSelfiesResponse({ payload, env, fetchImpl = fetch }) {
  const validated = validateLiveChatSelfiesRequest(payload);
  if (validated.error) {
    return jsonResponse(400, { ok: false, error: validated.error });
  }

  const key = env.GEMINI_API_KEY?.trim();
  if (!key) {
    return jsonResponse(503, { ok: false, error: 'selfies-unavailable' });
  }

  const request = validated.request;
  const geminiModel = env.GEMINI_IMAGE_MODEL?.trim() || GEMINI_DEFAULT_IMAGE_MODEL;
  const watermark = env.LIVECHAT_PHONE_WATERMARK?.trim() || LIVE_CHAT_PHONE_WATERMARK_DEFAULT;

  // Her clock, her light and her streets: the whole scene is worked out once so both photographs
  // share the same outfit, the same ambience and the same expression.
  const moment = modelLocalMoment({
    location: request.model.location,
    timezone: request.timezone,
    now: new Date(),
  });
  const seed = request.seed || `${request.model.slug}|${moment.timestamp}`;
  const scene = liveChatSelfieScene({
    location: request.model.location,
    moment,
    seed,
  });

  const variantBase = {
    ambience: scene.ambience,
    expression: scene.expression,
    timestamp: moment.timestamp,
    watermark,
  };

  let unreachable = false;
  const answers = await Promise.all(
    scene.poses.map(async (pose) => {
      const variant = { ...variantBase, pose, flaw: scene.flaws[0] };
      try {
        const upstream = await fetchImpl(
          `${GEMINI_ENDPOINT}/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(key)}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(buildGeminiLiveChatSelfiesBody(request, variant)),
          },
        );
        if (!upstream.ok) {
          unreachable = true;
          return null;
        }
        const parsed = await upstream.json();
        return extractGeneratedImage(parsed);
      } catch {
        unreachable = true;
        return null;
      }
    }),
  );

  const images = answers.filter((image) => typeof image === 'string' && image.length > 0);
  if (images.length === 0) {
    if (unreachable) return jsonResponse(502, { ok: false, error: 'selfies-failed' });
    // The image model answered with words — a refusal, or a safety stop.
    return jsonResponse(502, { ok: false, error: 'selfies-refused' });
  }

  return jsonResponse(200, {
    ok: true,
    provider: 'gemini',
    model: geminiModel,
    images: images.slice(0, LIVE_CHAT_PHOTO_COUNT),
    count: Math.min(images.length, LIVE_CHAT_PHOTO_COUNT),
    place: scene.ambience.place,
    flaw: scene.flaw,
    expression: scene.expression,
    timestamp: moment.timestamp,
    localTime: moment.timeLabel,
    timezone: moment.zone,
    phase: moment.phase,
    watermark,
  });
}
