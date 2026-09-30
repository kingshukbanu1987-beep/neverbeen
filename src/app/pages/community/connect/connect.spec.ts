import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { CommunityConnect } from './connect';
import { CommunityService, setCookie, deleteCookie, TOKEN_KEY, PROFILE_KEY, GUEST_KEY } from '../../../services/community.service';

describe('CommunityConnect', () => {
  let router: Router;
  let service: CommunityService;

  beforeEach(async () => {
    deleteCookie(TOKEN_KEY);
    localStorage.removeItem(GUEST_KEY);

    await TestBed.configureTestingModule({
      imports: [CommunityConnect],
      providers: [provideRouter([])],
    }).compileComponents();

    router = TestBed.inject(Router);
    service = TestBed.inject(CommunityService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  function create() {
    const fixture = TestBed.createComponent(CommunityConnect);
    fixture.detectChanges();
    return fixture;
  }

  it('renders Google sign-in in a card box and hides Facebook sign-in', () => {
    const element: HTMLElement = create().nativeElement;
    const cardBox = element.querySelector('.oauth-card-box');
    expect(cardBox).toBeTruthy();

    const buttons = Array.from(cardBox!.querySelectorAll<HTMLButtonElement>('.oauth-btn'));
    const labels = buttons.map((b) => b.textContent?.trim());

    expect(labels.some((l) => l?.includes('Sign in with Google'))).toBe(true);
    expect(labels.some((l) => l?.includes('Sign in with Facebook'))).toBe(false);

    // 'Sign in with Apple' and 'Sign in with Microsoft' have been removed
    expect(labels.some((l) => l?.includes('Sign in with Apple'))).toBe(false);
    expect(labels.some((l) => l?.includes('Sign in with Microsoft'))).toBe(false);

    expect(labels[0]).toContain('Sign in with Google');
    expect(buttons).toHaveLength(1);
  });

  it('offers an “Explore as Guest” option that opens the whole community default profile', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;
    const guest = element.querySelector<HTMLButtonElement>('button.guest-explore-btn');

    expect(guest).toBeTruthy();
    expect(guest!.textContent).toContain('Explore as Guest');
    expect(element.querySelector('.guest-divider')).toBeTruthy();
    expect(element.querySelector('.guest-hint')?.textContent).toContain('without an account');

    guest!.click();
    fixture.detectChanges();

    // The guest lands on the Community profile with the whole default profile loaded —
    // without any account session (no auth cookie/token, not signed in).
    expect(router.navigate).toHaveBeenCalledWith(['/community/profile']);
    expect(service.guestBrowsing()).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.profile()?.fullName).toBe('Kingshuk');
    expect(service.profile()?.profession).toContain('founder of NeverBeen');
  });

  it('redirects to user profile page if already authenticated on open', () => {
    service.loginAsDemoUser('active_member');
    expect(service.isAuthenticated()).toBe(true);

    const fixture = TestBed.createComponent(CommunityConnect);
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/community/profile']);
  });

  it('redirects new users to the registration form after OAuth', async () => {
    const fixture = TestBed.createComponent(CommunityConnect);
    const component = fixture.componentInstance;
    component.setSimulationMode(false); // New member mode

    await component.signInWith('google');
    expect(router.navigate).toHaveBeenCalledWith(['/community/register']);
  });

  it('redirects existing users to user profile page after OAuth', async () => {
    const fixture = TestBed.createComponent(CommunityConnect);
    const component = fixture.componentInstance;
    component.setSimulationMode(true); // Existing member mode

    await component.signInWith('google');
    expect(router.navigate).toHaveBeenCalledWith(['/community/profile']);
  });

  it('signs in with a real Google identity and routes a brand-new account to registration', async () => {
    localStorage.removeItem(PROFILE_KEY); // no NeverBeen profile yet for this Google email
    const fixture = TestBed.createComponent(CommunityConnect);
    const component = fixture.componentInstance;

    vi.spyOn(service, 'signInWithGoogle').mockResolvedValue({
      step: 'identity',
      identity: {
        sub: 'google-sub-101',
        email: 'sophia.travels@gmail.com',
        emailVerified: true,
        name: 'Sophia Laurent',
        givenName: 'Sophia',
        familyName: 'Laurent',
        picture: 'https://example.com/sophia.jpg',
      },
    });

    await component.signInWith('google');

    // Real Google data lands on the pending account and registration is required
    expect(service.currentUser()?.email).toBe('sophia.travels@gmail.com');
    expect(service.currentUser()?.firstName).toBe('Sophia');
    expect(service.currentUser()?.lastName).toBe('Laurent');
    expect(service.currentUser()?.profileComplete).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/community/register']);
  });

  it('routes an existing NeverBeen profile matched by Google email straight to the profile page', async () => {
    // A profile already completed for this member's Google email
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        id: 42,
        email: 'member.google@gmail.com',
        firstName: 'Marco',
        lastName: 'Polo',
        fullName: 'Marco Polo',
        settings: { isProfileLocked: false },
      }),
    );

    const fixture = TestBed.createComponent(CommunityConnect);
    const component = fixture.componentInstance;

    vi.spyOn(service, 'signInWithGoogle').mockResolvedValue({
      step: 'identity',
      identity: {
        sub: 'google-sub-42',
        email: 'member.google@gmail.com',
        emailVerified: true,
        name: 'Marco Polo',
        givenName: 'Marco',
        familyName: 'Polo',
        picture: '',
      },
    });

    await component.signInWith('google');

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.profileComplete).toBe(true);
    expect(router.navigate).toHaveBeenCalledWith(['/community/profile']);
  });

  it('signs in with a real Facebook identity and routes a brand-new account to registration', async () => {
    localStorage.removeItem(PROFILE_KEY); // no NeverBeen profile yet for this Facebook email
    const fixture = TestBed.createComponent(CommunityConnect);
    const component = fixture.componentInstance;

    vi.spyOn(service, 'signInWithFacebook').mockResolvedValue({
      step: 'identity',
      identity: {
        id: 'fb-id-777',
        email: 'marco.travels@example.com',
        name: 'Marco Polo',
        firstName: 'Marco',
        lastName: 'Polo',
        picture: 'https://example.com/marco.jpg',
      },
    });

    await component.signInWith('facebook');

    expect(service.currentUser()?.email).toBe('marco.travels@example.com');
    expect(service.currentUser()?.firstName).toBe('Marco');
    expect(service.currentUser()?.profileComplete).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/community/register']);
  });

  it('routes an existing NeverBeen profile matched by Facebook email straight to the profile page', async () => {
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        id: 77,
        email: 'existing.fb@example.com',
        firstName: 'Elena',
        lastName: 'Rossi',
        fullName: 'Elena Rossi',
        settings: { isProfileLocked: false },
      }),
    );

    const fixture = TestBed.createComponent(CommunityConnect);
    const component = fixture.componentInstance;

    vi.spyOn(service, 'signInWithFacebook').mockResolvedValue({
      step: 'identity',
      identity: {
        id: 'fb-id-78',
        email: 'existing.fb@example.com',
        name: 'Elena Rossi',
        firstName: 'Elena',
        lastName: 'Rossi',
        picture: '',
      },
    });

    await component.signInWith('facebook');

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.profileComplete).toBe(true);
    expect(router.navigate).toHaveBeenCalledWith(['/community/profile']);
  });
});
