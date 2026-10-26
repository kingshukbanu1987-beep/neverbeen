import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommunityService } from '../../../services/community.service';
import { SiteConfigService } from '../../../services/site-config.service';
import { CommunitySignInCard } from '../../../shared/community-sign-in-card/community-sign-in-card';

/**
 * The Community sign-in inside the home hero's first panel —
 * “Go Anywhere. Even Where You've Never Been” — placed directly underneath the
 * full-width picture stage.
 *
 * It is deliberately minimal: the trusted Community Google button, and nothing
 * else — no header line, no copy, no surface (the same flow the `/ai-models`
 * pages use, rendered through `app-community-sign-in-card`'s `button` variant).
 *
 * 1. **Visitor (not signed in)** — the Google button alone.
 * 2. **Member (signed in)** — a fixed black “Welcome” greeting, two spaces, then
 *    the member's name in a big Calibri line (no period at the end), followed by
 *    the plain-text line “Explore the NeverBeen Multiverse and Interact with our
 *    NeverBeen AI Models and Shop NeverBeen Merchandise from our exclusive
 *    NeverBeen Store” (non-interactive; it does not link to the Community), so
 *    the same spot greets them instead of asking them to sign in.
 *
 * The hero is part of the eager initial bundle while `CommunityService` is
 * deliberately lazy, so `hero.html` defers this component on viewport: the
 * community runtime stays in its own chunk.
 */
@Component({
  selector: 'app-hero-community-signin',
  imports: [CommunitySignInCard],
  templateUrl: './hero-community-signin.html',
  styleUrl: './hero-community-signin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroCommunitySignIn {
  private readonly community = inject(CommunityService);
  private readonly cms = inject(SiteConfigService);

  protected readonly signedIn = this.community.isAuthenticated;

  /**
   * Two spaces between “Welcome” and the member's name.
   *
   * The gap is built here rather than written in the template: the compiler
   * collapses runs of whitespace in template text, so `{{ '  ' }}` would render
   * as a single space. The span that carries it is `white-space: pre-wrap`, so
   * both spaces actually take up room.
   */
  protected readonly greetingGap = '\u0020\u0020';

  /** The member's name as the big line: `{name}` in the published copy is replaced, and any trailing period is dropped. */
  protected readonly memberName = computed(() => {
    const published = fillName(
      this.cms.text('home.hero', 'communityWelcomeTitle'),
      this.displayName(),
    );
    return published.trim().replace(/[\s.,!;:]+$/, '') || this.displayName();
  });

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
