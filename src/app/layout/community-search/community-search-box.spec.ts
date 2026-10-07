import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { CommunitySearchBox } from './community-search-box';
import { CommunityService } from '../../services/community.service';

describe('CommunitySearchBox (community header search)', () => {
  let router: Router;
  let el: HTMLElement;
  let detect: () => void;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunitySearchBox],
      providers: [provideRouter([])],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    // The travelers and circles this header search finds are the “Explore as Guest” tour
    // data; a signed-out visitor starts with none of it (see the last test).
    TestBed.inject(CommunityService).exploreAsGuest();
    const fixture = TestBed.createComponent(CommunitySearchBox);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
    detect = () => fixture.detectChanges();
  });

  function items(): HTMLElement[] {
    return Array.from(el.querySelectorAll('.csb-item')) as HTMLElement[];
  }

  function type(query: string) {
    const input = el.querySelector('.csb-input') as HTMLInputElement;
    input.value = query;
    input.dispatchEvent(new Event('input'));
    detect();
  }

  it('finds travelers by name / city / profession and circles, grouped', () => {
    const service = TestBed.inject(CommunityService);
    const elena = service.companions().find((c) => c.id === 33)!;
    const circle = service.circles()[0];

    type(elena.fullName.split(' ')[0]);
    expect(el.querySelectorAll('img.csb-avatar').length).toBeGreaterThan(0);
    expect(el.querySelector('.csb-group-label')?.textContent).toContain('Travelers');

    type(circle.name);
    const circleItems = items().filter((i) =>
      i.textContent?.includes(circle.name),
    );
    expect(circleItems.length).toBeGreaterThan(0);
    expect(el.querySelector('.csb-group-label')?.textContent).toContain('Circles');
  });

  it('opens the clicked traveler profile via /profile?id=…', () => {
    const service = TestBed.inject(CommunityService);
    const elena = service.companions().find((c) => c.id === 33)!;

    type(elena.fullName);
    const item = items().find((i) => i.textContent?.includes(elena.fullName))!;
    item.click();

    expect(router.navigate).toHaveBeenCalledWith(['/profile'], {
      queryParams: { id: elena.uniqueId },
    });
  });

  it('opens the Circles section for a clicked circle', () => {
    const service = TestBed.inject(CommunityService);
    const circle = service.circles()[0];

    type(circle.name);
    const item = items().find((i) => i.textContent?.includes(circle.name))!;
    item.click();

    expect(router.navigate).toHaveBeenCalledWith(['/profile'], { fragment: 'circles' });
  });

  it('sends a companion request from the + Connect action', () => {
    const service = TestBed.inject(CommunityService);
    const stranger = service.companions().find((c) => c.status === 'none')!;

    type(stranger.fullName);
    const item = items().find((i) => i.textContent?.includes(stranger.fullName))!;
    (item.querySelector('.csb-connect') as HTMLButtonElement).click();
    expect(service.companions().find((c) => c.id === stranger.id)!.status).toBe('pending_outgoing');
  });

  it('finds nothing for a signed-out visitor who has not opened the guest tour', () => {
    const service = TestBed.inject(CommunityService);
    // Leaving the tour (or never opening it) leaves the community empty: no demo travelers
    // and no demo circles are searchable, only the real member data would be.
    service.logout();
    detect();

    type('Elena');
    expect(items().length).toBe(0);
    expect(el.querySelector('.csb-empty')).toBeTruthy();
    expect(service.companions().length).toBe(0);
    expect(service.circles().length).toBe(0);
  });

  it('clears the search and shows an empty state for no match', () => {
    type('zzzz-no-such-traveler');
    expect(el.querySelector('.csb-empty')).toBeTruthy();

    (el.querySelector('.csb-clear') as HTMLButtonElement).click();
    detect();
    expect(el.querySelector('.csb-empty')).toBeNull();
    expect((el.querySelector('.csb-input') as HTMLInputElement).value).toBe('');
  });
});
