import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommunityService } from '../../../services/community.service';
import { SiteConfigService } from '../../../services/site-config.service';
import { CommunitySignInCard } from '../../../shared/community-sign-in-card/community-sign-in-card';

/**
 * The Community sign-in at the top of the home hero's first panel —
 * “Go Anywhere. Even Where You've Never Been” — placed directly under the small
 * texts (the eyebrow and the intro paragraph).
 *
 * It is deliberately minimal and paints nothing: a small header line and the
 * trusted Community Google button (the same flow the `/ai-models` pages use,
 * rendered through `app-community-sign-in-card`'s `button` variant).
 *
 * 1. **Visitor (not signed in)** — “Sign in to Explore the NeverBeen Multiverse”
 *    above the Google button.
 * 2. **Member (signed in)** — “Welcome, <name>.” with a single link into the
 *    Community, so the same spot greets them instead of asking them to sign in.
 *
 * The hero is part of the eager initial bundle while `CommunityService` is
 * deliberately lazy, so `hero.html` defers this component on viewport: the
 * community runtime stays in its own chunk.
 */
@Component({
  selector: 'app-hero-community-signin',
  imports: [RouterLink, CommunitySignInCard],
  templateUrl: './hero-community-signin.html',
  styleUrl: './hero-community-signin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroCommunitySignIn {
  private readonly community = inject(CommunityService);
  private readonly cms = inject(SiteConfigService);

  protected readonly signedIn = this.community.isAuthenticated;

  /** Copy is published from Admin Console → Website Management → Hero banner. */
  protected readonly title = computed(() => this.cms.text('home.hero', 'communitySignInTitle'));

  /** “Welcome, <name>.” — `{name}` in the published copy is replaced with the member's name. */
  protected readonly welcomeTitle = computed(() =>
    fillName(this.cms.text('home.hero', 'communityWelcomeTitle'), this.displayName()),
  );

  /** The name used in the greeting: first name whenever the member has one. */
  protected readonly displayName = computed(() => {
    const user = this.community.currentUser();
    const profile = this.community.profile();
    const first = (user?.firstName || profile?.firstName || '').trim();
    if (first) return first;
    const full = (user?.fullName || profile?.fullName || '').trim();
    if (full) return full.split(/\s+/)[0];
    const email = (user?.email || profile?.email || '').trim();
    if (email.includes('@')) return titleCase(email.split('@')[0].replace(/[._-]+/g, ' '));
    return 'Traveller';
  });
}

/** Replaces every `{name}` token in published copy with the member's name. */
function fillName(template: string, name: string): string {
  return template.replace(/\{name\}/gi, name);
}

/** “alex vance” → “Alex Vance” for names recovered from an e-mail address. */
function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}
