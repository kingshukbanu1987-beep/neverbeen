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

  it('places a green Dream Destinations button right after Know the Founder that links to the destinations section', () => {
    const element: HTMLElement = create().nativeElement;
    const buttons = Array.from(element.querySelectorAll<HTMLAnchorElement>('.actions a.btn'));
    const labels = buttons.map((link) => link.textContent?.trim());

    const founderIndex = labels.indexOf('Know the Founder');
    expect(founderIndex).toBeGreaterThan(-1);
    expect(labels[founderIndex + 1]).toBe('Dream Destinations');

    const dream = buttons[founderIndex + 1];
    expect(dream.getAttribute('href')).toBe('/#destinations');
    expect(dream.classList.contains('btn-dream')).toBe(true);
    expect(getComputedStyle(dream).backgroundColor).toBe('rgb(91, 181, 35)');
    expect(getComputedStyle(dream).color).toBe('rgb(255, 255, 255)');
  });

  it('places a red Collection button right after Create My Vacation that links to the collection page', () => {
    const element: HTMLElement = create().nativeElement;
    const buttons = Array.from(element.querySelectorAll<HTMLAnchorElement>('.actions a.btn'));
    const labels = buttons.map((link) => link.textContent?.trim());

    const createIndex = labels.indexOf('Create My Vacation');
    expect(createIndex).toBeGreaterThan(-1);
    expect(labels[createIndex + 1]).toBe('Collection');

    const collection = buttons[createIndex + 1];
    expect(collection.getAttribute('href')).toBe('/collection');
    expect(collection.classList.contains('btn-collection')).toBe(true);
  });
});
