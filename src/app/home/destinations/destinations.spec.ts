import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from '../../app.routes';
import { destinations } from '../../models/site-content';
import { Destinations } from './destinations';

/** Destinations added when the atlas grew beyond the original eighteen. */
const addedDestinations = [
  'Netherlands',
  'Austria',
  'Canada',
  'United States of America',
  'Maldives',
  'Thailand',
  'Malaysia',
  'Singapore',
  'Indonesia',
  'Australia',
  'Denmark',
  'Finland',
  'Japan',
  'Korea',
  'Brazil',
];

describe('Destinations', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Destinations],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(Destinations);
    fixture.detectChanges();
    return fixture;
  }

  it('renders one card per destination in the atlas', () => {
    const element: HTMLElement = create().nativeElement;
    const cards = Array.from(
      element.querySelectorAll<HTMLAnchorElement>('app-destination-card a.card'),
    );

    expect(cards.length).toBe(destinations.length);
  });

  it('links every card to that destination’s guide page and shows its photograph', () => {
    const element: HTMLElement = create().nativeElement;
    const cards = Array.from(
      element.querySelectorAll<HTMLAnchorElement>('app-destination-card a.card'),
    );

    for (const [index, destination] of destinations.entries()) {
      const card = cards[index];
      expect(card.getAttribute('href'), destination.name).toBe(`/destinations/${destination.slug}`);

      const image = card.querySelector('img');
      expect(image?.getAttribute('src'), destination.name).toBe(destination.image);
      expect(image?.getAttribute('alt'), destination.name).toContain(destination.name);
    }
  });

  it('lists every destination added to the popular destinations section', () => {
    const element: HTMLElement = create().nativeElement;
    const text = element.textContent ?? '';
    const cards = Array.from(
      element.querySelectorAll<HTMLAnchorElement>('app-destination-card a.card'),
    );
    const hrefs = cards.map((card) => card.getAttribute('href'));

    for (const name of addedDestinations) {
      const destination = destinations.find(
        (place) => place.name === name || place.country === name,
      );
      expect(destination, name).toBeDefined();
      expect(text, name).toContain(destination!.name);
      expect(hrefs, name).toContain(`/destinations/${destination!.slug}`);
    }
  });
});
