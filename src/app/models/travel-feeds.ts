/**
 * Types for the Travel Feeds page.
 *
 * The page is fed by public, keyless travel sources that allow cross-origin
 * requests from a browser:
 *   - Wikimedia Pageviews API  → what travellers are actually reading this week
 *   - Wikipedia API            → summaries and related articles per destination
 *   - Wikimedia Commons        → freely licensed travel photographs
 *   - Open-Meteo               → current conditions at the destination
 *   - OpenStreetMap Nominatim  → turning a typed place name into a location
 *
 * Paid or token-gated feeds (Google Places, Instagram, Facebook) are supported
 * through `feedSourceCredentials` below: add a key and the matching connector
 * starts running, contributing results with a live badge on the page.
 */

/** Credentials for the optional, key-based feeds. Leave blank to leave them off. */
export interface FeedSourceCredentials {
  /** Google Places API (New) key — https://console.cloud.google.com/ */
  googlePlacesApiKey?: string;
  /** Instagram Graph API token. */
  instagramAccessToken?: string;
  /** Facebook Graph API token, plus the page whose posts you want to read. */
  facebookAccessToken?: string;
  facebookPageId?: string;
}

export const feedSourceCredentials: FeedSourceCredentials = {
  // googlePlacesApiKey: '',
  // instagramAccessToken: '',
  // facebookAccessToken: '',
  // facebookPageId: '',
};

export type FeedSourceStatus = 'live' | 'off' | 'failed';

export interface FeedSourceReport {
  id: string;
  label: string;
  /** What the source contributes to the page. */
  role: string;
  status: FeedSourceStatus;
  /** How many items it returned in this run. */
  items: number;
  note?: string;
}

export interface FeedPhoto {
  url: string;
  /** Full-size page on Wikimedia Commons, so credit can be followed. */
  page: string;
  title: string;
  author: string;
  license: string;
}

export interface FeedArticle {
  title: string;
  extract: string;
  url: string;
  /** Which feed produced this item, e.g. Wikipedia or Google Places. */
  source: string;
}

export interface FeedWeather {
  temperature: number;
  description: string;
  glyph: string;
  windSpeed: number;
}

export interface FeedTrend {
  /** Views across the last seven days. */
  weeklyViews: number;
  /** Change against the previous seven days, as a percentage. */
  changePercent: number | null;
  /** Daily view counts, oldest first — drawn as a sparkline. */
  spark: number[];
}

export interface FeedPlace {
  name: string;
  /** Region or country, when a source can tell us. */
  context: string;
  coordinates: { lat: number; lon: number } | null;
  summary: string;
  sourceUrl: string;
}

export interface TrendingDestination {
  name: string;
  country: string;
  caption: string;
  photo: string;
  rank: number;
  trend: FeedTrend | null;
  weather: FeedWeather | null;
}

export interface DestinationFeed {
  place: FeedPlace;
  photos: FeedPhoto[];
  articles: FeedArticle[];
  weather: FeedWeather | null;
  trend: FeedTrend | null;
  sources: FeedSourceReport[];
  /** True when every live source failed — the page says so instead of pretending. */
  empty: boolean;
}

/** Destinations ranked by public interest; the long-form guides cover the same places. */
export interface TrendingSeed {
  name: string;
  country: string;
  caption: string;
  /** Wikipedia article used for pageviews and the summary. */
  article: string;
  /** Commons search phrase used to pick a hero photograph. */
  photoQuery: string;
  timezone: string;
  coordinates: { lat: number; lon: number };
}

export const trendingSeeds: TrendingSeed[] = [
  {
    name: 'Tokyo',
    country: 'Japan',
    caption: 'Neon streets after rain',
    article: 'Tokyo',
    photoQuery: 'Tokyo skyline night',
    timezone: 'Asia/Tokyo',
    coordinates: { lat: 35.6762, lon: 139.6503 },
  },
  {
    name: 'Santorini',
    country: 'Greece',
    caption: 'White walls, Aegean blue',
    article: 'Santorini',
    photoQuery: 'Oia Santorini',
    timezone: 'Europe/Athens',
    coordinates: { lat: 36.3932, lon: 25.4615 },
  },
  {
    name: 'Reykjavik',
    country: 'Iceland',
    caption: 'Quiet colour beneath northern skies',
    article: 'Reykjavík',
    photoQuery: 'Reykjavik Iceland',
    timezone: 'Atlantic/Reykjavik',
    coordinates: { lat: 64.1466, lon: -21.9426 },
  },
  {
    name: 'Marrakech',
    country: 'Morocco',
    caption: 'Terracotta walls and market light',
    article: 'Marrakesh',
    photoQuery: 'Marrakech medina',
    timezone: 'Africa/Casablanca',
    coordinates: { lat: 31.6295, lon: -7.9811 },
  },
  {
    name: 'Machu Picchu',
    country: 'Peru',
    caption: 'Clouds over the ancient citadel',
    article: 'Machu Picchu',
    photoQuery: 'Machu Picchu',
    timezone: 'America/Lima',
    coordinates: { lat: -13.1631, lon: -72.545 },
  },
  {
    name: 'Rome',
    country: 'Italy',
    caption: 'Ancient stone in the evening light',
    article: 'Rome',
    photoQuery: 'Rome Colosseum',
    timezone: 'Europe/Rome',
    coordinates: { lat: 41.9028, lon: 12.4964 },
  },
  {
    name: 'Cape Town',
    country: 'South Africa',
    caption: 'Ocean air beneath Table Mountain',
    article: 'Cape Town',
    photoQuery: 'Table Mountain Cape Town',
    timezone: 'Africa/Johannesburg',
    coordinates: { lat: -33.9249, lon: 18.4241 },
  },
  {
    name: 'Paris',
    country: 'France',
    caption: 'Golden hour along the Seine',
    article: 'Paris',
    photoQuery: 'Paris Eiffel Tower',
    timezone: 'Europe/Paris',
    coordinates: { lat: 48.8566, lon: 2.3522 },
  },
  {
    name: 'Istanbul',
    country: 'Turkey',
    caption: 'Two continents, one golden horizon',
    article: 'Istanbul',
    photoQuery: 'Istanbul Hagia Sophia',
    timezone: 'Europe/Istanbul',
    coordinates: { lat: 41.0082, lon: 28.9784 },
  },
  {
    name: 'Serengeti',
    country: 'Tanzania',
    caption: 'Endless plains beneath a wide sky',
    article: 'Serengeti National Park',
    photoQuery: 'Serengeti wildlife',
    timezone: 'Africa/Dar_es_Salaam',
    coordinates: { lat: -2.3333, lon: 34.8333 },
  },
  {
    name: 'Kyoto',
    country: 'Japan',
    caption: 'Temple gardens and quiet lanes',
    article: 'Kyoto',
    photoQuery: 'Kyoto temple',
    timezone: 'Asia/Tokyo',
    coordinates: { lat: 35.0116, lon: 135.7681 },
  },
  {
    name: 'Dubai',
    country: 'United Arab Emirates',
    caption: 'A skyline rising from the desert',
    article: 'Dubai',
    photoQuery: 'Dubai skyline',
    timezone: 'Asia/Dubai',
    coordinates: { lat: 25.2048, lon: 55.2708 },
  },
];
