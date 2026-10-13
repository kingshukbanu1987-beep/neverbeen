/**
 * Reading what the visitor actually typed.
 *
 * People type fast on a phone: letters repeat when they are excited (`soooo beautiful`), the
 * apostrophe is skipped (`dont`, `im`, `whats`), short words are swallowed (`u`, `ur`, `pls`), and
 * long words come out one key to the left (`beutiful`, `boyfrind`, `freind`). Before any of the
 * reply engine's patterns look at a message, it is read once here: the stretched letters are
 * collapsed, the everyday short forms are written out, and a word of five letters or more that is
 * one mistake away from a word the chat cares about is repaired to it.
 *
 * The result is deliberately conservative. `analysed` is used for matching only — the visitor's own
 * words (`original`) are what the window shows, and a repaired word never changes a name, a place
 * or anything the answer quotes back.
 */

/** Everyday chat forms, written out. Keyed on the lower-cased, apostrophe-free token. */
const SHORT_FORMS: Record<string, string> = {
  u: 'you',
  ur: 'your',
  urs: 'yours',
  r: 'are',
  y: 'why',
  k: 'ok',
  pls: 'please',
  plz: 'please',
  plss: 'please',
  thx: 'thanks',
  thnx: 'thanks',
  thanx: 'thanks',
  tnx: 'thanks',
  ty: 'thank you',
  hv: 'have',
  hve: 'have',
  hd: 'had',
  vl: 'will',
  wl: 'will',
  wud: 'would',
  cud: 'could',
  shud: 'should',
  wil: 'will',
  wat: 'what',
  wht: 'what',
  wen: 'when',
  wher: 'where',
  hw: 'how',
  hwz: 'how is',
  n: 'and',
  nd: 'and',
  abt: 'about',
  b4: 'before',
  gr8: 'great',
  msg: 'message',
  msgs: 'messages',
  pic: 'picture',
  pics: 'pictures',
  phots: 'photos',
  foto: 'photo',
  fotos: 'photos',
  luv: 'love',
  luvd: 'loved',
  lyk: 'like',
  lik: 'like',
  bcz: 'because',
  bcoz: 'because',
  coz: 'because',
  bful: 'beautiful',
  bfulll: 'beautiful',
  bae: 'baby',
  frnd: 'friend',
  frnds: 'friends',
  frend: 'friend',
  frends: 'friends',
  gf: 'girlfriend',
  bf: 'boyfriend',
  gud: 'good',
  gd: 'good',
  nyc: 'nice',
  naic: 'nice',
  aswome: 'awesome',
  aweome: 'awesome',
  reel: 'reel',
  contry: 'country',
  cantry: 'country',
  cty: 'city',
  wrk: 'work',
  wrking: 'working',
  studing: 'studying',
  stdy: 'study',
  schl: 'school',
  clg: 'college',
  uni: 'university',
  bio: 'biography',
  biografi: 'biography',
  biograhy: 'biography',
  marrige: 'marriage',
  mariage: 'marriage',
  weding: 'wedding',
  familly: 'family',
  famly: 'family',
  mothr: 'mother',
  brthr: 'brother',
  sistr: 'sister',
  boyfrnd: 'boyfriend',
  boyfrend: 'boyfriend',
  boyfrind: 'boyfriend',
  girlfrnd: 'girlfriend',
  gerlfriend: 'girlfriend',
  grlfriend: 'girlfriend',
  relation: 'relationship',
  realtionship: 'relationship',
  relatonship: 'relationship',
  adress: 'address',
  weathr: 'weather',
  tomorow: 'tomorrow',
  todays: 'today',
  nyt: 'night',
  gnyt: 'good night',
  gn: 'good night',
  gm: 'good morning',
  yup: 'yes',
  yep: 'yes',
  nope: 'no',
};

/**
 * Longer words the chat listens for, repaired when a message is one edit away from them
 * (`beutifull`, `gorjus`, `boyfrind`, `photograps`). Only words of five letters or more are
 * repaired, so short everyday words are never mangled.
 */
const KEYWORDS: readonly string[] = [
  'beautiful',
  'gorgeous',
  'pretty',
  'stunning',
  'handsome',
  'adorable',
  'photograph',
  'photographs',
  'photography',
  'picture',
  'pictures',
  'portfolio',
  'biography',
  'girlfriend',
  'boyfriend',
  'relationship',
  'marriage',
  'married',
  'university',
  'college',
  'school',
  'education',
  'career',
  'profession',
  'studying',
  'studies',
  'brother',
  'sister',
  'mother',
  'father',
  'parents',
  'family',
  'childhood',
  'hometown',
  'birthday',
  'ambition',
  'achievement',
  'hobbies',
  'hobby',
  'memories',
  'friends',
  'friend',
  'country',
  'promotion',
  'editorial',
  'campaign',
  'modelling',
  'modeling',
  'wonderful',
  'amazing',
  'fantastic',
  'incredible',
  'photoshoot',
  'instagram',
  'whatsapp',
  'neverbeen',
];

/** Replaces an apostrophe (straight or curly) so `don't` and `dont` are the same token. */
function tighten(token: string): string {
  return token.replace(/[’'`]/g, '');
}

/** `sooooo` → `soo`, `yesssss` → `yes`: a run of three or more letters becomes one. */
function collapseLetters(token: string): string {
  return token.replace(/([a-z])\1{2,}/g, '$1');
}

/** Classic Levenshtein distance, with an early exit once `limit` is passed. */
function distanceWithin(a: string, b: string, limit: number): boolean {
  if (Math.abs(a.length - b.length) > limit) return false;
  const rows = a.length + 1;
  const columns = b.length + 1;
  let previous = Array.from({ length: columns }, (_, index) => index);

  for (let row = 1; row < rows; row += 1) {
    const current = [row];
    let best = row;
    for (let column = 1; column < columns; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      const value = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + cost,
      );
      current.push(value);
      if (value < best) best = value;
    }
    if (best > limit) return false;
    previous = current;
  }

  return previous[columns - 1] <= limit;
}

/**
 * The keyword a word is one mistake away from, or the word itself when it is already one. A long
 * word gets a second edit of room (`beutifull`, `boyfrind`, `biograhy`), and a single-edit match is
 * always preferred to a double one.
 */
function repairWord(word: string): string {
  if (word.length < 5) return word;
  for (const keyword of KEYWORDS) {
    if (word === keyword) return word;
    if (distanceWithin(word, keyword, 1)) return keyword;
  }
  if (word.length < 8) return word;
  for (const keyword of KEYWORDS) {
    if (distanceWithin(word, keyword, 2)) return keyword;
  }
  return word;
}

export interface ChatVisitorReading {
  /** The message exactly as the visitor typed it. */
  original: string;
  /** The same message, lower-cased and repaired: this is what every pattern is tested against. */
  analysed: string;
  /** True when the reading needed a repair — a stretched word, a short form or a typo. */
  repaired: boolean;
}

/**
 * Reads one visitor message: the words stay in their order, the punctuation stays where it is, and
 * only the spelling is put back together.
 */
export function readVisitorMessage(text: string): ChatVisitorReading {
  const original = String(text ?? '');
  if (!original.trim()) return { original, analysed: '', repaired: false };

  let repaired = false;
  const analysed = original
    .split(/(\s+)/)
    .map((chunk) => {
      if (!chunk.trim()) return chunk;
      const bare = tighten(chunk).toLowerCase();
      if (!bare) return chunk;
      // The punctuation around the word is kept, so a question still ends in a question mark.
      const lead = /^[^\p{L}\p{N}]*/u.exec(chunk)?.[0] ?? '';
      const trail = /[^\p{L}\p{N}]*$/u.exec(chunk)?.[0] ?? '';
      const core = chunk.slice(lead.length, chunk.length - trail.length);
      const lowered = core.toLowerCase();

      const collapsed = collapseLetters(lowered);
      const known = SHORT_FORMS[collapsed] ?? SHORT_FORMS[tighten(collapsed)];
      const fixed = known ?? repairWord(collapsed);
      if (fixed !== lowered) repaired = true;
      return `${lead}${fixed}${trail}`;
    })
    .join('');

  return { original, analysed, repaired };
}

/** The one-word answer used by the tests and the transcript, e.g. `beautiful`. */
export function repairedToken(text: string): string {
  return readVisitorMessage(text).analysed;
}
