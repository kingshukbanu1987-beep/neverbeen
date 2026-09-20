import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { destinationGuides, destinationPage } from '../../models/destination-guide';
import { destinations } from '../../models/site-content';
import { DestinationCard } from '../../shared/destination-card/destination-card';
import { DestinationPageView } from './destination';

const weatherPayload = {
  current: {
    time: '2026-09-20T14:05',
    temperature_2m: 21.4,
    relative_humidity_2m: 58,
    apparent_temperature: 20.1,
    is_day: 1,
    precipitation: 0,
    weather_code: 2,
    cloud_cover: 35,
    pressure_msl: 1016,
    wind_speed_10m: 11.2,
    wind_direction_10m: 240,
  },
  daily: {
    time: ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24'],
    weather_code: [2, 3, 61, 1, 0],
    temperature_2m_max: [23, 22, 19, 24, 26],
    temperature_2m_min: [13, 12, 11, 12, 14],
    precipitation_probability_max: [10, 20, 70, 15, 5],
    sunrise: [
      '2026-09-20T07:30',
      '2026-09-21T07:31',
      '2026-09-22T07:32',
      '2026-09-23T07:33',
      '2026-09-24T07:34',
    ],
    sunset: [
      '2026-09-20T19:45',
      '2026-09-21T19:43',
      '2026-09-22T19:41',
      '2026-09-23T19:39',
      '2026-09-24T19:37',
    ],
  },
  timezone: 'Europe/Paris',
  utc_offset_seconds: 7200,
};

const ratesPayload = { date: '2026-09-19', rates: { EUR: 0.92, GBP: 0.79, JPY: 150.2, INR: 88.1 } };

const wikiPayload = {
  extract: 'Paris is the capital and largest city of France.',
  content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Paris' } },
};

let offline = false;

function stubLiveSources(): string[] {
  const requested: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requested.push(url);
      if (offline) {
        throw new Error('network unavailable');
      }
      const body = url.includes('open-meteo.com')
        ? weatherPayload
        : url.includes('frankfurter')
          ? ratesPayload
          : wikiPayload;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return requested;
}

async function settle(harness: RouterTestingHarness): Promise<void> {
  await harness.fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve, 0));
  harness.detectChanges();
}

describe('DestinationPageView', () => {
  beforeEach(async () => {
    offline = false;
    stubLiveSources();
    await TestBed.configureTestingModule({
      imports: [DestinationPageView],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the guide for the destination in the URL', async () => {
    const harness = await RouterTestingHarness.create('/destinations/paris');
    const element = harness.routeNativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Paris');
    expect(element.textContent).toContain('Île-de-France');
    expect(element.textContent).toContain('Golden hour along the Seine');
  });

  it('renders every content section of the guide', async () => {
    const harness = await RouterTestingHarness.create('/destinations/rome');
    const element = harness.routeNativeElement as HTMLElement;

    for (const id of [
      'live',
      'overview',
      'eat',
      'see',
      'history',
      'geography',
      'map',
      'plan',
      'photos',
    ]) {
      expect(element.querySelector(`#${id}`), `#${id} section`).not.toBeNull();
    }
  });

  it('lists every guide section in the jump menu with a link to it', async () => {
    const harness = await RouterTestingHarness.create('/destinations/rome');
    const element = harness.routeNativeElement as HTMLElement;

    const chips = Array.from(element.querySelectorAll<HTMLAnchorElement>('nav.jump a'));
    expect(chips.map((chip) => chip.textContent?.trim())).toEqual([
      'Live now',
      'Overview',
      'Where to eat',
      'Sightseeing',
      'History',
      'Geography',
      'Map',
      'Plan your visit',
      'Photographs',
    ]);

    // Each chip keeps a real link target, so it also works without JavaScript.
    for (const chip of chips) {
      const id = (chip.getAttribute('href') ?? '').replace('#', '');
      expect(element.querySelector(`#${id}`), `section #${id}`).not.toBeNull();
    }
  });

  it('jumps to the chosen section when a chip is clicked', async () => {
    const harness = await RouterTestingHarness.create('/destinations/rome');
    const element = harness.routeNativeElement as HTMLElement;
    const eat = Array.from(element.querySelectorAll<HTMLAnchorElement>('nav.jump a')).find(
      (chip) => chip.textContent?.trim() === 'Where to eat',
    )!;

    const location = TestBed.inject(Location);
    eat.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    harness.detectChanges();

    expect(location.path(true)).toBe('/destinations/rome#eat');
    expect(document.activeElement).toBe(element.querySelector('#eat'));
  });

  it('opens a guide that was shared with a section link straight at that section', async () => {
    const harness = await RouterTestingHarness.create('/destinations/rome#photos');
    await settle(harness);

    const element = harness.routeNativeElement as HTMLElement;
    expect(document.activeElement).toBe(element.querySelector('#photos'));
  });

  it('reuses the same component when a different destination is opened', async () => {
    const harness = await RouterTestingHarness.create('/destinations/paris');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe('Paris');

    await harness.navigateByUrl('/destinations/tokyo');
    await settle(harness);

    const element = harness.routeNativeElement as HTMLElement;
    expect(harness.routeDebugElement?.componentInstance instanceof DestinationPageView).toBe(true);
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Tokyo');
    expect(element.textContent).toContain('Neon streets after rain');
  });

  it('has a guide and photographs for every destination on the site', () => {
    expect(Object.keys(destinationGuides).length).toBeGreaterThanOrEqual(destinations.length);

    for (const destination of destinations) {
      const page = destinationPage(destination.slug);
      expect(page, destination.name).not.toBeNull();
      expect(page!.photos.length, destination.name).toBeGreaterThanOrEqual(3);
    }
  });

  it('shows live weather, the local clock and currency for the destination', async () => {
    const harness = await RouterTestingHarness.create('/destinations/paris');
    await settle(harness);

    const element = harness.routeNativeElement as HTMLElement;
    const text = element.textContent ?? '';

    // Weather card
    expect(text).toContain('Partly cloudy');
    expect(text).toContain('21');
    expect(text).toContain('58%');
    expect(text).toContain('km/h');
    expect(element.querySelectorAll('.forecast li').length).toBe(4);

    // Local time card
    expect(element.querySelector('.clock-time')?.textContent?.trim()).toMatch(
      /^\d{2}:\d{2}:\d{2}$/,
    );
    expect(text).toContain('Europe/Paris');
    expect(element.querySelector('.clock-date')?.textContent).toContain('2026');

    // Currency card
    expect(text).toContain('Euro');
    expect(text).toContain('EUR');
    expect(text).toContain('live reference rate');
    expect(text).toContain('Frankfurter');
  });

  it('keeps the guide readable when the live sources are unreachable', async () => {
    offline = true;
    const harness = await RouterTestingHarness.create('/destinations/paris');
    await settle(harness);

    const element = harness.routeNativeElement as HTMLElement;
    const text = element.textContent ?? '';

    expect(text).toContain('Live weather is unavailable right now');
    // The local clock is computed from the time zone, so it always works.
    expect(element.querySelector('.clock-time')?.textContent?.trim()).toMatch(
      /^\d{2}:\d{2}:\d{2}$/,
    );
    expect(text).toContain('approximate — live rate unavailable');
    // the written guide is untouched
    expect(text).toContain('Golden hour along the Seine');
  });

  it('embeds a map and links out for more detail', async () => {
    const harness = await RouterTestingHarness.create('/destinations/santorini');
    await settle(harness);
    const element = harness.routeNativeElement as HTMLElement;

    const frame = element.querySelector('iframe') as HTMLIFrameElement;
    expect(frame.getAttribute('src')).toContain('openstreetmap.org');
    expect(frame.getAttribute('src')).toContain('36.3932');
    expect(frame.getAttribute('title')).toContain('Santorini');

    const links = Array.from(element.querySelectorAll('a')).map(
      (a) => a.getAttribute('href') ?? '',
    );
    expect(
      links.some((href) => href.includes('google.com/maps')),
      'Google Maps link',
    ).toBe(true);
    expect(
      links.some((href) => href.includes('en.wikipedia.org')),
      'Wikipedia link',
    ).toBe(true);
  });

  it('shows a travel photograph gallery for the destination', async () => {
    const harness = await RouterTestingHarness.create('/destinations/cape-town');
    const element = harness.routeNativeElement as HTMLElement;
    const images = Array.from(element.querySelectorAll('.gallery img'));

    expect(images.length).toBeGreaterThanOrEqual(3);
    expect(images[0].getAttribute('alt')).toContain('Cape Town');
  });

  it('explains itself when a destination has no guide', async () => {
    const harness = await RouterTestingHarness.create('/destinations/atlantis');
    const element = harness.routeNativeElement as HTMLElement;

    expect(element.textContent).toContain('We do not have a guide for that destination yet');
    expect(element.querySelectorAll('.not-found-list a').length).toBeGreaterThan(0);
  });

  it('opens a destination guide from its card on the home page', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DestinationCard],
      providers: [provideRouter(routes)],
    }).compileComponents();

    const fixture = TestBed.createComponent(DestinationCard);
    fixture.componentRef.setInput('destination', destinations[0]);
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a.card') as HTMLAnchorElement;
    expect(anchor.getAttribute('href')).toBe(`/destinations/${destinations[0].slug}`);
    expect(anchor.querySelector('.cta')?.textContent).toContain('Explore the guide');
  });
});
