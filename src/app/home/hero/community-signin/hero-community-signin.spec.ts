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
    communityWelcomeTitle: '{name}',
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

  it('replaces the sign-in with the member name, set large, above the plain-text Explore line', () => {
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
    expect(element.querySelector('app-community-sign-in-card')).toBeNull();

    // “Welcome  ” then the name — two spaces between them, no period at the end.
    const title = element.querySelector<HTMLElement>('.hero-signin-title');
    expect(title).toBeTruthy();
    expect(title?.textContent?.trim()).toBe('Welcome  Aisha');
    expect(title?.textContent?.trim().startsWith('Welcome  A')).toBe(true);

    // The gap keeps both spaces rendered (HTML would otherwise collapse them).
    const gap = element.querySelector<HTMLElement>('.hero-signin-gap');
    expect(gap?.textContent).toBe('  ');
    expect(getComputedStyle(gap!).whiteSpace).toBe('pre-wrap');
    expect(title?.textContent?.trim().endsWith('.')).toBe(false);

    // “Welcome” matches the exact display style of “Imagine Yourself Anywhere, Even Where You’ve Never Been”,
    // while the member's username keeps its unchanged Calibri brand-purple style.
    const greeting = element.querySelector<HTMLElement>('.hero-signin-greeting');
    const name = element.querySelector<HTMLElement>('.hero-signin-name');
    expect(greeting?.textContent?.trim()).toBe('Welcome');
    expect(name?.textContent?.trim()).toBe('Aisha');

    const greetingStyle = getComputedStyle(greeting!);
    expect(greetingStyle.fontFamily).toContain('var(--serif)');
    expect(greetingStyle.fontWeight).toBe('500');
    expect(greetingStyle.lineHeight).toBe('1.04');
    expect(greetingStyle.letterSpacing).toBe('-0.028em');
    expect(greetingStyle.backgroundImage).toContain(
      'linear-gradient(102deg, rgb(11, 13, 18) 10%, rgb(38, 44, 63) 56%, rgb(91, 91, 240) 98%)',
    );

    const nameStyle = getComputedStyle(name!);
    expect(nameStyle.fontFamily).toContain('Calibri');
    expect(nameStyle.color).toBe('rgb(101, 57, 129)');
    expect(nameStyle.fontWeight).toBe('600');
    expect(nameStyle.letterSpacing).toBe('-0.02em');
    expect(nameStyle.lineHeight).toBe('1.02');
    const nameSize = fontSizeInPx(nameStyle.fontSize);
    expect(nameSize).toBeGreaterThanOrEqual(32);

    const subtitle = element.querySelector('.hero-signin-subtitle');
    expect(subtitle).toBeTruthy();
    expect(subtitle?.tagName).toBe('P');
    expect(subtitle?.textContent?.trim()).toBe(
      'Explore the NeverBeen Multiverse and Interact with our NeverBeen AI Models and Shop NeverBeen Merchandise from our exclusive NeverBeen Store',
    );

    // The Explore line stays small next to the name.
    expect(fontSizeInPx(getComputedStyle(subtitle!).fontSize)).toBeLessThan(nameSize);

    // Plain text only — never an anchor or navigation trigger to /community.
    expect(element.querySelector('a')).toBeNull();
    expect(element.querySelector('[href]')).toBeNull();
    expect(element.querySelector('.hero-signin-link')).toBeNull();
  });

  it('drops a trailing period left in published copy so the name never ends with one', () => {
    signedIn.set(true);
    currentUser.set({
      id: 42,
      firstName: 'Aisha',
      email: 'aisha@example.com',
      status: 'Active',
      profileComplete: true,
    });
    defaults['communityWelcomeTitle'] = '{name}.';

    try {
      const element = create();
      expect(element.querySelector('.hero-signin-title')?.textContent?.trim()).toBe(
        'Welcome  Aisha',
      );
    } finally {
      defaults['communityWelcomeTitle'] = '{name}';
    }
  });

  it('falls back to the e-mail name when a member has no first name', () => {
    signedIn.set(true);
    currentUser.set({
      id: 7,
      email: 'sam.traveller@example.com',
      status: 'Active',
      profileComplete: false,
    });

    expect(create().querySelector('.hero-signin-name')?.textContent?.trim()).toBe(
      'Sam Traveller',
    );
  });
});

/** Resolves a declared font-size ("2.9rem" / "46px") to pixels for comparison. */
function fontSizeInPx(value: string): number {
  const size = parseFloat(value);
  if (!Number.isFinite(size)) return 0;
  return value.trim().endsWith('rem') ? size * 16 : size;
}
