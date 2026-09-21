import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommunityProfile } from './profile';
import { CommunityService } from '../../../services/community.service';

describe('CommunityProfile', () => {
  let service: CommunityService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityProfile],
      providers: [provideRouter([])],
    }).compileComponents();

    service = TestBed.inject(CommunityService);
    service.loginAsDemoUser('active_member');
  });

  function create() {
    const fixture = TestBed.createComponent(CommunityProfile);
    fixture.detectChanges();
    return fixture;
  }

  it('renders member hero and tabs: about, details, gallery, settings', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.profile-name')?.textContent).toContain('Sophia Laurent');
    const tabs = Array.from(element.querySelectorAll<HTMLButtonElement>('.sidebar-btn'));
    expect(tabs.length).toBe(4);
  });

  it('allows switching between tabs', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    component.setTab('details');
    fixture.detectChanges();
    expect(element.querySelector('.details-list')).toBeTruthy();

    component.setTab('gallery');
    fixture.detectChanges();
    expect(element.querySelector('.gallery-grid')).toBeTruthy();

    component.setTab('settings');
    fixture.detectChanges();
    expect(element.querySelector('.settings-form')).toBeTruthy();
  });

  it('renders gallery items with captions', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.setTab('gallery');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const items = element.querySelectorAll('.gallery-item');
    expect(items.length).toBeGreaterThan(0);
  });
});
