import { Component, ElementRef, Injector, OnInit, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { SiteConfigService } from '../../../services/site-config.service';
import { Router, RouterLink } from '@angular/router';
import { CommunityService, FacebookIdentity, GoogleIdentity } from '../../../services/community.service';
import { TranslationService } from '../../../services/translation.service';
import { SelectValueSync } from '../../../shared/select-value-sync';

type GoogleButtonStep = Extract<
  Awaited<ReturnType<CommunityService['signInWithGoogle']>>,
  { step: 'show_google_button' }
>;

@Component({
  selector: 'app-community-connect',
  imports: [SelectValueSync, RouterLink],
  templateUrl: './connect.html',
  styleUrl: './connect.css',
})
export class CommunityConnect implements OnInit {
  protected readonly service = inject(CommunityService);
  protected readonly translation = inject(TranslationService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly cms = inject(SiteConfigService);

  /** Sign-in providers in the order / wording published in Website Management. */
  protected readonly providers = computed(() => this.cms.visibleItems('community.connect', 'providers'));
  protected cmsText(field: string): string {
    return this.cms.text('community.connect', field);
  }
  protected cmsFlag(field: string): boolean {
    return this.cms.flag('community.connect', field);
  }

  protected readonly simulateExisting = signal(false);
  protected readonly loadingProvider = signal<string | null>(null);
  /** Set when Google skipped One-Tap and the official button panel must show. */
  protected readonly googleManualStep = signal<GoogleButtonStep | null>(null);
  /** Host element for Google's official rendered button (inside @if panel). */
  private readonly googleHost = viewChild<ElementRef<HTMLElement>>('googleOfficialHost');

  ngOnInit(): void {
    // If the user is already authenticated (cookie has key and profile exists), show profile page
    if (this.service.isAuthenticated() && this.service.profile()) {
      this.router.navigate(['/community/profile']);
    }
  }

  setSimulationMode(isExisting: boolean): void {
    this.simulateExisting.set(isExisting);
  }

  /** Switch the entire NeverBeen site to the chosen language. */
  onLanguageChange(event: Event): void {
    const code = (event.target as HTMLSelectElement).value;
    this.translation.setLanguage(code);
  }

  async signInWith(provider: 'google' | 'facebook' | 'apple' | 'microsoft'): Promise<void> {
    // The official Google button panel is already open — ignore repeat clicks.
    if (provider === 'google' && this.googleManualStep()) {
      return;
    }

    this.loadingProvider.set(provider);
    try {
      if (provider === 'google') {
        const step = await this.service.signInWithGoogle();

        if (step.step === 'identity') {
          await this.finishGoogleSignIn(step.identity);
          return;
        }

        if (step.step === 'show_google_button') {
          // One-Tap wasn't shown — offer Google's official button instead.
          const identityPromise = this.service.awaitGoogleIdentity();
          this.googleManualStep.set(step);
          this.loadingProvider.set(null);
          afterNextRender(
            () => {
              const host = this.googleHost()?.nativeElement;
              if (host) {
                step.render(host);
              }
            },
            { injector: this.injector },
          );
          const identity = await identityPromise;
          this.googleManualStep.set(null);
          if (!identity) {
            return; // member cancelled
          }
          this.loadingProvider.set(provider);
          await this.finishGoogleSignIn(identity);
          return;
        }

        // step === 'unavailable' → GIS blocked/unreachable: preview fallback below.
      }

      if (provider === 'facebook') {
        const step = await this.service.signInWithFacebook();

        if (step.step === 'identity') {
          await this.finishFacebookSignIn(step.identity);
          return;
        }

        if (step.step === 'cancelled') {
          return; // member closed the Facebook dialog — do nothing.
        }

        // step === 'unavailable' → SDK blocked/unreachable: preview fallback below.
      }

      const res = await this.service.loginWithOAuth(provider, this.simulateExisting());
      if (res.profileComplete) {
        this.router.navigate(['/community/profile']);
      } else {
        this.router.navigate(['/community/register']);
      }
    } finally {
      this.loadingProvider.set(null);
    }
  }

  /** Routes a real Google identity: existing profile → profile, new → register. */
  private async finishGoogleSignIn(identity: GoogleIdentity): Promise<void> {
    const res = this.service.completeGoogleSignIn(identity);
    if (res.profileComplete) {
      this.router.navigate(['/community/profile']);
    } else {
      this.router.navigate(['/community/register']);
    }
  }

  /** Routes a real Facebook identity: existing profile → profile, new → register. */
  private async finishFacebookSignIn(identity: FacebookIdentity): Promise<void> {
    const res = this.service.completeFacebookSignIn(identity);
    if (res.profileComplete) {
      this.router.navigate(['/community/profile']);
    } else {
      this.router.navigate(['/community/register']);
    }
  }

  /** Cancel the official Google button panel. */
  cancelGoogleSignIn(): void {
    this.googleManualStep.set(null);
    this.service.cancelGoogleIdentity();
  }

  /** Current origin — shown in the panel's troubleshooting hint. */
  get currentOrigin(): string {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
}
