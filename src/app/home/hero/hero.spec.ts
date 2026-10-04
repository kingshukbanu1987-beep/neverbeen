import { By } from '@angular/platform-browser';
import { SiteConfigService } from '../../services/site-config.service';
import { TestBed } from '@angular/core/testing';
import { RouterLink, provideRouter } from '@angular/router';
import { Hero } from './hero';

describe('Hero', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Hero],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(Hero);
    fixture.detectChanges();
    return fixture;
  }

  function buttonsOf(element: HTMLElement): HTMLAnchorElement[] {
    return Array.from(element.querySelectorAll<HTMLAnchorElement>('.actions a.btn'));
  }

  function labelsOf(element: HTMLElement): string[] {
    return buttonsOf(element).map((link) => link.textContent?.trim() ?? '');
  }

  it('places Connect to NeverBeen Community very first, before Know the Founder, styled like Dream Destinations used to be', () => {
    const element: HTMLElement = create().nativeElement;
    const buttons = buttonsOf(element);
    const labels = labelsOf(element);

    expect(labels).toEqual([
      'Connect to NeverBeen Community',
      'Brochure',
      'The Storyline of Parallel Universe',
      'Know the Founder',
      'Create My Vacation',
      'Dream Destinations',
      'Neverbeen Collection',
      'Explore Gallery',
    ]);

    const community = buttons[0];
    expect(community.getAttribute('href')).toBe('/community');
    // Same style Dream Destinations had: solid green pill with white text
    expect(community.classList.contains('btn-dream')).toBe(true);
    expect(getComputedStyle(community).backgroundColor).toBe('rgb(91, 181, 35)');
    expect(getComputedStyle(community).color).toBe('rgb(255, 255, 255)');
  });

  it('places Create My Vacation right after Know the Founder', () => {
    const element: HTMLElement = create().nativeElement;
    const buttons = buttonsOf(element);
    const labels = labelsOf(element);

    const founderIndex = labels.indexOf('Know the Founder');
    expect(founderIndex).toBeGreaterThan(-1);
    expect(labels[founderIndex + 1]).toBe('Create My Vacation');

    const createBtn = buttons[founderIndex + 1];
    expect(createBtn.getAttribute('href')).toBe('/#contact');
    expect(createBtn.classList.contains('btn-primary')).toBe(true);
  });

  it('styles Dream Destinations exactly like Explore Gallery (ghost style)', () => {
    const element: HTMLElement = create().nativeElement;
    const buttons = buttonsOf(element);
    const labels = labelsOf(element);

    const createIndex = labels.indexOf('Create My Vacation');
    expect(createIndex).toBeGreaterThan(-1);
    expect(labels[createIndex + 1]).toBe('Dream Destinations');

    const dream = buttons[createIndex + 1];
    const gallery = buttons.find((b) => b.textContent?.trim() === 'Explore Gallery')!;

    expect(dream.getAttribute('href')).toBe('/#destinations');
    expect(dream.classList.contains('btn-ghost')).toBe(true);

    const dreamStyle = getComputedStyle(dream);
    const galleryStyle = getComputedStyle(gallery);
    expect(dreamStyle.backgroundColor).toBe(galleryStyle.backgroundColor);
    expect(dreamStyle.color).toBe(galleryStyle.color);
    expect(dreamStyle.borderColor).toBe(galleryStyle.borderColor);
  });

  it('keeps Neverbeen Collection between Dream Destinations and Explore Gallery', () => {
    const element: HTMLElement = create().nativeElement;
    const labels = labelsOf(element);

    const dreamIndex = labels.indexOf('Dream Destinations');
    expect(dreamIndex).toBeGreaterThan(-1);
    expect(labels[dreamIndex + 1]).toBe('Neverbeen Collection');
    expect(labels[dreamIndex + 2]).toBe('Explore Gallery');
  });

  it('places Brochure after Community with a gold background and white text', () => {
    const element: HTMLElement = create().nativeElement;
    const buttons = buttonsOf(element);
    const brochure = buttons[labelsOf(element).indexOf('Connect to NeverBeen Community') + 1];

    expect(brochure.textContent?.trim()).toBe('Brochure');
    expect(brochure.getAttribute('href')).toBe('/documentation');
    expect(brochure.classList.contains('btn-brochure')).toBe(true);
    expect(getComputedStyle(brochure).backgroundColor).toBe('rgb(247, 195, 14)');
    expect(getComputedStyle(brochure).color).toBe('rgb(255, 255, 255)');
  });

  it('places the storyline link after Brochure and gives it the same gold button styling', () => {
    const element: HTMLElement = create().nativeElement;
    const buttons = buttonsOf(element);
    const labels = labelsOf(element);
    const brochureIndex = labels.indexOf('Brochure');
    const storyline = buttons[brochureIndex + 1];

    expect(storyline.textContent?.trim()).toBe('The Storyline of Parallel Universe');
    expect(storyline.getAttribute('href')).toBe('/storyline-of-parallel-universe');
    expect(storyline.classList.contains('btn-brochure')).toBe(true);
    expect(getComputedStyle(storyline).backgroundColor).toBe('rgb(247, 195, 14)');
    expect(getComputedStyle(storyline).color).toBe('rgb(255, 255, 255)');
  });

  it('uses a native same-tab link for Brochure, without a RouterLink intercept', () => {
    const fixture = create();
    const links = fixture.debugElement.queryAll(By.directive(RouterLink));
    expect(links.some((el) => el.nativeElement.getAttribute('href') === '/documentation')).toBe(
      false,
    );
    const brochure = fixture.nativeElement.querySelector('a[href="/documentation"]');
    expect(brochure).toBeTruthy();
    expect(brochure.getAttribute('target')).toBeNull();
    expect(links.some((el) => el.nativeElement.getAttribute('href') === '/founder')).toBe(true);
  });

  it('uses a native same-tab direct link for Storyline instead of lazy-route navigation', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;
    const storyline = element.querySelector<HTMLAnchorElement>(
      'a[href="/storyline-of-parallel-universe"]',
    )!;
    const routerLinks = fixture.debugElement.queryAll(By.directive(RouterLink));

    expect(storyline).toBeTruthy();
    expect(storyline.getAttribute('target')).toBeNull();
    expect(
      routerLinks.some(
        (link) => link.nativeElement.getAttribute('href') === '/storyline-of-parallel-universe',
      ),
    ).toBe(false);
  });

  it('also positions Brochure after Community when the CMS has a legacy order', () => {
    const cms = TestBed.inject(SiteConfigService);
    const buttons = cms.items('home.hero', 'buttons');
    const brochure = buttons.find((b) => b.id === 'documentation')!;
    cms.state.update((s) => ({
      ...s,
      published: {
        'home.hero': {
          buttons: [
            ...buttons.filter((b) => b.id !== 'documentation'),
            { ...brochure, label: 'Our brochure' },
          ],
        },
      },
    }));
    const labels = labelsOf(create().nativeElement);
    const communityIndex = labels.indexOf('Connect to NeverBeen Community');
    expect(labels[communityIndex + 1]).toBe('Our brochure');
    expect(labels[communityIndex + 2]).toBe('The Storyline of Parallel Universe');
    expect(labels.at(-1)).toBe('Explore Gallery');
  });

  it('keeps CMS visibility settings for the brochure', () => {
    const cms = TestBed.inject(SiteConfigService);
    const buttons = cms
      .items('home.hero', 'buttons')
      .map((b) => ({ ...b, visible: b.id !== 'documentation' }));
    cms.state.update((s) => ({ ...s, published: { 'home.hero': { buttons } } }));
    expect(create().nativeElement.querySelector('a[href="/documentation"]')).toBeNull();
  });
});
