import { By } from '@angular/platform-browser';
import { SiteConfigService } from '../../services/site-config.service';
import { TestBed } from '@angular/core/testing';
import { RouterLink, provideRouter } from '@angular/router';
import { Hero } from './hero';
import { Owner } from '../owner/owner';

describe('Hero', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Hero, Owner],
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

  it('places Connect to NeverBeen Community very first in the founder navy', () => {
    const element: HTMLElement = create().nativeElement;
    const buttons = buttonsOf(element);
    const labels = labelsOf(element);

    expect(labels).toEqual([
      'Connect to NeverBeen Community',
      'Brochure',
      'Shop NeverBeen Merchandise',
      'The Storyline of Parallel Universe',
      'Create My Vacation',
    ]);

    const community = buttons[0];
    expect(community.getAttribute('href')).toBe('/community');
    expect(community.classList.contains('btn-dream')).toBe(true);
    expect(getComputedStyle(community).backgroundColor).toBe('rgb(18, 59, 104)');
    expect(getComputedStyle(community).color).toBe('rgb(255, 255, 255)');
  });

  it('places Create My Vacation right after The Storyline of Parallel Universe', () => {
    const element: HTMLElement = create().nativeElement;
    const buttons = buttonsOf(element);
    const labels = labelsOf(element);

    const storylineIndex = labels.indexOf('The Storyline of Parallel Universe');
    expect(storylineIndex).toBeGreaterThan(-1);
    expect(labels[storylineIndex + 1]).toBe('Create My Vacation');

    const createBtn = buttons[storylineIndex + 1];
    expect(createBtn.getAttribute('href')).toBe('/#contact');
    expect(createBtn.classList.contains('btn-primary')).toBe(true);
  });

  it('does not include moved or removed buttons in the hero actions', () => {
    const element: HTMLElement = create().nativeElement;
    const labels = labelsOf(element);

    expect(labels).not.toContain('NeverBeen AI Models');
    expect(labels).not.toContain('Know the Founder');
    expect(labels).not.toContain('Dream Destinations');
    expect(labels).not.toContain('Neverbeen Collection');
    expect(labels).not.toContain('NeverBeen Collection');
    expect(labels).not.toContain('Explore Gallery');
    expect(element.querySelector('a[href="/ai-models"]')).toBeNull();
    expect(element.querySelector('a[href="/founder"]')).toBeNull();
    expect(element.querySelector('a[href="/collection"]')).toBeNull();
  });

  it('places Know the Founder in the Founder section just below the founder description', () => {
    const fixture = TestBed.createComponent(Owner);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const intro = element.querySelector<HTMLElement>('.intro')!;
    const heading = intro.querySelector<HTMLElement>('app-section-heading')!;
    const actions = intro.querySelector<HTMLElement>('.actions')!;
    const founderBtn = actions.querySelector<HTMLAnchorElement>('a.btn.btn-founder')!;

    expect(heading).toBeTruthy();
    expect(heading.nextElementSibling).toBe(actions);
    expect(founderBtn).toBeTruthy();
    expect(founderBtn.textContent?.trim()).toBe('Know the Founder');
    expect(founderBtn.getAttribute('href')).toBe('/founder');
    expect(getComputedStyle(founderBtn).backgroundColor).toBe('rgb(18, 59, 104)');
    expect(getComputedStyle(founderBtn).color).toBe('rgb(255, 255, 255)');
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

  it('places merchandise after Brochure in the Founder navy, then keeps Storyline gold', () => {
    const element: HTMLElement = create().nativeElement;
    const buttons = buttonsOf(element);
    const labels = labelsOf(element);
    const brochureIndex = labels.indexOf('Brochure');
    const merchandise = buttons[brochureIndex + 1];
    const storyline = buttons[brochureIndex + 2];
    const community = buttons[labels.indexOf('Connect to NeverBeen Community')];

    expect(merchandise.textContent?.trim()).toBe('Shop NeverBeen Merchandise');
    expect(merchandise.getAttribute('href')).toBe('/merchandise');
    expect(merchandise.classList.contains('btn-founder')).toBe(true);
    expect(getComputedStyle(merchandise).backgroundColor).toBe(
      getComputedStyle(community).backgroundColor,
    );
    expect(getComputedStyle(merchandise).color).toBe(getComputedStyle(community).color);
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
    expect(links.some((el) => el.nativeElement.getAttribute('href') === '/community')).toBe(true);
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
    expect(labels[communityIndex + 2]).toBe('Shop NeverBeen Merchandise');
    expect(labels[communityIndex + 3]).toBe('The Storyline of Parallel Universe');
    expect(labels.at(-1)).toBe('Create My Vacation');
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
