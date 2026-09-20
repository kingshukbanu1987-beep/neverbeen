import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  DestinationPage,
  destinationPage,
  destinationGuides,
} from '../../models/destination-guide';
import { DestinationCard } from '../../shared/destination-card/destination-card';
import {
  CurrencyNow,
  DestinationLive,
  WeatherNow,
  WikipediaSummary,
  weatherGlyph,
} from '../../services/destination-live';

type LoadState = 'loading' | 'ready' | 'unavailable';

interface JumpLink {
  id: string;
  label: string;
}

/** Section chips shown under the hero. */
const SECTIONS: JumpLink[] = [
  { id: 'live', label: 'Live now' },
  { id: 'overview', label: 'Overview' },
  { id: 'eat', label: 'Where to eat' },
  { id: 'see', label: 'Sightseeing' },
  { id: 'history', label: 'History' },
  { id: 'geography', label: 'Geography' },
  { id: 'map', label: 'Map' },
  { id: 'plan', label: 'Plan your visit' },
  { id: 'photos', label: 'Photographs' },
];

const COMPASS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
];

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string, options: Intl.DateTimeFormatOptions, key: string) {
  const cacheKey = `${timeZone}|${key}`;
  let found = formatterCache.get(cacheKey);
  if (!found) {
    try {
      found = new Intl.DateTimeFormat('en-GB', { ...options, timeZone });
    } catch {
      found = new Intl.DateTimeFormat('en-GB', options);
    }
    formatterCache.set(cacheKey, found);
  }
  return found;
}

/** Offset of a time zone from UTC, in minutes, for a given instant. */
function zoneOffsetMinutes(timeZone: string, date: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date);
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const asUtc = Date.UTC(
      read('year'),
      read('month') - 1,
      read('day'),
      read('hour') % 24,
      read('minute'),
      read('second'),
    );
    return Math.round((asUtc - date.getTime()) / 60000);
  } catch {
    return -date.getTimezoneOffset();
  }
}

function offsetLabel(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const mins = String(absolute % 60).padStart(2, '0');
  return `UTC${sign}${hours}:${mins}`;
}

function durationLabel(minutes: number): string {
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;
  const parts = [
    hours ? `${hours} hour${hours === 1 ? '' : 's'}` : '',
    mins ? `${mins} minutes` : '',
  ];
  return parts.filter(Boolean).join(' ') || 'no time difference';
}

function dayLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

@Component({
  selector: 'app-destination',
  imports: [RouterLink, DestinationCard],
  templateUrl: './destination.html',
  styleUrl: './destination.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DestinationPageView {
  private readonly route = inject(ActivatedRoute);
  private readonly live = inject(DestinationLive);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly title = inject(Title);
  private readonly destroyRef = inject(DestroyRef);

  /** undefined while the slug is being resolved, null when no guide exists. */
  protected readonly page = signal<DestinationPage | null | undefined>(undefined);
  protected readonly weather = signal<WeatherNow | null>(null);
  protected readonly weatherState = signal<LoadState>('loading');
  protected readonly currency = signal<CurrencyNow | null>(null);
  protected readonly currencyState = signal<LoadState>('loading');
  protected readonly summary = signal<WikipediaSummary | null>(null);
  protected readonly summaryState = signal<LoadState>('loading');
  protected readonly sections = SECTIONS;
  protected readonly allGuides = Object.values(destinationGuides);

  private readonly clock = signal(Date.now());
  private requestId = 0;

  /** Local time in the destination, refreshed every second. */
  protected readonly localTime = computed(() => {
    const zone = this.page()?.guide.timezone;
    if (!zone) {
      return '';
    }
    return this.format(
      new Date(this.clock()),
      zone,
      { hour: '2-digit', minute: '2-digit', second: '2-digit' },
      'hms',
    );
  });

  protected readonly localTimeShort = computed(() => {
    const zone = this.page()?.guide.timezone;
    if (!zone) {
      return '';
    }
    return this.format(new Date(this.clock()), zone, { hour: '2-digit', minute: '2-digit' }, 'hm');
  });

  protected readonly localDate = computed(() => {
    const zone = this.page()?.guide.timezone;
    if (!zone) {
      return '';
    }
    return this.format(
      new Date(this.clock()),
      zone,
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
      'full-date',
    );
  });

  protected readonly localOffset = computed(() => {
    const zone = this.page()?.guide.timezone;
    return zone ? offsetLabel(zoneOffsetMinutes(zone, new Date(this.clock()))) : '';
  });

  /** How the destination time compares with the visitor's own clock. */
  protected readonly timeDifference = computed(() => {
    const zone = this.page()?.guide.timezone;
    if (!zone) {
      return '';
    }
    const now = new Date(this.clock());
    const here = -now.getTimezoneOffset();
    const there = zoneOffsetMinutes(zone, now);
    const difference = there - here;
    if (Math.abs(difference) < 15) {
      return 'Same time as your clock';
    }
    return `The destination is ${durationLabel(difference)} ${difference > 0 ? 'ahead of' : 'behind'} your time`;
  });

  protected readonly isNight = computed(() => {
    const current = this.weather();
    if (current) {
      return !current.isDay;
    }
    const zone = this.page()?.guide.timezone;
    if (!zone) {
      return false;
    }
    const hour = Number(
      this.format(new Date(this.clock()), zone, { hour: '2-digit', hour12: false }, 'hour'),
    );
    return hour < 6 || hour >= 19;
  });

  /**
   * Map embed URL. Angular requires resource URLs (iframes) to be marked safe;
   * this one is built entirely from numeric coordinates in our own data.
   */
  protected readonly mapSrc = computed(() => {
    const place = this.page();
    if (!place) {
      return null;
    }
    const { lat, lon } = place.guide.coordinates;
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.mapUrl(lat, lon));
  });

  protected readonly sunriseLabel = computed(() => this.formatIso(this.weather()?.sunrise ?? null));
  protected readonly sunsetLabel = computed(() => this.formatIso(this.weather()?.sunset ?? null));

  constructor() {
    const timer = setInterval(() => this.clock.set(Date.now()), 1000);
    const subscription = this.route.paramMap.subscribe((params) =>
      this.load(params.get('slug') ?? ''),
    );

    this.destroyRef.onDestroy(() => {
      clearInterval(timer);
      subscription.unsubscribe();
    });
  }

  protected glyph(conditionCode: number, isDay: boolean): string {
    return weatherGlyph(conditionCode, isDay);
  }

  protected compass(degrees: number): string {
    return COMPASS[Math.round(degrees / 22.5) % 16];
  }

  protected dayLabelOf(date: string): string {
    return dayLabel(date);
  }

  protected rate(value: number, digits = 2): string {
    return value.toLocaleString('en-GB', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  /** OpenStreetMap embed — no API key required, and safe to frame. */
  protected mapUrl(lat: number, lon: number): string {
    const spread = 0.06;
    const bbox = [lon - spread, lat - spread / 2, lon + spread, lat + spread / 2]
      .map((value) => value.toFixed(4))
      .join(',');
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(
      4,
    )},${lon.toFixed(4)}`;
  }

  protected googleMapsUrl(name: string, lat: number, lon: number): string {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}&query_place_id=&z=10#${encodeURIComponent(
      name,
    )}`;
  }

  /** Image search for a place — a quick way to see more travel photography. */
  protected photosOnGoogle(name: string): string {
    return this.googleSearch(`${name} travel photographs`, '2');
  }

  protected googleSearch(query: string, vertical?: string): string {
    const suffix = vertical ? `&udm=${vertical}` : '';
    return `https://www.google.com/search?q=${encodeURIComponent(query)}${suffix}`;
  }

  private format(
    date: Date,
    timeZone: string,
    options: Intl.DateTimeFormatOptions,
    key: string,
  ): string {
    return formatter(timeZone, options, key).format(date);
  }

  private formatIso(value: string | null): string {
    const zone = this.page()?.guide.timezone;
    if (!value || !zone) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value.split('T')[1] ?? value;
    }
    return this.format(parsed, zone, { hour: '2-digit', minute: '2-digit' }, 'hm');
  }

  private load(slug: string): void {
    const page = destinationPage(slug);
    this.page.set(page);
    this.requestId += 1;
    const request = this.requestId;

    this.weather.set(null);
    this.currency.set(null);
    this.summary.set(null);
    this.weatherState.set('loading');
    this.currencyState.set('loading');
    this.summaryState.set('loading');

    if (!page) {
      this.title.setTitle('Destination not found — NeverBeen');
      return;
    }

    this.title.setTitle(`${page.guide.name}, ${page.guide.country} — NeverBeen`);

    void this.loadWeather(page, request);
    void this.loadCurrency(page, request);
    void this.loadSummary(page, request);
  }

  private async loadWeather(page: DestinationPage, request: number): Promise<void> {
    const result = await this.live.weather(page.guide.coordinates.lat, page.guide.coordinates.lon);
    if (request !== this.requestId) {
      return;
    }
    this.weather.set(result);
    this.weatherState.set(result ? 'ready' : 'unavailable');
  }

  private async loadCurrency(page: DestinationPage, request: number): Promise<void> {
    const result = await this.live.currency(
      page.guide.currency.code,
      page.guide.currency.approximatePerUsd,
    );
    if (request !== this.requestId) {
      return;
    }
    this.currency.set(result);
    this.currencyState.set('ready');
  }

  private async loadSummary(page: DestinationPage, request: number): Promise<void> {
    const result = await this.live.summary(page.guide.wikipedia);
    if (request !== this.requestId) {
      return;
    }
    this.summary.set(result);
    this.summaryState.set(result ? 'ready' : 'unavailable');
  }
}
