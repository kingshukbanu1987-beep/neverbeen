/**
 * Types for the long-form destination guide pages.
 *
 * Each destination is plain data, so one reusable component can render every
 * guide (`src/app/pages/destination`) instead of one component per place.
 *
 * Live values (weather, local time, currency rates, Wikipedia extract) are not
 * stored here — the page fetches those in the browser and falls back to the
 * practical details recorded below when a source is unreachable.
 */

export interface GuideEntry {
  name: string;
  description: string;
}

export interface GuideSeason {
  label: string;
  note: string;
}

export interface GuideFact {
  label: string;
  value: string;
}

export interface GuideCurrency {
  code: string;
  name: string;
  symbol: string;
  /** Rough fallback used only when live rates cannot be loaded. */
  approximatePerUsd: number;
}

export interface DestinationGuide {
  slug: string;
  name: string;
  country: string;
  /** Where in the country (or region) the guide is anchored. */
  region: string;
  tagline: string;
  /** "At a glance" one-liner shown next to the local-time card. */
  bestTime: string;
  /** Overview paragraphs. */
  overview: string[];
  /** Where to eat: places, markets and dishes worth planning around. */
  eat: GuideEntry[];
  /** Sightseeing and top attractions. */
  attractions: GuideEntry[];
  history: string[];
  geography: string[];
  /** Culture, people and everyday customs. */
  culture: string[];
  seasons: GuideSeason[];
  gettingAround: string;
  /** Practical notes: language, plugs, tipping, visas and so on. */
  practical: GuideFact[];
  /** "Did you know" facts. */
  facts: string[];
  currency: GuideCurrency;
  /** IANA time zone, used to compute and display the local time. */
  timezone: string;
  coordinates: { lat: number; lon: number };
  /** Wikipedia article used for the live summary extract. */
  wikipedia: string;
}

import { Destination, destinations } from './site-content';
import { europeGuides } from './guides/europe';
import { africaMiddleEastGuides } from './guides/africa-middle-east';
import { asiaPacificAmericasGuides } from './guides/asia-pacific-americas';

/** Every long-form guide, keyed by URL slug. */
export const destinationGuides: Record<string, DestinationGuide> = Object.fromEntries(
  [...europeGuides, ...africaMiddleEastGuides, ...asiaPacificAmericasGuides].map((guide) => [
    guide.slug,
    guide,
  ]),
);

/** Everything one destination page needs, so a single component can render any of them. */
export interface DestinationPage {
  guide: DestinationGuide;
  /** Card data (name, country, caption and the curated photographs) from site content. */
  destination: Destination;
  /** Curated travel photographs for this destination. */
  photos: string[];
  /** Other destinations, used for the "keep exploring" strip. */
  related: Destination[];
}

export function hasGuide(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(destinationGuides, slug);
}

export function destinationPage(slug: string): DestinationPage | null {
  const guide = destinationGuides[slug];
  if (!guide) {
    return null;
  }

  const destination = destinations.find((place) => place.slug === slug);
  if (!destination) {
    return null;
  }

  const photos = [destination.image, ...destination.images].filter(
    (photo, index, all) => all.indexOf(photo) === index,
  );

  // Rotate through the other destinations so each guide suggests a different set.
  const start = destinations.indexOf(destination);
  const related = Array.from({ length: Math.min(4, destinations.length - 1) }, (_, offset) => {
    return destinations[(start + offset + 1) % destinations.length];
  });

  return { guide, destination, photos, related };
}
