import { Injectable, NgZone, OnDestroy, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

/**
 * Site-wide multilingual layer for NeverBeen.
 *
 * Picking a language in the Community login page dropdown translates every
 * visible string of the running app (navbar, login card, footer and every
 * routed page) via an external machine-translation API:
 *   1. Google Translate public "gtx" endpoint (no API key)
 *   2. MyMemory Translation API as automatic fallback
 *
 * Results are cached (memory + localStorage) so each language is fetched
 * once. Original English text is kept so switching back restores the source
 * exactly. Elements marked `data-no-translate` are left alone.
 */

export interface LanguageOption {
  code: string;
  /** Name of the language written in that language itself. */
  native: string;
  /** English name of the language. */
  english: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { code: 'es', native: 'Español', english: 'Spanish' },
  { code: 'fr', native: 'Français', english: 'French' },
  { code: 'de', native: 'Deutsch', english: 'German' },
  { code: 'it', native: 'Italiano', english: 'Italian' },
  { code: 'pt', native: 'Português', english: 'Portuguese' },
  { code: 'nl', native: 'Nederlands', english: 'Dutch' },
  { code: 'ru', native: 'Русский', english: 'Russian' },
  { code: 'zh-CN', native: '中文（简体）', english: 'Chinese (Simplified)' },
  { code: 'zh-TW', native: '中文（繁體）', english: 'Chinese (Traditional)' },
  { code: 'ja', native: '日本語', english: 'Japanese' },
  { code: 'ko', native: '한국어', english: 'Korean' },
  { code: 'ar', native: 'العربية', english: 'Arabic' },
  { code: 'he', native: 'עברית', english: 'Hebrew' },
  { code: 'tr', native: 'Türkçe', english: 'Turkish' },
  { code: 'sv', native: 'Svenska', english: 'Swedish' },
  { code: 'no', native: 'Norsk', english: 'Norwegian' },
  { code: 'da', native: 'Dansk', english: 'Danish' },
  { code: 'fi', native: 'Suomi', english: 'Finnish' },
  { code: 'pl', native: 'Polski', english: 'Polish' },
  { code: 'el', native: 'Ελληνικά', english: 'Greek' },
  { code: 'cs', native: 'Čeština', english: 'Czech' },
  { code: 'uk', native: 'Українська', english: 'Ukrainian' },
  { code: 'th', native: 'ไทย', english: 'Thai' },
  { code: 'vi', native: 'Tiếng Việt', english: 'Vietnamese' },
  { code: 'id', native: 'Bahasa Indonesia', english: 'Indonesian' },
  { code: 'ms', native: 'Bahasa Melayu', english: 'Malay' },
  { code: 'fil', native: 'Filipino', english: 'Filipino' },
  { code: 'sw', native: 'Kiswahili', english: 'Swahili' },
];

const STORAGE_LANG = 'neverbeen.language';
const CACHE_PREFIX = 'neverbeen.translate.cache.';
const MAX_CACHE_ENTRIES = 700;
const TRANSLATED_ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE']);
const HAS_LETTER = /[\p{L}]/u;

// -----------------------------------------------------------------------------
// Language detection helpers for user-generated content
// (Journey posts, MessageBook entries, comments, chats, About me, Intro …)
// -----------------------------------------------------------------------------

/**
 * Normalise a language tag so aliases and region variants compare equal
 * (e.g. `iw` → `he`, `zh` → `zh-CN`, `nb` → `no`, `tl` → `fil`).
 */
export function normalizeLanguageCode(code: string): string {
  const raw = code.trim().toLowerCase();
  if (!raw) return '';
  const primary = raw.split('-')[0];
  if (primary === 'zh') {
    return raw.includes('tw') || raw.includes('hk') || raw.includes('hant') ? 'zh-tw' : 'zh-cn';
  }
  if (primary === 'iw') return 'he';
  if (primary === 'tl' || primary === 'fil') return 'fil';
  if (primary === 'nb' || primary === 'nn' || primary === 'no') return 'no';
  if (primary === 'in') return 'id';
  if (primary === 'jv') return 'jv';
  return raw;
}

/** True when both codes represent the same language. Unknown/empty never matches. */
export function isSameLanguage(a: string, b: string): boolean {
  const na = normalizeLanguageCode(a);
  const nb = normalizeLanguageCode(b);
  return !!na && !!nb && na === nb;
}

/** Unambiguous writing systems — detection is instant and needs no API call. */
const SCRIPT_PATTERNS: Array<[RegExp, string]> = [
  [/[\u3040-\u30FF\u31F0-\u31FF]/u, 'ja'], // Japanese kana (before Han)
  [/[\uAC00-\uD7AF\u1100-\u11FF]/u, 'ko'], // Korean Hangul
  [/[\u4E00-\u9FFF\u3400-\u4DBF]/u, 'zh-CN'], // Chinese Han
  [/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/u, 'ar'],
  [/[\u0400-\u04FF\u0500-\u052F]/u, 'ru'], // Cyrillic
  [/[\u0900-\u097F]/u, 'hi'], // Devanagari
  [/[\u0E00-\u0E7F]/u, 'th'], // Thai
  [/[\u0590-\u05FF]/u, 'he'], // Hebrew
  [/[\u0370-\u03FF\u1F00-\u1FFF]/u, 'el'], // Greek
  [/[\u1780-\u17FF]/u, 'km'], // Khmer
  [/[\u1000-\u109F]/u, 'my'], // Myanmar
  [/[\u0E80-\u0EFF]/u, 'lo'], // Lao
];

/** Frequent words per Latin-script language for cheap offline scoring. */
const LATIN_KEYWORDS: Record<string, readonly string[]> = {
  en: [
    'the', 'and', 'is', 'are', 'was', 'were', 'you', 'your', 'that', 'this', 'with', 'for',
    'have', 'has', 'had', 'not', 'but', 'they', 'his', 'her', 'from', 'what', 'when', 'where',
    'who', 'how', 'why', 'all', 'can', 'will', 'just', 'about', 'into', 'over', 'some',
    'could', 'would', 'there', 'their', 'been', 'more', 'also', 'than', 'then', 'them',
    'these', 'those', 'its', 'our', 'out', 'get', 'like', 'one', 'two', 'very', 'much',
    'most', 'after', 'before', 'during', 'while', 'which', 'because', 'through', 'under',
    'between', 'want', 'make', 'made', 'take', 'day', 'time', 'way', 'people', 'good',
    'great', 'new', 'now', 'here', 'still', 'even', 'back', 'only', 'well', 'at', 'on',
    'of', 'to', 'in', 'is', 'it', 'as', 'be', 'by', 'or', 'an', 'we', 'do', 'if', 'so',
    'up', 'my', 'me', 'he', 'us', 'am', 'did', 'has', 'any', 'may', 'own', 'say', 'said',
    'post', 'photo', 'travel', 'journey', 'destination', 'vacation', 'gallery', 'neverbeen',
    'morning', 'evening', 'today', 'yesterday', 'tomorrow', 'really', 'beautiful', 'amazing',
  ],
  es: [
    'el', 'la', 'los', 'las', 'de', 'que', 'y', 'en', 'un', 'una', 'es', 'por', 'con',
    'para', 'no', 'se', 'del', 'al', 'lo', 'como', 'pero', 'más', 'mas', 'ya', 'este',
    'esta', 'son', 'está', 'esta', 'estoy', 'muy', 'también', 'tambien', 'porque', 'cuando',
    'donde', 'qué', 'hola', 'gracias', 'bueno', 'viaje', 'viajar', 'playa', 'ciudad',
    'gente', 'aquí', 'aqui', 'nuestro', 'vuestra', 'sus', 'esos', 'esas', 'todo', 'todos',
    'sino', 'pues', 'aunque', 'cada', 'otro', 'otra', 'bien', 'día', 'tiempo', 'foto',
    'mejor', 'gran', 'nuevo', 'ahora', 'siempre', 'también', 'fue', 'era', 'hay',
  ],
  fr: [
    'le', 'la', 'les', 'de', 'des', 'un', 'une', 'et', 'est', 'que', 'qui', 'dans', 'pour',
    'pas', 'sur', 'avec', 'plus', 'ce', 'cette', 'être', 'sont', 'nous', 'vous', 'je',
    'tu', 'il', 'elle', 'mais', 'où', 'ou', 'très', 'bien', 'aussi', 'parce', 'quand',
    'fait', 'voyage', 'ville', 'gens', 'merci', 'bonjour', 'notre', 'votre', 'leur',
    'aux', 'du', 'au', 'en', 'par', 'ne', 'se', 'sa', 'son', 'ses', 'ces', 'tout',
    'tous', 'toute', 'encore', 'même', 'alors', 'donc', 'puis', 'après', 'avant',
    'pendant', 'sous', 'entre', 'vers', 'chez', 'sans', 'contre', 'photo', 'jour',
    'temps', 'grand', 'nouveau', 'maintenant', 'toujours', 'était', 'été', 'avoir',
  ],
  de: [
    'der', 'die', 'das', 'und', 'ist', 'nicht', 'ein', 'eine', 'mit', 'auf', 'für',
    'von', 'zu', 'sich', 'auch', 'noch', 'nach', 'über', 'bei', 'aus', 'kann', 'ich',
    'wir', 'sie', 'mir', 'mich', 'sehr', 'aber', 'wenn', 'oder', 'denn', 'nur', 'schon',
    'mal', 'reise', 'stadt', 'leute', 'danke', 'hallo', 'sind', 'war', 'habe', 'hat',
    'wie', 'was', 'wo', 'jetzt', 'heute', 'gut', 'groß', 'neue', 'immer', 'diese',
    'dieser', 'meine', 'deine', 'seine', 'ihre', 'unser', 'euch', 'bin', 'dem', 'den',
  ],
  pt: [
    'o', 'a', 'os', 'as', 'de', 'do', 'da', 'que', 'e', 'em', 'um', 'uma', 'para',
    'com', 'não', 'se', 'no', 'na', 'por', 'mais', 'mas', 'já', 'está', 'são', 'eu',
    'você', 'muito', 'bom', 'viagem', 'cidade', 'gente', 'obrigado', 'olá', 'também',
    'quando', 'onde', 'como', 'isso', 'este', 'esta', 'meu', 'seu', 'nosso', 'mas',
    'bem', 'dia', 'tempo', 'foto', 'grande', 'novo', 'agora', 'sempre', 'foi', 'era',
  ],
  it: [
    'il', 'lo', 'la', 'i', 'gli', 'le', 'di', 'che', 'e', 'in', 'un', 'una', 'per',
    'non', 'si', 'del', 'della', 'è', 'sono', 'con', 'come', 'anche', 'più', 'molto',
    'bello', 'viaggio', 'città', 'grazie', 'ciao', 'quando', 'dove', 'perché', 'ma',
    'questo', 'questa', 'mio', 'tuo', 'suo', 'nostro', 'suo', 'più', 'già', 'poi',
    'dopo', 'prima', 'sempre', 'adesso', 'bene', 'giorno', 'tempo', 'foto', 'grande',
    'nuovo', 'era', 'stato', 'siamo', 'avete', 'hanno'
  ],
  nl: [
    'de', 'het', 'een', 'en', 'van', 'is', 'dat', 'niet', 'op', 'te', 'met', 'voor',
    'maar', 'ook', 'aan', 'er', 'zijn', 'wordt', 'kan', 'naar', 'uit', 'wel', 'als',
    'bij', 'dan', 'we', 'ik', 'je', 'dit', 'goed', 'reis', 'stad', 'mensen', 'dank',
    'heel', 'meer', 'meer', 'geen', 'al', 'wat', 'wie', 'waar', 'hoe', 'nu', 'toen',
    'altijd', 'groot', 'nieuw', 'tijd', 'dag', 'foto', 'mooi',
  ],
  pl: [
    'nie', 'jest', 'się', 'że', 'jak', 'ale', 'tak', 'ten', 'oraz', 'jeszcze', 'tylko',
    'gdzie', 'kiedy', 'dlaczego', 'kto', 'co', 'dla', 'przez', 'bardzo', 'dobrze',
    'podróż', 'miasto', 'ludzie', 'dziękuję', 'być', 'był', 'była', 'są', 'było',
    'może', 'przez', 'według', 'inni', 'inne', 'taki', 'ta', 'te', 'tu', 'tam',
    'teraz', 'zawsze', 'nowy', 'duży', 'czas', 'dzień',
  ],
  tr: [
    'bir', 'bu', 'için', 'çok', 'daha', 'ile', 'ama', 'gibi', 'sen', 'ben', 'değil',
    'var', 'kadar', 'diye', 'olan', 'ise', 'şey', 'ne', 'den', 'dan', 'tatil', 'şehir',
    'insanlar', 'teşekkür', 'merhaba', 'gibi', 'kendi', 'onun', 'böyle', 'şu', 'o',
    'biz', 'siz', 'onlar', 'her', 'hiç', 'şimdi', 'bugün', 'iyi', 'büyük', 'yeni',
    'zaman', 'gün', 'fotoğraf',
  ],
  id: [
    'yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'untuk', 'dengan', 'pada', 'adalah',
    'atau', 'juga', 'sudah', 'belum', 'ada', 'bisa', 'akan', 'kami', 'kamu', 'saya',
    'mereka', 'tidak', 'bukan', 'perjalanan', 'kota', 'orang', 'terima', 'halo', 'sangat',
    'lebih', 'para', 'oleh', 'karena', 'saat', 'ketika', 'dimana', 'siapa', 'bagaimana',
    'besar', 'baru', 'waktu', 'hari', 'foto', 'baik',
  ],
  ms: [
    'yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'untuk', 'dengan', 'pada', 'adalah',
    'atau', 'juga', 'sudah', 'ada', 'boleh', 'akan', 'saya', 'kamu', 'mereka', 'tidak',
    'perjalanan', 'bandar', 'orang', 'terima', 'hai', 'lebih', 'oleh', 'kerana', 'saat',
    'besar', 'baru', 'masa', 'hari', 'gambar', 'baik',
  ],
  vi: [
    'của', 'và', 'là', 'có', 'không', 'được', 'trong', 'cho', 'với', 'những', 'nhưng',
    'này', 'đã', 'vì', 'khi', 'tôi', 'bạn', 'chúng', 'rất', 'tốt', 'du lịch', 'thành',
    'phố', 'cảm', 'ơn', 'xin', 'chào', 'người', 'năm', 'ngày', 'giờ', 'ảnh', 'lớn',
    'mới', 'luôn', 'sau', 'trước', 'nhiều', 'một', 'hai', 'ở', 'từ', 'về',
  ],
  sv: [
    'och', 'att', 'är', 'inte', 'den', 'det', 'som', 'med', 'för', 'men', 'ett', 'har',
    'kan', 'från', 'när', 'över', 'efter', 'resa', 'stad', 'tack', 'hej', 'mycket',
    'bra', 'på', 'till', 'av', 'om', 'vid', 'ut', 'nu', 'idag', 'stor', 'ny', 'tid',
    'dag', 'foto', 'vi', 'du', 'jag', 'hur', 'var', 'när',
  ],
  no: [
    'og', 'at', 'er', 'ikke', 'den', 'det', 'som', 'med', 'for', 'men', 'har', 'kan',
    'når', 'over', 'etter', 'reise', 'by', 'takk', 'hei', 'veldig', 'bra', 'på', 'til',
    'av', 'om', 'ut', 'nå', 'idag', 'stor', 'ny', 'tid', 'dag', 'foto', 'vi', 'du',
    'jeg', 'hvor', 'hvordan',
  ],
  da: [
    'og', 'at', 'er', 'ikke', 'den', 'det', 'som', 'med', 'for', 'men', 'har', 'kan',
    'når', 'efter', 'rejse', 'by', 'tak', 'hej', 'meget', 'god', 'på', 'til', 'af',
    'om', 'ud', 'nu', 'i dag', 'stor', 'ny', 'tid', 'dag', 'foto', 'vi', 'du', 'jeg',
  ],
  fi: [
    'ja', 'on', 'ei', 'että', 'se', 'tai', 'kun', 'mutta', 'ole', 'olla', 'ne', 'myös',
    'vielä', 'juuri', 'matka', 'kaupunki', 'kiitos', 'hei', 'hyvä', 'paljon', 'nyt',
    'aina', 'suuri', 'uusi', 'aika', 'päivä', 'kuva', 'minä', 'sinä', 'me', 'he',
  ],
  cs: [
    'a', 'je', 'se', 'na', 'to', 'co', 'jak', 'ale', 'pro', 'nebo', 'když', 'kde',
    'proč', 'kdo', 'velmi', 'dobře', 'cesta', 'město', 'díky', 'ahoj', 'byl', 'byla',
    'jsou', 'tento', 'tato', 'můj', 'váš', 'teď', 'vždy', 'velký', 'nový', 'čas', 'den',
  ],
  uk: [
    'і', 'на', 'що', 'це', 'як', 'але', 'для', 'коли', 'де', 'хто', 'дуже', 'добре',
    'подорож', 'місто', 'дякую', 'привіт', 'не', 'є', 'він', 'вона', 'ми', 'ви',
    'було', 'була', 'цей', 'ця', 'тепер', 'завжди', 'великий', 'новий', 'час', 'день',
  ],
  sw: [
    'na', 'ya', 'wa', 'kwa', 'ni', 'katika', 'hii', 'hiyo', 'lakini', 'au', 'kama',
    'bila', 'baada', 'kabla', 'safari', 'mji', 'asante', 'habari', 'nzuri', 'sana',
    'huyo', 'wao', 'sisi', 'ninyi', 'yake', 'wake', 'leo', 'jana', 'kesho', 'mkuu',
    'mpya', 'wakati', 'siku', 'picha',
  ],
  fil: [
    'ang', 'ng', 'mga', 'sa', 'na', 'at', 'para', 'hindi', 'ito', 'iyon', 'ako', 'ikaw',
    'siya', 'kami', 'tayo', 'sila', 'mabuti', 'maganda', 'salamat', 'kumusta',
    'paglalakbay', 'lungsod', 'ngayon', 'kahapon', 'bukas', 'malaki', 'bago', 'oras',
    'araw', 'larawan',
  ],
};

/** Cheap offline detection: writing-system first, then Latin keyword scoring. */
function detectLanguageLocally(text: string): string | null {
  if (!HAS_LETTER.test(text)) return null;
  for (const [pattern, code] of SCRIPT_PATTERNS) {
    if (pattern.test(text)) return code;
  }
  const tokens = text.toLowerCase().match(/[\p{L}']+/gu) ?? [];
  if (tokens.length < 2) return null;
  let best: string | null = null;
  let bestScore = 0;
  let runnerUp = 0;
  for (const [code, words] of Object.entries(LATIN_KEYWORDS)) {
    const set = new Set(words);
    let score = 0;
    for (const token of tokens) {
      if (set.has(token)) score += 1;
    }
    if (score > bestScore) {
      runnerUp = bestScore;
      bestScore = score;
      best = code;
    } else if (score > runnerUp) {
      runnerUp = score;
    }
  }
  if (best && bestScore >= 2 && bestScore > runnerUp) return best;
  return null; // ambiguous → fall back to the external detection API
}

interface StringState {
  /** Original English text. */
  original: string;
  /** Last value written here (English or translated). */
  current: string;
  /** Language of `current` ('en' means it holds source text). */
  code: string;
}

type TranslationJob =
  | { kind: 'text'; node: Text; src: string }
  | { kind: 'attr'; el: Element; name: string; src: string };

@Injectable({ providedIn: 'root' })
export class TranslationService implements OnDestroy {
  readonly languages = LANGUAGES;
  readonly language = signal<string>('en');
  readonly translating = signal(false);

  private readonly textStates = new Map<Text, StringState>();
  private readonly attrStates = new Map<Element, Map<string, StringState>>();
  private readonly cache = new Map<string, string>();
  private readonly loadedCaches = new Set<string>();
  /** Detected language per user-content string (memory only). */
  private readonly detectCache = new Map<string, string>();
  private readonly detectCachePending = new Map<string, Promise<string>>();
  private observer: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private routerSub: Subscription | null = null;
  private running = false;
  private queued = false;

  constructor(private readonly router: Router, private readonly zone: NgZone) {
    try {
      const saved = localStorage.getItem(STORAGE_LANG);
      if (saved && LANGUAGES.some((l) => l.code === saved)) {
        this.language.set(saved);
        document.documentElement.lang = saved;
      }
    } catch {
      /* storage unavailable — stay on English */
    }
  }

  /** Start watching the DOM. Call once after the first render. */
  init(): void {
    if (this.observer || typeof document === 'undefined') return;

    this.zone.runOutsideAngular(() => {
      this.observer = new MutationObserver(() => this.schedule());
      this.observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: [...TRANSLATED_ATTRS],
      });
    });

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.schedule(280));

    if (this.language() !== 'en') {
      this.loadCacheFor(this.language());
      this.schedule(400);
    }
  }

  /** Switch the whole site to the given language. */
  setLanguage(code: string): void {
    const valid = LANGUAGES.some((l) => l.code === code) ? code : 'en';
    if (valid === this.language()) return;

    this.language.set(valid);
    try {
      localStorage.setItem(STORAGE_LANG, valid);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = valid;

    if (valid === 'en') {
      this.restoreEnglish();
      return;
    }
    this.loadCacheFor(valid);
    this.schedule(120);
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.observer?.disconnect();
    this.observer = null;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.persistTimer) clearTimeout(this.persistTimer);
  }

  // -------------------------------------------------------------------------
  // User-generated content: language detection + on-demand translation
  // -------------------------------------------------------------------------

  /**
   * Detect the language of a user's post / comment / chat message / About me
   * entry so the UI can decide whether to offer a "Translate" option.
   * Returns '' when detection fails (treated as "different from the UI
   * language" so the Translate option is never wrongly hidden).
   * Results are cached per text in memory.
   */
  detectLanguage(text: string): Promise<string> {
    const src = (text || '').trim();
    if (!HAS_LETTER.test(src) || src.length < 6) {
      return Promise.resolve(src ? 'en' : '');
    }
    const cached = this.detectCache.get(src);
    if (cached !== undefined) return Promise.resolve(cached);
    const pending = this.detectCachePending.get(src);
    if (pending) return pending;

    const job = (async (): Promise<string> => {
      let code = detectLanguageLocally(src);
      if (!code) code = (await this.detectViaApi(src)) ?? '';
      this.detectCache.set(src, code);
      this.detectCachePending.delete(src);
      return code;
    })();
    this.detectCachePending.set(src, job);
    return job;
  }

  /**
   * Translate a single piece of user content into `code` on demand (the
   * "Translate" option shown next to posts, comments, chats, About me …).
   * Uses the same external APIs + cache as the site-wide layer.
   */
  async translateContent(text: string, code: string): Promise<string | null> {
    const src = (text || '').trim();
    if (!src || !HAS_LETTER.test(src)) return null;
    const cacheKey = this.key(code, src);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    const translated = await this.translateText(code, src);
    if (translated) {
      this.cache.set(cacheKey, translated);
      this.persistCache(code);
    }
    return translated;
  }

  /** Ask the external Google Translate endpoint to identify the source language. */
  private async detectViaApi(src: string): Promise<string | null> {
    try {
      const probe = src.slice(0, 240);
      const url =
        'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t' +
        `&q=${encodeURIComponent(probe)}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data: unknown = await res.json();
      // Response shape: [[...]], null, "<detected source language>", ...
      if (Array.isArray(data) && typeof data[2] === 'string' && data[2].trim()) {
        return normalizeLanguageCode(data[2]);
      }
    } catch {
      /* offline / API unavailable — caller treats this as unknown */
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Scheduling
  // -------------------------------------------------------------------------

  private schedule(delayMs = 400): void {
    if (this.language() === 'en') return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.translatePass();
    }, delayMs);
  }

  private async translatePass(): Promise<void> {
    if (this.language() === 'en') return;
    if (this.running) {
      this.queued = true;
      return;
    }
    this.running = true;
    this.translating.set(true);
    try {
      const code = this.language();
      const jobs = this.collectJobs(code);
      const missing = [...new Set(jobs.map((j) => j.src))].filter(
        (s) => !this.cache.has(this.key(code, s)),
      );
      if (missing.length) {
        await this.resolveMany(code, missing);
      }
      this.applyJobs(code, jobs);
      this.prune();
    } finally {
      this.running = false;
      this.translating.set(false);
      if (this.queued) {
        this.queued = false;
        this.schedule(50);
      }
    }
  }

  // -------------------------------------------------------------------------
  // DOM collection / application
  // -------------------------------------------------------------------------

  private collectJobs(code: string): TranslationJob[] {
    const jobs: TranslationJob[] = [];

    const visitText = (node: Text): void => {
      const cur = node.nodeValue;
      if (cur === null) return;
      let state = this.textStates.get(node);
      if (state) {
        if (cur !== state.current) {
          // The framework replaced our text with fresh source copy.
          state = { original: cur, current: cur, code: 'en' };
          this.textStates.set(node, state);
        } else if (state.code === code) {
          return; // already translated into the active language
        }
      } else {
        if (!this.isTranslatable(cur)) return;
        state = { original: cur, current: cur, code: 'en' };
        this.textStates.set(node, state);
      }
      const src = state.original.trim();
      if (this.isTranslatable(src)) jobs.push({ kind: 'text', node, src });
    };

    const visitEl = (el: Element): void => {
      if (el.hasAttribute('data-no-translate')) return;
      if (SKIP_TAGS.has(el.tagName)) return;

      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          visitText(child as Text);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          visitEl(child as Element);
        }
      }

      for (const name of TRANSLATED_ATTRS) {
        const val = el.getAttribute(name);
        if (val === null) continue;
        let map = this.attrStates.get(el);
        let state = map?.get(name);
        if (state) {
          if (state.current !== val) {
            state = { original: val, current: val, code: 'en' };
            map!.set(name, state);
          } else if (state.code === code) {
            continue;
          }
        } else {
          if (!this.isTranslatable(val)) continue;
          if (!map) {
            map = new Map();
            this.attrStates.set(el, map);
          }
          state = { original: val, current: val, code: 'en' };
          map.set(name, state);
        }
        const src = state.original.trim();
        if (this.isTranslatable(src)) jobs.push({ kind: 'attr', el, name, src });
      }
    };

    if (document.body) visitEl(document.body);
    return jobs;
  }

  private applyJobs(code: string, jobs: TranslationJob[]): void {
    for (const job of jobs) {
      const translated = this.cache.get(this.key(code, job.src));
      if (!translated) continue; // API unavailable — keep the source copy

      if (job.kind === 'text') {
        if (!job.node.isConnected) continue;
        const state = this.textStates.get(job.node);
        if (!state || state.code === code) continue;
        const cur = job.node.nodeValue ?? '';
        const lead = cur.match(/^\s*/)?.[0] ?? '';
        const trail = cur.match(/\s*$/)?.[0] ?? '';
        const next = `${lead}${translated.trim()}${trail}`;
        job.node.nodeValue = next;
        state.current = next;
        state.code = code;
      } else {
        if (!job.el.isConnected) continue;
        const state = this.attrStates.get(job.el)?.get(job.name);
        if (!state || state.code === code) continue;
        if (state.current !== job.el.getAttribute(job.name)) continue;
        job.el.setAttribute(job.name, translated);
        state.current = translated;
        state.code = code;
      }
    }
  }

  /** Put every string back to its original English source. */
  private restoreEnglish(): void {
    for (const [node, state] of this.textStates) {
      if (node.isConnected && node.nodeValue === state.current) {
        node.nodeValue = state.original;
      }
    }
    this.textStates.clear();
    for (const [el, map] of this.attrStates) {
      if (!el.isConnected) continue;
      for (const [name, state] of map) {
        if (el.getAttribute(name) === state.current) {
          el.setAttribute(name, state.original);
        }
      }
    }
    this.attrStates.clear();
  }

  /** Drop bookkeeping for nodes the framework has removed. */
  private prune(): void {
    for (const node of this.textStates.keys()) {
      if (!node.isConnected) this.textStates.delete(node);
    }
    for (const el of this.attrStates.keys()) {
      if (!el.isConnected) this.attrStates.delete(el);
    }
  }

  private isTranslatable(value: string): boolean {
    const t = value.trim();
    return t.length >= 2 && HAS_LETTER.test(t);
  }

  // -------------------------------------------------------------------------
  // External translation APIs
  // -------------------------------------------------------------------------

  private key(code: string, text: string): string {
    return code + ' ' + text;
  }

  private async resolveMany(code: string, texts: string[]): Promise<void> {
    const queue = [...texts];
    const workers = Array.from({ length: 4 }, () =>
      (async () => {
        while (queue.length) {
          const src = queue.shift();
          if (src === undefined) break;
          const translated = await this.translateText(code, src);
          if (translated) {
            this.cache.set(this.key(code, src), translated);
            this.persistCache(code);
          }
        }
      })(),
    );
    await Promise.all(workers);
  }

  private async translateText(code: string, text: string): Promise<string | null> {
    const chunks = chunkText(text, 420);
    const parts: string[] = [];
    for (const chunk of chunks) {
      const part = await this.translateChunk(code, chunk);
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join(' ');
  }

  /** Primary: Google Translate public endpoint. Fallback: MyMemory API. */
  private async translateChunk(code: string, text: string): Promise<string | null> {
    try {
      const url =
        'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t' +
        `&tl=${encodeURIComponent(code)}&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: unknown = await res.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const out = (data[0] as unknown[])
            .map((seg) => (Array.isArray(seg) ? String(seg[0] ?? '') : ''))
            .join('');
          if (out.trim()) return out;
        }
      }
    } catch {
      /* fall through to the backup API */
    }

    try {
      const url =
        'https://api.mymemory.translated.net/get?langpair=' +
        `${encodeURIComponent('en|' + code)}&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        const out = data?.responseData?.translatedText;
        if (
          typeof out === 'string' &&
          out.trim() &&
          !/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(out)
        ) {
          return out;
        }
      }
    } catch {
      /* both APIs unavailable — original text is kept */
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Cache persistence
  // -------------------------------------------------------------------------

  private loadCacheFor(code: string): void {
    if (this.loadedCaches.has(code)) return;
    this.loadedCaches.add(code);
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + code);
      if (!raw) return;
      const entries = JSON.parse(raw) as [string, string][];
      for (const [src, tr] of entries) {
        if (typeof src === 'string' && typeof tr === 'string') {
          this.cache.set(this.key(code, src), tr);
        }
      }
    } catch {
      /* ignore corrupt cache */
    }
  }

  private persistCache(code: string): void {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      try {
        const prefix = code + ' ';
        const entries: [string, string][] = [];
        for (const [k, v] of this.cache) {
          if (k.startsWith(prefix)) entries.push([k.slice(prefix.length), v]);
          if (entries.length >= MAX_CACHE_ENTRIES) break;
        }
        localStorage.setItem(CACHE_PREFIX + code, JSON.stringify(entries));
      } catch {
        /* quota exceeded — in-memory cache still works */
      }
    }, 600);
  }
}

/** Split long copy on sentence/word boundaries so each API call stays small. */
function chunkText(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf('. ', max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(' ', max);
    if (cut < max * 0.5) cut = max;
    else cut += 1;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
}
