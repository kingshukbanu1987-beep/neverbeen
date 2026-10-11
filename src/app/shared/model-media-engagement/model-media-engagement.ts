import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CommunityService } from '../../services/community.service';
import {
  MediaEngagementStats,
  MediaKind,
  ModelMediaEngagementService,
  SignInRequiredError,
} from '../../services/model-media-engagement.service';
import { CommunitySignInModal } from '../community-sign-in-modal/community-sign-in-modal';

type ShareState = 'idle' | 'shared' | 'copied' | 'unsupported' | 'error';

/** Compact count formatting: 999 · 1.2K · 12.4K · 1.1M. */
export function formatEngagementCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value < 1000) return String(Math.floor(value));
  if (value < 1_000_000) {
    const thousands = value / 1000;
    return `${thousands >= 100 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, '')}K`;
  }
  const millions = value / 1_000_000;
  return `${millions.toFixed(1).replace(/\.0$/, '')}M`;
}

/**
 * The seen · likes · comments · share strip shown on every photograph and clip of a model's
 * portfolio — on the tiles of the main page and the "View All" album, in the photo pop-up and
 * in the video player.
 *
 * Every opinion carries its own count and its own transparent icon. **Seen** needs no account;
 * **Like** and **Comments** are Community actions — a signed-out visitor gets the ultra-modern
 * sign-in pop-up instead, while a member likes in place or emits `comments` so the host can open
 * the comments panel. **Share** uses the native share sheet where the browser has one and falls
 * back to copying the link.
 */
@Component({
  selector: 'app-model-media-engagement',
  imports: [CommunitySignInModal],
  templateUrl: './model-media-engagement.html',
  styleUrl: './model-media-engagement.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelMediaEngagementBar {
  readonly modelSlug = input.required<string>();
  readonly mediaType = input.required<MediaKind>();
  readonly mediaSrc = input.required<string>();
  /** `overlay` sits on the photograph itself; `row` is the roomy layout for captions and bars. */
  readonly layout = input<'overlay' | 'row'>('overlay');
  /**
   * What the Comments icon does. `gate` (portfolio tiles) asks a guest to sign in, exactly as
   * Like does; `open` (the photo and video pop-ups) shows the thread to everybody, because the
   * comments of an opened photograph are public — posting still needs an account.
   */
  readonly commentsAction = input<'gate' | 'open'>('gate');

  /** Emitted when the visitor asks to read the comments of this media. */
  readonly comments = output<void>();

  private readonly service = inject(ModelMediaEngagementService);
  private readonly community = inject(CommunityService, { optional: true });

  protected readonly signInOpen = signal(false);
  protected readonly busy = signal(false);
  protected readonly shareState = signal<ShareState>('idle');
  protected readonly hint = signal('');

  protected readonly stats = computed<MediaEngagementStats>(() =>
    this.service.statsFor(this.modelSlug(), this.mediaType(), this.mediaSrc()),
  );

  protected readonly seenLabel = computed(() => {
    const count = this.stats().seen;
    return count === 1 ? 'Seen once' : `Seen ${formatEngagementCount(count)} times`;
  });

  protected count(value: number): string {
    return formatEngagementCount(value);
  }

  protected likeLabel(): string {
    const stats = this.stats();
    const total = formatEngagementCount(stats.likes);
    if (stats.likedByMe) return `Liked — ${total} ${stats.likes === 1 ? 'like' : 'likes'}. Tap to remove your like.`;
    return `Like — ${total} ${stats.likes === 1 ? 'like' : 'likes'}`;
  }

  protected commentLabel(): string {
    const total = this.stats().comments;
    return `Comments — ${total} ${total === 1 ? 'comment' : 'comments'}`;
  }

  protected shareLabel(): string {
    const total = this.stats().shares;
    return `Share — ${total} ${total === 1 ? 'share' : 'shares'}`;
  }

  /** The page to come back to after signing in from this strip. */
  protected returnToPath(): string {
    return typeof location === 'undefined' ? '/' : location.pathname;
  }

  protected signInReason(): string {
    return this.mediaType() === 'video'
      ? 'Sign in with your Community account to like this clip, join the comments and share it with friends.'
      : 'Sign in with your Community account to like this photograph, join the comments and share it with friends.';
  }

  protected async onLike(): Promise<void> {
    if (this.busy()) return;
    if (!this.signedIn()) {
      this.signInOpen.set(true);
      return;
    }
    this.busy.set(true);
    this.hint.set('');
    try {
      await this.service.toggleLike(this.modelSlug(), this.mediaType(), this.mediaSrc());
    } catch (error) {
      if (error instanceof SignInRequiredError) {
        this.signInOpen.set(true);
      } else {
        this.flashHint('Could not save your like — try again.');
      }
    } finally {
      this.busy.set(false);
    }
  }

  protected onComments(): void {
    if (this.commentsAction() === 'gate' && !this.signedIn()) {
      this.signInOpen.set(true);
      return;
    }
    this.comments.emit();
  }

  protected async onShare(): Promise<void> {
    if (this.busy()) return;
    const url = typeof location !== 'undefined' ? location.href : '';
    const title =
      this.mediaType() === 'video' ? 'A clip from NeverBeen' : 'A photograph from NeverBeen';
    this.busy.set(true);

    let shared = false;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        shared = true;
        this.shareState.set('shared');
      } catch {
        // The visitor dismissed the share sheet — fall through to copying the link.
      }
    }

    if (!shared) {
      try {
        await navigator.clipboard.writeText(url);
        this.shareState.set('copied');
      } catch {
        this.shareState.set('unsupported');
      }
    }

    if (this.shareState() !== 'unsupported') {
      await this.service.recordShare(this.modelSlug(), this.mediaType(), this.mediaSrc());
    }
    this.busy.set(false);

    window.setTimeout(() => this.shareState.set('idle'), 2600);
  }

  protected shareFeedback(): string {
    switch (this.shareState()) {
      case 'shared':
        return 'Shared';
      case 'copied':
        return 'Link copied';
      case 'unsupported':
        return 'Copy this page’s address to share';
      default:
        return '';
    }
  }

  protected closeSignIn(): void {
    this.signInOpen.set(false);
  }

  private signedIn(): boolean {
    return !!this.community?.isAuthenticated?.();
  }

  private flashHint(message: string): void {
    this.hint.set(message);
    window.setTimeout(() => this.hint.set(''), 2600);
  }
}
