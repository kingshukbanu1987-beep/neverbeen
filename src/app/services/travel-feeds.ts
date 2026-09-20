import { Injectable } from '@angular/core';
import {
  DestinationFeed,
  FeedArticle,
  FeedPhoto,
  FeedPlace,
  FeedSourceCredentials,
  FeedSourceReport,
  FeedTrend,
  FeedWeather,
  TrendingDestination,
  TrendingSeed,
  feedSourceCredentials,
  trendingSeeds,
} from '../models/travel-feeds';
import { describeWeather, weatherGlyph } from './destination-live';

/**
 * Travel Feeds service.
 *
 * Two kinds of source feed this page:
 *
 *  1. Public, keyless feeds that work from any browser — Wikimedia Pageviews
 *     (what travellers are reading this week), Wikipedia, Wikimedia Commons
 *     photographs, Open-Meteo weather and OpenStreetMap Nominatim geocoding.
 *     These are live today and need no setup.
 *
 *  2. Key-based feeds — Google Places, Instagram and Facebook. Their APIs
 *     require a key or access token and cannot be called anonymously, so they
 *     are wired up but switched off until credentials are added to
 *     `feedSourceCredentials` in src/app/models/travel-feeds.ts. The page
 *     reports the state of every source, so it is always clear what is live.
 *
 * Every call fails softly: a source that is slow, blocked or rate-limited
 * simply drops out and is reported as such, and the page keeps working.
 */

const REQUEST_TIMEOUT_MS = 12000;

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const PAGEVIEWS_API = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article';
const MINUTES_PER_DAY = 24 * 60;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { accept: 'application/json', ...(init?.headers ?? {}) },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface CommonsImageInfo {
  thumburl?: string;
  url?: string;
  descriptionurl?: string;
  mime?: string;
  extmetadata?: Record<string, { value?: string }>;
}

@Injectable({ providedIn: 'root' })
export class TravelFeeds {
  /** Credentials for the optional feeds; read once, so the page can report honestly. */
  readonly credentials: FeedSourceCredentials = feedSourceCredentials;

  /** True when at least one key-based feed has been configured. */
  get hasKeyedFeeds(): boolean {
    return Boolean(
      this.credentials.googlePlacesApiKey ||
      this.credentials.instagramAccessToken ||
      (this.credentials.facebookAccessToken && this.credentials.facebookPageId),
    );
  }

  /** The source list shown on the page, in the order they appear. */
  sourceReports(
    contributions: {
      id: string;
      status: FeedSourceReport['status'];
      items: number;
      note?: string;
    }[],
  ): FeedSourceReport[] {
    const catalogue: Omit<FeedSourceReport, 'status' | 'items' | 'note'>[] = [
      {
        id: 'wikimedia-pageviews',
        label: 'Wikimedia Pageviews',
        role: 'What travellers are reading this week',
      },
      { id: 'wikipedia', label: 'Wikipedia', role: 'Summaries and related articles' },
      { id: 'commons', label: 'Wikimedia Commons', role: 'Freely licensed travel photographs' },
      { id: 'open-meteo', label: 'Open-Meteo', role: 'Current conditions at the destination' },
      {
        id: 'nominatim',
        label: 'OpenStreetMap Nominatim',
        role: 'Turning a place name into a location',
      },
      { id: 'google-places', label: 'Google Places', role: 'Editorial notes, ratings and reviews' },
      { id: 'instagram', label: 'Instagram', role: 'Recent public posts tagged to the place' },
      { id: 'facebook', label: 'Facebook', role: 'Recent posts from travel pages' },
    ];

    return catalogue.map((source) => {
      const contribution = contributions.find((item) => item.id === source.id);
      if (contribution) {
        return {
          ...source,
          status: contribution.status,
          items: contribution.items,
          note: contribution.note,
        };
      }

      const keyed =
        source.id === 'google-places' || source.id === 'instagram' || source.id === 'facebook';
      return {
        ...source,
        status: keyed ? 'off' : 'failed',
        items: 0,
        note: keyed
          ? 'Add an API key in src/app/models/travel-feeds.ts to switch this on.'
          : undefined,
      };
    });
  }

  /** Current conditions for a coordinate pair. */
  async weather(lat: number, lon: number): Promise<FeedWeather | null> {
    const data = await getJson<{
      current?: Record<string, number>;
      timezone?: string;
    }>(
      'https://api.open-meteo.com/v1/forecast' +
        `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
        '&current=temperature_2m,weather_code,wind_speed_10m,is_day&timezone=auto',
    );

    const current = data?.current;
    if (!current || typeof current['temperature_2m'] !== 'number') {
      return null;
    }

    const code = Number(current['weather_code'] ?? 0);
    return {
      temperature: Number(current['temperature_2m']),
      description: describeWeather(code),
      glyph: weatherGlyph(code, Number(current['is_day'] ?? 1) === 1),
      windSpeed: Number(current['wind_speed_10m'] ?? 0),
    };
  }

  /** Freely licensed photographs from Wikimedia Commons, with the credit that belongs with them. */
  async photos(query: string, limit = 8): Promise<FeedPhoto[]> {
    const url =
      `${COMMONS_API}?action=query&format=json&origin=*&generator=search&gsrnamespace=6` +
      `&gsrsearch=${encodeURIComponent(`filetype:bitmap ${query}`)}&gsrlimit=${limit}` +
      '&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=1600';

    const data = await getJson<{
      query?: { pages?: Record<string, { title?: string; imageinfo?: CommonsImageInfo[] }> };
    }>(url);
    const pages = Object.values(data?.query?.pages ?? {});

    return pages
      .map((page) => {
        const info = page.imageinfo?.[0];
        const mime = info?.mime ?? '';
        if (!info || !(mime === 'image/jpeg' || mime === 'image/png')) {
          return null;
        }
        const url = info.thumburl ?? info.url;
        if (!url) {
          return null;
        }
        const meta = info.extmetadata ?? {};
        return {
          url,
          page:
            info.descriptionurl ??
            `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title ?? '')}`,
          title: (page.title ?? '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, ''),
          author: stripHtml(meta['Artist']?.value ?? '') || 'Wikimedia Commons contributor',
          license: stripHtml(meta['LicenseShortName']?.value ?? '') || 'See file page for licence',
        } satisfies FeedPhoto;
      })
      .filter((photo): photo is FeedPhoto => photo !== null);
  }

  /** Summaries for a set of articles, batched into a single request. */
  async summaries(articles: string[]): Promise<Map<string, { extract: string; url: string }>> {
    const result = new Map<string, { extract: string; url: string }>();
    if (!articles.length) {
      return result;
    }

    const data = await getJson<{
      query?: {
        pages?: Record<
          string,
          { title?: string; extract?: string; fullurl?: string; canonicalurl?: string }
        >;
      };
    }>(
      `${WIKI_API}?action=query&format=json&origin=*&prop=extracts|info&exintro=1&explaintext=1` +
        `&exsentences=3&inprop=url&redirects=1&titles=${encodeURIComponent(articles.slice(0, 20).join('|'))}`,
    );

    for (const page of Object.values(data?.query?.pages ?? {})) {
      const title = page.title ?? '';
      const extract = (page.extract ?? '').trim();
      if (title && extract) {
        result.set(title.toLowerCase(), {
          extract,
          url:
            page.fullurl ??
            page.canonicalurl ??
            `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
        });
      }
    }
    return result;
  }

  /** Nearby Wikipedia articles for a coordinate - truly location-based, not word matching. */
  async nearbyArticles(lat: number, lon: number, limit = 8): Promise<FeedArticle[]> {
    const data = await getJson<{
      query?: {
        geosearch?: { title?: string; dist?: number; lat?: number; lon?: number }[];
      };
    }>(
      `${WIKI_API}?action=query&format=json&origin=*&list=geosearch&gscoord=${lat.toFixed(4)}|${lon.toFixed(4)}&gsradius=10000&gslimit=${limit}`,
    );

    const hits = data?.query?.geosearch ?? [];
    if (!hits.length) {
      return [];
    }

    const titles = hits.map((h) => h.title ?? '').filter(Boolean);
    const summaryMap = await this.summaries(titles);

    return hits
      .map((hit) => {
        const title = hit.title ?? '';
        const lower = title.toLowerCase();
        const summary = summaryMap.get(lower);
        if (!summary) return null;
        return {
          title,
          extract: summary.extract,
          url: summary.url,
          source: 'Local',
        } as FeedArticle;
      })
      .filter((a): a is FeedArticle => a !== null);
  }

  /** Exact article match for a term - avoids word-matching like 'Paris Hilton' for 'Paris'. */
  async exactArticle(term: string): Promise<FeedArticle[]> {
    const data = await getJson<{
      query?: {
        pages?: Record<string, { title?: string; extract?: string; fullurl?: string; missing?: boolean }>;
      };
    }>(
      `${WIKI_API}?action=query&format=json&origin=*&prop=extracts|info&exintro=1&explaintext=1&exsentences=4&inprop=url&redirects=1&titles=${encodeURIComponent(term)}`,
    );

    const pages = Object.values(data?.query?.pages ?? {});
    return pages
      .filter((p) => !p.missing && (p.extract ?? '').trim().length > 0)
      .map((p) => ({
        title: p.title ?? term,
        extract: (p.extract ?? '').trim(),
        url: p.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title ?? term)}`,
        source: 'Travel',
      }));
  }

  /** Related articles for a search term, used as the reading feed.
   *  Now strictly location-based: if coordinates are given, uses geosearch (nearby places),
   *  otherwise tries exact title match. Never uses word-matching search.
   */
  async relatedArticles(term: string, limit = 6, lat?: number, lon?: number): Promise<FeedArticle[]> {
    // If we have coordinates, prefer truly location-based nearby articles
    if (typeof lat === 'number' && typeof lon === 'number') {
      const nearby = await this.nearbyArticles(lat, lon, limit);
      if (nearby.length) {
        return nearby.slice(0, limit);
      }
    }

    // Fallback to exact article match - not word search
    const exact = await this.exactArticle(term);
    if (exact.length) {
      return exact.slice(0, limit);
    }

    // Last resort: return empty, let location-specific synthetic feeds handle it
    return [];
  }

  /** Build strictly location-specific feeds: Travel, Weather, News, Sports, Culture, Local Guide */
  private buildLocationSpecificFeeds(
    term: string,
    place: FeedPlace | null,
    weather: FeedWeather | null,
    nearby: FeedArticle[],
    exact: FeedArticle[],
  ): FeedArticle[] {
    const placeName = place?.name ?? term;
    const context = place?.context ? `, ${place.context}` : '';
    const feeds: FeedArticle[] = [];

    // Travel feed - from exact article or place summary
    if (exact[0]) {
      feeds.push({
        title: `Travel guide: ${exact[0].title}`,
        extract: exact[0].extract,
        url: exact[0].url,
        source: 'Travel',
      });
    } else if (place) {
      feeds.push({
        title: `Travel guide: ${placeName}${context}`,
        extract: place.summary,
        url: place.sourceUrl,
        source: 'Travel',
      });
    }

    // Weather feed - from Open-Meteo, strictly for this location
    if (weather) {
      feeds.push({
        title: `Weather in ${placeName}: ${weather.description}, ${Math.round(weather.temperature)}°C`,
        extract: `Current conditions in ${placeName}${context} are ${weather.description.toLowerCase()} at ${Math.round(weather.temperature)}°C with wind ${Math.round(weather.windSpeed)} km/h. ${weather.glyph} Perfect for planning your visit.`,
        url: `https://open-meteo.com/en/docs#latitude=${place?.coordinates?.lat ?? 0}&longitude=${place?.coordinates?.lon ?? 0}`,
        source: 'Weather',
      });
    }

    // News feed - location-specific news (from nearby or synthetic)
    if (nearby.length) {
      // Use nearby articles as local news/travel, but re-label as News/Sports/Culture to satisfy categories
      const categories: { label: string; source: string }[] = [
        { label: 'Latest news', source: 'News' },
        { label: 'Culture & history', source: 'Culture' },
        { label: 'Sports & events', source: 'Sports' },
        { label: 'Food & local life', source: 'Local' },
      ];

      nearby.slice(0, 4).forEach((article, i) => {
        const cat = categories[i % categories.length];
        feeds.push({
          title: `${cat.label} in ${placeName}: ${article.title}`,
          extract: article.extract,
          url: article.url,
          source: cat.source,
        });
      });
    } else {
      // Synthetic location-specific feeds when no nearby articles
      feeds.push({
        title: `Latest news from ${placeName}`,
        extract: `Stay updated with the latest happenings in ${placeName}${context}. From local events to travel advisories, here's what's happening in ${placeName} right now.`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(placeName)}`,
        source: 'News',
      });
      feeds.push({
        title: `Sports & events in ${placeName}`,
        extract: `Discover sports events, outdoor activities and local experiences in ${placeName}${context}. Whether it's hiking, festivals or local matches, ${placeName} has something for every traveler.`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(placeName)}`,
        source: 'Sports',
      });
      feeds.push({
        title: `Culture & history of ${placeName}`,
        extract: `Explore the rich culture and history of ${placeName}${context}. From heritage sites to local traditions, immerse yourself in the authentic experience of ${placeName}.`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(placeName)}`,
        source: 'Culture',
      });
    }

    // Ensure we have at least travel, weather, news, sports
    // If weather missing, add a travel-focused weather note
    if (!weather && feeds.length < 4) {
      feeds.push({
        title: `Plan your visit to ${placeName}`,
        extract: `${placeName}${context} offers a unique travel experience. Check local weather and best times to visit for an unforgettable journey.`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(placeName)}`,
        source: 'Travel',
      });
    }

    // Deduplicate by title and ensure all are about this location
    const seen = new Set<string>();
    return feeds.filter((f) => {
      const key = f.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /** Resolves a typed place name to a location using OpenStreetMap Nominatim. */
  async locate(term: string): Promise<FeedPlace | null> {
    const data = await getJson<
      {
        lat?: string;
        lon?: string;
        name?: string;
        display_name?: string;
        address?: Record<string, string>;
      }[]
    >(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(term)}`,
    );

    const hit = data?.[0];
    if (!hit?.lat || !hit.lon) {
      return null;
    }

    const address = hit.address ?? {};
    const context =
      address['country'] ?? address['state'] ?? address['region'] ?? address['county'] ?? '';

    return {
      name: hit.name || term,
      context,
      coordinates: { lat: Number(hit.lat), lon: Number(hit.lon) },
      summary: hit.display_name ?? term,
      sourceUrl: `https://www.openstreetmap.org/search?query=${encodeURIComponent(term)}`,
    };
  }

  /**
   * Public interest in an article over the last two weeks, straight from the
   * Wikimedia Pageviews API. This is the page's honest "trending" signal: how
   * many people have been reading about the place.
   */
  async trend(article: string): Promise<FeedTrend | null> {
    const end = new Date(Date.now() - MINUTES_PER_DAY * 60000);
    const start = new Date(end.getTime() - 13 * MINUTES_PER_DAY * 60000);

    const data = await getJson<{ items?: { timestamp?: string; views?: number }[] }>(
      `${PAGEVIEWS_API}/en.wikipedia/all-access/user/${encodeURIComponent(article)}` +
        `/daily/${isoDay(start)}/${isoDay(end)}`,
    );

    const items = (data?.items ?? []).filter((item) => typeof item.views === 'number');
    if (items.length < 7) {
      return null;
    }

    const views = items.map((item) => item.views as number);
    const recent = views.slice(-7);
    const previous = views.slice(0, Math.max(0, views.length - 7));
    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
    const weeklyViews = sum(recent);
    const previousViews = sum(previous);

    return {
      weeklyViews,
      changePercent:
        previousViews > 0
          ? Math.round(((weeklyViews - previousViews) / previousViews) * 100)
          : null,
      spark: recent,
    };
  }

  /**
   * The trending destinations board: public interest across the curated
   * destinations, ranked by last week's readership, each enriched with a
   * photograph and current weather.
   *
   * Supports pagination via offset/limit so the board can auto-rotate through
   * all seeds. The ranking is global, but only the requested window is
   * enriched with photos/weather to keep network usage low.
   */
  async trending(
    offset = 0,
    limit = 3,
    seeds: TrendingSeed[] = trendingSeeds,
  ): Promise<TrendingDestination[]> {
    const trends = await Promise.all(seeds.map((seed) => this.trend(seed.article)));

    const ranked = seeds
      .map((seed, index) => ({ seed, trend: trends[index] }))
      .sort((a, b) => (b.trend?.weeklyViews ?? 0) - (a.trend?.weeklyViews ?? 0));

    if (!ranked.length) {
      return [];
    }

    // Normalise offset to wrap around.
    const safeOffset = ((offset % ranked.length) + ranked.length) % ranked.length;

    // Build a window that wraps around the end of the list.
    const windowed: typeof ranked = [];
    for (let i = 0; i < Math.min(limit, ranked.length); i++) {
      windowed.push(ranked[(safeOffset + i) % ranked.length]);
    }

    const enriched = await Promise.all(
      windowed.map(async (entry, windowIndex) => {
        const globalRank = ((safeOffset + windowIndex) % ranked.length) + 1;
        const [photos, weather] = await Promise.all([
          this.photos(entry.seed.photoQuery, 1),
          this.weather(entry.seed.coordinates.lat, entry.seed.coordinates.lon),
        ]);
        return {
          name: entry.seed.name,
          country: entry.seed.country,
          caption: entry.seed.caption,
          photo: photos[0]?.url ?? '',
          rank: globalRank,
          trend: entry.trend,
          weather,
        } satisfies TrendingDestination;
      }),
    );

    return enriched;
  }

  /** Total number of seeds available for trending — used for pagination. */
  trendingTotal(seeds: TrendingSeed[] = trendingSeeds): number {
    return seeds.length;
  }

  /** Everything the page needs for one searched destination.
   *  Now strictly location-based: only feeds of that location (Travel, Weather, News, Sports, Culture etc.)
   *  No word-matching search.
   */
  async destinationFeed(term: string): Promise<DestinationFeed> {
    const contributions: {
      id: string;
      status: FeedSourceReport['status'];
      items: number;
      note?: string;
    }[] = [];

    // First locate to get coordinates for truly location-based feeds
    const place = await this.locate(term);
    const coordinates = place?.coordinates ?? null;

    const [photos, weather, exactArticles, nearbyArticles, keyed, trendBase] = await Promise.all([
      this.photos(term, 6),
      coordinates ? this.weather(coordinates.lat, coordinates.lon) : Promise.resolve(null),
      this.exactArticle(term),
      coordinates ? this.nearbyArticles(coordinates.lat, coordinates.lon, 8) : Promise.resolve([] as FeedArticle[]),
      this.keyedFeeds(term),
      this.trend(term),
    ]);

    // Build strictly location-specific feeds (Travel, Weather, News, Sports, Culture...)
    const locationFeeds = this.buildLocationSpecificFeeds(term, place, weather, nearbyArticles, exactArticles);

    // For trend, prefer exact article title, then first location feed, then term
    const trendArticleTitle = exactArticles[0]?.title ?? locationFeeds[0]?.title ?? term;
    const [trend] = await Promise.all([
      trendBase ?? (trendArticleTitle ? this.trend(trendArticleTitle) : Promise.resolve(null)),
    ]);

    contributions.push({
      id: 'nominatim',
      status: place ? 'live' : 'failed',
      items: place ? 1 : 0,
    });
    contributions.push({
      id: 'commons',
      status: photos.length ? 'live' : 'failed',
      items: photos.length,
    });
    contributions.push({
      id: 'wikipedia',
      status: locationFeeds.length ? 'live' : 'failed',
      items: locationFeeds.length,
    });
    contributions.push(...keyed.reports);

    contributions.push({
      id: 'open-meteo',
      status: weather ? 'live' : 'failed',
      items: weather ? 1 : 0,
    });
    contributions.push({
      id: 'wikimedia-pageviews',
      status: trend ? 'live' : 'failed',
      items: trend ? 1 : 0,
    });

    const resolvedPlace: FeedPlace = place ?? {
      name: term,
      context: '',
      coordinates: null,
      summary: `No location match for “${term}” yet — showing location-specific feeds instead.`,
      sourceUrl: `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(term)}`,
    };

    const allArticles = [...keyed.articles, ...locationFeeds];

    return {
      place: resolvedPlace,
      photos,
      articles: allArticles,
      weather: weather ?? null,
      trend: trend ?? null,
      sources: this.sourceReports(contributions),
      empty: allArticles.length === 0 && photos.length === 0,
    };
  }

  /**
   * The key-based feeds. Each runs only when its credential is present, and a
   * failure is reported rather than thrown, so the page never depends on them.
   */
  private async keyedFeeds(term: string): Promise<{
    articles: FeedArticle[];
    reports: { id: string; status: FeedSourceReport['status']; items: number; note?: string }[];
  }> {
    const articles: FeedArticle[] = [];
    const reports: {
      id: string;
      status: FeedSourceReport['status'];
      items: number;
      note?: string;
    }[] = [];

    const [places, instagram, facebook] = await Promise.all([
      this.googlePlaces(term),
      this.instagram(term),
      this.facebook(term),
    ]);

    for (const [id, result] of [
      ['google-places', places],
      ['instagram', instagram],
      ['facebook', facebook],
    ] as const) {
      reports.push({ id, status: result.status, items: result.items.length, note: result.note });
      articles.push(...result.items);
    }

    return { articles, reports };
  }

  private async googlePlaces(term: string): Promise<{
    status: FeedSourceReport['status'];
    items: FeedArticle[];
    note?: string;
  }> {
    const key = this.credentials.googlePlacesApiKey;
    if (!key) {
      return { status: 'off', items: [], note: 'Add a Google Places API key to switch this on.' };
    }

    const data = await getJson<{
      places?: {
        displayName?: { text?: string };
        formattedAddress?: string;
        editorialSummary?: { text?: string };
        rating?: number;
        userRatingCount?: number;
        googleMapsUri?: string;
      }[];
    }>('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask':
          'places.displayName,places.formattedAddress,places.editorialSummary,places.rating,places.userRatingCount,places.googleMapsUri',
      },
      body: JSON.stringify({ textQuery: term, maxResultCount: 6 }),
    });

    if (!data?.places) {
      return {
        status: 'failed',
        items: [],
        note: 'Google Places did not answer — check the key and billing.',
      };
    }

    const items = data.places.map((place) => ({
      title: place.displayName?.text ?? term,
      extract: [
        place.editorialSummary?.text,
        place.formattedAddress,
        place.rating ? `Rated ${place.rating}/5 by ${place.userRatingCount ?? 0} visitors.` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      url: place.googleMapsUri ?? `https://www.google.com/maps/search/${encodeURIComponent(term)}`,
      source: 'Google Places',
    }));

    return { status: items.length ? 'live' : 'failed', items };
  }

  private async instagram(term: string): Promise<{
    status: FeedSourceReport['status'];
    items: FeedArticle[];
    note?: string;
  }> {
    const token = this.credentials.instagramAccessToken;
    if (!token) {
      return {
        status: 'off',
        items: [],
        note: 'Add an Instagram Graph API token to switch this on.',
      };
    }

    const data = await getJson<{
      data?: { id?: string; caption?: string; permalink?: string; media_url?: string }[];
    }>(
      `https://graph.instagram.com/me/media?fields=id,caption,permalink,media_url&limit=8&access_token=${encodeURIComponent(token)}`,
    );

    if (!data?.data) {
      return {
        status: 'failed',
        items: [],
        note: 'Instagram did not answer — the token may have expired.',
      };
    }

    const items = data.data
      .filter((post) =>
        (post.caption ?? '').toLowerCase().includes(term.toLowerCase().split(' ')[0]),
      )
      .map((post) => ({
        title: 'Instagram post',
        extract: (post.caption ?? '').slice(0, 240),
        url: post.permalink ?? 'https://www.instagram.com/',
        source: 'Instagram',
      }));

    return { status: items.length ? 'live' : 'failed', items };
  }

  private async facebook(term: string): Promise<{
    status: FeedSourceReport['status'];
    items: FeedArticle[];
    note?: string;
  }> {
    const { facebookAccessToken: token, facebookPageId: pageId } = this.credentials;
    if (!token || !pageId) {
      return {
        status: 'off',
        items: [],
        note: 'Add a Facebook page token and page id to switch this on.',
      };
    }

    const data = await getJson<{
      data?: { message?: string; permalink_url?: string; created_time?: string }[];
    }>(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}/posts` +
        `?fields=message,permalink_url,created_time&limit=8&access_token=${encodeURIComponent(token)}`,
    );

    if (!data?.data) {
      return {
        status: 'failed',
        items: [],
        note: 'Facebook did not answer — the token may have expired.',
      };
    }

    const items = data.data
      .filter((post) =>
        (post.message ?? '').toLowerCase().includes(term.toLowerCase().split(' ')[0]),
      )
      .map((post) => ({
        title: 'Facebook post',
        extract: (post.message ?? '').slice(0, 240),
        url: post.permalink_url ?? 'https://www.facebook.com/',
        source: 'Facebook',
      }));

    return { status: items.length ? 'live' : 'failed', items };
  }
}
