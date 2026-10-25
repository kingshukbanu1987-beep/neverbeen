import { By } from '@angular/platform-browser';
import { SiteConfigService } from '../../services/site-config.service';
import { TestBed } from '@angular/core/testing';
import { RouterLink, provideRouter } from '@angular/router';
import { Brochure } from '../brochure/brochure';
import { Hero } from './hero';
import { HERO_TRAVEL_SLIDES } from './hero-slides';
import { TRAVEL_IMAGE_SOURCES } from './travel-images';
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

  it('places Connect to NeverBeen Community first as an independent white pill button', () => {
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
    expect(getComputedStyle(community).backgroundColor).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(community).color).toBe('var(--ink)');
    expect(getComputedStyle(community).fontFamily).toContain('Calibri');
    expect(getComputedStyle(community).fontSize).toBe('1rem');
  });

  it('renders each hero button independently with a white background instead of inside a white container', () => {
    const element: HTMLElement = create().nativeElement;
    const dock = element.querySelector<HTMLElement>('.dock')!;
    const actions = element.querySelector<HTMLElement>('.actions')!;
    const buttons = buttonsOf(element);

    expect(getComputedStyle(dock).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(actions).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(actions).borderTopWidth).toBe('0px');
    expect(buttons.length).toBe(3);
    for (const btn of buttons) {
      expect(getComputedStyle(btn).backgroundColor).toBe('rgb(255, 255, 255)');
    }
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

  it('places the travel text on the left and the full-size public/travel photographs on the right in one widescreen panel, while keeping image-above-copy order for mobile', () => {
    const element: HTMLElement = create().nativeElement;
    const travel = element.querySelector<HTMLElement>('.panel-travel')!;
    expect(travel).toBeTruthy();

    const stage = travel.querySelector<HTMLElement>('.stage')!;
    const copy = travel.querySelector<HTMLElement>('.panel-copy')!;
    expect(getComputedStyle(travel).display).toBe('grid');
    expect(getComputedStyle(travel).gridTemplateAreas).toContain('copy stage');
    expect(getComputedStyle(copy).gridArea).toBe('copy');
    expect(getComputedStyle(stage).gridArea).toBe('stage');
    expect(getComputedStyle(travel).width).toBe('100%');
    expect(getComputedStyle(travel).maxWidth).toBe('none');
    expect(getComputedStyle(travel).borderTopWidth).toBe('0px');
    expect(getComputedStyle(stage).position).toBe('relative');
    expect(getComputedStyle(stage).borderTopWidth).toBe('0px');
    expect(['rgba(0, 0, 0, 0)', 'transparent']).toContain(getComputedStyle(stage).backgroundColor);
    expect(getComputedStyle(stage).borderRadius).not.toBe('0px');
    expect(stage.compareDocumentPosition(copy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(travel.querySelector('.veil')).toBeNull();
    expect(travel.querySelector('.wash')).toBeNull();

    expect(travel.querySelector('h1')?.textContent?.trim()).toBe(
      "Go Anywhere. Even Where You've Never Been",
    );
    expect(travel.querySelector('.lede')?.textContent).toContain(
      'Create stunning AI vacation photos of yourself',
    );

    const photos = Array.from(travel.querySelectorAll<HTMLImageElement>('img.photo'));
    const sources = photos.map((img) => img.getAttribute('src'));
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((src) => src?.startsWith('/travel/'))).toBe(true);
    // The active photograph plus the one preloaded behind it, in folder order.
    expect(sources).toEqual(HERO_TRAVEL_SLIDES.slice(0, sources.length).map((s) => s.src));
    for (const photo of photos) {
      expect(getComputedStyle(photo).objectFit).toBe('contain');
    }
  });

  it('renders every photograph in public/travel in the top slideshow', () => {
    expect(HERO_TRAVEL_SLIDES.length).toBe(TRAVEL_IMAGE_SOURCES.length);
    expect(HERO_TRAVEL_SLIDES.map((slide) => slide.src)).toEqual([...TRAVEL_IMAGE_SOURCES]);
    for (const slide of HERO_TRAVEL_SLIDES) {
      expect(slide.alt.length).toBeGreaterThan(0);
    }
  });

  it('drops the closing full stop from the old published headline but keeps custom copy', () => {
    const cms = TestBed.inject(SiteConfigService);
    cms.state.update((s) => ({
      ...s,
      published: { ...s.published, 'home.hero': { title: "Go Anywhere. Even Where You've Never Been." } },
    }));
    const element: HTMLElement = create().nativeElement;
    expect(element.querySelector('.panel-travel h1')?.textContent?.trim()).toBe(
      "Go Anywhere. Even Where You've Never Been",
    );

    cms.state.update((s) => ({
      ...s,
      published: { ...s.published, 'home.hero': { title: 'Go Anywhere, Whenever You Like.' } },
    }));
    const custom: HTMLElement = create().nativeElement;
    expect(custom.querySelector('.panel-travel h1')?.textContent?.trim()).toBe(
      'Go Anywhere, Whenever You Like.',
    );
  });

  it('places the people text on the left and the full-size banner portraits on the right in one widescreen panel, while keeping image-above-copy order for mobile', () => {
    const element: HTMLElement = create().nativeElement;
    const people = element.querySelector<HTMLElement>('.panel-people')!;
    expect(people).toBeTruthy();

    const stage = people.querySelector<HTMLElement>('.stage')!;
    const copy = people.querySelector<HTMLElement>('.panel-copy')!;
    expect(getComputedStyle(people).display).toBe('grid');
    expect(getComputedStyle(people).gridTemplateAreas).toContain('copy stage');
    expect(getComputedStyle(copy).gridArea).toBe('copy');
    expect(getComputedStyle(stage).gridArea).toBe('stage');
    expect(getComputedStyle(people).width).toBe('100%');
    expect(getComputedStyle(people).maxWidth).toBe('none');
    expect(getComputedStyle(people).borderTopWidth).toBe('0px');
    expect(getComputedStyle(stage).position).toBe('relative');
    expect(getComputedStyle(stage).borderTopWidth).toBe('0px');
    expect(['rgba(0, 0, 0, 0)', 'transparent']).toContain(getComputedStyle(stage).backgroundColor);
    expect(getComputedStyle(stage).borderRadius).not.toBe('0px');
    expect(stage.compareDocumentPosition(copy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(people.querySelector('.veil')).toBeNull();
    expect(people.querySelector('.wash')).toBeNull();

    expect(people.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      "Meet the People. Even When They Don't Exists outside NeverBeen Multiverse",
    );
    expect(people.querySelector('.lede')?.textContent).toContain(
      'What if their stories matter, even if their worlds are imaginary?',
    );

    const photos = Array.from(people.querySelectorAll<HTMLImageElement>('img.photo'));
    const sources = photos.map((img) => img.getAttribute('src'));
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((src) => src?.startsWith('/banner/'))).toBe(true);
    for (const photo of photos) {
      expect(getComputedStyle(photo).objectFit).toBe('contain');
    }
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
      travelIndex: () => number;
      peopleIndex: () => number;
      advance: () => void;
      travelSlides: unknown[];
      peopleSlides: unknown[];
    };

    expect(hero.intervalSeconds()).toBe(5);
    expect(hero.travelIndex()).toBe(0);
    expect(hero.peopleIndex()).toBe(0);

    hero.advance();
    fixture.detectChanges();

    expect(hero.travelIndex()).toBe(1 % hero.travelSlides.length);
    expect(hero.peopleIndex()).toBe(1 % hero.peopleSlides.length);
  });
});
