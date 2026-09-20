import { Injectable } from '@angular/core';

/**
 * Live, third-party data for a destination page.
 *
 * Everything here is fetched from the visitor's browser at runtime, from
 * sources that need no API key and allow cross-origin requests:
 *   - current weather and forecast: Open-Meteo (open-meteo.com)
 *   - exchange rates: Frankfurter, built on European Central Bank reference rates
 *   - background reading: Wikipedia REST API
 *
 * Each call fails softly: if a source is unreachable the page simply hides or
 * falls back for that card, so a guide never breaks because of a network issue.
 */

export interface WeatherNow {
  temperature: number;
  apparent: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  cloudCover: number;
  pressure: number;
  isDay: boolean;
  code: number;
  description: string;
  /** IANA zone reported by the weather service for these coordinates. */
  timezone: string;
  utcOffsetSeconds: number;
  sunrise: string | null;
  sunset: string | null;
  observedAt: string;
  forecast: WeatherDay[];
}

export interface WeatherDay {
  date: string;
  min: number;
  max: number;
  code: number;
  description: string;
  precipitationChance: number;
}

export interface CurrencyNow {
  /** Exchange rate for one US dollar in the destination currency. */
  perUsd: number;
  /** True when the figure comes from live reference rates rather than an estimate. */
  live: boolean;
  /** Date string reported by the rate provider. */
  asOf: string;
  /** A handful of useful cross rates, all per one unit of the destination currency. */
  crossRates: { code: string; rate: number }[];
}

export interface WikipediaSummary {
  extract: string;
  url: string;
}

/** WMO weather interpretation codes, as used by Open-Meteo. */
const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snowfall',
  73: 'Moderate snowfall',
  75: 'Heavy snowfall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

export function describeWeather(code: number): string {
  return WEATHER_CODES[code] ?? 'Changeable';
}

/** Simple emoji stand-in for the weather code, so no icon library is needed. */
export function weatherGlyph(code: number, isDay: boolean): string {
  if (code === 0) {
    return isDay ? '☀️' : '🌙';
  }
  if (code <= 2) {
    return isDay ? '🌤️' : '🌙';
  }
  if (code === 3) {
    return '☁️';
  }
  if (code === 45 || code === 48) {
    return '🌫️';
  }
  if (code >= 51 && code <= 57) {
    return '🌦️';
  }
  if (code >= 61 && code <= 67) {
    return '🌧️';
  }
  if (code >= 71 && code <= 77) {
    return '🌨️';
  }
  if (code >= 80 && code <= 82) {
    return '🌧️';
  }
  if (code >= 85 && code <= 86) {
    return '🌨️';
  }
  return '⛈️';
}

const REQUEST_TIMEOUT_MS = 9000;

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class DestinationLive {
  async weather(lat: number, lon: number): Promise<WeatherNow | null> {
    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,' +
      'weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset' +
      '&timezone=auto&forecast_days=5';

    const data = await getJson<{
      current?: Record<string, number>;
      daily?: Record<string, (number | string)[]>;
      timezone?: string;
      utc_offset_seconds?: number;
    }>(url);

    const current = data?.current;
    if (!current || typeof current['temperature_2m'] !== 'number') {
      return null;
    }

    const daily = data?.daily ?? {};
    const days = (daily['time'] as string[] | undefined) ?? [];
    const forecast: WeatherDay[] = days.slice(1, 5).map((date, index) => {
      const position = index + 1;
      const code = Number(daily['weather_code']?.[position] ?? 0);
      return {
        date,
        min: Number(daily['temperature_2m_min']?.[position] ?? 0),
        max: Number(daily['temperature_2m_max']?.[position] ?? 0),
        code,
        description: describeWeather(code),
        precipitationChance: Number(daily['precipitation_probability_max']?.[position] ?? 0),
      };
    });

    const code = Number(current['weather_code']);
    return {
      temperature: Number(current['temperature_2m']),
      apparent: Number(current['apparent_temperature'] ?? current['temperature_2m']),
      humidity: Number(current['relative_humidity_2m'] ?? 0),
      windSpeed: Number(current['wind_speed_10m'] ?? 0),
      windDirection: Number(current['wind_direction_10m'] ?? 0),
      precipitation: Number(current['precipitation'] ?? 0),
      cloudCover: Number(current['cloud_cover'] ?? 0),
      pressure: Number(current['pressure_msl'] ?? 0),
      isDay: Number(current['is_day'] ?? 1) === 1,
      code,
      description: describeWeather(code),
      timezone: data?.timezone ?? '',
      utcOffsetSeconds: Number(data?.utc_offset_seconds ?? 0),
      sunrise: (daily['sunrise']?.[0] as string) ?? null,
      sunset: (daily['sunset']?.[0] as string) ?? null,
      observedAt: (data?.current?.['time'] as unknown as string) ?? new Date().toISOString(),
      forecast,
    };
  }

  /**
   * Live rate for the destination currency, expressed as units per US dollar.
   * `approximatePerUsd` is only used when reference rates do not cover the currency
   * or the provider cannot be reached.
   */
  async currency(code: string, approximatePerUsd: number): Promise<CurrencyNow> {
    const crosses = ['USD', 'EUR', 'GBP', 'JPY'].filter((item) => item !== code);
    const data = await getJson<{ date?: string; rates?: Record<string, number> }>(
      `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${[code, ...crosses].join(',')}`,
    );

    const rates = data?.rates ?? {};
    const perUsd = code === 'USD' ? 1 : rates[code];
    const live = typeof perUsd === 'number' && perUsd > 0;
    const usdPerUnit = live ? 1 / (perUsd as number) : 1 / approximatePerUsd;

    const crossRates = ['USD', 'EUR', 'GBP', 'INR']
      .filter((item) => item !== code)
      .map((item) => {
        const perUsdTarget = item === 'USD' ? 1 : rates[item];
        const rate =
          typeof perUsdTarget === 'number' && perUsdTarget > 0 ? perUsdTarget * usdPerUnit : null;
        return rate ? { code: item, rate } : null;
      })
      .filter((entry): entry is { code: string; rate: number } => entry !== null);

    return {
      perUsd: live ? (perUsd as number) : approximatePerUsd,
      live,
      asOf: data?.date ?? '',
      crossRates,
    };
  }

  async summary(article: string): Promise<WikipediaSummary | null> {
    const data = await getJson<{
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    }>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(article)}`);

    if (!data?.extract) {
      return null;
    }

    return {
      extract: data.extract,
      url:
        data.content_urls?.desktop?.page ??
        `https://en.wikipedia.org/wiki/${encodeURIComponent(article)}`,
    };
  }
}
