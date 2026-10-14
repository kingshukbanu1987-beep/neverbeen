import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommunityService, GoogleIdentity } from '../../services/community.service';
import { rememberCommunityReturnPath, takeCommunityReturnPath } from '../community-return-path';

type GoogleButtonStep = Extract<
  Awaited<ReturnType<CommunityService['signInWithGoogle']>>,
  { step: 'show_google_button' }
>;

@Component({
  selector: 'app-community-sign-in-card',
  templateUrl: './community-sign-in-card.html',
  styleUrl: './community-sign-in-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunitySignInCard {
  readonly returnTo = input.required<string>();
  /** Optional context lets the same trusted Google flow serve member-only destinations beyond testimonials. */
  readonly eyebrow = input('NeverBeen Community');
  readonly title = input('Your experience belongs here.');
  readonly copy = input('Sign in to share a testimonial with the community.');
  readonly note = input('Community sign-in only · Guest access cannot post testimonials');

  private readonly service = inject(CommunityService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly googleHost = viewChild<ElementRef<HTMLElement>>('googleOfficialHost');

  protected readonly isSigningIn = signal(false);
  protected readonly googleManualStep = signal<GoogleButtonStep | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  async signInWithGoogle(): Promise<void> {
    if (this.isSigningIn() || this.googleManualStep()) return;

    this.errorMessage.set(null);
    this.isSigningIn.set(true);
    rememberCommunityReturnPath(this.returnTo());

    try {
      // Use the same authorization-code flow as the Community sign-in page whenever
      // the API is available; the callback returns the member to this portfolio.
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

      // Match Community Connect's fallback for browsers where Google Identity Services
      // cannot load (for example a local preview with third-party scripts blocked).
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
    this.router.navigateByUrl(takeCommunityReturnPath() ?? '/community/profile');
  }
}
