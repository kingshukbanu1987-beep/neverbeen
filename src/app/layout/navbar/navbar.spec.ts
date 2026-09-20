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

  function create() {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    return fixture;
  }

  function navLinks(): HTMLAnchorElement[] {
    return Array.from(create().nativeElement.querySelectorAll('nav a')) as HTMLAnchorElement[];
  }

  it('places the Audience link directly after How It Works', () => {
    const labels = navLinks().map((link) => link.textContent?.trim());

    expect(labels.indexOf('Audience')).toBe(labels.indexOf('How It Works') + 1);
  });

  it('points the Audience link at the audience route', () => {
    const audience = navLinks().find((link) => link.textContent?.trim() === 'Audience');

    expect(audience?.getAttribute('href')).toBe('/audience');
  });

  it('links the FAQ option, placed after Pricing, to the "Before you go" FAQ section', () => {
    const links = navLinks();
    const labels = links.map((link) => link.textContent?.trim());
    const faq = links[labels.indexOf('FAQ')];

    expect(labels.indexOf('FAQ')).toBe(labels.indexOf('Pricing') + 1);
    expect(faq.getAttribute('href')).toBe('/#faq');
    expect(faq.querySelector('svg.icon use')?.getAttribute('href')).toBe('#nb-icon-help-circle');
  });

  it('routes /audience to the Audience page component', async () => {
    const { Audience } = await import('../../pages/audience/audience');
    const audienceRoute = routes.find((route) => route.path === 'audience');

    expect(audienceRoute).toBeDefined();
    const loaded = await (audienceRoute!.loadComponent as () => Promise<unknown>)();

    expect(loaded).toBe(Audience);
  });

  it('shows the menu toggle as three lines with no visible "Menu" text', () => {
    const button = create().nativeElement.querySelector('button.menu') as HTMLButtonElement;

    expect(button.textContent?.trim()).toBe('');
    expect(button.querySelectorAll('.line').length).toBe(3);
    expect(button.getAttribute('aria-label')).toBe('Open menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe('site-nav');
  });

  it('opens and closes the navigation from the hamburger button', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;
    const button = element.querySelector('button.menu') as HTMLButtonElement;
    const nav = element.querySelector('nav#site-nav') as HTMLElement;

    button.click();
    fixture.detectChanges();

    expect(button.classList.contains('is-open')).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Close menu');
    expect(nav.classList.contains('open')).toBe(true);

    button.click();
    fixture.detectChanges();

    expect(button.classList.contains('is-open')).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(nav.classList.contains('open')).toBe(false);
  });

  it('links the Feedback option to the feedback page with its own icon', () => {
    const links = navLinks();
    const feedback = links.find((link) => link.textContent?.trim() === 'Feedback');

    expect(feedback).toBeDefined();
    expect(feedback!.getAttribute('href')).toBe('/feedback');
    expect(feedback!.querySelector('svg.icon use')?.getAttribute('href')).toBe(
      '#nb-icon-message-square',
    );
  });

  it('puts a distinct decorative icon to the left of every menu option', () => {
    const element: HTMLElement = create().nativeElement;
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('nav a'));
    const references = new Set<string>();

    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const icon = link.firstElementChild;

      expect(icon?.tagName.toLowerCase()).toBe('svg');
      expect(icon?.classList.contains('icon')).toBe(true);
      expect(icon?.getAttribute('aria-hidden')).toBe('true');

      const reference = icon?.querySelector('use')?.getAttribute('href') ?? '';
      expect(reference.startsWith('#nb-icon-')).toBe(true);
      expect(element.querySelector(`.icon-sprite symbol${reference}`)).not.toBeNull();
      references.add(reference);
    }
    expect(references.size).toBe(links.length);
  });
});
