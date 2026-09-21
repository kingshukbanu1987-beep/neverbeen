import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { CommunityConnect } from './connect';
import { CommunityService } from '../../../services/community.service';

describe('CommunityConnect', () => {
  let router: Router;
  let service: CommunityService;

  beforeEach(async () => {
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

  it('renders OAuth login buttons for Google, Facebook, and Microsoft', () => {
    const element: HTMLElement = create().nativeElement;
    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('.btn-provider'));
    const text = buttons.map((b) => b.textContent?.trim());

    expect(text.some((t) => t?.includes('Continue with Google'))).toBe(true);
    expect(text.some((t) => t?.includes('Continue with Facebook'))).toBe(true);
    expect(text.some((t) => t?.includes('Continue with Microsoft'))).toBe(true);
  });

  it('navigates to register if OAuth returns pending status', async () => {
    const fixture = TestBed.createComponent(CommunityConnect);
    const component = fixture.componentInstance;
    vi.spyOn(service, 'loginWithOAuth').mockResolvedValue({
      token: 'fake',
      tokenType: 'Bearer',
      expiresIn: 3600,
      isNewUser: true,
      profileComplete: false,
      message: 'New user',
      user: {
        id: 1,
        email: 'test@example.com',
        status: 'Pending',
        profileComplete: false,
      },
    });

    await component.connectWith('google');
    expect(router.navigate).toHaveBeenCalledWith(['/community/register']);
  });

  it('navigates to profile if OAuth returns profileComplete true', async () => {
    const fixture = TestBed.createComponent(CommunityConnect);
    const component = fixture.componentInstance;
    vi.spyOn(service, 'loginWithOAuth').mockResolvedValue({
      token: 'fake',
      tokenType: 'Bearer',
      expiresIn: 3600,
      isNewUser: false,
      profileComplete: true,
      message: 'Existing user',
      user: {
        id: 1,
        email: 'test@example.com',
        status: 'Active',
        profileComplete: true,
      },
    });

    await component.connectWith('google');
    expect(router.navigate).toHaveBeenCalledWith(['/community/profile']);
  });

  it('provides quick demo sandbox buttons for reviewers', () => {
    const fixture = TestBed.createComponent(CommunityConnect);
    const component = fixture.componentInstance;

    component.demoLogin('active_member');
    expect(service.currentUser()?.fullName).toBe('Sophia Laurent');
    expect(router.navigate).toHaveBeenCalledWith(['/community/profile']);
  });
});
