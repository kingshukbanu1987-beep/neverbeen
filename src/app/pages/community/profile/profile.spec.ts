import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { CommunityProfile } from './profile';
import { CommunityService, getCookie, setCookie, TOKEN_KEY, deleteCookie } from '../../../services/community.service';

describe('CommunityProfile', () => {
  let router: Router;
  let service: CommunityService;

  beforeEach(async () => {
    deleteCookie(TOKEN_KEY);

    await TestBed.configureTestingModule({
      imports: [CommunityProfile],
      providers: [provideRouter([])],
    }).compileComponents();

    router = TestBed.inject(Router);
    service = TestBed.inject(CommunityService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    // Set up active user
    service.loginAsDemoUser('active_member');
  });

  function create() {
    const fixture = TestBed.createComponent(CommunityProfile);
    fixture.detectChanges();
    return fixture;
  }

  it('renders left side panel with user photo, full name, country/city, and menu', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    const leftPanel = element.querySelector('.left-side-panel');
    expect(leftPanel).toBeTruthy();

    expect(leftPanel!.querySelector('.user-avatar-img')).toBeTruthy();
    expect(leftPanel!.querySelector('.profile-full-name')?.textContent?.trim()).toContain('Sophia Laurent');
    expect(leftPanel!.querySelector('.profile-location')?.textContent?.trim()).toContain('Paris');

    const menuButtons = Array.from(leftPanel!.querySelectorAll<HTMLButtonElement>('.menu-btn'));
    const menuLabels = menuButtons.map((b) => b.textContent?.trim());

    expect(menuLabels.some((l) => l?.includes('About me'))).toBe(true);
    expect(menuLabels.some((l) => l?.includes('Gallery'))).toBe(true);
    expect(menuLabels.some((l) => l?.includes('MessageBook'))).toBe(true);
    expect(menuLabels.some((l) => l?.includes('Settings'))).toBe(true);
    expect(menuLabels.some((l) => l?.includes('Log Out'))).toBe(true);
  });

  it('opens About me section by default in the right side wide panel', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    const widePanel = element.querySelector('.right-wide-panel');
    expect(widePanel).toBeTruthy();
    expect(widePanel!.querySelector('.section-title')?.textContent?.trim()).toBe('About Me');
    expect(widePanel!.querySelector('.bio-container')).toBeTruthy();
  });

  it('opens Gallery, MessageBook, and Settings in the wide panel when clicked', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // Switch to Gallery
    component.setSection('gallery');
    fixture.detectChanges();
    expect(element.querySelector('.right-wide-panel .section-title')?.textContent?.trim()).toBe('Vacation Gallery');
    expect(element.querySelector('.gallery-grid')).toBeTruthy();

    // Switch to MessageBook
    component.setSection('messagebook');
    fixture.detectChanges();
    expect(element.querySelector('.right-wide-panel .section-title')?.textContent?.trim()).toBe('Community MessageBook');
    expect(element.querySelector('.mb-composer-box')).toBeTruthy();
    expect(element.querySelectorAll('.post-card').length).toBeGreaterThan(0);

    // Switch to Settings
    component.setSection('settings');
    fixture.detectChanges();
    expect(element.querySelector('.right-wide-panel .section-title')?.textContent?.trim()).toBe('Settings');
    expect(element.querySelector('.settings-form')).toBeTruthy();
  });

  it('terminates user session and navigates to Sign in page on clicking Log Out', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(getCookie(TOKEN_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/community']);
  });
});
