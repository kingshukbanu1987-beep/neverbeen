import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CurrentUser, Profile } from '../../../models/community';
import { CommunityService } from '../../../services/community.service';
import { SiteConfigService } from '../../../services/site-config.service';
import { HeroCommunitySignIn } from './hero-community-signin';

describe('HeroCommunitySignIn', () => {
  const currentUser = signal<CurrentUser | null>(null);
  const profile = signal<Profile | null>(null);
  const signedIn = signal(false);

  const community = {
    currentUser,
    profile,
    isAuthenticated: signedIn,
  };

  const defaults: Record<string, string> = {
    communityWelcomeTitle: 'Welcome, {name}.',
  };

  beforeEach(async () => {
    currentUser.set(null);
    profile.set(null);
    signedIn.set(false);

    await TestBed.configureTestingModule({
      imports: [HeroCommunitySignIn],
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
    const fixture = TestBed.createComponent(HeroCommunitySignIn);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the Google sign-in button alone to visitors, with no header text', () => {
    const element = create();

    // Nothing is written next to the button — no header line, no copy, no note.
    expect(element.querySelector('.hero-signin-title')).toBeNull();
    expect(element.querySelector('.hero-signin-subtitle')).toBeNull();
    expect(element.querySelector('a')).toBeNull();

    // The Google button comes from the shared Community sign-in card, in its
    // button-only variant: no dark card, no eyebrow, no extra copy or note.
    const card = element.querySelector('app-community-sign-in-card');
    expect(card).toBeTruthy();
    expect(card?.classList.contains('is-button')).toBe(true);
    expect(card?.querySelector('.community-auth-card')).toBeNull();
    expect(card?.querySelector('button.google-sign-in')?.textContent?.trim()).toBe(
      'Sign in with Google',
    );

    expect(element.querySelector('.hero-signin')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Sign in with Google',
    );
  });

  it('replaces the sign-in with a personal welcome and plain-text subtitle that does not link to the community', () => {
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
      activeStatus: 'Active',
    });

    const element = create();

    expect(element.querySelector('.hero-signin')?.classList.contains('is-member')).toBe(true);
    expect(element.querySelector('.hero-signin-title')?.textContent?.trim()).toBe(
      'Welcome, Aisha.',
    );
    expect(element.querySelector('app-community-sign-in-card')).toBeNull();

    const subtitle = element.querySelector('.hero-signin-subtitle');
    expect(subtitle).toBeTruthy();
    expect(subtitle?.tagName).toBe('P');
    expect(subtitle?.textContent?.trim()).toBe('Step into the NeverBeen Multiverse');

    // Plain text only — never an anchor or navigation trigger to /community.
    expect(element.querySelector('a')).toBeNull();
    expect(element.querySelector('[href]')).toBeNull();
    expect(element.querySelector('.hero-signin-link')).toBeNull();
  });

  it('falls back to the e-mail name when a member has no first name', () => {
    signedIn.set(true);
    currentUser.set({
      id: 7,
      email: 'sam.traveller@example.com',
      status: 'Active',
      profileComplete: false,
    });

    expect(create().querySelector('.hero-signin-title')?.textContent?.trim()).toBe(
      'Welcome, Sam Traveller.',
    );
  });
});
