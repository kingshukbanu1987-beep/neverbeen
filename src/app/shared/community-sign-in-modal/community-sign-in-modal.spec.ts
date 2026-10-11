import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommunityService } from '../../services/community.service';
import { CommunitySignInModal } from './community-sign-in-modal';

@Component({
  imports: [CommunitySignInModal],
  template: `
    @if (open) {
      <app-community-sign-in-modal
        [title]="title"
        [reason]="reason"
        (dismissed)="closed += 1"
      />
    }
  `,
})
class ModalHost {
  open = true;
  title = 'Sign in to like & comment';
  reason = 'Sign in with your Community account to like this photograph.';
  closed = 0;
}

describe('CommunitySignInModal', () => {
  let fixture: ComponentFixture<ModalHost>;
  let element: HTMLElement;

  beforeEach(async () => {
    const communityMock = {
      isAuthenticated: () => false,
      currentUser: () => null,
      token: () => null,
      apiUrl: 'https://neverbeen-api.test',
      apiLive: false,
      guestBrowsing: () => false,
      checkApiOnline: vi.fn().mockResolvedValue(false),
      startOAuthRedirect: vi.fn().mockReturnValue(false),
      signInWithGoogle: vi.fn(),
      loginWithOAuth: vi.fn(),
      completeGoogleSignIn: vi.fn(),
      awaitGoogleIdentity: vi.fn(),
      cancelGoogleIdentity: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ModalHost],
      providers: [provideRouter([]), { provide: CommunityService, useValue: communityMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalHost);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('renders an ultra-modern dialog with the reason and the Google entry point', () => {
    const card = element.querySelector('.signin-card');
    expect(card?.getAttribute('role')).toBe('dialog');
    expect(card?.getAttribute('aria-modal')).toBe('true');
    expect(element.querySelector('.signin-title')?.textContent).toContain('Sign in to like');
    expect(element.querySelector('.signin-reason')?.textContent).toContain('like this photograph');
    expect(element.querySelector('.signin-google')?.textContent).toContain('Continue with Google');

    // The small perk chips name exactly what a session unlocks.
    const perks = Array.from(element.querySelectorAll('.signin-perks li')).map((chip) =>
      chip.textContent?.trim(),
    );
    expect(perks).toEqual(['♥ Likes', '💬 Comments', '↗ Share']);
  });

  it('dismisses on the close button, on the backdrop and on Escape', () => {
    const host = fixture.componentInstance;

    element.querySelector<HTMLButtonElement>('.signin-close')!.click();
    fixture.detectChanges();
    expect(host.closed).toBe(1);

    host.open = true;
    fixture.detectChanges();
    const overlay = element.querySelector<HTMLElement>('.signin-overlay')!;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(host.closed).toBe(2);

    host.open = true;
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(host.closed).toBe(3);
  });

  it('offers the account-creation path and a guest way out', () => {
    const join = element.querySelector<HTMLAnchorElement>('.signin-join');
    expect(join?.getAttribute('href')).toBe('/community/register');
    expect(element.querySelector('.signin-later')?.textContent).toContain('Continue browsing');
    expect(element.querySelector('.signin-foot')?.textContent?.toLowerCase()).toContain(
      'guests can explore',
    );
  });
});
