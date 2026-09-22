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
});
