import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
});
