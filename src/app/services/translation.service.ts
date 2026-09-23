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
