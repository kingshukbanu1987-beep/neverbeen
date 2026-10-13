import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ModelLiveChatService } from '../../services/model-live-chat.service';
import { ModelMediaEngagementService } from '../../services/model-media-engagement.service';
import { ModelTestimonialsService } from '../../services/model-testimonials.service';
import { CompactCount, ExactCountPopover } from '../../shared/exact-count-popover';
import { AiModelProfile, aiModelProfiles } from './ai-model-data';
import { AiModelChatDialog } from './chat/ai-model-chat';

type AvailabilityState = 'available' | 'unavailable' | 'future';
type SortMode = 'default' | 'price-asc' | 'price-desc';
type AvailabilityFilter = 'all' | AvailabilityState;
type ModelEngagementTotals = { seen: number; likes: number; comments: number; shares: number };

const EMPTY_ENGAGEMENT_TOTALS: ModelEngagementTotals = {
  seen: 0,
  likes: 0,
  comments: 0,
  shares: 0,
};
const TESTIMONIALS_PAGE_SIZE = 100;
const REVIEW_SUMMARY_CONCURRENCY = 4;

type ReviewSummaryStatus = 'loading' | 'ready' | 'error';
type ModelReviewSummary = {
  averageRating: number;
  reviewCount: number;
  status: ReviewSummaryStatus;
};

const INITIAL_REVIEW_SUMMARY: ModelReviewSummary = {
  averageRating: 0,
  reviewCount: 0,
  status: 'loading',
};

/**
 * Draws one photograph at random from the model's album to use as her card cover, so the directory
 * opens with a different set of covers on every visit. A model whose album is still empty keeps the
 * stored cover, which the card renders as the designed "original portrait pending" placeholder.
 */
export function drawCover(model: AiModelProfile): string {
  if (model.photos.length === 0) return model.cover;
  const index = Math.floor(Math.random() * model.photos.length);
  return model.photos[index].src;
}

@Component({
  selector: 'app-ai-models-page',
  imports: [RouterLink, CompactCount, ExactCountPopover, AiModelChatDialog],
  templateUrl: './ai-models.html',
  styleUrl: './ai-models.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiModelsPage {
  protected readonly models = aiModelProfiles;
  private readonly engagement = inject(ModelMediaEngagementService);
  /** Each model's Live Chat count, shown on her card beside the Live Chat button. */
  private readonly liveChats = inject(ModelLiveChatService);

  /** The model whose live chat window is open, or null. The session lives in the chat service. */
  protected readonly chatModel = signal<AiModelProfile | null>(null);
  private readonly testimonialsApi = inject(ModelTestimonialsService);

  /** Per-model averages and review counts from the complete public testimonial feeds. */
  private readonly reviewSummaries = signal<ReadonlyMap<string, ModelReviewSummary>>(
    new Map(this.models.map((model) => [model.slug, INITIAL_REVIEW_SUMMARY] as const)),
  );
  protected readonly ratingStars = [1, 2, 3, 4, 5];

  /**
   * Totals across each model's complete photo and video albums — the seen, likes, comments and
   * shares every card shows together in one row.
   */
  private readonly engagementByModel = computed(() => {
    const totals = new Map<string, ModelEngagementTotals>();

    for (const model of this.models) {
      const modelTotals = { ...EMPTY_ENGAGEMENT_TOTALS };
      for (const photo of model.photos) {
        const stats = this.engagement.statsFor(model.slug, 'photo', photo.src);
        modelTotals.seen += stats.seen;
        modelTotals.likes += stats.likes;
        modelTotals.comments += stats.comments;
        modelTotals.shares += stats.shares;
      }
      for (const video of model.videos) {
        const stats = this.engagement.statsFor(model.slug, 'video', video.src);
        modelTotals.seen += stats.seen;
        modelTotals.likes += stats.likes;
        modelTotals.comments += stats.comments;
        modelTotals.shares += stats.shares;
      }
      totals.set(model.slug, modelTotals);
    }

    return totals;
  });

  /**
   * The cover every card shows, drawn once per visit — reopening the page re-picks each model's
   * cover from her album, while the cards keep their published running order.
   */
  private readonly covers = new Map(
    aiModelProfiles.map((model) => [model.slug, drawCover(model)] as const),
  );

  protected readonly search = signal('');
  protected readonly sort = signal<SortMode>('default');
  protected readonly availabilityFilter = signal<AvailabilityFilter>('all');
  protected readonly availabilityFilters: ReadonlyArray<{
    value: AvailabilityFilter;
    label: string;
  }> = [
    { value: 'all', label: 'All models' },
    { value: 'available', label: 'Available for Contract' },
    { value: 'unavailable', label: 'Currently Unavailable' },
    { value: 'future', label: 'Looking for Future Contract' },
  ];
  protected readonly totalCount = computed(() => String(this.models.length).padStart(2, '0'));
  /** The current calendar year, so the "Portfolio index /YYYY" eyebrow stays accurate across visits. */
  protected readonly currentYear = new Date().getFullYear();
  protected readonly hasIllustrativeProfiles = computed(() =>
    this.models.some((model) => model.illustrative),
  );
  protected readonly filteredModels = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    const availability = this.availabilityFilter();
    const matches = this.models.filter((model) => {
      if (availability !== 'all' && this.availabilityState(model) !== availability) return false;
      if (!query) return true;
      return `${model.name} ${model.location}`.toLocaleLowerCase().includes(query);
    });

    const mode = this.sort();
    if (mode === 'default') return matches;

    const direction = mode === 'price-asc' ? 1 : -1;
    return [...matches].sort((a, b) => {
      const rateA = a.photoRate > 0 ? a.photoRate : Number.POSITIVE_INFINITY;
      const rateB = b.photoRate > 0 ? b.photoRate : Number.POSITIVE_INFINITY;
      if (rateA === rateB) return a.name.localeCompare(b.name);
      if (!Number.isFinite(rateA)) return 1;
      if (!Number.isFinite(rateB)) return -1;
      return (rateA - rateB) * direction;
    });
  });

  constructor() {
    // Load engagement for both media types so each directory card can show album-wide totals.
    for (const model of this.models) {
      this.engagement.registerModel(model.slug, [
        ...model.photos.map((photo) => ({ kind: 'photo' as const, src: photo.src })),
        ...model.videos.map((video) => ({ kind: 'video' as const, src: video.src })),
      ]);
    }

    // Ratings are public, live testimonial data rather than part of the generated model catalog.
    // Keep these requests bounded rather than fetching every model's reviews at once.
    void this.loadReviewSummaries();
    void this.liveChats.load();
  }

  protected setAvailabilityFilter(value: AvailabilityFilter): void {
    this.availabilityFilter.set(value);
  }

  /** Chip badge counts — how many profiles sit in each availability state. */
  protected availabilityCount(value: AvailabilityFilter): number {
    if (value === 'all') return this.models.length;
    return this.models.filter((model) => this.availabilityState(model) === value).length;
  }

  protected resetFilters(): void {
    this.search.set('');
    this.availabilityFilter.set('all');
  }

  protected updateSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as SortMode);
  }

  protected updateSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.search.set('');
  }

  /** Opens the live chat with a model straight from her card in the directory. */
  protected openChat(model: AiModelProfile): void {
    this.chatModel.set(model);
  }

  protected closeChat(): void {
    this.chatModel.set(null);
  }

  protected indexLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  /** The frame this card displays: a random pick from the model's album, fixed for this visit. */
  protected coverFor(model: AiModelProfile): string {
    return this.covers.get(model.slug) ?? model.cover;
  }

  /** How many photographs the model's album holds — shown large on the cover. */
  protected photoCount(model: AiModelProfile): number {
    return model.photos.length;
  }

  protected photoLabel(model: AiModelProfile): string {
    return model.photos.length === 1 ? 'photograph' : 'photographs';
  }

  /** How many video clips the model's portfolio holds. */
  protected videoCount(model: AiModelProfile): number {
    return model.videos.length;
  }

  protected videoLabel(model: AiModelProfile): string {
    return model.videos.length === 1 ? 'video' : 'videos';
  }

  protected engagementTotals(model: AiModelProfile): ModelEngagementTotals {
    return this.engagementByModel().get(model.slug) ?? EMPTY_ENGAGEMENT_TOTALS;
  }

  protected formatTotal(value: number): string {
    return value.toLocaleString('en-US');
  }

  protected reviewSummary(model: AiModelProfile): ModelReviewSummary {
    return this.reviewSummaries().get(model.slug) ?? INITIAL_REVIEW_SUMMARY;
  }

  protected formattedRating(model: AiModelProfile): string {
    return this.reviewSummary(model).averageRating.toFixed(1);
  }

  /** How much of an individual star to fill, including a partial star for fractional averages. */
  protected starFillPercent(model: AiModelProfile, star: number): number {
    const rating = Math.max(0, Math.min(5, this.reviewSummary(model).averageRating));
    return Math.round(Math.max(0, Math.min(1, rating - star + 1)) * 1000) / 10;
  }

  /**
   * The review count as the card writes it: the number, then the word "reviews". Only a feed
   * with reviews in it has a number — `null` while loading, on error, or when there are none.
   */
  protected reviewCountNumber(model: AiModelProfile): string | null {
    const summary = this.reviewSummary(model);
    if (summary.status !== 'ready' || summary.reviewCount === 0) return null;
    return this.formatTotal(summary.reviewCount);
  }

  protected reviewCountLabel(model: AiModelProfile): string {
    const summary = this.reviewSummary(model);
    if (summary.status === 'loading') return 'Loading reviews';
    if (summary.status === 'error') return 'Reviews unavailable';
    if (summary.reviewCount === 0) return 'No Reviews';
    return `${this.formatTotal(summary.reviewCount)} reviews`;
  }

  protected ratingAccessibleLabel(model: AiModelProfile): string {
    const summary = this.reviewSummary(model);
    if (summary.status === 'loading') return 'Ratings are loading';
    if (summary.status === 'error') return 'Rating is temporarily unavailable';
    return `${summary.averageRating.toFixed(1)} out of 5 stars from ${summary.reviewCount} reviews`;
  }

  protected reviewLinkLabel(model: AiModelProfile): string {
    const summary = this.reviewSummary(model);
    if (summary.status === 'error') return `Open the testimonials for ${model.name}`;
    if (summary.status === 'loading') return `Ratings for ${model.name} are loading`;
    if (summary.reviewCount === 0)
      return `No reviews yet for ${model.name}; open the testimonial section`;
    return `Read ${summary.reviewCount} reviews for ${model.name}`;
  }

  /**
   * The Live Chat count of a model, as the card shows it: the number once it is known, a dash while
   * the directory is still loading it, and `null` (no counter at all) when the count cannot be had.
   */
  protected liveChatCountLabel(model: AiModelProfile): string | null {
    const count = this.liveChats.countFor(model.slug);
    if (count !== null) return this.formatTotal(count);
    const status = this.liveChats.status();
    return status === 'idle' || status === 'loading' ? '—' : null;
  }

  protected liveChatWord(model: AiModelProfile): string {
    return this.liveChats.countFor(model.slug) === 1 ? 'Live Chat' : 'Live Chats';
  }

  protected liveChatAccessibleLabel(model: AiModelProfile): string {
    const count = this.liveChats.countFor(model.slug);
    if (count === null) return `Live Chat counter for ${model.name} is loading`;
    return `${this.formatTotal(count)} ${count === 1 ? 'Live Chat' : 'Live Chats'} with ${model.name}`;
  }

  private async loadReviewSummaries(): Promise<void> {
    const queue = [...this.models];
    const loadNext = async (): Promise<void> => {
      while (queue.length > 0) {
        const model = queue.shift();
        if (!model) return;

        try {
          const summary = await this.fetchReviewSummary(model.slug);
          this.setReviewSummary(model.slug, summary);
        } catch {
          this.setReviewSummary(model.slug, {
            averageRating: 0,
            reviewCount: 0,
            status: 'error',
          });
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(REVIEW_SUMMARY_CONCURRENCY, queue.length) }, () => loadNext()),
    );
  }

  private async fetchReviewSummary(modelSlug: string): Promise<ModelReviewSummary> {
    const ratings: number[] = [];
    const seenTestimonials = new Set<number>();
    let page = 1;
    let totalPages = 1;
    let reviewCount = 0;

    while (page <= totalPages) {
      const result = await this.testimonialsApi.list(modelSlug, page, TESTIMONIALS_PAGE_SIZE);
      const resultCount = Number.isFinite(result.totalCount)
        ? Math.max(0, Math.floor(result.totalCount))
        : result.items.length;
      reviewCount = Math.max(reviewCount, resultCount);

      const actualPageSize =
        Number.isFinite(result.pageSize) && result.pageSize > 0
          ? Math.floor(result.pageSize)
          : TESTIMONIALS_PAGE_SIZE;
      totalPages = Math.max(
        totalPages,
        Number.isFinite(result.totalPages) ? Math.floor(result.totalPages) : 0,
        Math.ceil(reviewCount / actualPageSize),
      );

      for (const testimonial of result.items) {
        if (seenTestimonials.has(testimonial.id)) continue;
        seenTestimonials.add(testimonial.id);
        if (
          Number.isFinite(testimonial.rating) &&
          testimonial.rating >= 0 &&
          testimonial.rating <= 5
        ) {
          ratings.push(testimonial.rating);
        }
      }

      if (page < totalPages && result.items.length === 0) {
        throw new Error(`Testimonial page ${page} was empty before the end of the feed.`);
      }
      page += 1;
    }

    const averageRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
        : 0;

    return {
      averageRating: Math.max(0, Math.min(5, averageRating)),
      reviewCount: Math.max(reviewCount, seenTestimonials.size),
      status: 'ready',
    };
  }

  private setReviewSummary(modelSlug: string, summary: ModelReviewSummary): void {
    this.reviewSummaries.update((current) => {
      const next = new Map(current);
      next.set(modelSlug, summary);
      return next;
    });
  }

  /**
   * Profile data may contain one of the directory labels already, a longer legacy booking note,
   * or no availability note yet. Legacy/open notes fall back to the standard available state.
   */
  protected availabilityState(model: AiModelProfile): AvailabilityState {
    const availability = model.availability.trim().toLocaleLowerCase();
    if (/unavailable|fully booked|not accepting/.test(availability)) return 'unavailable';
    if (/future|looking for|coming soon/.test(availability)) return 'future';
    return 'available';
  }

  protected availabilityLabel(model: AiModelProfile): string {
    switch (this.availabilityState(model)) {
      case 'unavailable':
        return 'Currently Unavailable';
      case 'future':
        return 'Looking for Future Contract';
      default:
        return 'Available for Contract';
    }
  }

  protected startingPrice(model: AiModelProfile): string {
    return model.photoRate > 0 ? `₹${model.photoRate.toLocaleString('en-IN')}` : 'On request';
  }
}
