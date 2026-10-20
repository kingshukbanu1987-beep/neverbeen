import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CommunityService } from '../../services/community.service';
import { ModelLiveChatService } from '../../services/model-live-chat.service';
import {
  MediaKind,
  ModelMediaEngagementService,
} from '../../services/model-media-engagement.service';
import {
  CreateModelTestimonial,
  ModelTestimonial,
  ModelTestimonialAuthor,
  ModelTestimonialsService,
} from '../../services/model-testimonials.service';
import { rememberCommunityReturnPath } from '../../shared/community-return-path';
import { CommunitySignInCard } from '../../shared/community-sign-in-card/community-sign-in-card';
import { CompactCount, ExactCountPopover } from '../../shared/exact-count-popover';
import { ModelLiveChatPill } from '../../shared/model-live-chat-pill/model-live-chat-pill';
import { ModelVerifiedTick } from '../../shared/model-verified-tick/model-verified-tick';
import { ModelMediaCommentsDialog } from '../../shared/model-media-comments-dialog/model-media-comments-dialog';
import { ModelMediaEngagementBar } from '../../shared/model-media-engagement/model-media-engagement';
import { AiModelPhoto, AiModelProfile, AiModelVideo, aiModelProfiles } from './ai-model-data';
import { AiModelBookingDialog } from './booking/ai-model-booking';
import { AiModelChatDialog } from './chat/ai-model-chat';
import { LiveChatAccess } from './chat/live-chat-access';
import { requiresRegisteredChat } from './chat/live-chat-policy';
import { ChatIdentity } from './chat/chat-identity';
import { LiveChatPlan } from './chat/chat-types';
import { ModelHighlights } from './highlights/model-highlights';
import { PremiumPhotoTeaser } from './premium-content/premium-photo-teaser';
import { AiModelPhotoViewer } from './photo-viewer/ai-model-photo-viewer';
import { AiModelVideoPlayer } from './video/ai-model-video-player';

type PortfolioView = 'grid' | 'feed';
type AvailabilityState = 'available' | 'unavailable' | 'future';
type ShareState = 'idle' | 'shared' | 'copied' | 'unsupported';

/**
 * One tile of the photo section: an album photograph (which opens the lightbox at its own place in
 * the preview), a locked Premium Content teaser (which opens nothing), or the View All door that
 * closes the grid.
 */
export type PortfolioGalleryTile =
  | { kind: 'photo'; photo: AiModelPhoto; lightboxIndex: number }
  | { kind: 'premium'; photo: AiModelPhoto }
  | { kind: 'view-all'; photo: AiModelPhoto };

/** Fisher-Yates draw: which photograph lands in position 1, 2, 3 … of the album. */
function drawOrder(length: number): number[] {
  const positions = Array.from({ length }, (_, index) => index);
  for (let index = length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [positions[index], positions[swap]] = [positions[swap], positions[index]];
  }
  return positions;
}

/**
 * A fresh random arrangement of the album. The portfolio re-arranges itself on every visit, so the
 * same album never opens in the same order twice; the cover, the avatar and the counts are
 * unaffected.
 */
export function shufflePhotos(photos: readonly AiModelPhoto[]): AiModelPhoto[] {
  const order = drawOrder(photos.length);
  return order.map((source) => photos[source]);
}

/**
 * How many photographs the portfolio shows. A larger album shows a random selection of this many,
 * and its last tile opens the complete album on the model's "View All" page.
 */
export const PREVIEW_LIMIT = 12;

/**
 * How many locked Premium Content frames the photo section teases at most — "at least 4" whenever
 * the model holds four or more photographs in her `PremiumContent/` folder, and every one she has
 * when she holds fewer.
 */
export const PREMIUM_TEASER_LIMIT = 4;

/**
 * Draws up to `count` random slots among `total`, pairwise non-adjacent (never one straight after
 * another) and never the very last slot, which belongs to the View All door. When the room cannot
 * hold the whole count, as many as fit are drawn instead.
 */
export function drawPremiumTeaserSlots(count: number, total: number): number[] {
  if (count <= 0 || total <= 1) return [];
  // The last slot of the finished grid is reserved, so the candidates run 0 … total - 2.
  const candidates = Array.from({ length: total - 1 }, (_, index) => index);
  // `count` non-adjacent slots need 2·count − 1 candidates to exist at all.
  const roomForAll = candidates.length >= 2 * count - 1;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    for (let index = candidates.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [candidates[index], candidates[swap]] = [candidates[swap], candidates[index]];
    }

    const slots: number[] = [];
    for (const slot of candidates) {
      if (slots.length >= count) break;
      if (slots.every((taken) => Math.abs(taken - slot) >= 2)) slots.push(slot);
    }
    // A full set is what was asked for; when the room cannot hold one, the best partial set is.
    if (slots.length >= count || !roomForAll) return slots.sort((a, b) => a - b);
  }
  return [];
}

/**
 * Lays the album's photographs and the locked Premium Content teasers into one list: the teasers
 * land at random, never one straight after another, and never on the final slot. Each photograph
 * keeps the index it carries in the preview, so the lightbox still opens at the right frame.
 */
export function interleavePremiumTeasers(
  photos: readonly AiModelPhoto[],
  teasers: readonly AiModelPhoto[],
): PortfolioGalleryTile[] {
  const tiles: PortfolioGalleryTile[] = photos.map((photo, index) => ({
    kind: 'photo',
    photo,
    lightboxIndex: index,
  }));
  if (teasers.length === 0) return tiles;

  let nextTeaser = 0;
  for (const slot of drawPremiumTeaserSlots(teasers.length, photos.length + teasers.length)) {
    const teaser = teasers[nextTeaser];
    if (!teaser) break;
    tiles.splice(slot, 0, { kind: 'premium', photo: teaser });
    nextTeaser += 1;
  }
  return tiles;
}

@Component({
  selector: 'app-ai-model-portfolio-page',
  imports: [
    RouterLink,
    AiModelBookingDialog,
    AiModelChatDialog,
    LiveChatAccess,
    AiModelPhotoViewer,
    AiModelVideoPlayer,
    CompactCount,
    CommunitySignInCard,
    ModelLiveChatPill,
    ExactCountPopover,
    ModelMediaCommentsDialog,
    ModelMediaEngagementBar,
    ModelVerifiedTick,
    ModelHighlights,
    PremiumPhotoTeaser,
  ],
  templateUrl: './ai-model-portfolio.html',
  styleUrl: './ai-model-portfolio.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiModelPortfolioPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('slug') ?? '' },
  );
  // Some lightweight route hosts only expose `paramMap`; falling back keeps the portfolio usable in
  // embeds and tests while real routed pages read the post-Google `liveChatPlan` query string.
  private readonly returnedLiveChatPlan = toSignal(
    (this.route.queryParamMap ?? this.route.paramMap).pipe(
      map((params): LiveChatPlan | '' => {
        const plan = params.get('liveChatPlan');
        return plan === 'registered' || plan === 'premium' ? plan : '';
      }),
    ),
    {
      initialValue: ((): LiveChatPlan | '' => {
        const plan = this.route.snapshot.queryParamMap?.get('liveChatPlan') ?? '';
        return plan === 'registered' || plan === 'premium' ? plan : '';
      })(),
    },
  );

  protected readonly model = computed(
    () => aiModelProfiles.find((profile) => profile.slug === this.slug()) ?? null,
  );

  private readonly router = inject(Router);

  protected readonly community = inject(CommunityService);
  private readonly testimonialsApi = inject(ModelTestimonialsService);
  /** The Live Now / past-chat counts of the split pill beside the Live Chat button. */
  private readonly liveChats = inject(ModelLiveChatService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly engagement = inject(ModelMediaEngagementService);

  /** The photograph or clip whose thread the page-level comments pop-up shows. */
  protected readonly commentsTarget = signal<{ type: MediaKind; src: string } | null>(null);

  /** Only completed, active Community accounts may publish portfolio testimonials. */
  protected readonly canLeaveTestimonial = computed(() => {
    const user = this.community.currentUser();
    return (
      this.community.isAuthenticated() &&
      !this.community.guestBrowsing() &&
      !!user?.profileComplete &&
      user.status.trim().toLocaleLowerCase() === 'active'
    );
  });
  protected readonly needsCommunityProfileCompletion = computed(
    () => this.community.currentUser()?.status.trim().toLocaleLowerCase() === 'pending',
  );

  protected readonly testimonials = signal<ModelTestimonial[]>([]);
  protected readonly testimonialTotal = signal(0);
  protected readonly testimonialPage = signal(0);
  protected readonly testimonialPageSize = 50;
  protected readonly testimonialLoadState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly testimonialLoadError = signal('');
  protected readonly loadingMoreTestimonials = signal(false);
  protected readonly moreTestimonialsError = signal('');

  protected readonly headline = signal('');
  protected readonly testimonialText = signal('');
  protected readonly rating = signal(0);
  protected readonly submittingTestimonial = signal(false);
  protected readonly testimonialSubmitError = signal('');
  protected readonly testimonialSubmitSuccess = signal('');
  protected readonly ratingStars = [1, 2, 3, 4, 5];
  protected readonly ratingSteps = Array.from({ length: 10 }, (_, index) => (index + 1) / 2);

  protected readonly headlineIsValid = computed(() => {
    const length = this.headline().trim().length;
    return length >= 10 && length <= 100;
  });
  protected readonly testimonialTextIsValid = computed(() => {
    const length = this.testimonialText().trim().length;
    return length >= 20 && length <= 2500;
  });
  protected readonly canPublishTestimonial = computed(() => {
    const selectedRating = this.rating();
    return (
      this.canLeaveTestimonial() &&
      this.headlineIsValid() &&
      this.testimonialTextIsValid() &&
      selectedRating >= 0.5 &&
      selectedRating <= 5 &&
      Number.isInteger(selectedRating * 2) &&
      !this.submittingTestimonial()
    );
  });

  private testimonialRequestId = 0;

  /**
   * Every photograph in the model's album, shuffled fresh for this visit. It recomputes whenever the
   * model changes — opening a portfolio (or moving to another model and back) re-arranges the grid —
   * and whenever the visitor asks for another arrangement from the gallery toolbar.
   */
  protected readonly shuffleTick = signal(0);
  protected readonly photos = computed(() => {
    this.shuffleTick();
    return shufflePhotos(this.model()?.photos ?? []);
  });

  protected readonly previewLimit = PREVIEW_LIMIT;

  /**
   * The photographs the gallery shows: the first twelve of this visit's shuffle, so every visit (and
   * every Shuffle) draws a different random twelve. Smaller albums are shown whole.
   */
  protected readonly previewPhotos = computed(() => this.photos().slice(0, PREVIEW_LIMIT));

  /**
   * The locked Premium Content frames this visit teases — at least four whenever the model holds
   * four or more in her `PremiumContent/` folder, every one she has when she holds fewer, and none
   * at all for a model without the folder. Drawn afresh with every shuffle, so they never sit in
   * the same place twice.
   */
  protected readonly premiumTeasers = computed(() => {
    this.shuffleTick();
    return shufflePhotos(this.model()?.premiumPhotos ?? []).slice(0, PREMIUM_TEASER_LIMIT);
  });

  /** True when the photo section carries at least one locked Premium Content teaser. */
  protected readonly hasPremiumTeasers = computed(() => this.premiumTeasers().length > 0);

  /**
   * The tiles of the photo section, in the order the grid lays them out: the preview's photographs
   * with the locked Premium Content teasers scattered among them at random — never one straight
   * after another — and the View All door closing the row whenever the album holds more than the
   * preview shows.
   */
  protected readonly galleryTiles = computed<PortfolioGalleryTile[]>(() => {
    const preview = this.previewPhotos();
    const hasMore = this.hasMorePhotos();
    // When the View All door closes the grid, the twelfth photograph travels inside it rather
    // than on its own tile.
    const photosForGrid = hasMore ? preview.slice(0, PREVIEW_LIMIT - 1) : preview;
    const tiles = interleavePremiumTeasers(photosForGrid, this.premiumTeasers());
    if (hasMore) {
      const closingPhoto = preview[PREVIEW_LIMIT - 1] ?? preview.at(-1);
      if (closingPhoto) tiles.push({ kind: 'view-all', photo: closingPhoto });
    }
    return tiles;
  });

  /** True when the album holds more photographs than the gallery shows. */
  protected readonly hasMorePhotos = computed(() => this.photos().length > PREVIEW_LIMIT);

  /** Photographs only the complete album shows — the "+N" on the View All tile. */
  protected readonly hiddenPhotoCount = computed(() =>
    Math.max(this.photos().length - PREVIEW_LIMIT, 0),
  );

  /**
   * Seen · Likes · Comments · Shares across every photograph and clip of the model — the row shown
   * just above the photographs, kept in step with the counters the service receives.
   */
  protected readonly engagementTotals = computed(() => {
    const profile = this.model();
    const totals = { seen: 0, likes: 0, comments: 0, shares: 0 };

    if (!profile) return totals;

    for (const photo of profile.photos) {
      const stats = this.engagement.statsFor(profile.slug, 'photo', photo.src);
      totals.seen += stats.seen;
      totals.likes += stats.likes;
      totals.comments += stats.comments;
      totals.shares += stats.shares;
    }
    for (const video of profile.videos) {
      const stats = this.engagement.statsFor(profile.slug, 'video', video.src);
      totals.seen += stats.seen;
      totals.likes += stats.likes;
      totals.comments += stats.comments;
      totals.shares += stats.shares;
    }

    return totals;
  });

  /** Keep totals exact while grouping longer values for quick scanning. */
  protected formatTotal(value: number): string {
    return value.toLocaleString('en-US');
  }

  /** Router link to the model's complete album. */
  protected readonly allPhotosLink = computed(() => {
    const slug = this.model()?.slug;
    return slug ? ['/ai-models', slug, 'photos'] : null;
  });

  protected readonly view = signal<PortfolioView>('grid');

  /**
   * The clips in the album's `video/` folder, in album order — the reel shown directly under the
   * model's personal details. Unlike the photographs, the reel keeps its order so a series reads
   * the way it was uploaded.
   */
  protected readonly videos = computed(() => this.model()?.videos ?? []);

  /** Index (within the preview) of the photograph open in the viewer, or null when it is closed. */
  protected readonly activeIndex = signal<number | null>(null);

  protected readonly lightboxOpen = computed(() => this.activeIndex() !== null);

  /** Index of the clip open in the video player, or null when the player is closed. */
  protected readonly activeVideoIndex = signal<number | null>(null);

  protected readonly videoPlayerOpen = computed(() => this.activeVideoIndex() !== null);

  protected readonly shareState = signal<ShareState>('idle');

  /** The Rent form pop-up. */
  protected readonly bookingOpen = signal(false);

  /**
   * The Live Chat access choice sits before the session. Only after its Free Chat, Registered
   * User or Premium rules are selected do we mount the chat itself.
   */
  protected readonly chatOpen = signal(false);
  protected readonly chatPlan = signal<LiveChatPlan | null>(null);
  protected readonly registeredChatIdentity = signal<ChatIdentity | null>(null);
  protected readonly resumeChatPlan = signal<LiveChatPlan | null>(null);
  private liveChatReturnHandled = false;

  /**
   * Normalised availability for this model — kept in step with the directory listing so a
   * profile reads the same in both places.
   */
  protected readonly availabilityState = computed<AvailabilityState>(() => {
    const availability = (this.model()?.availability ?? '').trim().toLocaleLowerCase();
    if (/unavailable|fully booked|not accepting/.test(availability)) return 'unavailable';
    if (/future|looking for|coming soon/.test(availability)) return 'future';
    return 'available';
  });

  protected readonly availabilityLabel = computed(() => {
    switch (this.availabilityState()) {
      case 'unavailable':
        return 'Currently Unavailable';
      case 'future':
        return 'Looking for Future Contract';
      default:
        return 'Available for Contract';
    }
  });

  /** Unavailable models cannot be booked — the Rent button turns into a disabled notice. */
  protected readonly bookable = computed(() => this.availabilityState() !== 'unavailable');

  /** The model's own rate for one photograph, shown next to the Rent button. */
  protected readonly ratePerPhoto = computed(() => this.model()?.photoRate ?? 0);

  protected readonly shareLabel = computed(() => {
    switch (this.shareState()) {
      case 'shared':
        return 'Profile shared';
      case 'copied':
        return 'Link copied';
      case 'unsupported':
        return 'Copy not available';
      default:
        return 'Share profile';
    }
  });

  private readonly rentButton = viewChild<ElementRef<HTMLButtonElement>>('rentButton');
  /** Returned to focus when the chat window closes, so the keyboard flow never breaks. */
  private readonly chatButton = viewChild<ElementRef<HTMLButtonElement>>('chatButton');
  private lastFocused: HTMLElement | null = null;
  private lastFocusedVideo: HTMLElement | null = null;
  private shareTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // The pill reads the counts whenever this page opens, exactly as the directory's cards do,
    // and again when the visitor comes back to the tab. No polling: the numbers the page loaded
    // stay until then, and a chat started or ended from here moves them through the counts its
    // own start / end request answers with.
    void this.liveChats.load();
    this.destroyRef.onDestroy(this.liveChats.watch());

    // Load a fresh model-specific public testimonial feed whenever the route changes.
    effect(() => {
      const slug = this.model()?.slug;
      const requestId = ++this.testimonialRequestId;
      this.testimonials.set([]);
      this.testimonialTotal.set(0);
      this.testimonialPage.set(0);
      this.testimonialLoadError.set('');
      this.moreTestimonialsError.set('');
      this.loadingMoreTestimonials.set(false);
      this.headline.set('');
      this.testimonialText.set('');
      this.rating.set(0);
      this.submittingTestimonial.set(false);
      this.testimonialSubmitError.set('');
      this.testimonialSubmitSuccess.set('');
      this.testimonialLoadState.set(slug ? 'loading' : 'ready');
      if (slug) void this.fetchTestimonials(slug, 1, requestId, false);

      // Register the album so every tile's seen / likes / comments / share strip has numbers.
      const profile = this.model();
      if (slug && profile) {
        this.engagement.registerModel(slug, [
          ...profile.photos.map((photo) => ({ kind: 'photo' as MediaKind, src: photo.src })),
          ...profile.videos.map((video) => ({ kind: 'video' as MediaKind, src: video.src })),
        ]);
      }
      this.commentsTarget.set(null);
    });

    // OAuth / registration comes back to this exact portfolio with the selected chat plan in its
    // query string. Re-open the access review rather than losing the model the member chose.
    effect(() => {
      const returnedPlan = this.returnedLiveChatPlan();
      if (this.liveChatReturnHandled || !returnedPlan || !this.model()) return;
      this.liveChatReturnHandled = true;
      this.chatPlan.set(null);
      this.registeredChatIdentity.set(null);
      this.resumeChatPlan.set(returnedPlan);
      this.chatOpen.set(true);
    });

    // Keep the page behind the pop-up from scrolling while it is open.
    effect((onCleanup) => {
      if (typeof document === 'undefined') return;
      const body = document.body;
      const previousOverflow = body.style.overflow;
      if (this.activeIndex() !== null || this.activeVideoIndex() !== null) {
        body.style.overflow = 'hidden';
      }
      onCleanup(() => {
        body.style.overflow = previousOverflow;
      });
    });

    // Coming back from the complete album ("Back to portfolio" links to #photos), land on the
    // gallery straight away instead of gliding down from wherever the album was scrolled to.
    afterNextRender(() => {
      if (this.route.snapshot.fragment !== 'photos') return;
      const anchor = document.getElementById('photos');
      if (!anchor || typeof window.scrollTo !== 'function') return;
      const top = anchor.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, left: 0, behavior: 'instant' });
    });
  }

  ngOnDestroy(): void {
    if (this.shareTimer) clearTimeout(this.shareTimer);
    this.testimonialRequestId += 1;
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  }

  protected modelLocation(profile: AiModelProfile): string {
    const parts = profile.location
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : 'Location to be announced';
  }

  protected rememberPortfolioReturnPath(slug: string): void {
    rememberCommunityReturnPath(`/ai-models/${encodeURIComponent(slug)}`);
  }

  protected updateHeadline(event: Event): void {
    this.headline.set((event.target as HTMLInputElement).value);
    this.testimonialSubmitError.set('');
    this.testimonialSubmitSuccess.set('');
  }

  protected updateTestimonialText(event: Event): void {
    this.testimonialText.set((event.target as HTMLTextAreaElement).value);
    this.testimonialSubmitError.set('');
    this.testimonialSubmitSuccess.set('');
  }

  protected chooseRating(value: number): void {
    if (this.ratingSteps.includes(value)) this.rating.set(value);
  }

  protected onRatingKeydown(event: KeyboardEvent): void {
    const current = this.ratingSteps.indexOf(this.rating());
    let next = current;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(current + 1, 9);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown')
      next = Math.max(current - 1, 0);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 9;
    else return;

    event.preventDefault();
    const value = this.ratingSteps[next];
    this.rating.set(value);
    (event.currentTarget as HTMLElement)
      .querySelector<HTMLButtonElement>(`[data-rating-value="${value}"]`)
      ?.focus();
  }

  protected scoreLabel(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  protected isFullStar(value: number): boolean {
    return this.rating() >= value;
  }

  protected isHalfStar(value: number): boolean {
    return this.rating() === value - 0.5;
  }

  protected ratingLabel(value: number): string {
    return `${this.scoreLabel(value)} out of 5 stars`;
  }

  protected onTestimonialsScroll(event: Event): void {
    const list = event.currentTarget as HTMLElement;
    if (
      this.testimonialLoadState() !== 'ready' ||
      this.loadingMoreTestimonials() ||
      this.testimonials().length >= this.testimonialTotal() ||
      list.scrollTop + list.clientHeight < list.scrollHeight - 120
    ) {
      return;
    }

    const slug = this.model()?.slug;
    if (!slug) return;
    this.loadingMoreTestimonials.set(true);
    this.moreTestimonialsError.set('');
    void this.fetchTestimonials(slug, this.testimonialPage() + 1, this.testimonialRequestId, true);
  }

  protected async publishTestimonial(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const profile = this.model();
    if (!profile || !this.canPublishTestimonial()) return;
    const requestId = this.testimonialRequestId;

    const payload: CreateModelTestimonial = {
      headline: this.headline().trim(),
      text: this.testimonialText().trim(),
      rating: this.rating(),
    };
    this.submittingTestimonial.set(true);
    this.testimonialSubmitError.set('');
    this.testimonialSubmitSuccess.set('');

    try {
      const created = await this.testimonialsApi.create(profile.slug, payload);
      if (requestId !== this.testimonialRequestId) return;
      this.testimonials.update((current) =>
        [created, ...current.filter((item) => item.id !== created.id)].slice(
          0,
          Math.max(this.testimonialPageSize, current.length + 1),
        ),
      );
      this.testimonialTotal.update((total) => total + 1);
      this.headline.set('');
      this.testimonialText.set('');
      this.rating.set(0);
      this.testimonialSubmitSuccess.set(
        'Your testimonial has been published. Thank you for sharing.',
      );
    } catch {
      if (requestId !== this.testimonialRequestId) return;
      this.testimonialSubmitError.set(
        'Your testimonial could not be published right now. Please try again in a moment.',
      );
    } finally {
      if (requestId === this.testimonialRequestId) this.submittingTestimonial.set(false);
    }
  }

  protected testimonialPreview(value: string): string {
    if (value.length <= 210) return value;
    const prefix = value.slice(0, 210).trimEnd();
    const lastSpace = prefix.lastIndexOf(' ');
    return `${prefix.slice(0, lastSpace > 150 ? lastSpace : prefix.length)}…`;
  }

  protected hasLongTestimonial(value: string): boolean {
    return value.length > 210;
  }

  protected authorName(author: ModelTestimonialAuthor): string {
    return author.fullName?.trim() || 'NeverBeen Community member';
  }

  protected authorInitials(author: ModelTestimonialAuthor): string {
    const names = this.authorName(author).split(/\s+/).filter(Boolean);
    return (
      names
        .slice(0, 2)
        .map((name) => name[0]?.toUpperCase() ?? '')
        .join('') || 'NB'
    );
  }

  protected authorPhotoUrl(author: ModelTestimonialAuthor): string {
    const url = author.profilePhotoUrl?.trim();
    if (!url) return '';
    return url.startsWith('/api/') ? `${this.community.apiUrl}${url}` : url;
  }

  protected authorLocation(author: ModelTestimonialAuthor): string {
    return (
      [author.city?.trim(), author.country?.trim()].filter(Boolean).join(', ') ||
      'Location not shared'
    );
  }

  protected authorStatus(author: ModelTestimonialAuthor): string {
    const status = author.activeStatus?.trim();
    if (status?.toLocaleLowerCase() === 'custom' && author.customStatusText?.trim()) {
      return author.customStatusText.trim();
    }
    return status || 'Community member';
  }

  protected authorStatusClass(author: ModelTestimonialAuthor): string {
    switch (author.activeStatus?.trim().toLocaleLowerCase()) {
      case 'active':
        return 'status-active';
      case 'busy':
      case "don't disturb":
        return 'status-busy';
      case 'away':
        return 'status-away';
      case 'custom':
        return 'status-custom';
      default:
        return 'status-inactive';
    }
  }

  protected timestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
      date,
    );
  }

  protected hideBrokenAvatar(event: Event): void {
    (event.currentTarget as HTMLImageElement).hidden = true;
  }

  protected async loadMoreTestimonials(): Promise<void> {
    const slug = this.model()?.slug;
    if (
      !slug ||
      this.loadingMoreTestimonials() ||
      this.testimonials().length >= this.testimonialTotal()
    ) {
      return;
    }
    this.loadingMoreTestimonials.set(true);
    this.moreTestimonialsError.set('');
    await this.fetchTestimonials(slug, this.testimonialPage() + 1, this.testimonialRequestId, true);
  }

  private async fetchTestimonials(
    slug: string,
    page: number,
    requestId: number,
    append: boolean,
  ): Promise<void> {
    try {
      const result = await this.testimonialsApi.list(slug, page, this.testimonialPageSize);
      if (requestId !== this.testimonialRequestId) return;

      this.testimonials.update((current) => {
        const combined = append ? [...current, ...result.items] : result.items;
        const seen = new Set<number>();
        return combined.filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
      });
      this.testimonialTotal.set(Math.max(result.totalCount, this.testimonials().length));
      this.testimonialPage.set(page);
      this.testimonialLoadState.set('ready');
    } catch {
      if (requestId !== this.testimonialRequestId) return;
      if (append) {
        this.moreTestimonialsError.set('Could not load more testimonials. Scroll to retry.');
      } else {
        this.testimonialLoadError.set(
          'Testimonials are temporarily unavailable. Please try again later.',
        );
        this.testimonialLoadState.set('error');
      }
    } finally {
      if (requestId === this.testimonialRequestId && append) {
        this.loadingMoreTestimonials.set(false);
      }
    }
  }

  protected fact(value: string): string {
    return value.trim() || 'Details to be added';
  }

  protected photoAlt(name: string, index: number): string {
    return `${name} — portfolio photograph ${index + 1}`;
  }

  protected frameLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  protected photoCount(): string {
    return String(this.photos().length).padStart(2, '0');
  }

  /** How many clips the album's video folder holds. */
  protected videoCount(): number {
    return this.videos().length;
  }

  protected videoLabel(): string {
    return this.videos().length === 1 ? 'video' : 'videos';
  }

  protected videoTitle(index: number): string {
    const clip = this.videos()[index];
    if (!clip) return '';
    return clip.caption || `${this.model()?.name ?? 'Portfolio'} · clip ${this.frameLabel(index)}`;
  }

  /**
   * Mobile browsers (iOS Safari, several Android browsers) do not paint a frame for a
   * poster-less `preload="metadata"` video, leaving the tile black. Asking for a media
   * fragment makes them decode and show the first frame.
   */
  protected previewSrc(clip: AiModelVideo): string {
    return clip.src.includes('#') ? clip.src : `${clip.src}#t=0.1`;
  }

  /** Staggered reveal for the grid, capped so long albums do not wait on the animation. */
  protected tileDelay(index: number): number {
    return Math.min(index * 45, 540);
  }

  protected viewAllLabel(name: string): string {
    return `View all ${this.photos().length} photographs of ${name}`;
  }

  /**
   * The caption split so its frame number can be set in the numeric face: a custom caption is
   * returned whole, while the generated "Name · frame NN" fallback keeps NN in `frame`.
   */
  protected captionParts(index: number): { text: string; frame: string } {
    const photo = this.photos()[index];
    if (!photo) return { text: '', frame: '' };
    if (photo.caption) return { text: photo.caption, frame: '' };
    return { text: `${this.model()?.name ?? 'Portfolio'} · frame `, frame: this.frameLabel(index) };
  }

  protected openBooking(): void {
    if (!this.bookable()) return;
    this.bookingOpen.set(true);
  }

  protected closeBooking(): void {
    this.bookingOpen.set(false);
    this.rentButton()?.nativeElement.focus({ preventScroll: true });
  }

  /** Opens the modern Free Chat / Registered User / Premium Live Chat access screen for this model. */
  protected openChat(): void {
    if (!this.model()) return;
    this.chatPlan.set(null);
    this.registeredChatIdentity.set(null);
    this.resumeChatPlan.set(null);
    this.chatOpen.set(true);
  }

  protected startFreeChat(): void {
    const model = this.model();
    if (!model || requiresRegisteredChat(model)) return;
    this.chatPlan.set('free');
    this.registeredChatIdentity.set(null);
    this.resumeChatPlan.set(null);
  }

  protected startRegisteredChat(identity: ChatIdentity): void {
    this.chatPlan.set('registered');
    this.registeredChatIdentity.set(identity);
    this.resumeChatPlan.set(null);
  }

  protected startPremiumChat(identity: ChatIdentity): void {
    this.chatPlan.set('premium');
    this.registeredChatIdentity.set(identity);
    this.resumeChatPlan.set(null);
  }

  /** The plan chosen before the Google round trip is appended to this path when sign-in opens. */
  protected liveChatReturnPath(profile: AiModelProfile): string {
    return `/ai-models/${encodeURIComponent(profile.slug)}`;
  }

  protected closeChat(): void {
    this.chatOpen.set(false);
    this.chatPlan.set(null);
    this.registeredChatIdentity.set(null);
    this.resumeChatPlan.set(null);
    this.chatButton()?.nativeElement.focus({ preventScroll: true });
  }

  /**
   * Instagram's Forward to another model: this page only shows one model, so the visitor goes to the
   * directory, where that model's access screen opens with the forwarded message waiting in it.
   */
  protected forwardChat(target: AiModelProfile): void {
    this.chatOpen.set(false);
    this.chatPlan.set(null);
    this.registeredChatIdentity.set(null);
    this.resumeChatPlan.set(null);
    void this.router.navigate(['/ai-models'], { queryParams: { forwardChat: target.slug } });
  }

  /** Another arrangement of the same album, without leaving the page. */
  protected shuffleNow(): void {
    this.shuffleTick.update((tick) => tick + 1);
  }

  protected setView(view: PortfolioView): void {
    this.view.set(view);
  }

  protected openLightbox(index: number): void {
    if (index < 0 || index >= this.previewPhotos().length) return;
    this.lastFocused =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement) : null;
    this.activeIndex.set(index);
  }

  protected openVideo(index: number): void {
    this.lastFocusedVideo =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement) : null;
    this.activeVideoIndex.set(index);
  }

  /** The page-level comments pop-up a tile's Comments icon opens (members only). */
  protected openComments(type: MediaKind, src: string): void {
    this.commentsTarget.set({ type, src });
  }

  protected closeComments(): void {
    this.commentsTarget.set(null);
  }

  protected closeVideo(): void {
    if (this.activeVideoIndex() === null) return;
    this.activeVideoIndex.set(null);
    this.lastFocusedVideo?.focus?.({ preventScroll: true });
    this.lastFocusedVideo = null;
  }

  protected closeLightbox(): void {
    if (this.activeIndex() === null) return;
    this.activeIndex.set(null);
    this.lastFocused?.focus?.({ preventScroll: true });
    this.lastFocused = null;
  }

  protected async shareProfile(profile: AiModelProfile): Promise<void> {
    const url = typeof location !== 'undefined' ? location.href : '';
    const data = {
      title: `${profile.name} · NeverBeen AI model`,
      text: profile.bio,
      url,
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(data);
        this.flashShareState('shared');
        return;
      } catch {
        // The visitor dismissed the share sheet — fall through to copying the link.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      this.flashShareState('copied');
    } catch {
      this.flashShareState('unsupported');
    }
  }

  private flashShareState(state: ShareState): void {
    this.shareState.set(state);
    if (this.shareTimer) clearTimeout(this.shareTimer);
    this.shareTimer = setTimeout(() => this.shareState.set('idle'), 2600);
  }

  // ------------------------------------------------------------ portfolio document

  /**
   * The generated portfolio document (`<album>/Portfolio/*.pdf`) published by
   * CreatePortfolio.mjs, or null while the model has none.
   */
  protected readonly portfolioDocument = computed(() => this.model()?.portfolio ?? null);

  /** "Watch Portfolio" opens the model's portfolio document page. */
  protected watchPortfolio(profile: AiModelProfile): void {
    void this.router.navigate(['/ai-models', profile.slug, 'portfolio']);
  }

  /**
   * "Download Portfolio" saves the PDF. A model without a document is sent to the same
   * portfolio document page, which explains — on a plain white page — that no portfolio
   * is available yet and points at the NeverBeen support team.
   */
  protected downloadPortfolio(profile: AiModelProfile): void {
    const file = this.portfolioDocument();
    if (!file) {
      this.watchPortfolio(profile);
      return;
    }
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.downloadName || file.fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}
