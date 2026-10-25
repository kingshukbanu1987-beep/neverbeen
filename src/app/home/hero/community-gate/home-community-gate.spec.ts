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
  const unreadNotifications = signal(0);
  const unreadChats = signal(0);

  const community = {
    currentUser,
    profile,
    isAuthenticated: signedIn,
    unreadNotificationCount: unreadNotifications,
    unreadChatCount: unreadChats,
  };

  const defaults: Record<string, string> = {
    communityCardTitle: 'Continue to NeverBeen Community',
    communityCardCopy: 'Use the same Google account you use across NeverBeen.',
    communityWelcomeTitle: 'Welcome, {name}.',
    communityWelcomeCopy: 'You are home in the NeverBeen Multiverse, {name}.',
  };

  beforeEach(async () => {
    currentUser.set(null);
    profile.set(null);
    signedIn.set(false);
    unreadNotifications.set(0);
    unreadChats.set(0);

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

  function create(): HTMLElement {
    const fixture = TestBed.createComponent(HomeCommunityGate);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows visitors only the same Community Google sign-in the AI model pages use', () => {
    const element = create();
    const section = element.querySelector<HTMLElement>('section.gate')!;

    const card = element.querySelector('app-community-sign-in-card');
    expect(card).toBeTruthy();
    expect(card?.querySelector('button.google-sign-in')?.textContent).toContain(
      'Sign in with Google',
    );
    expect(card?.textContent).toContain('Continue to NeverBeen Community');

    // Nothing is written around the card: no headline, perks or footnote.
    expect(element.querySelector('h2')).toBeNull();
    expect(element.querySelector('.gate-perks')).toBeNull();
    expect(element.querySelector('.gate-footnote')).toBeNull();
    expect(element.querySelector('.gate-eyebrow')).toBeNull();

    // A visitor never sees the member passport.
    expect(element.querySelector('.passport')).toBeNull();
    // The section has no surface of its own — it uses the page background.
    expect(getComputedStyle(section).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(section).borderTopWidth).toBe('0px');
    expect(['none', '']).toContain(getComputedStyle(section).boxShadow);
  });

  it('welcomes a signed-in member by name beside the passport instead of the sign-in card', () => {
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
    unreadNotifications.set(3);

    const element = create();

    expect(element.querySelector('.gate')?.classList.contains('gate-member')).toBe(true);
    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Welcome, Aisha.');
    expect(element.querySelector('.gate-welcome-note')?.textContent?.trim()).toBe(
      'You are home in the NeverBeen Multiverse, Aisha.',
    );

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
});
