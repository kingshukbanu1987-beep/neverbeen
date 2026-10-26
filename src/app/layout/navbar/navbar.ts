import {
  Component,
  DestroyRef,
  ElementRef,
  EnvironmentInjector,
  Injector,
  afterNextRender,
  computed,
  inject,
  runInInjectionContext,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { filter } from 'rxjs/operators';
import { SiteConfigService } from '../../services/site-config.service';
import { CommunityBadgeService } from '../../services/community-badge.service';
import { SiteTabService } from '../../services/site-tab.service';
import { rememberCommunityReturnPath, takeCommunityReturnPath } from '../../shared/community-return-path';
import { CommunitySearchBox } from '../community-search/community-search-box';
import type { CommunityService } from '../../services/community.service';

interface NavLink {
  id: string;
  label: string;
  path: string;
  fragment: string | undefined;
  icon: string;
}

interface GoogleButtonStep {
  step: 'show_google_button';
  render: (host: HTMLElement) => void;
}

const TOKEN_COOKIE = 'neverbeen_auth_token';
const DEMO_TOKEN = 'jwt_default_active_token';
const USER_STORAGE_KEY = 'neverbeen_current_user';
const PROFILE_STORAGE_KEY = 'neverbeen_user_profile';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function hasCommunityAuthCookie(): boolean {
  const token = readCookie(TOKEN_COOKIE);
  return !!token && token !== DEMO_TOKEN;
}

function hasSavedCommunitySession(): boolean {
  if (!hasCommunityAuthCookie()) return false;
  try {
    return (
      typeof localStorage !== 'undefined' &&
      !!(localStorage.getItem(USER_STORAGE_KEY) || localStorage.getItem(PROFILE_STORAGE_KEY))
    );
  } catch {
    return false;
  }
}

function initialNavbarUrl(routerUrl: string): string {
  if (routerUrl && routerUrl !== '/') return routerUrl;
  if (typeof location !== 'undefined' && location.pathname && location.pathname !== '/') {
    return `${location.pathname}${location.search}${location.hash}`;
  }
  return routerUrl || '';
}

@Component({
  selector: 'app-navbar',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, CommunitySearchBox],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly router = inject(Router);
  private readonly cms = inject(SiteConfigService);
  private readonly badges = inject(CommunityBadgeService);
  private readonly siteTab = inject(SiteTabService);
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly injector = inject(Injector);
  private readonly googleHost = viewChild<ElementRef<HTMLElement>>('googleOfficialHost');

  protected readonly open = signal(false);
  protected readonly currentUrl = signal(initialNavbarUrl(this.router.url));
  protected readonly isSigningIn = signal(false);
  protected readonly googleManualStep = signal<GoogleButtonStep | null>(null);
  protected readonly authErrorMessage = signal<string | null>(null);

  /**
   * Community header badges: unread notifications / unread chats. Read from the
   * small root CommunityBadgeService (fed by the lazy CommunityService) so the
   * eager navbar never pulls the heavyweight community service into the initial bundle.
   */
  protected readonly unreadNotifications = this.badges.unreadNotifications;
  protected readonly unreadChats = this.badges.unreadChats;

  /**
   * Whether the visitor is currently signed in to the NeverBeen Community.
   * Uses the live signal synced by CommunityService when loaded, falling back to
   * the persisted auth cookie + stored member record before the lazy chunk loads.
   */
  protected readonly isCommunitySignedIn = computed(() => {
    const synced = this.badges.signedIn();
    return synced !== null ? synced : hasSavedCommunitySession();
  });

  protected badgeText(count: number): string {
    return count > 99 ? '99+' : String(count);
  }

  constructor() {
    // Publish the live header height as a CSS variable (--site-nav-h) so other sticky
    // elements (e.g. the Admin Console topbar/side panel) can sit below the website header
    // instead of covering it when the page is scrolled.
    const host = inject(ElementRef<HTMLElement>);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (this.badges.signedIn() === null && hasCommunityAuthCookie()) {
        void this.getCommunityService();
      }
      const header = (host.nativeElement as HTMLElement).querySelector<HTMLElement>('.nav');
      if (!header || typeof ResizeObserver === 'undefined') return;
      const root = document.documentElement;
      const update = () => root.style.setProperty('--site-nav-h', `${header.offsetHeight}px`);
      update();
      const observer = new ResizeObserver(update);
      observer.observe(header);
      destroyRef.onDestroy(() => observer.disconnect());
    });

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects || event.url);
      });
  }

  /**
   * The Community sign-in / connect page (exact route /community) belongs to the public
   * website: it keeps the full website header (logo + site menu). The community profile
   * header appears only once a visitor enters the community itself (/community/… pages,
   * member profiles and the Message Book).
   */
  private readonly isCommunitySignIn = computed(() =>
    /^\/community(?:\/register)?\/?(\?|#|$)/.test(this.currentUrl()),
  );

  /** Give the AI model studio and its profile pages their plum site chrome: rgb(55, 38, 66). */
  protected readonly isAiModels = computed(() =>
    /^\/?ai-models(?:\/|\?|#|$)/.test(this.currentUrl()),
  );

  /**
   * Merchandise uses the same plum site chrome as the AI model studio. Its in-page
   * storefront is white and lavender, so the shared header and footer stay visually tied
   * to the model directory rather than introducing a second brand palette.
   */
  protected readonly isMerchandise = computed(() =>
    /^\/?merchandise(?:\/|\?|#|$)/.test(this.currentUrl()),
  );

  /** The Multiverse Studio promotion gallery shares the View All studio chrome. */
  protected readonly isMultiverseStudio = computed(() =>
    /^\/?multiverse-studio(?:\/|\?|#|$)/.test(this.currentUrl()),
  );

  /** Studio experiences get the same compact site chrome. */
  protected readonly isStudioChrome = computed(
    () => this.isAiModels() || this.isMerchandise() || this.isMultiverseStudio(),
  );

  /**
   * Compact header (smaller bar + 50% logo) on the Community, AI Models, Merchandise,
   * Multiverse Studio, member profiles and the whole Admin Console, so as much of the
   * working area as possible is visible. The Community sign-in page keeps the full-size
   * website header.
   */
  protected readonly isCompactLogo = computed(() => {
    const url = this.currentUrl();
    return (
      !this.isCommunitySignIn() &&
      (this.isStudioChrome() ||
        url.includes('/community') ||
        url.includes('/profile') ||
        /^\/admin(\/|\?|#|$)/.test(url))
    );
  });

  /** Community pages (hub, profiles, Message Book) — where the member's community theme applies. */
  protected readonly isCommunity = computed(
    () => !this.isCommunitySignIn() && /^\/(community|profile)(\/|\?|#|$)/.test(this.currentUrl()),
  );

  private readonly allLinks: NavLink[] = [
    {
      id: 'home',
      label: 'Home',
      path: '/',
      fragment: undefined as string | undefined,
      icon: 'home',
    },
    { id: 'audience', label: 'Audience', path: '/audience', fragment: undefined, icon: 'users' },
    {
      id: 'collection',
      label: 'Collection',
      path: '/collection',
      fragment: undefined,
      icon: 'image',
    },
    {
      id: 'merchandise',
      label: 'Merchandise',
      path: '/merchandise',
      fragment: undefined,
      icon: 'shopping-bag',
    },
    {
      id: 'destinations',
      label: 'Destinations',
      path: '/',
      fragment: 'destinations',
      icon: 'map-pin',
    },
    { id: 'live', label: 'Live', path: '/travel-feeds', fragment: undefined, icon: 'live' },
    { id: 'pricing', label: 'Pricing', path: '/', fragment: 'pricing', icon: 'tag' },
    { id: 'faq', label: 'FAQ', path: '/', fragment: 'faq', icon: 'help-circle' },
    { id: 'admin', label: 'Admin', path: '/login', fragment: undefined, icon: 'log-in' },
    { id: 'founder', label: 'Founder', path: '/', fragment: 'owner', icon: 'user' },
    { id: 'contact', label: 'Contact', path: '/', fragment: 'contact', icon: 'mail' },
    {
      id: 'feedback',
      label: 'Feedback',
      path: '/feedback',
      fragment: undefined,
      icon: 'message-square',
    },
  ];

  /** Menu options in the order, wording and visibility published in Website Management. */
  protected readonly links = computed(() =>
    this.cms
      .visibleItems('global.navbar', 'links')
      .map((item) => {
        const base = this.allLinks.find((l) => l.id === item.id);
        return base ? { ...base, label: item.label } : null;
      })
      .filter((l): l is NavLink => l !== null),
  );

  toggle(): void {
    this.open.update((value) => !value);
  }

  close(): void {
    this.open.set(false);
  }

  async onCommunityAuth(event: Event): Promise<void> {
    event.preventDefault();
    this.close();

    if (this.isCommunitySignedIn()) {
      const service = await this.getCommunityService();
      service.logout();
      this.badges.signedIn.set(false);
      this.siteTab.sync();
      return;
    }

    await this.signInWithGoogle();
  }

  async cancelGoogleSignIn(): Promise<void> {
    this.googleManualStep.set(null);
    const service = await this.getCommunityService();
    service.cancelGoogleIdentity();
    takeCommunityReturnPath();
  }

  private async signInWithGoogle(): Promise<void> {
    if (this.isSigningIn() || this.googleManualStep()) return;

    this.authErrorMessage.set(null);
    this.isSigningIn.set(true);
    rememberCommunityReturnPath(this.currentUrl() || '/');

    try {
      const service = await this.getCommunityService();
      if ((await service.checkApiOnline(true)) && service.startOAuthRedirect('google')) {
        return;
      }

      const step = await service.signInWithGoogle();
      if (step.step === 'identity') {
        const result = service.completeGoogleSignIn(step.identity);
        this.navigateAfterSignIn(result.profileComplete);
        return;
      }

      if (step.step === 'show_google_button') {
        const identityPromise = service.awaitGoogleIdentity();
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
        const result = service.completeGoogleSignIn(identity);
        this.navigateAfterSignIn(result.profileComplete);
        return;
      }

      const result = await service.loginWithOAuth('google');
      this.navigateAfterSignIn(result.profileComplete);
    } catch (error) {
      this.authErrorMessage.set(
        error instanceof Error && error.message
          ? error.message
          : 'Google sign-in could not be completed. Please try again.',
      );
      takeCommunityReturnPath();
    } finally {
      this.isSigningIn.set(false);
    }
  }

  private navigateAfterSignIn(profileComplete: boolean): void {
    if (!profileComplete) {
      void this.router.navigate(['/community/register']);
      return;
    }
    void this.router.navigateByUrl(takeCommunityReturnPath() ?? '/community/profile');
  }

  private async getCommunityService(): Promise<CommunityService> {
    const { CommunityService: CommunityServiceToken } = await import(
      '../../services/community.service'
    );
    return runInInjectionContext(this.envInjector, () => inject(CommunityServiceToken));
  }
}
