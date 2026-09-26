import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Navbar } from './navbar';
import { routes } from '../../app.routes';
import { CommunityBadgeService } from '../../services/community-badge.service';
import { CommunityService } from '../../services/community.service';
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
  return { companionId, companion: makeCompanion(companionId), isMinimized: false, draftText: '', unreadCount, messages: [] };
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

  it('places the Audience link directly after the How option', () => {
    const labels = navLinks().map((link) => link.textContent?.trim());

    expect(labels.indexOf('Audience')).toBe(labels.indexOf('How') + 1);
  });

  it('labels the how-it-works option "How" and still points at the section', () => {
    const links = navLinks();
    const how = links.find((link) => link.textContent?.trim() === 'How');

    expect(how).toBeDefined();
    expect(how!.getAttribute('href')).toBe('/#how-it-works');
    expect(how!.querySelector('svg.icon use')?.getAttribute('href')).toBe('#nb-icon-cog');
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
    component['currentUrl'].set('/community');
    fixture.detectChanges();
    expect(component['isCommunity']()).toBe(true);
    expect(element.querySelector('header.community-nav')).toBeTruthy();
    expect(element.querySelector('.logo')).toBeNull();
    expect(element.querySelector('nav#site-nav')).toBeNull();
    expect(element.querySelector('button.menu')).toBeNull();

    // …and the new header carries the three icon shortcuts + the theme dropdown at the top right.
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
    expect(element.querySelector('nav#ch-nav ~ .theme-slot')).not.toBeNull();

    // Same replacement on member profile pages.
    component['currentUrl'].set('/profile?id=89201534010000000101');
    fixture.detectChanges();
    expect(element.querySelector('header.community-nav')).toBeTruthy();
    expect(element.querySelector('.logo')).toBeNull();
  });

  it('shows red unread-count badges fed by the community service, hidden at zero, capped at 99+', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;
    const community = TestBed.inject(CommunityService);
    const bridge = TestBed.inject(CommunityBadgeService);
    component['currentUrl'].set('/community');

    // Push the community state through the same path production uses:
    // CommunityService → badge-sync effect → CommunityBadgeService → navbar.
    const apply = (notifications: NotificationItem[], boxes: ActiveChatBox[]) => {
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

    // One unread notification + two chats holding unread messages (of three boxes) →
    // badge on the bell and on the messenger icon only.
    apply([makeNotification(1)], [makeBox(7, 2), makeBox(8, 1), makeBox(9, 0)]);
    expect(iconBadges()).toEqual([null, '1', '2']);

    // Over 99 unread → the 99+ cap.
    apply(Array.from({ length: 105 }, (_, i) => makeNotification(i + 1)), [makeBox(7, 1)]);
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
