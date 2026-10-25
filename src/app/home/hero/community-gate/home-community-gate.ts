import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommunityService } from '../../../services/community.service';
import { SiteConfigService } from '../../../services/site-config.service';
import { CommunitySignInCard } from '../../../shared/community-sign-in-card/community-sign-in-card';

interface GateStat {
  id: string;
  label: string;
  value: number;
}

/**
 * The Community gate that closes the Home page's hero, directly under
 * “Meet the People. Even When They Don't Exists outside NeverBeen Multiverse”.
 *
 * It has exactly two faces:
 *
 * 1. **Visitor (not signed in)** — the same trusted Google sign-in the
 *    `/ai-models` portfolio testimonial section uses (`app-community-sign-in-card`),
 *    set inside a luminous “portal” so the dark auth card reads as a doorway
 *    into the Multiverse rather than a form.
 * 2. **Member (signed in)** — a personal welcome panel: “Welcome, <name>.” with
 *    a passport-style member card (portrait, member ID, presence, quick links
 *    into the Community and live unread counts).
 *
 * The Home hero is part of the eager initial bundle, while `CommunityService`
 * (and its community data) is deliberately lazy so the first paint stays small.
 * The hero therefore defers this component (`@defer (on viewport)` in
 * `hero.html`), which keeps the whole community runtime in its own chunk.
 */
@Component({
  selector: 'app-home-community-gate',
  imports: [RouterLink, CommunitySignInCard],
  templateUrl: './home-community-gate.html',
  styleUrl: './home-community-gate.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeCommunityGate {
  private readonly community = inject(CommunityService);
  private readonly cms = inject(SiteConfigService);

  protected readonly signedIn = this.community.isAuthenticated;
  protected readonly guestBrowsing = this.community.guestBrowsing;

  protected readonly unreadNotifications = this.community.unreadNotificationCount;
  protected readonly unreadChats = this.community.unreadChatCount;

  /** Copy is published from Admin Console → Website Management → Hero banner. */
  protected readonly gateTitle = computed(() => this.cms.text('home.hero', 'communityGateTitle'));
  protected readonly gateCopy = computed(() => this.cms.text('home.hero', 'communityGateCopy'));
  protected readonly cardTitle = computed(() => this.cms.text('home.hero', 'communityCardTitle'));
  protected readonly cardCopy = computed(() => this.cms.text('home.hero', 'communityCardCopy'));

  /** “Welcome, <name>.” — `{name}` in the published copy is replaced with the member's name. */
  protected readonly welcomeTitle = computed(() =>
    fillName(this.cms.text('home.hero', 'communityWelcomeTitle'), this.displayName()),
  );
  protected readonly welcomeCopy = computed(() =>
    fillName(this.cms.text('home.hero', 'communityWelcomeCopy'), this.displayName()),
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

  /** The member's complete name for the passport card. */
  protected readonly fullName = computed(() => {
    const user = this.community.currentUser();
    const profile = this.community.profile();
    return (
      (user?.fullName || profile?.fullName || '').trim() ||
      [user?.firstName || profile?.firstName, user?.lastName || profile?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      this.displayName()
    );
  });

  protected readonly initials = computed(() =>
    this.fullName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join(''),
  );

  protected readonly portrait = computed(
    () =>
      this.community.profile()?.profilePhotoUrl ||
      this.community.currentUser()?.profilePhotoUrl ||
      null,
  );

  protected readonly memberId = computed(
    () => this.community.profile()?.uniqueId || this.community.currentUser()?.uniqueId || '',
  );

  protected readonly memberSince = computed(() => {
    const created = this.community.profile()?.createdAtUtc;
    if (!created) return '';
    const year = new Date(created).getFullYear();
    return Number.isFinite(year) ? String(year) : '';
  });

  protected readonly presence = computed(
    () =>
      this.community.profile()?.activeStatus ||
      this.community.currentUser()?.activeStatus ||
      'Active',
  );

  protected readonly presenceLabel = computed(() => {
    const status = this.presence();
    return status === 'Custom' ? this.community.profile()?.customStatusText || 'Online' : status;
  });

  /** The signed-in member's live footprint in the Multiverse. */
  protected readonly stats = computed<GateStat[]>(() => [
    { id: 'journey', label: 'Journey posts', value: this.community.visibleJourneyPosts().length },
    { id: 'circles', label: 'Circles joined', value: this.community.myCircles().length },
    { id: 'connections', label: 'Connections', value: this.community.visibleCompanions().length },
  ]);

  protected badgeText(count: number): string {
    return count > 99 ? '99+' : String(count);
  }
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
