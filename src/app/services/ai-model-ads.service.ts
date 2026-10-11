import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';
import { AiModelProfile, aiModelProfiles } from '../pages/ai-models/ai-model-data';
import {
  AiModelAd,
  createRandom,
  hashSeed,
  pickAdModels,
  toAdvertisement,
} from '../shared/ai-model-ads/ai-model-ad';
import { CommunityService } from './community.service';

/** Where an advertisement was seen — the right rail of the Community Home, or the Journey feed. */
export type AiModelAdSurface = 'rail' | 'feed';

/** One impression or click of a model advertisement, as recorded by the Web API. */
export type AiModelAdEventType = 'impression' | 'click';

interface ModelAdEvent {
  modelSlug: string;
  type: AiModelAdEventType;
  surface: AiModelAdSurface;
}

/** Answer of `GET /api/models/ads` — the pool the studio advertises from. */
interface ModelAdPoolResponse {
  items?: Array<{ modelSlug?: string; isActive?: boolean; weight?: number }>;
}

/** Pool rows the website received, keyed by slug. */
interface ModelAdPool {
  /** Slugs the studio paused (`IsActive = false`) — they leave the rotation. */
  retired: ReadonlySet<string>;
  /** Serving weight 1..10 per slug; a model without a row keeps weight 1. */
  weights: ReadonlyMap<string, number>;
}

const API_TIMEOUT_MS = 20_000;
/** Events are sent in small batches so a browsing member never causes a request per card. */
const EVENT_FLUSH_DELAY_MS = 2_500;

/**
 * Serves the NeverBeen AI Models advertisement: which models the rail and the Journey feed show,
 * which of their photographs appear, and — when the Web API is live — which models the studio has
 * switched on for advertising plus the impression/click counters that tell the founder which
 * profiles the advertisement actually reaches.
 *
 * The catalog itself lives in the website build (`ai-model-data.ts`), so both advertisements work
 * fully offline and for guests; the API only tunes and measures them. When the pool or the event
 * endpoint is unavailable the service quietly falls back to the whole studio roster and to local
 * (untracked) rotation.
 */
@Injectable({ providedIn: 'root' })
export class AiModelAdsService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly community = inject(CommunityService);

  /** This visit's randomness — refreshed on every page load, stable while the member browses. */
  private readonly sessionSeed = hashSeed(Date.now() & 0xffffffff, Math.floor(Math.random() * 0xffffffff));
  private readonly railRandom = createRandom(hashSeed(this.sessionSeed, 0x9e3779b9));

  /** The studio pool; null until `GET /api/models/ads` answers (or fails, leaving the roster). */
  private readonly pool = signal<ModelAdPool | null>(null);
  private poolRequested = false;

  private readonly railCache = new Map<number, AiModelAd[]>();
  private readonly feedAdCache = new Map<number, AiModelAd>();
  private readonly adSlotCache = new Map<number, boolean>();
  private readonly feedSeed = hashSeed(this.sessionSeed, 0x85ebca6b);

  /**
   * The models the advertisement may use. Every model of the studio catalog takes part by
   * default; the API pool only removes the models the studio paused and favours the ones it
   * gave a higher rotation weight.
   */
  private readonly eligibleModels = computed<AiModelProfile[]>(() => {
    const pool = this.pool();
    const roster = pool ? aiModelProfiles.filter((model) => !pool.retired.has(model.slug)) : aiModelProfiles;
    const models = roster.length ? roster : aiModelProfiles;
    if (!pool) return models;

    // Weighted pool: a model with weight 3 appears three times, so she is drawn three times as often.
    const weighted: AiModelProfile[] = [];
    for (const model of models) {
      const weight = Math.min(10, Math.max(1, Math.round(pool.weights.get(model.slug) ?? 1)));
      for (let copy = 0; copy < weight; copy += 1) weighted.push(model);
    }
    return weighted;
  });

  constructor() {
    this.loadAdPool();
  }

  /**
   * The models the right rail advertises, 15 by default. The arrangement is drawn once and
   * cached per size, so the panel keeps the same faces while the member is on the page.
   */
  railAds(count = 15): AiModelAd[] {
    const size = Math.max(0, Math.min(48, Math.floor(count)));
    const cached = this.railCache.get(size);
    if (cached) return cached;

    const roster = this.eligibleModels();
    const picked = pickAdModels(roster, size, this.railRandom);
    const advertisements = picked.map((model, index) =>
      toAdvertisement(model, createRandom(hashSeed(this.sessionSeed, 0x27d4eb2f, index))),
    );
    this.railCache.set(size, advertisements);
    return advertisements;
  }

  /**
   * The advertisement that runs **after** Journey post `postIndex`, or null when this post keeps
   * the feed ad-free. Slots land at irregular intervals (roughly every four to six posts, never
   * two in a row) and every model in the studio takes a turn in the rotation.
   */
  feedAdAfter(postIndex: number): AiModelAd | null {
    if (!this.isAdSlot(postIndex)) return null;
    return this.feedAdForSlot(this.slotNumber(postIndex));
  }

  /** Records that an advertisement was shown (best effort; ignored while the API is unavailable). */
  trackImpression(advertisement: AiModelAd, surface: AiModelAdSurface): void {
    this.queueEvent({ modelSlug: advertisement.slug, type: 'impression', surface });
  }

  /** Records that a member opened the advertised portfolio (best effort). */
  trackClick(advertisement: AiModelAd, surface: AiModelAdSurface): void {
    this.queueEvent({ modelSlug: advertisement.slug, type: 'click', surface });
  }

  // ---------------------------------------------------------------------------------------
  // Journey feed placement
  // ---------------------------------------------------------------------------------------

  /**
   * True when an advertisement follows the post at `postIndex`. Deterministic per visit: the same
   * post keeps its advertisement after "Load more" appends older stories.
   */
  private isAdSlot(postIndex: number): boolean {
    if (postIndex < 2) return false; // the feed always opens with real stories
    const cached = this.adSlotCache.get(postIndex);
    if (cached !== undefined) return cached;

    const previous = this.adSlotCache.get(postIndex - 1) ?? this.computeAdSlot(postIndex - 1);
    const before = this.adSlotCache.get(postIndex - 2) ?? this.computeAdSlot(postIndex - 2);
    const slot = !previous && !before && this.computeAdSlot(postIndex);
    this.adSlotCache.set(postIndex, slot);
    return slot;
  }

  private computeAdSlot(postIndex: number): boolean {
    if (postIndex < 2) return false;
    // ≈ one advertisement every four to five posts, at irregular positions.
    return hashSeed(this.feedSeed, postIndex * 2 + 1) % 100 < 22;
  }

  /** Which advertisement this slot shows — 0-based, counting slots from the top of the feed. */
  private slotNumber(postIndex: number): number {
    let slots = 0;
    for (let index = 2; index <= postIndex; index += 1) {
      if (this.isAdSlot(index)) slots += 1;
    }
    return Math.max(0, slots - 1);
  }

  private feedAdForSlot(slot: number): AiModelAd {
    const cached = this.feedAdCache.get(slot);
    if (cached) return cached;

    const roster = this.eligibleModels();
    const model = roster[slot % roster.length];
    const advertisement = toAdvertisement(model, createRandom(hashSeed(this.feedSeed, 0x165667b1, slot)));
    this.feedAdCache.set(slot, advertisement);
    return advertisement;
  }

  // ---------------------------------------------------------------------------------------
  // Web API bridge (ad pool + impression / click counters)
  // ---------------------------------------------------------------------------------------

  /** Reads the studio's advertising pool once per visit. Failures keep the full roster in play. */
  private loadAdPool(): void {
    const http = this.http;
    if (this.poolRequested || !http || !this.community.apiLive) return;
    this.poolRequested = true;

    void firstValueFrom(
      http
        .get<ModelAdPoolResponse>(`${this.community.apiUrl}/api/models/ads`)
        .pipe(timeout({ first: API_TIMEOUT_MS }), catchError(() => of(null))),
    ).then((response) => {
      const items = response?.items ?? [];
      if (items.length === 0) return; // no pool published — advertise the whole roster
      const retired = new Set<string>();
      const weights = new Map<string, number>();
      for (const item of items) {
        const slug = (item.modelSlug ?? '').trim();
        if (!slug) continue;
        if (item.isActive === false) {
          retired.add(slug);
          continue;
        }
        weights.set(slug, Math.min(10, Math.max(1, Math.round(item.weight ?? 1))));
      }
      if (retired.size === items.length) return; // every row paused — never advertise nothing
      this.pool.set({ retired, weights });
      // The pool changed the roster — rebuild the arrangements the surfaces already asked for.
      this.railCache.clear();
      this.feedAdCache.clear();
    });
  }

  private readonly pendingEvents = new Map<string, ModelAdEvent>();
  private flushTimer?: ReturnType<typeof setTimeout>;

  private queueEvent(event: ModelAdEvent): void {
    if (!this.http || !this.community.apiLive) return;
    const key = `${event.type}|${event.surface}|${event.modelSlug}`;
    if (this.pendingEvents.has(key)) return;
    this.pendingEvents.set(key, event);
    if (this.pendingEvents.size >= 25) {
      this.flushEvents();
      return;
    }
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => this.flushEvents(), EVENT_FLUSH_DELAY_MS);
  }

  private flushEvents(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    const http = this.http;
    if (!http || this.pendingEvents.size === 0) return;
    const events = [...this.pendingEvents.values()];
    this.pendingEvents.clear();
    // Best effort: a failing counter must never disturb the member's page.
    http
      .post(`${this.community.apiUrl}/api/models/ads/events`, { events })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }
}
