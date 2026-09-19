import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Navbar } from './navbar';
import { routes } from '../../app.routes';

describe('Navbar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  function navLinks(): HTMLAnchorElement[] {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    return Array.from(fixture.nativeElement.querySelectorAll('nav a')) as HTMLAnchorElement[];
  }

  it('places the Audience link directly after How It Works', () => {
    const labels = navLinks().map((link) => link.textContent?.trim());

    expect(labels.indexOf('Audience')).toBe(labels.indexOf('How It Works') + 1);
  });

  it('points the Audience link at the audience route', () => {
    const audience = navLinks().find((link) => link.textContent?.trim() === 'Audience');

    expect(audience?.getAttribute('href')).toBe('/audience');
  });

  it('routes /audience to the Audience page component', async () => {
    const { Audience } = await import('../../pages/audience/audience');
    const audienceRoute = routes.find((route) => route.path === 'audience');

    expect(audienceRoute).toBeDefined();
    const loaded = await (audienceRoute!.loadComponent as () => Promise<unknown>)();

    expect(loaded).toBe(Audience);
  });
});
