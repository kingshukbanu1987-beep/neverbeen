import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommunityHub } from './community';
import { CommunityService } from '../../services/community.service';
import { routes } from '../../app.routes';

describe('CommunityHub', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityHub],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(CommunityHub);
    fixture.detectChanges();
    return fixture;
  }

  it('renders navigation tabs for Connect, Register, Profile, and Message Book', () => {
    const element: HTMLElement = create().nativeElement;
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('nav.community-nav a.nav-tab'));
    const labels = links.map((a) => a.textContent?.trim());

    expect(labels.some((l) => l?.includes('Connect & Sign In'))).toBe(true);
    expect(labels.some((l) => l?.includes('Registration Form'))).toBe(true);
    expect(labels.some((l) => l?.includes('Member Profile'))).toBe(true);
    expect(labels.some((l) => l?.includes('Message Book'))).toBe(true);
  });

  it('displays guest indicator when logged out, and user details when authenticated', () => {
    const fixture = TestBed.createComponent(CommunityHub);
    const service = TestBed.inject(CommunityService);

    // Log out to test guest mode
    service.logout();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.guest-chip')?.textContent).toContain('Guest Visitor');

    // Simulate demo login
    service.loginAsDemoUser('active_member');
    fixture.detectChanges();

    expect(element.querySelector('.user-chip')?.textContent).toContain('Sophia Laurent');
    expect(element.querySelector('.btn-logout')).toBeTruthy();
  });
});
