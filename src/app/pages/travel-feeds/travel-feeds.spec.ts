import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { TravelFeedsPage } from './travel-feeds';

const today = new Date(Date.now() - 60000);
const day = (offset: number) =>
  new Date(today.getTime() - offset * 86400000).toISOString().slice(0, 10).replace(/-/g, '');

function pageviews(views: number[]) {
  return {
    items: views.map((value, index) => ({
      timestamp: day(views.length - 1 - index),
      views: value,
    })),
  };
}

const commonsPayload = {
  query: {
    pages: {
      1: {
        title: 'File:Kyoto temple at dusk.jpg',
        imageinfo: [
          {
            thumburl: 'https://upload.wikimedia.org/kyoto-1.jpg',
            descriptionurl: 'https://commons.wikimedia.org/wiki/File:Kyoto_temple_at_dusk.jpg',
            mime: 'image/jpeg',
            extmetadata: {
              Artist: { value: '<a href="#">Mika Tanaka</a>' },
              LicenseShortName: { value: 'CC BY-SA 4.0' },
            },
          },
        ],
      },
      2: {
        title: 'File:Fushimi Inari torii path.jpg',
        imageinfo: [
          {
            thumburl: 'https://upload.wikimedia.org/kyoto-2.jpg',
            descriptionurl: 'https://commons.wikimedia.org/wiki/File:Fushimi_Inari_torii_path.jpg',
            mime: 'image/jpeg',
            extmetadata: {
              Artist: { value: 'Kenji Sato' },
              LicenseShortName: { value: 'CC BY 2.0' },
            },
          },
        ],
      },
      3: {
        title: 'File:Kyoto map.svg',
        imageinfo: [
          {
            thumburl: 'https://upload.wikimedia.org/kyoto.svg',
            mime: 'image/svg+xml',
            extmetadata: {},
          },
        ],
      },
    },
  },
};

const wikiSearchPayload = {
  query: {
    pages: {
      10: {
        title: 'Kyoto',
        index: 1,
        extract: 'Kyoto is a city on the island of Honshu in Japan.',
        fullurl: 'https://en.wikipedia.org/wiki/Kyoto',
      },
      11: {
        title: 'Fushimi Inari-taisha',
        index: 2,
        extract: 'Fushimi Inari-taisha is the head shrine of Inari in Kyoto.',
        fullurl: 'https://en.wikipedia.org/wiki/Fushimi_Inari-taisha',
      },
    },
  },
};

const nominatimPayload = [
  {
    lat: '35.0116',
    lon: '135.7681',
    name: 'Kyoto',
    display_name: 'Kyoto, Kyoto Prefecture, Japan',
    address: { country: 'Japan', state: 'Kyoto Prefecture' },
  },
];

const weatherPayload = {
  current: { temperature_2m: 18.4, weather_code: 3, wind_speed_10m: 9.1, is_day: 1 },
  timezone: 'Asia/Tokyo',
};

interface SourceLog {
  url: string;
}

function stubFeeds(options: { fail?: boolean } = {}): SourceLog[] {
  const log: SourceLog[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      log.push({ url });
      if (options.fail) {
        throw new Error('feed unreachable');
      }

      const body = url.includes('pageviews')
        ? pageviews([
            1200, 1500, 1750, 1600, 2100, 2400, 2600, 2300, 2000, 1900, 2200, 2500, 2700, 2900,
          ])
        : url.includes('commons.wikimedia.org')
          ? commonsPayload
          : url.includes('nominatim')
            ? nominatimPayload
            : url.includes('open-meteo')
              ? weatherPayload
              : wikiSearchPayload;

      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return log;
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
  TestBed.createComponent(TravelFeedsPage).detectChanges();
}

describe('TravelFeedsPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TravelFeedsPage],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function create() {
    stubFeeds();
    const fixture = TestBed.createComponent(TravelFeedsPage);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 30));
    fixture.detectChanges();
    return fixture;
  }

  it('opens on the trending destinations headline with a search box and submit button', async () => {
    const fixture = await create();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Trending Destinations News');
    expect(element.querySelector('#destination-search')).not.toBeNull();
    expect(element.querySelector('button[type="submit"]')?.textContent).toContain('Submit');
    expect(element.querySelector('.notice-soft')?.textContent).toContain(
      'Google Places, Instagram and Facebook are currently switched off',
    );
  });

  it('is reachable from its own route', async () => {
    stubFeeds();
    const harness = await RouterTestingHarness.create('/travel-feeds');
    await new Promise((resolve) => setTimeout(resolve, 30));
    harness.detectChanges();

    const element = harness.routeNativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Trending Destinations News');
    expect(harness.routeDebugElement?.componentInstance instanceof TravelFeedsPage).toBe(true);
  });

  it('ranks the trending board from live readership and shows photos and weather', async () => {
    const fixture = await create();
    const element: HTMLElement = fixture.nativeElement;
    const cards = Array.from(element.querySelectorAll('.board-card'));

    expect(cards.length).toBeGreaterThan(1);
    const text = element.textContent ?? '';
    expect(text).toContain('Trending destinations right now');
    expect(text).toContain('16.5k reads'); // last seven days of the stubbed feed
    expect(text).toContain('Kyoto');
    expect(element.querySelector('.board-card img')).not.toBeNull();
    expect(element.querySelector('.spark-line')?.getAttribute('d')).toContain('M0');
  });

  it('retrieves and displays the feed for a searched destination', async () => {
    const fixture = await create();
    const element: HTMLElement = fixture.nativeElement;

    const input = element.querySelector<HTMLInputElement>('#destination-search')!;
    input.value = 'Kyoto';
    input.dispatchEvent(new Event('input'));

    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 30));
    fixture.detectChanges();

    const text = element.textContent ?? '';
    // destination profile from Nominatim + Open-Meteo
    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Kyoto');
    expect(text).toContain('Japan');
    expect(text).toContain('18°C');
    expect(text).toContain('Overcast');
    // reading feed from Wikipedia
    expect(text).toContain('What the feeds are saying');
    expect(text).toContain('Fushimi Inari-taisha');
    // photographs from Wikimedia Commons, with the credit the licence requires
    expect(element.querySelectorAll('.photo-grid img').length).toBe(2);
    expect(text).toContain('Mika Tanaka');
    expect(text).toContain('CC BY-SA 4.0');
    // sources are reported honestly
    expect(text).toContain('Wikimedia Commons');
    expect(element.querySelectorAll('.badge-live').length).toBeGreaterThanOrEqual(4);
  });

  it('marks the key-based feeds as switched off until credentials exist', async () => {
    const fixture = await create();
    const element: HTMLElement = fixture.nativeElement;
    const input = element.querySelector<HTMLInputElement>('#destination-search')!;
    input.value = 'Kyoto';
    input.dispatchEvent(new Event('input'));
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 30));
    fixture.detectChanges();

    const text = element.textContent ?? '';
    expect(text).toContain('Google Places');
    expect(text).toContain('Instagram');
    expect(text).toContain('Facebook');
    expect(text).toContain('Add a Google Places API key to switch this on.');
    expect(text).toContain('Add an Instagram Graph API token to switch this on.');
    expect(text).toContain('Add a Facebook page token and page id to switch this on.');
    expect(element.querySelectorAll('.badge-off').length).toBe(3);
  });

  it('keeps the page usable when every feed is unreachable', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TravelFeedsPage],
      providers: [provideRouter(routes)],
    }).compileComponents();

    stubFeeds({ fail: true });
    const fixture = TestBed.createComponent(TravelFeedsPage);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 30));
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('The trending board is unavailable right now');
    expect(element.textContent).toContain('Trending Destinations News');

    // a search still resolves to a friendly notice rather than an exception
    const input = element.querySelector<HTMLInputElement>('#destination-search')!;
    input.value = 'Kyoto';
    input.dispatchEvent(new Event('input'));
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 30));
    fixture.detectChanges();

    expect(element.textContent).toContain('Live feed for');
    expect(element.querySelectorAll('.badge-failed').length).toBeGreaterThan(0);
  });

  it('tells the visitor when a search matches nothing', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TravelFeedsPage],
      providers: [provideRouter(routes)],
    }).compileComponents();

    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ query: { pages: {} } }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );

    const fixture = TestBed.createComponent(TravelFeedsPage);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 30));
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const input = element.querySelector<HTMLInputElement>('#destination-search')!;
    input.value = 'Atlantis';
    input.dispatchEvent(new Event('input'));
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 30));
    fixture.detectChanges();

    expect(element.textContent).toContain('The public feeds had nothing for “Atlantis”');
  });

  it('lets a suggestion chip run a search without typing', async () => {
    const fixture = await create();
    const element: HTMLElement = fixture.nativeElement;
    const firstChip = element.querySelector<HTMLButtonElement>('.chip')!;

    firstChip.click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 30));
    fixture.detectChanges();

    expect(element.textContent).toContain(`Live feed for ${firstChip.textContent?.trim()}`);
  });

  it('does not search on an empty or too-short term', async () => {
    const fixture = await create();
    const element: HTMLElement = fixture.nativeElement;
    const input = element.querySelector<HTMLInputElement>('#destination-search')!;

    input.value = 'K';
    input.dispatchEvent(new Event('input'));
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(element.textContent).not.toContain('Live feed for');
    expect(fixture.componentInstance['form'].controls.destination.touched).toBe(true);
  });
});
