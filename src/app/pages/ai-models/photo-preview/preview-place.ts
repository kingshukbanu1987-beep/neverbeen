/**
 * The location plate of the cinematic Preview.
 *
 * A model's `location` arrives as one string — "Shiraz, Iran" — and the plate splits it into the
 * city and the country it shows, adding the country's two-letter code as the departure-board
 * detail beside the country name. A country the directory does not know simply loses its chip;
 * nothing else about the plate changes.
 */

export interface PreviewPlace {
  /** The city the model calls home, e.g. "Shiraz". */
  city: string;
  /** The country the city sits in, e.g. "Iran". Empty when the location names only a city. */
  country: string;
  /** Two-letter country code, e.g. "IR". Empty when the country is unknown or unstated. */
  code: string;
  /** The whole place on one line — "Shiraz, Iran" — read out to assistive tech. */
  label: string;
}

/**
 * Country name (lower-case) to its ISO 3166-1 alpha-2 code, for every country the directory's
 * models currently call home. Extend it as new countries join: leaving one out only costs the
 * chip, never the city or the country.
 */
const COUNTRY_CODES: Readonly<Record<string, string>> = {
  argentina: 'AR',
  azerbaijan: 'AZ',
  'bosnia and herzegovina': 'BA',
  colombia: 'CO',
  egypt: 'EG',
  georgia: 'GE',
  india: 'IN',
  iran: 'IR',
  iraq: 'IQ',
  ireland: 'IE',
  jordan: 'JO',
  kuwait: 'KW',
  lebanon: 'LB',
  malaysia: 'MY',
  morocco: 'MA',
  oman: 'OM',
  qatar: 'QA',
  'saudi arabia': 'SA',
  syria: 'SY',
  turkey: 'TR',
  türkiye: 'TR',
  'united arab emirates': 'AE',
  'united kingdom': 'GB',
  uruguay: 'UY',
};

/**
 * Splits a profile location into the plate's city, country and country code.
 *
 * The city is the first comma-separated part and the country the last, so a three-part location
 * still reads correctly; anything after a "·" (the biography's " · remote and on location" tail)
 * is dropped. Returns null when the location is empty, which hides the plate entirely.
 */
export function parsePreviewPlace(location: string): PreviewPlace | null {
  const parts = location
    .split(',')
    .map((part) => part.split('·')[0].trim())
    .filter(Boolean);
  if (!parts.length) return null;

  const city = parts[0];
  const country = parts.length > 1 ? parts[parts.length - 1] : '';
  return {
    city,
    country,
    code: COUNTRY_CODES[country.toLocaleLowerCase()] ?? '',
    label: [city, country].filter(Boolean).join(', '),
  };
}
