import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommunityHub } from './community';
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

  it('renders the community shell with router outlet', () => {
    const element: HTMLElement = create().nativeElement;
    expect(element.querySelector('.community-shell')).toBeTruthy();
    expect(element.querySelector('router-outlet')).toBeTruthy();
  });

  it('drops the shell top padding on the profile route so no blank row shows above the profile', () => {
    const fixture = create();
    const shell = fixture.nativeElement.querySelector('.community-shell') as HTMLElement;

    // Every other community page keeps the shell's 2rem breathing room.
    expect(shell.classList.contains('is-profile-route')).toBe(false);

    // The member profile page (the Community Home) starts directly under the community header.
    (fixture.componentInstance as any).currentUrl.set('/community/profile');
    fixture.detectChanges();
    expect(shell.classList.contains('is-profile-route')).toBe(true);
  });
});
