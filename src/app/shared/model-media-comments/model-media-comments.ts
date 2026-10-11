import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommunityService } from '../../services/community.service';
import {
  MediaComment,
  MediaKind,
  ModelMediaEngagementService,
  SignInRequiredError,
} from '../../services/model-media-engagement.service';
import { CommunitySignInModal } from '../community-sign-in-modal/community-sign-in-modal';

const PAGE_SIZE = 50;
const MAX_COMMENT_LENGTH = 1000;

/**
 * The comments thread of one photograph or clip — shown inside the photo pop-up, inside the
 * video player, and in the page-level comments dialog of the portfolio tiles.
 *
 * Reading is public: anybody who opens a photograph or a clip can read its conversation.
 * Posting is a Community action — a signed-out visitor gets the ultra-modern sign-in pop-up.
 */
@Component({
  selector: 'app-model-media-comments',
  imports: [CommunitySignInModal],
  templateUrl: './model-media-comments.html',
  styleUrl: './model-media-comments.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelMediaComments {
  readonly modelSlug = input.required<string>();
  readonly mediaType = input.required<MediaKind>();
  readonly mediaSrc = input.required<string>();
  /** False hides the ✕ — used when the host dialog provides its own close affordance. */
  readonly closable = input(true);

  readonly closed = output<void>();

  private readonly service = inject(ModelMediaEngagementService);
  private readonly community = inject(CommunityService, { optional: true });

  protected readonly items = signal<MediaComment[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly posting = signal(false);
  protected readonly postError = signal('');
  protected readonly draft = signal('');
  protected readonly signInOpen = signal(false);

  protected readonly signedIn = computed(() => !!this.community?.isAuthenticated?.());

  protected readonly remaining = computed(
    () => MAX_COMMENT_LENGTH - this.draft().length,
  );

  constructor() {
    // Reload whenever the host points at another photograph or clip.
    effect(() => {
      const slug = this.modelSlug();
      const src = this.mediaSrc();
      if (slug && src) void this.load();
    });
  }

  protected async load(): Promise<void> {
    const slug = this.modelSlug();
    const src = this.mediaSrc();
    if (!slug || !src) return;
    this.state.set('loading');
    try {
      const page = await this.service.fetchComments(slug, this.mediaType(), src, 1, PAGE_SIZE);
      this.items.set(page.items);
      this.totalCount.set(page.totalCount);
      this.state.set('ready');
    } catch {
      this.state.set('error');
    }
  }

  protected updateDraft(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
    this.postError.set('');
  }

  protected async post(): Promise<void> {
    if (this.posting()) return;
    if (!this.signedIn()) {
      this.signInOpen.set(true);
      return;
    }
    const text = this.draft().trim();
    if (!text) return;

    this.posting.set(true);
    this.postError.set('');
    try {
      const created = await this.service.addComment(
        this.modelSlug(),
        this.mediaType(),
        this.mediaSrc(),
        text,
      );
      this.items.update((current) => [created, ...current]);
      this.totalCount.update((total) => total + 1);
      this.draft.set('');
    } catch (error) {
      if (error instanceof SignInRequiredError) {
        this.signInOpen.set(true);
      } else {
        this.postError.set(
          error instanceof Error && error.message
            ? error.message
            : 'Your comment could not be posted right now.',
        );
      }
    } finally {
      this.posting.set(false);
    }
  }

  protected openSignIn(): void {
    this.signInOpen.set(true);
  }

  protected closeSignIn(): void {
    this.signInOpen.set(false);
    if (this.signedIn()) void this.load();
  }

  protected close(): void {
    this.closed.emit();
  }

  /** The page to come back to after signing in from the composer. */
  protected returnToPath(): string {
    return typeof location === 'undefined' ? '/' : location.pathname;
  }

  protected authorName(comment: MediaComment): string {
    return comment.author.fullName?.trim() || 'NeverBeen Community member';
  }

  protected authorInitials(comment: MediaComment): string {
    const names = this.authorName(comment).split(/\s+/).filter(Boolean);
    return (
      names
        .slice(0, 2)
        .map((name) => name[0]?.toUpperCase() ?? '')
        .join('') || 'NB'
    );
  }

  protected authorPhotoUrl(comment: MediaComment): string {
    const url = comment.author.profilePhotoUrl?.trim();
    if (!url) return '';
    if (url.startsWith('/api/')) {
      const base = (this.community?.apiUrl ?? '').replace(/\/+$/, '');
      return `${base}${url}`;
    }
    return url;
  }

  protected hideBrokenAvatar(event: Event): void {
    (event.currentTarget as HTMLImageElement).hidden = true;
  }

  protected timestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'just now';
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes >= 0 && minutes < 1) return 'just now';
    if (minutes >= 0 && minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours >= 0 && hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days >= 0 && days < 7) return `${days}d ago`;
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
  }
}
