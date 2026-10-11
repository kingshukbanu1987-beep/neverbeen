import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { CommunityService } from './community.service';
import { ModelTestimonialAuthor } from './model-testimonials.service';

/** Which kind of album media a statistic, view or comment belongs to. */
export type MediaKind = 'photo' | 'video';

/** One photograph's or one clip's engagement numbers, as the page shows them. */
export interface MediaEngagementStats {
  /** Unique visitors who opened the photograph or started the clip. */
  seen: number;
  likes: number;
  comments: number;
  shares: number;
  likedByMe: boolean;
}

/** One Community member's comment on a photograph or a clip. */
export interface MediaComment {
  /** Server id, or a browser-local id when the API is unreachable. */
  id: string;
  text: string;
  createdAtUtc: string;
  author: ModelTestimonialAuthor;
}

/** Page of comments returned by the API (same shape as the other paged endpoints). */
export interface MediaCommentsPage {
  items: MediaComment[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Thrown by `toggleLike` / `addComment` when nobody is signed in to the Community. */
export class SignInRequiredError extends Error {
  constructor(message = 'Sign in to the Community to do that.') {
    super(message);
    this.name = 'SignInRequiredError';
  }
}

const ZERO: MediaEngagementStats = { seen: 0, likes: 0, comments: 0, shares: 0, likedByMe: false };

/** localStorage keys: this browser's per-media record (counts start from a demo seed). */
const LOCAL_DB_KEY = 'neverbeen_media_engagement_v1';
/** Stable per-browser visitor token, so an anonymous "seen" is counted once per person. */
const VISITOR_KEY = 'neverbeen_media_visitor';
/** Comment length accepted by the API and shown in the panel. */
const MAX_COMMENT_LENGTH = 1000;

interface LocalMediaRecord {
  seeded: true;
  seedSeen: number;
  seedLikes: number;
  seedShares: number;
  /** Local account ids that liked this media in the browser-only store. */
  likedBy: number[];
  /** True once this browser counted a share of this media. */
  sharedLocally: boolean;
  comments: MediaComment[];
}

interface LocalDb {
  media: Record<string, LocalMediaRecord>;
}

/** Server rows for one media key, as `GET /api/models/{slug}/media/stats` returns them. */
interface MediaStatDto {
  mediaKey: string;
  mediaType: MediaKind;
  seenCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByMe: boolean;
}

interface MediaCommentDto {
  id: number;
  text: string;
  createdAtUtc: string;
  author: ModelTestimonialAuthor;
}

interface MediaCommentsPageDto {
  items: MediaCommentDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Deterministic 32-bit string hash — the browser-only demo numbers never flicker. */
function hashString(value: string): number {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

/** The demo voices a browser-only album starts with, before the community writes its own. */
const SEED_COMMENTS: readonly { author: string; text: string }[] = [
  {
    author: 'Meera Kapoor',
    text: 'The light in this frame is unreal — whoever styled this shoot deserves an award.',
  },
  {
    author: 'Daniel Okoye',
    text: 'Opened this one three times just to study the composition. Beautiful work.',
  },
  {
    author: 'Sofia Almeida',
    text: 'This pose with the window light is my favourite of the whole album.',
  },
  {
    author: 'Rohan Mehta',
    text: 'The colour grade here feels like a film still. Instant favourite.',
  },
  {
    author: 'Ayesha Noor',
    text: 'So much confidence in this shot. The portfolio just keeps getting better.',
  },
  {
    author: 'Lucas Meyer',
    text: 'Came for the reel, stayed for frames like this one. Stunning.',
  },
];

/**
 * Engagement numbers (seen / likes / comments / shares) for every photograph and clip of a
 * model's portfolio, plus the two write actions a signed-in Community member can take.
 *
 * Reads and anonymous counts go to the NeverBeen Web API
 * (`/api/models/{slug}/media/…`, see docs/patches/neverbeen-api-model-media-engagement.patch).
 * The first call decides the backend for the session: when the API is unreachable — or has not
 * been deployed with this feature yet — the service falls back to a browser-only store seeded
 * with plausible demo numbers, exactly like the rest of the Community's fallback mode, so the
 * portfolio always shows live-looking counts and its buttons always respond.
 *
 * Likes and comments are member-only: they throw `SignInRequiredError` when nobody is signed in,
 * which the engagement bar answers with the Community sign-in pop-up. "Seen" never needs an
 * account — each visitor (token or member) is counted once per photograph or clip.
 */
@Injectable({ providedIn: 'root' })
export class ModelMediaEngagementService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly community = inject(CommunityService, { optional: true });

  /** The read model every component renders from, keyed by `slug::kind::src`. */
  private readonly statsState = signal<Record<string, MediaEngagementStats>>({});
  readonly stats = this.statsState.asReadonly();

  /** Which store answered the first request of this session. */
  private backend: 'unknown' | 'api' | 'local' = 'unknown';
  private backendProbe: Promise<'api' | 'local'> | null = null;
  private readonly loadedModels = new Set<string>();
  private readonly inFlightLoads = new Map<string, Promise<void>>();
  /** Media each page has registered, so the browser-only store can seed them together. */
  private readonly registeredKeys = new Map<string, string[]>();

  /** Browser-only store; hydrated once, written through on every local mutation. */
  private local: LocalDb = this.readLocalDb();
  private readonly localVersion = signal(0);

  /** Views and shares already recorded by this browser, `slug::kind::src` keys. */
  private readonly recordedViews = new Set<string>(this.readRecordedList(LOCAL_DB_KEY + '_seen'));
  private readonly recordedShares = new Set<string>(this.readRecordedList(LOCAL_DB_KEY + '_shared'));

  constructor() {
    // When a member signs in mid-session, re-read the stats so `likedByMe` reflects their likes.
    effect(() => {
      const signedIn = !!this.community?.isAuthenticated?.();
      if (signedIn && this.backend === 'api') void this.reloadLoadedModels();
    });
  }

  // ------------------------------------------------------------------------------ reads

  /** The composite key every store uses for one photograph or clip of one model. */
  key(modelSlug: string, kind: MediaKind, src: string): string {
    return `${modelSlug}::${kind}::${src}`;
  }

  /** One media's numbers, ready for the template. Missing media reads as all zeros. */
  statsFor(modelSlug: string, kind: MediaKind, src: string): MediaEngagementStats {
    // Touch the local store in fallback mode so a `statsFor` after a local mutation re-renders.
    if (this.backend === 'local') this.localVersion();
    return this.statsState()[this.key(modelSlug, kind, src)] ?? ZERO;
  }

  /**
   * Tells the service which media a page shows and loads the model's counters. Pages call this
   * whenever the route's model (or album) changes; it is safe to call more than once.
   */
  registerModel(modelSlug: string, media: readonly { kind: MediaKind; src: string }[]): void {
    if (!modelSlug) return;
    const keys = media.map((item) => this.key(modelSlug, item.kind, item.src));
    this.registeredKeys.set(modelSlug, keys);
    void this.loadStats(modelSlug);
  }

  /** Loads (or reloads) every counter of one model. Never throws. */
  async loadStats(modelSlug: string, force = false): Promise<void> {
    if (!modelSlug) return;
    if (!force && this.loadedModels.has(modelSlug)) return;
    const existing = this.inFlightLoads.get(modelSlug);
    if (!force && existing) return existing;

    const task = (async () => {
      try {
        const mode = await this.ensureBackend(modelSlug);
        if (mode === 'api') {
          const rows = await this.fetchStatsFromApi(modelSlug);
          if (rows) {
            this.applyApiRows(modelSlug, rows);
            this.loadedModels.add(modelSlug);
            return;
          }
          // The API disappeared after the probe — fall back for the rest of the session.
          this.backend = 'local';
          this.backendProbe = null;
        }
        this.hydrateLocal(this.registeredKeys.get(modelSlug) ?? []);
        this.loadedModels.add(modelSlug);
      } finally {
        this.inFlightLoads.delete(modelSlug);
      }
    })();

    this.inFlightLoads.set(modelSlug, task);
    return task;
  }

  /** Stats the API answered with, for tests and diagnostics. `null` in browser-only mode. */
  async fetchStatsFromApi(modelSlug: string): Promise<MediaStatDto[] | null> {
    if (!this.http) return null;
    try {
      const rows = await firstValueFrom(
        this.http
          .get<MediaStatDto[]>(this.endpoint(modelSlug, 'stats'), { headers: this.readHeaders() })
          .pipe(timeout({ first: 15_000 })),
      );
      return Array.isArray(rows) ? rows : [];
    } catch {
      return null;
    }
  }

  // ------------------------------------------------------------------------------ writes

  /**
   * Counts one open of a photograph or one start of a clip — no sign-in required. The browser
   * records it at most once per media, and the API counts each visitor (token or member) once.
   */
  async recordView(modelSlug: string, kind: MediaKind, src: string): Promise<void> {
    if (!modelSlug || !src) return;
    const key = this.key(modelSlug, kind, src);
    if (this.recordedViews.has(key)) return;

    const mode = await this.ensureBackend(modelSlug);
    if (mode === 'api') {
      const seen = await this.postCount(modelSlug, 'view', kind, src);
      if (seen !== null) {
        this.recordedViews.add(key);
        this.rememberList(LOCAL_DB_KEY + '_seen', key);
        this.patchStats(key, (current) => ({ ...current, seen }));
        return;
      }
      // A transient network failure keeps the session on the API; the count simply waits
      // for the next load. Nothing is written locally, so the number is never double-counted.
      return;
    }

    this.recordedViews.add(key);
    this.rememberList(LOCAL_DB_KEY + '_seen', key);
    this.ensureLocalRecord(key);
    this.hydrateLocalKeys([key]);
  }

  /**
   * Counts one share of a photograph or clip (the native share sheet, or the copied link).
   * Each visitor is counted once per media, the same way "seen" works.
   */
  async recordShare(modelSlug: string, kind: MediaKind, src: string): Promise<void> {
    if (!modelSlug || !src) return;
    const key = this.key(modelSlug, kind, src);
    if (this.recordedShares.has(key)) return;

    const mode = await this.ensureBackend(modelSlug);
    if (mode === 'api') {
      const shares = await this.postCount(modelSlug, 'share', kind, src);
      if (shares !== null) {
        this.recordedShares.add(key);
        this.rememberList(LOCAL_DB_KEY + '_shared', key);
        this.patchStats(key, (current) => ({ ...current, shares }));
      }
      return;
    }

    this.recordedShares.add(key);
    this.rememberList(LOCAL_DB_KEY + '_shared', key);
    const record = this.ensureLocalRecord(key);
    if (!record.sharedLocally) {
      record.sharedLocally = true;
      this.persistLocal();
    }
    this.hydrateLocalKeys([key]);
  }

  /** Adds or removes the member's like. Throws `SignInRequiredError` without a session. */
  async toggleLike(modelSlug: string, kind: MediaKind, src: string): Promise<MediaEngagementStats> {
    const user = this.community?.currentUser?.() ?? null;
    if (!this.community?.isAuthenticated?.() || !this.community?.token?.() || !user) {
      throw new SignInRequiredError();
    }
    if (!modelSlug || !src) throw new Error('This media is not part of a published portfolio.');

    const key = this.key(modelSlug, kind, src);
    const mode = await this.ensureBackend(modelSlug);

    if (mode === 'api') {
      try {
        const result = await firstValueFrom(
          this.http!
            .post<{ liked: boolean; likeCount: number }>(
              this.endpoint(modelSlug, 'like'),
              { mediaKey: src, mediaType: kind },
              { headers: this.writeHeaders() },
            )
            .pipe(timeout({ first: 15_000 })),
        );
        this.patchStats(key, (current) => ({
          ...current,
          likedByMe: result.liked,
          likes: result.likeCount,
        }));
        return this.statsState()[key] ?? ZERO;
      } catch (error) {
        if (error instanceof SignInRequiredError) throw error;
        throw new Error('Your like could not be saved right now. Please try again.');
      }
    }

    const record = this.ensureLocalRecord(key);
    const liked = !record.likedBy.includes(user.id);
    if (liked) record.likedBy.push(user.id);
    else record.likedBy = record.likedBy.filter((id) => id !== user.id);
    this.persistLocal();
    this.hydrateLocalKeys([key]);
    return this.statsState()[key] ?? ZERO;
  }

  /** One page of comments — public, so everybody opening a photograph can read them. */
  async fetchComments(
    modelSlug: string,
    kind: MediaKind,
    src: string,
    page = 1,
    pageSize = 50,
  ): Promise<MediaCommentsPage> {
    if (!modelSlug || !src) return emptyPage(page, pageSize);
    const key = this.key(modelSlug, kind, src);
    const mode = await this.ensureBackend(modelSlug);

    if (mode === 'api') {
      try {
        const result = await firstValueFrom(
          this.http!
            .get<MediaCommentsPageDto>(this.endpoint(modelSlug, 'comments'), {
              params: { mediaKey: src, mediaType: kind, page, pageSize },
              headers: this.readHeaders(),
            })
            .pipe(timeout({ first: 15_000 })),
        );
        const items = (result.items ?? []).map(toComment);
        this.patchStats(key, (current) => ({ ...current, comments: result.totalCount }));
        return {
          items,
          totalCount: result.totalCount,
          page: result.page ?? page,
          pageSize: result.pageSize ?? pageSize,
          totalPages: result.totalPages ?? 1,
        };
      } catch {
        // The API failed mid-session: answer from the browser store rather than an error page.
        this.backend = 'local';
        this.backendProbe = null;
      }
    }

    const record = this.ensureLocalRecord(key);
    this.hydrateLocalKeys([key]);
    const start = (Math.max(1, page) - 1) * pageSize;
    const items = record.comments.slice(start, start + pageSize);
    return {
      items,
      totalCount: record.comments.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(record.comments.length / pageSize)),
    };
  }

  /** Publishes the member's comment. Throws `SignInRequiredError` without a session. */
  async addComment(modelSlug: string, kind: MediaKind, src: string, text: string): Promise<MediaComment> {
    const user = this.community?.currentUser?.() ?? null;
    if (!this.community?.isAuthenticated?.() || !this.community?.token?.() || !user) {
      throw new SignInRequiredError();
    }
    const clean = text.trim();
    if (!clean) throw new Error('Write something first.');
    if (clean.length > MAX_COMMENT_LENGTH) {
      throw new Error(`A comment can be up to ${MAX_COMMENT_LENGTH} characters.`);
    }
    if (!modelSlug || !src) throw new Error('This media is not part of a published portfolio.');

    const key = this.key(modelSlug, kind, src);
    const mode = await this.ensureBackend(modelSlug);

    if (mode === 'api') {
      try {
        const created = await firstValueFrom(
          this.http!
            .post<MediaCommentDto>(
              this.endpoint(modelSlug, 'comments'),
              { mediaKey: src, mediaType: kind, text: clean },
              { headers: this.writeHeaders() },
            )
            .pipe(timeout({ first: 15_000 })),
        );
        this.patchStats(key, (current) => ({ ...current, comments: current.comments + 1 }));
        return toComment(created);
      } catch (error) {
        if (error instanceof SignInRequiredError) throw error;
        throw new Error('Your comment could not be posted right now. Please try again.');
      }
    }

    const record = this.ensureLocalRecord(key);
    const comment: MediaComment = {
      id: `local-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      text: clean,
      createdAtUtc: new Date().toISOString(),
      author: {
        id: user.id,
        uniqueId: user.uniqueId,
        fullName: user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' '),
        profilePhotoUrl: user.profilePhotoUrl,
        isVerified: user.isVerified,
        activeStatus: user.activeStatus,
        customStatusText: user.customStatusText,
        lastSeenUtc: user.lastSeenUtc,
      },
    };
    record.comments.unshift(comment);
    this.persistLocal();
    this.hydrateLocalKeys([key]);
    return comment;
  }

  // ------------------------------------------------------------------------------ backends

  /** Resolves (once) whether this session talks to the API or to the browser store. */
  private ensureBackend(modelSlug: string): Promise<'api' | 'local'> {
    if (this.backend !== 'unknown') return Promise.resolve(this.backend);
    if (!this.backendProbe) {
      this.backendProbe = (async () => {
        if (!this.http || !modelSlug) return (this.backend = 'local');
        const rows = await this.fetchStatsFromApi(modelSlug);
        if (rows) return (this.backend = 'api');
        return (this.backend = 'local');
      })();
    }
    return this.backendProbe;
  }

  private async reloadLoadedModels(): Promise<void> {
    for (const slug of this.loadedModels) await this.loadStats(slug, true);
  }

  /** API rows carry the media key but not the model slug — they arrive scoped by the request. */
  private applyApiRows(modelSlug: string, rows: readonly MediaStatDto[]): void {
    this.statsState.update((current) => {
      const next = { ...current };
      for (const row of rows) {
        if (!row || !row.mediaKey) continue;
        const kind: MediaKind = row.mediaType === 'video' ? 'video' : 'photo';
        next[this.key(modelSlug, kind, row.mediaKey)] = {
          seen: row.seenCount ?? 0,
          likes: row.likeCount ?? 0,
          comments: row.commentCount ?? 0,
          shares: row.shareCount ?? 0,
          likedByMe: !!row.likedByMe,
        };
      }
      return next;
    });
  }

  private async postCount(
    modelSlug: string,
    action: 'view' | 'share',
    kind: MediaKind,
    src: string,
  ): Promise<number | null> {
    if (!this.http) return null;
    try {
      const result = await firstValueFrom(
        this.http
          .post<{ seenCount?: number; shareCount?: number }>(
            this.endpoint(modelSlug, action),
            { mediaKey: src, mediaType: kind, viewerToken: this.visitorToken() },
            { headers: this.readHeaders() },
          )
          .pipe(timeout({ first: 15_000 })),
      );
      return result?.seenCount ?? result?.shareCount ?? null;
    } catch {
      return null;
    }
  }

  // ------------------------------------------------------------------------ browser store

  private ensureLocalRecord(key: string): LocalMediaRecord {
    const existing = this.local.media[key];
    if (existing) return existing;
    const seed = seedFor(key);
    const record: LocalMediaRecord = {
      seeded: true,
      seedSeen: seed.seen,
      seedLikes: seed.likes,
      seedShares: seed.shares,
      likedBy: [],
      sharedLocally: false,
      comments: seedComments(key, seed.commentCount),
    };
    this.local.media[key] = record;
    this.persistLocal();
    return record;
  }

  private hydrateLocal(keys: readonly string[]): void {
    this.hydrateLocalKeys(keys);
  }

  private hydrateLocalKeys(keys: readonly string[]): void {
    if (keys.length === 0) {
      // Nothing registered yet: hydrate every record the browser already holds.
      keys = Object.keys(this.local.media);
    }
    this.localVersion.update((version) => version + 1);
    this.statsState.update((current) => {
      const next = { ...current };
      const userId = this.community?.currentUser?.()?.id;
      for (const key of keys) {
        const record = this.ensureLocalRecord(key);
        next[key] = {
          seen: record.seedSeen + (this.recordedViews.has(key) ? 1 : 0),
          likes: record.seedLikes + record.likedBy.length,
          comments: record.comments.length,
          shares: record.seedShares + (record.sharedLocally ? 1 : 0),
          likedByMe: userId != null && record.likedBy.includes(userId),
        };
      }
      return next;
    });
  }

  private patchStats(
    key: string,
    update: (current: MediaEngagementStats) => MediaEngagementStats,
  ): void {
    this.statsState.update((current) => ({ ...current, [key]: update(current[key] ?? ZERO) }));
  }

  private readLocalDb(): LocalDb {
    if (typeof localStorage === 'undefined') return { media: {} };
    try {
      const raw = localStorage.getItem(LOCAL_DB_KEY);
      if (!raw) return { media: {} };
      const parsed = JSON.parse(raw) as LocalDb;
      return parsed && typeof parsed.media === 'object' && parsed.media ? parsed : { media: {} };
    } catch {
      return { media: {} };
    }
  }

  private persistLocal(): void {
    this.localVersion.update((version) => version + 1);
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(this.local));
    } catch {
      // Storage full or blocked — the session keeps working from memory.
    }
  }

  private readRecordedList(storageKey: string): string[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }

  private rememberList(storageKey: string, key: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const current = this.readRecordedList(storageKey);
      if (!current.includes(key)) current.push(key);
      localStorage.setItem(storageKey, JSON.stringify(current.slice(-500)));
    } catch {
      // Best effort only — a fresh browser session may count the open once more.
    }
  }

  // ------------------------------------------------------------------------------ plumbing

  private endpoint(modelSlug: string, path: string): string {
    const base = (this.community?.apiUrl ?? '').replace(/\/+$/, '');
    return `${base}/api/models/${encodeURIComponent(modelSlug)}/media/${path}`;
  }

  private readHeaders(): HttpHeaders | undefined {
    const token = this.community?.token?.() ?? null;
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }

  private writeHeaders(): HttpHeaders {
    const token = this.community?.token?.() ?? null;
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  /** Stable per-browser id so the API can count an anonymous visitor exactly once. */
  private visitorToken(): string {
    if (typeof localStorage === 'undefined') return `t${Date.now()}${Math.random().toString(36).slice(2)}`;
    try {
      let token = localStorage.getItem(VISITOR_KEY);
      if (!token) {
        const raw =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
        token = raw.replace(/-/g, '').slice(0, 32);
        localStorage.setItem(VISITOR_KEY, token);
      }
      return token;
    } catch {
      return `t${Date.now()}${Math.floor(Math.random() * 1e9).toString(36)}`;
    }
  }
}

// ------------------------------------------------------------------------------- helpers

function emptyPage(page: number, pageSize: number): MediaCommentsPage {
  return { items: [], totalCount: 0, page, pageSize, totalPages: 0 };
}

function toComment(dto: MediaCommentDto): MediaComment {
  return {
    id: String(dto.id),
    text: dto.text,
    createdAtUtc: dto.createdAtUtc,
    author: dto.author,
  };
}

/** Demo counters for one media key — stable for as long as the browser store lives. */
function seedFor(key: string): {
  seen: number;
  likes: number;
  shares: number;
  commentCount: number;
} {
  const hash = hashString(key);
  return {
    seen: 64 + (hash % 1780),
    likes: 5 + ((hash >>> 3) % 132),
    shares: (hash >>> 7) % 41,
    commentCount: (hash >>> 11) % 4,
  };
}

function seedComments(key: string, count: number): MediaComment[] {
  const hash = hashString(key);
  const now = Date.now();
  return Array.from({ length: count }, (_, index) => {
    const pick = SEED_COMMENTS[(hash + index * 5) % SEED_COMMENTS.length];
    return {
      id: `seed-${hash}-${index}`,
      text: pick.text,
      createdAtUtc: new Date(now - (index + 1) * 9 * 60 * 60 * 1000 - (hash % 50) * 60 * 1000).toISOString(),
      author: {
        id: (hash + index) % 900 + 100,
        fullName: pick.author,
        isVerified: (hash + index) % 3 === 0,
        activeStatus: 'Active',
      },
    };
  });
}
