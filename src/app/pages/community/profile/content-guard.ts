/**
 * Fast community content guard.
 * Normalises text once, then checks a precompiled URL pattern and a token set
 * of slurs, sexual terms, and hate phrases across many languages.
 * It blocks the post; it never rewrites the member's words.
 */

export type ContentGuardReason = 'url' | 'language';

export interface ContentGuardResult {
  ok: boolean;
  reason: ContentGuardReason | null;
  message: string;
}

const URL_MESSAGE =
  'Links can’t be posted in NeverBeen. Remove the web address and try again.';
const LANGUAGE_MESSAGE =
  'This language can’t be posted. Journey posts, comments, MessageBook notes, and About Me can’t include slurs, sexual content, or hatred.';

const URL_RE =
  /(?:https?:\/\/|hxxps?:\/\/|www\.)\S+|\b[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\s*(?:\[\.\]|\(\.\)|dot)\s*|\.)(?:com|net|org|io|co|in|uk|de|fr|info|me|app|dev|xyz|ru|cn|jp|br|au|ca|us|edu|gov|tv|ly|gg|link|site|shop|online|blog)\b/i;

/** Explicit sexual terms, slurs, and hate words. Matched on normalised tokens. */
const BANNED_TOKENS = new Set<string>([
  // English sexual / explicit
  'fuck', 'fucking', 'fucker', 'motherfucker', 'shit', 'bullshit', 'bitch', 'cunt', 'dick', 'cock',
  'pussy', 'asshole', 'bastard', 'slut', 'whore', 'porn', 'porno', 'pornography', 'xxx', 'blowjob',
  'handjob', 'cumshot', 'orgasm', 'dildo', 'vibrator', 'hentai', 'nude', 'nudes', 'boobs', 'tits',
  'milf', 'incest', 'rape', 'rapist', 'molest', 'molester', 'pedophile', 'paedophile',
  // English slurs / hate
  'nigger', 'nigga', 'faggot', 'fag', 'dyke', 'tranny', 'retard', 'retarded', 'kike', 'spic', 'chink',
  'gook', 'wetback', 'raghead', 'towelhead', 'paki', 'beaner',
  // Spanish
  'puta', 'puto', 'mierda', 'joder', 'coño', 'cono', 'cabron', 'cabrón', 'pendejo', 'verga', 'chingar',
  'maricon', 'maricón', 'zorra', 'polla',
  // French
  'putain', 'merde', 'salope', 'encule', 'enculé', 'connard', 'connasse', 'nique',
  // German
  'scheisse', 'scheiße', 'fotze', 'hurensohn', 'wichser', 'schwuchtel', 'arschloch', 'ficken',
  // Italian
  'cazzo', 'minchia', 'vaffanculo', 'troia', 'puttana', 'stronzo', 'fica',
  // Portuguese
  'porra', 'caralho', 'puta', 'foder', 'buceta', 'viado', 'merda',
  // Dutch
  'kut', 'kanker', 'hoer', 'lul', 'neuken',
  // Russian (latin + cyrillic)
  'blyat', 'suka', 'pidor', 'khuy', 'сука', 'блядь', 'пидор', 'хуй',
  // Hindi / Hinglish / Bengali / Urdu
  'chutiya', 'chutia', 'madarchod', 'behenchod', 'bhosdike', 'randi', 'gaandu', 'lund', 'harami',
  'chodu', 'মাগি', 'শালা', 'हरामी', 'रंडी', 'चूतिया',
  // Arabic
  'كس', 'شرموطة', 'عرص', 'منيوك', 'كلب',
  // Turkish
  'siktir', 'orospu', 'amk', 'yarrak',
  // Indonesian / Malay
  'anjing', 'bangsat', 'kontol', 'memek', 'ngentot', 'bajingan',
  // Filipino
  'putangina', 'tangina', 'gago', 'kantot', 'puki',
  // Polish / Swedish / others
  'kurwa', 'pierdol', 'jebac', 'fitta', 'hora', 'neger',
  // Chinese / Japanese / Korean explicit
  '傻逼', '操你妈', '肏', 'セックス', 'エロ', '시발', '씨발', '병신', '보지', '자지',
]);

const BANNED_PHRASES = [
  'kill all', 'death to', 'gas the', 'go die', 'kys', 'hate all',
  'muertos todos', 'mort aux', 'tod die', 'смерть', 'मार डालो', 'মরে যা',
  'child porn', 'child sex', 'underage sex', 'sex tape',
];

function stripMarks(value: string): string {
  return value.normalize('NFKC').replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, '');
}

function fold(value: string): string {
  return stripMarks(value)
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/3/g, 'e')
    .replace(/1!|¡/g, 'i')
    .replace(/0/g, 'o')
    .replace(/\$5/g, 's')
    .replace(/7/g, 't')
    .replace(/(.)\1{2,}/g, '$1$1');
}

function tokensOf(value: string): string[] {
  const folded = fold(value);
  const parts = folded.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const joinedSingles: string[] = [];
  let bucket = '';
  for (const part of parts) {
    if (part.length === 1) {
      bucket += part;
      continue;
    }
    if (bucket.length >= 3) joinedSingles.push(bucket);
    bucket = '';
    joinedSingles.push(part);
  }
  if (bucket.length >= 3) joinedSingles.push(bucket);
  return joinedSingles;
}

export function inspectCommunityText(text: string | null | undefined): ContentGuardResult {
  const raw = (text ?? '').trim();
  if (!raw) return { ok: true, reason: null, message: '' };
  if (URL_RE.test(raw) || URL_RE.test(fold(raw))) {
    return { ok: false, reason: 'url', message: URL_MESSAGE };
  }
  const folded = fold(raw);
  for (const phrase of BANNED_PHRASES) {
    if (folded.includes(phrase)) {
      return { ok: false, reason: 'language', message: LANGUAGE_MESSAGE };
    }
  }
  for (const token of tokensOf(raw)) {
    if (BANNED_TOKENS.has(token)) {
      return { ok: false, reason: 'language', message: LANGUAGE_MESSAGE };
    }
  }
  // CJK and Arabic terms are not split by the latin tokeniser.
  for (const term of BANNED_TOKENS) {
    if (term.length >= 2 && /[^\u0000-\u007f]/.test(term) && folded.includes(term)) {
      return { ok: false, reason: 'language', message: LANGUAGE_MESSAGE };
    }
  }
  return { ok: true, reason: null, message: '' };
}

export function inspectCommunityFields(fields: Array<string | null | undefined>): ContentGuardResult {
  for (const field of fields) {
    const result = inspectCommunityText(field);
    if (!result.ok) return result;
  }
  return { ok: true, reason: null, message: '' };
}
