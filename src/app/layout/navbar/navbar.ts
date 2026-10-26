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
import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { filter } from 'rxjs/operators';
import { SiteConfigService } from '../../services/site-config.service';
import { CommunityBadgeService } from '../../services/community-badge.service';
import { SiteTabService } from '../../services/site-tab.service';
import {
  rememberCommunityReturnPath,
  takeCommunityReturnPath,
} from '../../shared/community-return-path';
import { CommunitySearchBox } from '../community-search/community-search-box';
import { generate20DigitUid, type CurrentUser, type Profile } from '../../models/community';
import type { CommunityService } from '../../services/community.service';

interface NavLink {
  id: string;
  label: string;
  path: string;
  fragment: string | undefined;
  icon: string;
}

/**
 * Identity shown in the ultra-modern account menu (avatar chip + drop-down) that
 * replaces the plain "Log out" option in the website menu.
 */
interface AccountSnapshot {
  fullName: string;
  email: string;
  uniqueId: string;
  photoUrl: string;
  initial: string;
}

interface GoogleButtonStep {
  step: 'show_google_button';
  render: (host: HTMLElement) => void;
}

/** The subset of the persisted LoginDevice record shown by the account menu. */
interface StoredLoginDevice {
  id?: string;
  name?: string;
  model?: string;
  type?: string;
  os?: string;
  browser?: string;
  ipAddress?: string;
  location?: string;
  country?: string;
  city?: string;
  locality?: string;
  isCurrent?: boolean;
  blocked?: boolean;
}

interface CurrentDeviceSnapshot {
  name: string;
  specs: string;
  ipAddress: string;
  city: string;
  country: string;
  location: string;
}

const TOKEN_COOKIE = 'neverbeen_auth_token';
const DEMO_TOKEN = 'jwt_default_active_token';
const USER_STORAGE_KEY = 'neverbeen_current_user';
const PROFILE_STORAGE_KEY = 'neverbeen_user_profile';
const DEVICES_STORAGE_KEY = 'neverbeen_devices';
const DEVICE_ID_STORAGE_PREFIX = 'neverbeen_device_id';
const NOT_AVAILABLE = 'Not available';

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

function readStoredJson<T>(key: string): T | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function joinUnique(parts: string[]): string {
  const seen = new Set<string>();
  return parts
    .map(cleanText)
    .filter((part) => {
      const key = part.toLowerCase();
      if (!part || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(' · ');
}

function readStorageText(key: string): string {
  try {
    return typeof localStorage === 'undefined' ? '' : (localStorage.getItem(key) ?? '').trim();
  } catch {
    return '';
  }
}

/** Device ids are account-scoped; prefer this session's id over an older isCurrent flag. */
function currentBrowserDeviceIds(): string[] {
  const user = readStoredJson<Partial<CurrentUser>>(USER_STORAGE_KEY);
  const profile = readStoredJson<Partial<Profile>>(PROFILE_STORAGE_KEY);
  const accountIds = [user?.id, profile?.id, 'anonymous']
    .filter((id): id is number | string => id !== undefined && id !== null)
    .map((id) => readStorageText(`${DEVICE_ID_STORAGE_PREFIX}:${id}`));
  return accountIds.filter(Boolean);
}

/** Older device records only have a free-form "City, Region, Country" location string. */
function legacyLocationParts(location: string): { city: string; country: string } {
  const parts = location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return { city: '', country: parts[0] ?? '' };
  return { city: parts[0], country: parts.at(-1) ?? '' };
}

/** Best browser-only fallback before CommunityService has registered this device. */
function browserDeviceFallback(): CurrentDeviceSnapshot {
  const nav = typeof navigator === 'undefined' ? null : navigator;
  const ua = nav?.userAgent ?? '';
  const platform = nav?.platform ?? '';
  const hardware = /iPhone/i.test(ua)
    ? 'iPhone'
    : /iPad/i.test(ua)
      ? 'iPad'
      : /Android/i.test(ua)
        ? 'Android device'
        : /Mac/i.test(`${ua} ${platform}`)
          ? 'MacBook'
          : /Windows/i.test(`${ua} ${platform}`)
            ? 'Windows PC'
            : /CrOS/i.test(ua)
              ? 'Chromebook'
              : 'This device';
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR\//i.test(ua)
      ? 'Opera'
      : /Firefox\//i.test(ua)
        ? 'Firefox'
        : /Chrome\/|CriOS\//i.test(ua)
          ? 'Chrome'
          : /Safari\//i.test(ua)
            ? 'Safari'
            : 'Browser';
  const os = /iPhone|iPad/i.test(ua)
    ? 'iOS / iPadOS'
    : /Android/i.test(ua)
      ? 'Android'
      : /Mac/i.test(`${ua} ${platform}`)
        ? 'macOS'
        : /Windows/i.test(`${ua} ${platform}`)
          ? 'Windows'
          : /CrOS/i.test(ua)
            ? 'ChromeOS'
            : '';
  return {
    name: joinUnique([hardware, browser]),
    specs: joinUnique([hardware, os, browser]),
    ipAddress: NOT_AVAILABLE,
    city: NOT_AVAILABLE,
    country: NOT_AVAILABLE,
    location: NOT_AVAILABLE,
  };
}

/**
 * Read-only current-device details for the account drop-down. The community service
 * registers this browser and persists the API's IP / geolocation answer under this key;
 * reading it here keeps the always-mounted navbar independent of the lazy community chunk.
 */
function readCurrentDeviceSnapshot(): CurrentDeviceSnapshot {
  const fallback = browserDeviceFallback();
  const stored = readStoredJson<StoredLoginDevice[]>(DEVICES_STORAGE_KEY);
  const devices = Array.isArray(stored) ? stored : [];
  const browserIds = new Set(currentBrowserDeviceIds());
  const device =
    devices.find((entry) => !!entry.id && browserIds.has(entry.id)) ??
    devices.find((entry) => entry.isCurrent && !entry.blocked) ??
    devices.find((entry) => !entry.blocked) ??
    devices[0];
  if (!device) return fallback;

  const legacy = legacyLocationParts(cleanText(device.location));
  const city = cleanText(device.city) || legacy.city || NOT_AVAILABLE;
  const country = cleanText(device.country) || legacy.country || NOT_AVAILABLE;
  const ipAddress = cleanText(device.ipAddress) || NOT_AVAILABLE;
  const locationParts = [city, country].filter((part) => part !== NOT_AVAILABLE);
  const name = cleanText(device.name) || joinUnique([device.model ?? '', device.browser ?? '']);

  return {
    name: name || fallback.name,
    specs: joinUnique([device.type ?? '', device.os ?? '', device.browser ?? '']) || fallback.specs,
    ipAddress,
    city,
    country,
    location: locationParts.join(', ') || cleanText(device.location) || NOT_AVAILABLE,
  };
}

/**
 * Snapshot of the signed-in member (photo, full name, e-mail, NeverBeen User ID) for the
 * account menu — read straight from the session this browser stored, so the always-mounted
 * navbar never has to pull the heavyweight community chunk just to draw the option.
 */
function readAccountSnapshot(): AccountSnapshot | null {
  const user = readStoredJson<Partial<CurrentUser>>(USER_STORAGE_KEY);
  const profile = readStoredJson<Partial<Profile>>(PROFILE_STORAGE_KEY);
  if (!user && !profile) return null;

  const fullName = (
    user?.fullName ||
    profile?.fullName ||
    [user?.firstName || profile?.firstName, user?.lastName || profile?.lastName]
      .filter(Boolean)
      .join(' ') ||
    ''
  ).trim();
  const email = (user?.email || profile?.email || '').trim();
  if (!fullName && !email) return null;

  const id = user?.id ?? profile?.id;
  const uniqueId = (
    user?.uniqueId ||
    profile?.uniqueId ||
    (id ? generate20DigitUid(id) : '')
  ).trim();
  const photoUrl = user?.profilePhotoUrl || profile?.profilePhotoUrl || '';
  const initial = (fullName || email || '?').charAt(0).toUpperCase() || '?';
  return { fullName, email, uniqueId, photoUrl, initial };
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
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, CommunitySearchBox, NgTemplateOutlet],
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

  // ---------------------------------------------------------------------------------------------
  // Ultra-modern account menu (avatar chip + drop-down) — replaces the plain "Log out" option.
  // ---------------------------------------------------------------------------------------------

  /** Whether the account drop-down opened from the menu option is visible. */
  protected readonly accountMenuOpen = signal(false);

  /**
   * Bumped whenever the menu option is opened so the snapshot (photo / name after a
   * profile edit) is re-read from the stored session, on top of the navigation refresh.
   */
  private readonly accountRevision = signal(0);

  /**
   * The signed-in member as shown in the account chip and drop-down (null while signed out).
   * Re-read on navigation and on `profileRevision` — bumped by CommunityService the moment
   * a profile photo / detail is saved — so a new picture shows in the menu immediately,
   * without waiting for the account drop-down to be opened.
   */
  protected readonly account = computed<AccountSnapshot | null>(() => {
    if (!this.isCommunitySignedIn()) return null;
    this.accountRevision();
    this.currentUrl();
    this.badges.profileRevision();
    return readAccountSnapshot();
  });

  /**
   * Read-only current-device details (full name, IP, login city and country). The device
   * revision is bumped by CommunityService after its API / geolocation lookup, while
   * accountRevision re-reads the cache each time the drop-down is opened.
   */
  protected readonly currentDevice = computed<CurrentDeviceSnapshot>(() => {
    this.isCommunitySignedIn();
    this.accountRevision();
    this.currentUrl();
    this.badges.deviceRevision();
    return readCurrentDeviceSnapshot();
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

      // The account drop-down closes when the visitor clicks anywhere else or presses Escape.
      const onDocumentClick = (event: MouseEvent) => {
        if (!this.accountMenuOpen()) return;
        const target = event.target instanceof Element ? event.target : null;
        if (!target?.closest('.account-menu')) this.accountMenuOpen.set(false);
      };
      const onDocumentKeydown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        this.accountMenuOpen.set(false);
        this.open.set(false);
      };
      document.addEventListener('click', onDocumentClick);
      document.addEventListener('keydown', onDocumentKeydown);

      destroyRef.onDestroy(() => {
        observer.disconnect();
        document.removeEventListener('click', onDocumentClick);
        document.removeEventListener('keydown', onDocumentKeydown);
      });
    });

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects || event.url);
        // Leaving the page the drop-down was opened on also closes it.
        this.accountMenuOpen.set(false);
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

  /** Manage Your NeverBeen Account uses the AI Models studio's compact plum site chrome. */
  protected readonly isAccountSettings = computed(() =>
    /^\/?account(?:\/|\?|#|$)/.test(this.currentUrl()),
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

  /** Studio experiences — and the account page — get the same compact site chrome. */
  protected readonly isStudioChrome = computed(
    () =>
      this.isAiModels() ||
      this.isAccountSettings() ||
      this.isMerchandise() ||
      this.isMultiverseStudio(),
  );

  /**
   * Compact header (smaller bar + 50% logo) on the Community, AI Models, Account,
   * Merchandise, Multiverse Studio, member profiles and the whole Admin Console, so as
   * much of the working area as possible is visible. The Community sign-in page keeps
   * the full-size website header.
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
      await this.logout();
      return;
    }

    await this.signInWithGoogle();
  }

  /** Opens / closes the account drop-down attached to the menu option. */
  toggleAccountMenu(event?: Event): void {
    event?.stopPropagation();
    this.accountMenuOpen.update((open) => !open);
    // Re-read the stored profile (photo / name) every time the option is opened.
    this.accountRevision.update((revision) => revision + 1);
  }

  closeAccountMenu(): void {
    this.accountMenuOpen.set(false);
  }

  /** "Manage your NeverBeen Account" row — opens the account details page. */
  manageAccount(): void {
    this.closeAccountMenu();
    this.close();
    void this.router.navigate(['/account']);
  }

  /** The drop-down's Log Out row — ends the community session. */
  async logout(): Promise<void> {
    this.closeAccountMenu();
    this.close();
    const service = await this.getCommunityService();
    service.logout();
    this.badges.signedIn.set(false);
    this.siteTab.sync();
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
    const { CommunityService: CommunityServiceToken } =
      await import('../../services/community.service');
    return runInInjectionContext(this.envInjector, () => inject(CommunityServiceToken));
  }
}
