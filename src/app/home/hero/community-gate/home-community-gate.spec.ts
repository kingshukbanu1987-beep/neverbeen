import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CurrentUser, Profile } from '../../../models/community';
import { CommunityService } from '../../../services/community.service';
import { SiteConfigService } from '../../../services/site-config.service';
import { HomeCommunityGate } from './home-community-gate';

describe('HomeCommunityGate', () => {
  const currentUser = signal<CurrentUser | null>(null);
  const profile = signal<Profile | null>(null);
  const signedIn = signal(false);
  const guestBrowsing = signal(false);
  const unreadNotifications = signal(0);
  const unreadChats = signal(0);
  const journeyPosts = signal<unknown[]>([]);
  const circles = signal<unknown[]>([]);
  const connections = signal<unknown[]>([]);

  const community = {
    currentUser,
    profile,
    isAuthenticated: signedIn,
    guestBrowsing,
    unreadNotificationCount: unreadNotifications,
    unreadChatCount: unreadChats,
    visibleJourneyPosts: journeyPosts,
    myCircles: circles,
    visibleCompanions: connections,
  };

  beforeEach(async () => {
    currentUser.set(null);
    profile.set(null);
    signedIn.set(false);
    guestBrowsing.set(false);
    unreadNotifications.set(0);
    unreadChats.set(0);
    journeyPosts.set([]);
    circles.set([]);
    connections.set([]);

    await TestBed.configureTestingModule({
      imports: [HomeCommunityGate],
      providers: [
        provideRouter([]),
        { provide: CommunityService, useValue: community },
        {
          provide: SiteConfigService,
          useValue: { text: (_group: string, key: string) => defaults[key] },
        },
      ],
    }).compileComponents();
  });

  const defaults: Record<string, string> = {
    communityGateTitle: 'Sign in. Step into the NeverBeen Multiverse.',
    communityGateCopy: 'One NeverBeen account keeps every journey, circle and message together.',
    communityCardTitle: 'Continue to NeverBeen Community',
    communityCardCopy: 'Use the same Google account you use across NeverBeen.',
    communityWelcomeTitle: 'Welcome, {name}.',
    communityWelcomeCopy: 'You are home in the NeverBeen Multiverse, {name}.',
  };

  function create(): HTMLElement {
    const fixture = TestBed.createComponent(HomeCommunityGate);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('offers the same Community Google sign-in the AI model pages use to visitors', () => {
    const element = create();

    expect(element.querySelector('h2')?.textContent?.trim()).toBe(
      'Sign in. Step into the NeverBeen Multiverse.',
    );
    expect(element.querySelector('.gate-perks')?.textContent).toContain('Join the circles');

    const card = element.querySelector('app-community-sign-in-card');
    expect(card).toBeTruthy();
    expect(card?.querySelector('button.google-sign-in')?.textContent).toContain(
      'Sign in with Google',
    );
    expect(card?.textContent).toContain('Continue to NeverBeen Community');

    // A visitor never sees the member passport.
    expect(element.querySelector('.passport')).toBeNull();
    // The gate sits in its own section under the hero previews.
    expect(element.querySelector('section.gate')).toBeTruthy();
  });

  it('welcomes a signed-in member by name and swaps the sign-in card for the passport', () => {
    signedIn.set(true);
    currentUser.set({
      id: 42,
      uniqueId: '10000000000000000042',
      firstName: 'Aisha',
      lastName: 'Rahman',
      fullName: 'Aisha Rahman',
      email: 'aisha@example.com',
      status: 'Active',
      profileComplete: true,
      profilePhotoUrl: '/community/aisha.jpg',
      activeStatus: 'Busy',
    });
    profile.set({
      id: 42,
      uniqueId: '10000000000000000042',
      fullName: 'Aisha Rahman',
      email: 'aisha@example.com',
      status: 'Active',
      createdAtUtc: '2024-03-11T09:00:00Z',
      settings: {} as Profile['settings'],
      gallery: [],
      commentCount: 0,
    });
    journeyPosts.set([{}, {}, {}]);
    circles.set([{}]);
    connections.set([{}, {}]);
    unreadNotifications.set(3);

    const element = create();

    expect(element.querySelector('.gate')?.classList.contains('gate-member')).toBe(true);
    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Welcome, Aisha.');

    // No sign-in card for a member.
    expect(element.querySelector('app-community-sign-in-card')).toBeNull();

    const passport = element.querySelector('.passport')!;
    expect(passport.querySelector('h3')?.textContent?.trim()).toBe('Aisha Rahman');
    expect(passport.querySelector('.passport-initials')).toBeNull();
    expect(passport.querySelector('img')?.getAttribute('src')).toBe('/community/aisha.jpg');
    expect(passport.querySelector('.passport-id')?.textContent?.trim()).toBe(
      '10000000000000000042',
    );
    expect(passport.textContent).toContain('2024');
    expect(passport.querySelector('.passport-presence')?.textContent).toContain('Busy');
    expect(passport.querySelector('.link-badge')?.textContent?.trim()).toBe('3');

    const passportLinks = Array.from(passport.querySelectorAll('a')).map((link) =>
      link.getAttribute('href'),
    );
    expect(passportLinks).toContain('/profile');
    expect(passportLinks).toContain('/community/message-book');

    const stats = Array.from(element.querySelectorAll('.gate-stat')).map((stat) =>
      (stat.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );
    expect(stats).toEqual(['Journey posts3', 'Circles joined1', 'Connections2']);
  });

  it('falls back to initials and the e-mail name when a member has no portrait or names', () => {
    signedIn.set(true);
    currentUser.set({
      id: 7,
      email: 'sam.traveller@example.com',
      status: 'Active',
      profileComplete: false,
    });

    const element = create();

    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Welcome, Sam Traveller.');
    expect(element.querySelector('.passport-initials')?.textContent?.trim()).toBe('ST');
    expect(element.querySelector('.passport-id')?.textContent?.trim()).toBe('Pending');
  });

  it('tells a guest that signing in keeps their own journey', () => {
    guestBrowsing.set(true);
    expect(create().querySelector('.gate-footnote')?.textContent).toContain('exploring as a guest');
  });
});
