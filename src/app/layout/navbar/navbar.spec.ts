import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Navbar } from './navbar';
import { routes } from '../../app.routes';
import { CommunityBadgeService } from '../../services/community-badge.service';
import {
  CommunityService,
  deleteCookie,
  setCookie,
  TOKEN_KEY,
} from '../../services/community.service';
import { openDemoAccount } from '../../services/community-demo.testing';
import { SiteTabService } from '../../services/site-tab.service';
import { ActiveChatBox, Companion, NotificationItem } from '../../models/community';

function makeCompanion(id: number): Companion {
  return {
    id,
    uniqueId: `89201534010000000${id}`,
    fullName: `Companion ${id}`,
    profilePhotoUrl: '',
    country: 'India',
    city: 'Kolkata',
    profession: 'Photographer',
    isOnline: true,
    mutualCompanionsCount: 0,
    status: 'connected',
  };
}

function makeBox(companionId: number, unreadCount: number): ActiveChatBox {
  return {
    companionId,
    companion: makeCompanion(companionId),
    isMinimized: false,
    draftText: '',
    unreadCount,
    messages: [],
  };
}

function makeNotification(id: number, isRead = false): NotificationItem {
  return {
    id,
    type: 'journey_like',
    fromUser: { id: id + 10, fullName: `Member ${id}` },
    message: 'liked your journey post',
    createdAtUtc: new Date().toISOString(),
    isRead,
  };
}

describe('Navbar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    return fixture;
  }

  function navLinks(): HTMLAnchorElement[] {
    return Array.from(create().nativeElement.querySelectorAll('nav a')) as HTMLAnchorElement[];
  }

  it('removes the How option from the menu and places Audience directly after Home', () => {
    const labels = navLinks().map((link) => link.textContent?.trim());

    expect(labels).not.toContain('How');
    expect(labels.indexOf('Audience')).toBe(labels.indexOf('Home') + 1);
  });

  it('places Sign In at the end of the menu after Feedback when not logged in to the Community', () => {
    const community = TestBed.inject(CommunityService);
    community.logout();
    TestBed.flushEffects();

    const links = navLinks();
    const labels = links.map((link) => link.textContent?.trim());
    const signIn = links.at(-1)!;

    expect(labels.at(-1)).toBe('Sign In');
    expect(labels.indexOf('Sign In')).toBe(labels.indexOf('Feedback') + 1);
    expect(labels).not.toContain('Log out');
    expect(signIn.querySelector('svg.icon use')?.getAttribute('href')).toBe('#nb-icon-sign-in');
  });

  it('shows the ultra-modern account option when logged in and logs out from its drop-down', async () => {
    const community = TestBed.inject(CommunityService);
    openDemoAccount(community, 'active_member');
    const fixture = create();
    TestBed.flushEffects();
    fixture.detectChanges();

    try {
      const element: HTMLElement = fixture.nativeElement;
      const navLabels = () =>
        Array.from(element.querySelectorAll<HTMLAnchorElement>('nav#site-nav a')).map((link) =>
          link.textContent?.trim(),
        );

      // The plain "Log out" text option is gone; the end of the menu holds the avatar chip
      // (and the same option sits after the hamburger for mobile screens).
      expect(community.isAuthenticated()).toBe(true);
      expect(navLabels()).not.toContain('Log out');
      expect(navLabels()).not.toContain('Sign In');
      const inNav = element.querySelector('.account-menu[data-variant="innav"]') as HTMLElement;
      const inBar = element.querySelector('.account-menu[data-variant="inbar"]') as HTMLElement;
      expect(inNav).toBeTruthy();
      expect(inBar).toBeTruthy();

      const chip = inNav.querySelector<HTMLButtonElement>('.account-chip')!;
      expect(chip).toBeTruthy();
      expect(chip.getAttribute('aria-expanded')).toBe('false');
      expect(chip.querySelector('.account-chip-avatar img, .account-chip-initial')).toBeTruthy();

      // The drop-down opens with four rows: identity, current device, manage account, log out.
      const dropdown = inNav.querySelector<HTMLElement>('.account-dropdown')!;
      expect(dropdown.getAttribute('aria-hidden')).toBe('true');

      chip.click();
      fixture.detectChanges();
      expect(fixture.componentInstance['accountMenuOpen']()).toBe(true);
      expect(chip.getAttribute('aria-expanded')).toBe('true');
      expect(dropdown.getAttribute('aria-hidden')).toBe('false');

      const rows = Array.from(dropdown.querySelectorAll<HTMLElement>('.account-row'));
      expect(rows.length).toBe(4);

      // Row 1 — read-only identity: photo, full name, e-mail and the NeverBeen User ID.
      const identity = rows[0];
      expect(identity.classList.contains('account-identity')).toBe(true);
      expect(identity.querySelector('.account-photo img, .account-photo-initial')).toBeTruthy();
      expect(identity.querySelector('.account-name')?.textContent?.trim()).toBe('Kingshuk');
      expect(identity.querySelector('.account-email')?.textContent?.trim()).toBe(
        'kingshuk.founder@neverbeen.example',
      );
      expect(identity.querySelector('.account-uid')?.textContent).toContain('89201534010000000001');

      // Row 2 — read-only current-device information with a transparent device icon.
      expect(rows[1].classList.contains('account-device')).toBe(true);
      expect(rows[1].textContent).toContain('Current Device');
      expect(rows[1].textContent).toContain('Full Device Name');
      expect(rows[1].textContent).toContain('IP Address');
      expect(rows[1].textContent).toContain('City');
      expect(rows[1].textContent).toContain('Country');
      expect(rows[1].querySelector('.account-device-icon')?.getAttribute('fill')).toBe('none');

      // Row 3 — opens the "Manage your NeverBeen Account" page.
      expect(rows[2].querySelector('.account-action-label')?.textContent?.trim()).toBe(
        'Manage your NeverBeen Account',
      );
      expect(rows[2].querySelector('.account-brand')).toBeTruthy();

      // Row 4 — the Log Out action.
      expect(rows[3].classList.contains('account-logout')).toBe(true);
      expect(rows[3].querySelector('.account-action-label')?.textContent?.trim()).toBe('Log Out');

      // Row 3 routes to the account page and closes the drop-down.
      const router = TestBed.inject(Router);
      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      rows[2].click();
      fixture.detectChanges();
      expect(navSpy).toHaveBeenCalledWith(['/account']);
      expect(fixture.componentInstance['accountMenuOpen']()).toBe(false);
      navSpy.mockRestore();

      // Row 4 logs the member out: only the plain Sign In option is left, with no drop-down.
      chip.click();
      fixture.detectChanges();
      rows[3].click();
      await new Promise((resolve) => setTimeout(resolve, 40));
      TestBed.flushEffects();
      fixture.detectChanges();

      expect(community.isAuthenticated()).toBe(false);
      expect(element.querySelector('.account-menu')).toBeNull();
      expect(element.querySelector('.account-dropdown')).toBeNull();
      expect(navLabels().at(-1)).toBe('Sign In');
    } finally {
      community.logout();
    }
  });

  it('shows the current device name, IP address, city and country above Manage Account', () => {
    const community = TestBed.inject(CommunityService);
    openDemoAccount(community, 'active_member');
    TestBed.flushEffects();

    const user = JSON.parse(localStorage.getItem('neverbeen_current_user') ?? '{}') as {
      id?: number | string;
    };
    const device = {
      id: 'device-menu-current',
      name: 'Samsung Galaxy S24 Ultra · Chrome',
      model: 'Samsung Galaxy S24 Ultra',
      type: 'Phone',
      os: 'Android 14',
      browser: 'Chrome',
      ipAddress: '203.0.113.42',
      location: 'George Town, Penang, Malaysia',
      city: 'George Town',
      country: 'Malaysia',
      isCurrent: true,
      isActive: true,
      blocked: false,
    };
    const deviceIdKeys = [`neverbeen_device_id:${user.id ?? ''}`, 'neverbeen_device_id:anonymous'];
    const previous = {
      devices: localStorage.getItem('neverbeen_devices'),
      ids: deviceIdKeys.map((key) => localStorage.getItem(key)),
    };
    localStorage.setItem('neverbeen_devices', JSON.stringify([device]));
    for (const key of deviceIdKeys) localStorage.setItem(key, device.id);

    const fixture = create();
    TestBed.flushEffects();
    fixture.detectChanges();

    try {
      const inNav = fixture.nativeElement.querySelector(
        '.account-menu[data-variant="innav"]',
      ) as HTMLElement;
      inNav.querySelector<HTMLButtonElement>('.account-chip')!.click();
      fixture.detectChanges();

      const rows = Array.from(
        inNav.querySelectorAll<HTMLElement>('.account-dropdown > .account-row'),
      );
      const deviceRow = inNav.querySelector<HTMLElement>('.account-device')!;
      const deviceIndex = rows.findIndex((row) => row.classList.contains('account-device'));
      const manageIndex = rows.findIndex((row) =>
        row.textContent?.includes('Manage your NeverBeen Account'),
      );

      expect(deviceIndex).toBe(manageIndex - 1);
      expect(deviceRow.querySelector('.account-device-name')?.textContent?.trim()).toBe(
        'Samsung Galaxy S24 Ultra · Chrome',
      );
      expect(deviceRow.querySelector('.account-device-specs')?.textContent).toContain('Android 14');
      expect(deviceRow.querySelector('.account-device-ip b')?.textContent?.trim()).toBe(
        '203.0.113.42',
      );
      const places = Array.from(
        deviceRow.querySelectorAll<HTMLElement>('.account-device-place b'),
      ).map((place) => place.textContent?.trim());
      expect(places).toEqual(['George Town', 'Malaysia']);
      expect(deviceRow.querySelector('.account-device-icon')?.getAttribute('fill')).toBe('none');
    } finally {
      if (previous.devices === null) localStorage.removeItem('neverbeen_devices');
      else localStorage.setItem('neverbeen_devices', previous.devices);
      deviceIdKeys.forEach((key, index) => {
        const value = previous.ids[index];
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      });
      community.logout();
    }
  });

  it('shows a newly uploaded profile photo in the menu immediately, without navigation', async () => {
    const community = TestBed.inject(CommunityService);
    openDemoAccount(community, 'active_member');
    const fixture = create();
    TestBed.flushEffects();
    fixture.detectChanges();

    const chipImg = () =>
      fixture.nativeElement.querySelector('.account-chip-avatar img') as HTMLImageElement | null;

    const before = chipImg()?.getAttribute('src') ?? '';
    expect(before).toBeTruthy();

    // "Manage your NeverBeen Account" → Update: the service stores the new photograph…
    const photo = new File([new Uint8Array([1, 2, 3, 4])], 'avatar.jpg', { type: 'image/jpeg' });
    const uploaded = await community.uploadProfilePhoto(photo);

    // …and the very same page's menu avatar shows it at once — no navigation to refresh
    // the snapshot, no account drop-down open. (Regression: the chip kept the old photo.)
    TestBed.flushEffects();
    fixture.detectChanges();

    const after = chipImg()?.getAttribute('src') ?? '';
    expect(uploaded).toBeTruthy();
    expect(after).toBe(uploaded);
    expect(after).not.toBe(before);
  });

  it('triggers the Google sign-in flow when clicking Sign In in the menu while signed out', async () => {
    const community = TestBed.inject(CommunityService);
    community.logout();
    const checkApiSpy = vi.spyOn(community, 'checkApiOnline').mockResolvedValue(false);
    const googleSpy = vi.spyOn(community, 'signInWithGoogle').mockResolvedValue({
      step: 'identity',
      identity: {
        sub: 'google-sub-123',
        email: 'aisha@example.com',
        emailVerified: true,
        name: 'Aisha Rahman',
        givenName: 'Aisha',
        familyName: 'Rahman',
        picture: '',
      },
    });
    const completeSpy = vi.spyOn(community, 'completeGoogleSignIn').mockReturnValue({
      token: 'jwt_test_google_token',
      tokenType: 'Bearer',
      expiresIn: 86400,
      isNewUser: false,
      profileComplete: true,
      message: 'Signed in',
      user: {
        id: 42,
        firstName: 'Aisha',
        lastName: 'Rahman',
        fullName: 'Aisha Rahman',
        email: 'aisha@example.com',
        status: 'Active',
        profileComplete: true,
      },
    });
    const router = TestBed.inject(Router);
    const navByUrlSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const fixture = create();
    fixture.componentInstance['currentUrl'].set('/');
    TestBed.flushEffects();
    fixture.detectChanges();

    try {
      await fixture.componentInstance.onCommunityAuth(
        new MouseEvent('click', { cancelable: true }),
      );

      expect(checkApiSpy).toHaveBeenCalledWith(true);
      expect(googleSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'aisha@example.com', givenName: 'Aisha' }),
      );
      expect(navByUrlSpy).toHaveBeenCalledWith('/');
    } finally {
      checkApiSpy.mockRestore();
      googleSpy.mockRestore();
      completeSpy.mockRestore();
      navByUrlSpy.mockRestore();
      community.logout();
    }
  });

  it('points the Merchandise link at the store and gives it a shopping bag icon', () => {
    const merchandise = navLinks().find((link) => link.textContent?.trim() === 'Merchandise');

    expect(merchandise?.getAttribute('href')).toBe('/merchandise');
    expect(merchandise?.querySelector('svg.icon use')?.getAttribute('href')).toBe(
      '#nb-icon-shopping-bag',
    );
  });

  it('points the Audience link at the audience route', () => {
    const audience = navLinks().find((link) => link.textContent?.trim() === 'Audience');

    expect(audience?.getAttribute('href')).toBe('/audience');
  });

  it('links the FAQ option, placed after Pricing, to the "Before you go" FAQ section', () => {
    const links = navLinks();
    const labels = links.map((link) => link.textContent?.trim());
    const faq = links[labels.indexOf('FAQ')];

    expect(labels.indexOf('FAQ')).toBe(labels.indexOf('Pricing') + 1);
    expect(faq.getAttribute('href')).toBe('/#faq');
    expect(faq.querySelector('svg.icon use')?.getAttribute('href')).toBe('#nb-icon-help-circle');
  });

  it('routes /audience to the Audience page component', async () => {
    const { Audience } = await import('../../pages/audience/audience');
    const audienceRoute = routes.find((route) => route.path === 'audience');

    expect(audienceRoute).toBeDefined();
    const loaded = await (audienceRoute!.loadComponent as () => Promise<unknown>)();

    expect(loaded).toBe(Audience);
  });

  it('shows the menu toggle as three lines with no visible "Menu" text', () => {
    const button = create().nativeElement.querySelector('button.menu') as HTMLButtonElement;

    expect(button.textContent?.trim()).toBe('');
    expect(button.querySelectorAll('.line').length).toBe(3);
    expect(button.getAttribute('aria-label')).toBe('Open menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe('site-nav');
  });

  it('opens and closes the navigation from the hamburger button', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;
    const button = element.querySelector('button.menu') as HTMLButtonElement;
    const nav = element.querySelector('nav#site-nav') as HTMLElement;

    button.click();
    fixture.detectChanges();

    expect(button.classList.contains('is-open')).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Close menu');
    expect(nav.classList.contains('open')).toBe(true);

    button.click();
    fixture.detectChanges();

    expect(button.classList.contains('is-open')).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(nav.classList.contains('open')).toBe(false);
  });

  it('links the Live option (formerly Travel Feeds), placed before Pricing, to its page with green live icon', () => {
    const links = navLinks();
    const labels = links.map((link) => link.textContent?.trim());
    const feeds = links[labels.indexOf('Live')];

    expect(labels.indexOf('Live')).toBe(labels.indexOf('Pricing') - 1);
    expect(feeds.getAttribute('href')).toBe('/travel-feeds');
    expect(feeds.querySelector('svg.icon use')?.getAttribute('href')).toBe('#nb-icon-live');
  });

  it('links the Feedback option to the feedback page with its own icon', () => {
    const links = navLinks();
    const feedback = links.find((link) => link.textContent?.trim() === 'Feedback');

    expect(feedback).toBeDefined();
    expect(feedback!.getAttribute('href')).toBe('/feedback');
    expect(feedback!.querySelector('svg.icon use')?.getAttribute('href')).toBe(
      '#nb-icon-message-square',
    );
  });

  it('puts a distinct decorative icon to the left of every menu option', () => {
    const element: HTMLElement = create().nativeElement;
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('nav a'));
    const references = new Set<string>();

    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const icon = link.firstElementChild;

      expect(icon?.tagName.toLowerCase()).toBe('svg');
      expect(icon?.classList.contains('icon')).toBe(true);
      expect(icon?.getAttribute('aria-hidden')).toBe('true');

      const reference = icon?.querySelector('use')?.getAttribute('href') ?? '';
      expect(reference.startsWith('#nb-icon-')).toBe(true);
      expect(element.querySelector(`.icon-sprite symbol${reference}`)).not.toBeNull();
      references.add(reference);
    }
    expect(references.size).toBe(links.length);
  });

  it('replaces the website header with the community header on community/profile pages', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // Default website pages: the classic header with the logo and site menu.
    component['currentUrl'].set('/');
    fixture.detectChanges();
    expect(element.querySelector('header.community-nav')).toBeNull();
    expect(element.querySelector('.logo')).toBeTruthy();
    expect(element.querySelector('nav#site-nav')).toBeTruthy();

    // Community pages: the default header (logo included) is gone completely…
    component['currentUrl'].set('/community/profile');
    fixture.detectChanges();
    expect(component['isCommunity']()).toBe(true);
    expect(element.querySelector('header.community-nav')).toBeTruthy();
    expect(element.querySelector('.logo')).toBeNull();
    expect(element.querySelector('nav#site-nav')).toBeNull();
    expect(element.querySelector('button.menu')).toBeNull();

    // …and the new header carries the three icon shortcuts. The theme dropdown is
    // hidden: the Community always uses the Default look.
    expect(element.querySelector('.ch-brand')).toBeTruthy();
    const shortcuts = Array.from(element.querySelectorAll<HTMLAnchorElement>('nav#ch-nav a'));
    expect(shortcuts.map((a) => a.getAttribute('href'))).toEqual([
      '/profile#journey',
      '/profile#notifications',
      '/profile#messenger',
    ]);
    expect(shortcuts[0].querySelector('use')?.getAttribute('href')).toBe('#nb-icon-home');
    expect(shortcuts[1].querySelector('use')?.getAttribute('href')).toBe('#nb-icon-bell');
    expect(shortcuts[2].querySelector('use')?.getAttribute('href')).toBe('#nb-icon-message-square');
    expect(element.querySelector('.theme-slot')).toBeNull();
    expect(element.querySelector('app-community-theme-picker')).toBeNull();

    // Same replacement on member profile pages.
    component['currentUrl'].set('/profile?id=89201534010000000101');
    fixture.detectChanges();
    expect(element.querySelector('header.community-nav')).toBeTruthy();
    expect(element.querySelector('.logo')).toBeNull();
  });

  it('uses rgb(55, 38, 66) for the header and menu background on /ai-models and model profile pages', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;
    const header = element.querySelector('header.nav') as HTMLElement;
    const menuButton = element.querySelector('button.menu') as HTMLButtonElement;
    const siteNav = element.querySelector('nav#site-nav') as HTMLElement;

    for (const url of [
      '/ai-models',
      '/ai-models?search=fiadh',
      '/ai-models/fiadh-dara',
      '/ai-models/fiadh-dara#testimonials',
      '/ai-models/fiadh-dara/photos',
      '/ai-models/fiadh-dara/biography',
      '/ai-models/fiadh-dara/portfolio',
    ]) {
      component['currentUrl'].set(url);
      fixture.detectChanges();

      expect(component['isAiModels']()).toBe(true);
      expect(header.classList.contains('ai-models-nav')).toBe(true);
      expect(getComputedStyle(header).backgroundColor).toBe('rgb(55, 38, 66)');
      expect(getComputedStyle(menuButton).backgroundColor).toBe('rgb(55, 38, 66)');
      expect(getComputedStyle(siteNav).backgroundColor).toBe('rgb(55, 38, 66)');

      menuButton.click();
      fixture.detectChanges();
      expect(siteNav.classList.contains('open')).toBe(true);
      expect(getComputedStyle(siteNav).backgroundColor).toBe('rgb(55, 38, 66)');

      menuButton.click();
      fixture.detectChanges();
    }

    component['currentUrl'].set('/');
    fixture.detectChanges();
    expect(component['isAiModels']()).toBe(false);
    expect(header.classList.contains('ai-models-nav')).toBe(false);
    expect(getComputedStyle(header).backgroundColor).toBe('rgb(255, 255, 255)');
  });

  it('gives Manage Your NeverBeen Account the AI Models compact plum header', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;
    const header = element.querySelector('header.nav') as HTMLElement;

    for (const url of ['/account', '/account?updated=1', '/account#profile']) {
      component['currentUrl'].set(url);
      fixture.detectChanges();

      expect(component['isAccountSettings']()).toBe(true);
      expect(component['isStudioChrome']()).toBe(true);
      expect(component['isCompactLogo']()).toBe(true);
      expect(header.classList.contains('ai-models-nav')).toBe(true);
      expect(header.classList.contains('compact-nav')).toBe(true);
      expect(getComputedStyle(header).backgroundColor).toBe('rgb(55, 38, 66)');
    }

    component['currentUrl'].set('/');
    fixture.detectChanges();
    expect(component['isAccountSettings']()).toBe(false);
    expect(header.classList.contains('ai-models-nav')).toBe(false);
  });

  it('gives Merchandise the same plum chrome as the AI model studio', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;
    const header = element.querySelector('header.nav') as HTMLElement;
    const menuButton = element.querySelector('button.menu') as HTMLButtonElement;
    const siteNav = element.querySelector('nav#site-nav') as HTMLElement;

    component['currentUrl'].set('/merchandise');
    fixture.detectChanges();

    expect(component['isMerchandise']()).toBe(true);
    expect(component['isStudioChrome']()).toBe(true);
    expect(header.classList.contains('ai-models-nav')).toBe(true);
    expect(header.classList.contains('merchandise-nav')).toBe(true);
    expect(getComputedStyle(header).backgroundColor).toBe('rgb(55, 38, 66)');
    expect(getComputedStyle(menuButton).backgroundColor).toBe('rgb(55, 38, 66)');
    expect(getComputedStyle(siteNav).backgroundColor).toBe('rgb(55, 38, 66)');

    component['currentUrl'].set('/');
    fixture.detectChanges();
    expect(component['isMerchandise']()).toBe(false);
    expect(header.classList.contains('merchandise-nav')).toBe(false);
  });

  it('keeps the full website header on the Community sign-in page', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    component['currentUrl'].set('/community');
    fixture.detectChanges();

    // The sign-in page is part of the public website: logo + site menu, full size,
    // not the community profile header (search / shortcuts / theme picker).
    expect(component['isCommunity']()).toBe(false);
    expect(component['isCompactLogo']()).toBe(false);
    expect(element.querySelector('header.community-nav')).toBeNull();
    expect(element.querySelector('header.compact-nav')).toBeNull();
    expect(element.querySelector('.logo')).toBeTruthy();
    expect(element.querySelector('nav#site-nav')).toBeTruthy();
    expect(element.querySelector('button.menu')).toBeTruthy();
    expect(element.querySelector('.ch-brand')).toBeNull();
  });

  it('keeps the full website header on the Community registration page', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    component['currentUrl'].set('/community/register');
    fixture.detectChanges();

    expect(component['isCommunity']()).toBe(false);
    expect(component['isCompactLogo']()).toBe(false);
    expect(element.querySelector('header.community-nav')).toBeNull();
    expect(element.querySelector('header.compact-nav')).toBeNull();
    expect(element.querySelector('.logo')).toBeTruthy();
    expect(element.querySelector('nav#site-nav')).toBeTruthy();
    expect(element.querySelector('.ch-brand')).toBeNull();
  });

  it('shows the waiting chats of the guest tour on the messenger icon', () => {
    // The waiting conversations belong to the “Explore as Guest” tour; a signed-out visitor
    // who has not opened it has none (the community starts empty — see community-demo-data).
    const community = TestBed.inject(CommunityService);
    community.exploreAsGuest();
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;
    component['currentUrl'].set('/community/profile');
    TestBed.flushEffects();
    fixture.detectChanges();

    const chatBadge = element
      .querySelector('a[href="/profile#messenger"] .ch-badge')
      ?.textContent?.trim();
    expect(community.unreadChatCount()).toBeGreaterThan(0);
    expect(chatBadge).toBe(String(community.unreadChatCount()));
  });

  it('shows red unread-count badges fed by the community service, hidden at zero, capped at 99+', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;
    const community = TestBed.inject(CommunityService);
    const bridge = TestBed.inject(CommunityBadgeService);
    component['currentUrl'].set('/community/profile');

    // Push the community state through the same path production uses:
    // CommunityService → badge-sync effect → CommunityBadgeService → navbar.
    const apply = (notifications: NotificationItem[], boxes: ActiveChatBox[]) => {
      community.pendingChats.set([]);
      community.notifications.set(notifications);
      community.activeChatBoxes.set(boxes);
      TestBed.flushEffects();
      fixture.detectChanges();
    };
    const iconBadges = () =>
      Array.from(element.querySelectorAll<HTMLAnchorElement>('nav#ch-nav a')).map(
        (a) => a.querySelector<HTMLSpanElement>('.ch-badge')?.textContent?.trim() ?? null,
      );

    // Nothing unread: no badges.
    apply([], []);
    expect(element.querySelectorAll('.ch-badge').length).toBe(0);

    // One unread notification + three unread chat messages across two boxes (of three)
    // → badge on the bell and on the messenger icon (one per unread message).
    apply([makeNotification(1)], [makeBox(7, 2), makeBox(8, 1), makeBox(9, 0)]);
    expect(iconBadges()).toEqual([null, '1', '3']);

    // Browser tab ( ) is chats + notifications, not notifications alone.
    setCookie(TOKEN_KEY, 'jwt_default_active_token', 1);
    TestBed.inject(SiteTabService).sync();
    expect(document.title).toBe('(4) NeverBeen');
    deleteCookie(TOKEN_KEY);
    TestBed.inject(SiteTabService).sync();

    // Over 99 unread → the 99+ cap.
    apply(
      Array.from({ length: 105 }, (_, i) => makeNotification(i + 1)),
      [makeBox(7, 1)],
    );
    expect(iconBadges()).toEqual([null, '99+', '1']);

    // Everything marked read → the badges disappear.
    community.markNotificationsRead();
    community.markChatRead(7);
    apply(community.notifications(), community.activeChatBoxes());
    expect(iconBadges()).toEqual([null, null, null]);
    expect(bridge.unreadNotifications()).toBe(0);
    expect(bridge.unreadChats()).toBe(0);
  });
});
