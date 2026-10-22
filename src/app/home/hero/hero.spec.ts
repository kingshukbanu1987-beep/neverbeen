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

  it('places Connect to NeverBeen Community very first in the founder navy', () => {
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
    expect(community.classList.contains('btn-dream')).toBe(true);
    expect(getComputedStyle(community).backgroundColor).toBe('rgb(18, 59, 104)');
    expect(getComputedStyle(community).color).toBe('rgb(255, 255, 255)');
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
    expect(labels).not.toContain('Brochure');
    expect(labels).not.toContain('The Storyline of Parallel Universe');
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
    const founderBtn = actions.querySelector<HTMLAnchorElement>('a.btn.btn-founder')!;

    expect(heading).toBeTruthy();
    expect(heading.nextElementSibling).toBe(actions);
    expect(founderBtn).toBeTruthy();
    expect(founderBtn.textContent?.trim()).toBe('Know the Founder');
    expect(founderBtn.getAttribute('href')).toBe('/founder');
    expect(getComputedStyle(founderBtn).backgroundColor).toBe('rgb(18, 59, 104)');
    expect(getComputedStyle(founderBtn).color).toBe('rgb(255, 255, 255)');
  });

  it('places Brochure in the Brochure section just below the description', () => {
    const fixture = TestBed.createComponent(Brochure);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const intro = element.querySelector<HTMLElement>('.intro')!;
    const lede = intro.querySelector<HTMLElement>('.lede')!;
    const actions = intro.querySelector<HTMLElement>('.actions')!;
    const brochureBtn = actions.querySelector<HTMLAnchorElement>('a.btn.btn-brochure')!;

    expect(lede).toBeTruthy();
    expect(lede.nextElementSibling).toBe(actions);
    expect(brochureBtn).toBeTruthy();
    expect(brochureBtn.textContent?.trim()).toBe('Brochure');
    expect(brochureBtn.getAttribute('href')).toBe('/documentation');
    expect(getComputedStyle(brochureBtn).backgroundColor).toBe('rgb(247, 195, 14)');
    expect(getComputedStyle(brochureBtn).color).toBe('rgb(255, 255, 255)');
  });

  it('places The Storyline of Parallel Universe in the Storyline section just below the description', () => {
    const fixture = TestBed.createComponent(StorylineSection);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const intro = element.querySelector<HTMLElement>('.intro')!;
    const lede = intro.querySelector<HTMLElement>('.lede')!;
    const actions = intro.querySelector<HTMLElement>('.actions')!;
    const storylineBtn = actions.querySelector<HTMLAnchorElement>('a.btn.btn-brochure')!;

    expect(lede).toBeTruthy();
    expect(lede.nextElementSibling).toBe(actions);
    expect(storylineBtn).toBeTruthy();
    expect(storylineBtn.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'The Storyline of Parallel Universe',
    );
    expect(storylineBtn.getAttribute('href')).toBe('/storyline-of-parallel-universe');
    expect(getComputedStyle(storylineBtn).backgroundColor).toBe('rgb(247, 195, 14)');
    expect(getComputedStyle(storylineBtn).color).toBe('rgb(255, 255, 255)');
  });

  it('places merchandise after Community in the Founder navy', () => {
    const element: HTMLElement = create().nativeElement;
    const buttons = buttonsOf(element);
    const labels = labelsOf(element);
    const communityIndex = labels.indexOf('Connect to NeverBeen Community');
    const merchandise = buttons[communityIndex + 1];
    const community = buttons[communityIndex];

    expect(merchandise.textContent?.trim()).toBe('Shop NeverBeen Merchandise');
    expect(merchandise.getAttribute('href')).toBe('/merchandise');
    expect(merchandise.classList.contains('btn-founder')).toBe(true);
    expect(getComputedStyle(merchandise).backgroundColor).toBe(
      getComputedStyle(community).backgroundColor,
    );
    expect(getComputedStyle(merchandise).color).toBe(getComputedStyle(community).color);
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
});
