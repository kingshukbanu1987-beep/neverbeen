import { By } from '@angular/platform-browser';
import { SiteConfigService } from '../../services/site-config.service';
import { TestBed } from '@angular/core/testing';
import { RouterLink, provideRouter } from '@angular/router';
import { Brochure } from '../brochure/brochure';
import { Hero } from './hero';
import { Owner } from '../owner/owner';
import { StorylineSection } from '../storyline/storyline-section';

describe('Hero', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Hero, Owner, Brochure, StorylineSection],
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

  it('places Connect to NeverBeen Community first in the Collection ghost style', () => {
    const element: HTMLElement = create().nativeElement;
    const buttons = buttonsOf(element);
    const labels = labelsOf(element);

    expect(labels).toEqual([
      'Connect to NeverBeen Community',
      'Shop NeverBeen Merchandise',
      'Create My Vacation',
    ]);

    const community = buttons[0];
    expect(community.getAttribute('href')).toBe('/community');
    expect(community.classList.contains('btn-ghost')).toBe(true);
    expect(getComputedStyle(community).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(community).color).toBe('var(--ink)');
    expect(getComputedStyle(community).fontFamily).toContain('Calibri');
    expect(getComputedStyle(community).fontSize).toBe('1rem');
  });

  it('places Create My Vacation right after Shop NeverBeen Merchandise', () => {
    const element: HTMLElement = create().nativeElement;
    const buttons = buttonsOf(element);
    const labels = labelsOf(element);

    const merchandiseIndex = labels.indexOf('Shop NeverBeen Merchandise');
    expect(merchandiseIndex).toBeGreaterThan(-1);
    expect(labels[merchandiseIndex + 1]).toBe('Create My Vacation');

    const createBtn = buttons[merchandiseIndex + 1];
    expect(createBtn.getAttribute('href')).toBe('/#contact');
    expect(createBtn.classList.contains('btn-ghost')).toBe(true);
  });

  it('does not include moved or removed buttons in the hero actions', () => {
    const element: HTMLElement = create().nativeElement;
    const labels = labelsOf(element);

    expect(labels).not.toContain('NeverBeen AI Models');
    expect(labels).not.toContain('Meet the NeverBeen AI Models');
    expect(labels).not.toContain('Know the Founder');
    expect(labels).not.toContain('Dream Destinations');
    expect(labels).not.toContain('Neverbeen Collection');
    expect(labels).not.toContain('NeverBeen Collection');
    expect(labels).not.toContain('Explore the NeverBeen Collection');
    expect(labels).not.toContain('Explore Gallery');
    expect(labels).not.toContain('Brochure');
    expect(labels).not.toContain('Explore the NeverBeen Brochure');
    expect(labels).not.toContain('The Storyline of Parallel Universe');
    expect(labels).not.toContain('Read the Stories of Parallel Universe');
    expect(element.querySelector('a[href="/ai-models"]')).toBeNull();
    expect(element.querySelector('a[href="/founder"]')).toBeNull();
    expect(element.querySelector('a[href="/collection"]')).toBeNull();
    expect(element.querySelector('a[href="/documentation"]')).toBeNull();
    expect(element.querySelector('a[href="/storyline-of-parallel-universe"]')).toBeNull();
  });

  it('places Know the Founder in the Founder section just below the founder description', () => {
    const fixture = TestBed.createComponent(Owner);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const intro = element.querySelector<HTMLElement>('.intro')!;
    const heading = intro.querySelector<HTMLElement>('app-section-heading')!;
    const actions = intro.querySelector<HTMLElement>('.actions')!;
    const founderBtn = actions.querySelector<HTMLAnchorElement>('a.btn.btn-ghost')!;

    expect(heading).toBeTruthy();
    expect(heading.nextElementSibling).toBe(actions);
    expect(founderBtn).toBeTruthy();
    expect(founderBtn.textContent?.trim()).toBe('Meet the Founder of NeverBeen Multiverse');
    expect(founderBtn.getAttribute('href')).toBe('/founder');
    expect(getComputedStyle(founderBtn).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(founderBtn).color).toBe('var(--ink)');
  });

  it('places Explore the NeverBeen Brochure in the Brochure section just below the description', () => {
    const fixture = TestBed.createComponent(Brochure);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const intro = element.querySelector<HTMLElement>('.intro')!;
    const lede = intro.querySelector<HTMLElement>('.lede')!;
    const actions = intro.querySelector<HTMLElement>('.actions')!;
    const brochureBtn = actions.querySelector<HTMLAnchorElement>('a.btn.btn-ghost')!;

    expect(lede).toBeTruthy();
    expect(lede.nextElementSibling).toBe(actions);
    expect(brochureBtn).toBeTruthy();
    expect(brochureBtn.textContent?.trim()).toBe('Explore the NeverBeen Brochure');
    expect(brochureBtn.getAttribute('href')).toBe('/documentation');
    expect(getComputedStyle(brochureBtn).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(brochureBtn).color).toBe('var(--ink)');
  });

  it('places Read the Stories of Parallel Universe in the Storyline section just below the description', () => {
    const fixture = TestBed.createComponent(StorylineSection);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const intro = element.querySelector<HTMLElement>('.intro')!;
    const lede = intro.querySelector<HTMLElement>('.lede')!;
    const actions = intro.querySelector<HTMLElement>('.actions')!;
    const storylineBtn = actions.querySelector<HTMLAnchorElement>('a.btn.btn-ghost')!;

    expect(lede).toBeTruthy();
    expect(lede.nextElementSibling).toBe(actions);
    expect(storylineBtn).toBeTruthy();
    expect(storylineBtn.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Read the Stories of Parallel Universe',
    );
    expect(storylineBtn.getAttribute('href')).toBe('/storyline-of-parallel-universe');
    expect(getComputedStyle(storylineBtn).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(storylineBtn).color).toBe('var(--ink)');
  });

  it('places merchandise after Community in the same Collection ghost style', () => {
    const element: HTMLElement = create().nativeElement;
    const buttons = buttonsOf(element);
    const labels = labelsOf(element);
    const communityIndex = labels.indexOf('Connect to NeverBeen Community');
    const merchandise = buttons[communityIndex + 1];
    const community = buttons[communityIndex];

    expect(merchandise.textContent?.trim()).toBe('Shop NeverBeen Merchandise');
    expect(merchandise.getAttribute('href')).toBe('/merchandise');
    expect(merchandise.classList.contains('btn-ghost')).toBe(true);
    expect(getComputedStyle(merchandise).backgroundColor).toBe(
      getComputedStyle(community).backgroundColor,
    );
    expect(getComputedStyle(merchandise).color).toBe(getComputedStyle(community).color);
    expect(getComputedStyle(merchandise).fontSize).toBe(getComputedStyle(community).fontSize);
  });

  it('uses a native same-tab link for merchandise instead of lazy-route navigation', () => {
    const fixture = create();
    const element = fixture.nativeElement as HTMLElement;
    const merchandise = element.querySelector<HTMLAnchorElement>('a[href="/merchandise"]')!;
    const routerLinks = fixture.debugElement.queryAll(By.directive(RouterLink));

    expect(merchandise).toBeTruthy();
    expect(merchandise.textContent?.trim()).toBe('Shop NeverBeen Merchandise');
    expect(merchandise.getAttribute('target')).toBeNull();
    expect(
      routerLinks.some((link) => link.nativeElement.getAttribute('href') === '/merchandise'),
    ).toBe(false);
    expect(
      routerLinks.some((link) => link.nativeElement.getAttribute('href') === '/community'),
    ).toBe(true);
  });

  it('also positions Merchandise after Community when the CMS has a legacy order', () => {
    const cms = TestBed.inject(SiteConfigService);
    const buttons = cms.items('home.hero', 'buttons');
    const merchandise = buttons.find((b) => b.id === 'merchandise')!;
    cms.state.update((s) => ({
      ...s,
      published: {
        'home.hero': {
          buttons: [
            ...buttons.filter((b) => b.id !== 'merchandise'),
            { ...merchandise, label: 'Merchandise Store' },
          ],
        },
      },
    }));
    const labels = labelsOf(create().nativeElement);
    const communityIndex = labels.indexOf('Connect to NeverBeen Community');
    expect(labels[communityIndex + 1]).toBe('Merchandise Store');
    expect(labels.at(-1)).toBe('Create My Vacation');
  });

  it('keeps CMS visibility settings for hero buttons', () => {
    const cms = TestBed.inject(SiteConfigService);
    const buttons = cms
      .items('home.hero', 'buttons')
      .map((b) => ({ ...b, visible: b.id !== 'merchandise' }));
    cms.state.update((s) => ({ ...s, published: { 'home.hero': { buttons } } }));
    expect(create().nativeElement.querySelector('a[href="/merchandise"]')).toBeNull();
  });

  it('drops the destination photo slideshow from the top of the page', () => {
    const element: HTMLElement = create().nativeElement;
    expect(element.querySelector('figure.frame img')?.getAttribute('src')).not.toContain(
      'destinations',
    );
    expect(element.querySelector('.slide-controls')).toBeNull();
    expect(element.querySelector('figcaption')).toBeNull();
  });

  it('sets the headline over the closing pages of the brochure', () => {
    const element: HTMLElement = create().nativeElement;
    const travel = element.querySelector<HTMLElement>('.panel-travel')!;
    expect(travel).toBeTruthy();
    expect(travel.querySelector('h1')?.textContent?.trim()).toBe(
      "Go Anywhere. Even Where You've Never Been.",
    );
    expect(travel.querySelector('.lede')?.textContent).toContain(
      'Create stunning AI vacation photos of yourself',
    );

    const sources = Array.from(travel.querySelectorAll<HTMLImageElement>('img.photo')).map((img) =>
      img.getAttribute('src'),
    );
    expect(sources).toEqual([
      '/assets/brochure-preview/neverbeen-brochure-page-52.jpg',
      '/assets/brochure-preview/neverbeen-brochure-page-53.jpg',
    ]);
  });

  it('writes the people headline and paragraph on the banner portraits', () => {
    const element: HTMLElement = create().nativeElement;
    const people = element.querySelector<HTMLElement>('.panel-people')!;
    expect(people).toBeTruthy();
    expect(people.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      "Meet the People. Even When They Don't Exists outside NeverBeen Multiverse",
    );
    expect(people.querySelector('.lede')?.textContent).toContain(
      'What if their stories matter, even if their worlds are imaginary?',
    );

    const sources = Array.from(people.querySelectorAll<HTMLImageElement>('img.photo')).map((img) =>
      img.getAttribute('src'),
    );
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((src) => src?.startsWith('/banner/'))).toBe(true);
  });

  it('places the three calls to action between the two previews', () => {
    const element: HTMLElement = create().nativeElement;
    const travel = element.querySelector('.panel-travel')!;
    const dock = element.querySelector('.dock')!;
    const people = element.querySelector('.panel-people')!;

    expect(travel.compareDocumentPosition(dock) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(dock.compareDocumentPosition(people) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(labelsOf(element)).toEqual([
      'Connect to NeverBeen Community',
      'Shop NeverBeen Merchandise',
      'Create My Vacation',
    ]);
  });

  it('moves both previews every five seconds by default', () => {
    const fixture = create();
    const hero = fixture.componentInstance as unknown as {
      intervalSeconds: () => number;
      brochureIndex: () => number;
      peopleIndex: () => number;
      advance: () => void;
      brochureSlides: unknown[];
      peopleSlides: unknown[];
    };

    expect(hero.intervalSeconds()).toBe(5);
    expect(hero.brochureIndex()).toBe(0);
    expect(hero.peopleIndex()).toBe(0);

    hero.advance();
    fixture.detectChanges();

    expect(hero.brochureIndex()).toBe(1 % hero.brochureSlides.length);
    expect(hero.peopleIndex()).toBe(1 % hero.peopleSlides.length);
  });
});
