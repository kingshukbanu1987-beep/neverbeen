import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommunityService, GoogleIdentity } from '../../services/community.service';
import {
  rememberCommunityReturnPath,
  takeCommunityReturnPath,
} from '../community-return-path';

type GoogleButtonStep = Extract<
  Awaited<ReturnType<CommunityService['signInWithGoogle']>>,
  { step: 'show_google_button' }
>;

/**
 * The Community sign-in pop-up shown when a visitor taps **Like** or **Comments** on a
 * photograph or a clip without an account.
 *
 * It is a self-contained dialog: backdrop click or Escape dismisses it, focus starts on the
 * Google button and returns to the control that opened it, and the same authorization flows the
 * Community pages use (authorization-code redirect, the official Google button, or the local
 * fallback) all work from here. The return path is remembered, so after signing in the visitor
 * lands back on the exact portfolio they were looking at.
 */
@Component({
  selector: 'app-community-sign-in-modal',
  imports: [RouterLink],
  templateUrl: './community-sign-in-modal.html',
  styleUrl: './community-sign-in-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'dismiss()',
  },
})
export class CommunitySignInModal {
  /** What the visitor was trying to do — shown as the pop-up's reason line. */
  readonly reason = input('Sign in to like, comment and join the Community.');
  /** Short headline above the reason; the sign-in call to action stays the same. */
  readonly title = input('Your moment in the Community starts here.');
  /** Where to return after signing in — defaults to the page the pop-up opened on. */
  readonly returnTo = input<string>(typeof location === 'undefined' ? '/' : location.pathname);

  readonly dismissed = output<void>();

  private readonly service = inject(CommunityService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly hostRef = inject(ElementRef);
  private readonly googleHost = viewChild<ElementRef<HTMLElement>>('googleOfficialHost');

  protected readonly isSigningIn = signal(false);
  protected readonly googleManualStep = signal<GoogleButtonStep | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    // Keep the page behind the pop-up from scrolling while it is open.
    effect((onCleanup) => {
      if (typeof document === 'undefined') return;
      const body = document.body;
      const previousOverflow = body.style.overflow;
      body.style.overflow = 'hidden';
      onCleanup(() => {
        body.style.overflow = previousOverflow;
      });
    });

    afterNextRender(() => {
      const element = this.hostRef.nativeElement as HTMLElement;
      element?.querySelector<HTMLButtonElement>('.signin-google')?.focus({ preventScroll: true });
    });
  }

  /** Backdrop click — the card itself stops the event before it reaches here. */
  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.dismiss();
  }

  /** Keeps the portfolio as the landing point after the account is created. */
  rememberReturnPath(): void {
    rememberCommunityReturnPath(this.returnTo());
  }

  dismiss(): void {
    this.dismissed.emit();
  }

  /** Called by the sign-in card logic when the flow finished (or was abandoned). */
  async signInWithGoogle(): Promise<void> {
    if (this.isSigningIn() || this.googleManualStep()) return;

    this.errorMessage.set(null);
    this.isSigningIn.set(true);
    rememberCommunityReturnPath(this.returnTo());

    try {
      // Same authorization-code flow as the Community pages whenever the API is available.
      if ((await this.service.checkApiOnline(true)) && this.service.startOAuthRedirect('google')) {
        return;
      }

      const step = await this.service.signInWithGoogle();
      if (step.step === 'identity') {
        this.finishGoogleSignIn(step.identity);
        return;
      }

      if (step.step === 'show_google_button') {
        const identityPromise = this.service.awaitGoogleIdentity();
        this.googleManualStep.set(step);
        this.isSigningIn.set(false);
        afterNextRender(
          () => {
            const host = this.googleHost()?.nativeElement;
            if (host) step.render(host);
          },
          { injector: this.injector },
        );

        const identity = await identityPromise;
        this.googleManualStep.set(null);
        if (!identity) return;
        this.isSigningIn.set(true);
        this.finishGoogleSignIn(identity);
        return;
      }

      const result = await this.service.loginWithOAuth('google');
      this.navigateAfterSignIn(result.profileComplete);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error && error.message
          ? error.message
          : 'Google sign-in could not be completed. Please try again.',
      );
      takeCommunityReturnPath();
    } finally {
      this.isSigningIn.set(false);
    }
  }

  cancelGoogleSignIn(): void {
    this.googleManualStep.set(null);
    this.service.cancelGoogleIdentity();
    takeCommunityReturnPath();
  }

  private finishGoogleSignIn(identity: GoogleIdentity): void {
    const result = this.service.completeGoogleSignIn(identity);
    this.navigateAfterSignIn(result.profileComplete);
  }

  private navigateAfterSignIn(profileComplete: boolean): void {
    if (!profileComplete) {
      this.router.navigate(['/community/register']);
      return;
    }
    // Stay on the portfolio: the return path is the page this pop-up opened on.
    void this.router.navigateByUrl(takeCommunityReturnPath() ?? this.returnTo());
    this.dismissed.emit();
  }
}
