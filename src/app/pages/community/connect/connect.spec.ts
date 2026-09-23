import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { CommunityConnect } from './connect';
import { CommunityService, setCookie, deleteCookie, TOKEN_KEY, PROFILE_KEY } from '../../../services/community.service';

describe('CommunityConnect', () => {
  let router: Router;
  let service: CommunityService;

  beforeEach(async () => {
    deleteCookie(TOKEN_KEY);

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

  it('renders the 4 OAuth login options in order — Google, Facebook, Apple (3rd), Microsoft — in a card box design', () => {
    const element: HTMLElement = create().nativeElement;
    const cardBox = element.querySelector('.oauth-card-box');
    expect(cardBox).toBeTruthy();

    const buttons = Array.from(cardBox!.querySelectorAll<HTMLButtonElement>('.oauth-btn'));
    const labels = buttons.map((b) => b.textContent?.trim());

    expect(labels.some((l) => l?.includes('Sign in with Google'))).toBe(true);
    expect(labels.some((l) => l?.includes('Sign in with Facebook'))).toBe(true);
    expect(labels.some((l) => l?.includes('Sign in with Apple'))).toBe(true);
    expect(labels.some((l) => l?.includes('Sign in with Microsoft'))).toBe(true);

    // Apple must sit in 3rd place, right after Facebook and before Microsoft
    expect(labels[0]).toContain('Sign in with Google');
    expect(labels[1]).toContain('Sign in with Facebook');
    expect(labels[2]).toContain('Sign in with Apple');
    expect(labels[3]).toContain('Sign in with Microsoft');
    expect(buttons[2].classList.contains('btn-apple')).toBe(true);
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
});
