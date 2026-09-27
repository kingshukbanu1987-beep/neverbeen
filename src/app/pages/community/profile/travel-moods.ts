import { EXTRA_TRAVEL_MOOD_GROUPS } from './travel-moods-extra';

/** Keep stored mood values as their display text for compatibility with existing Journey posts. */
const ORIGINAL_TRAVEL_MOOD_GROUPS = [
  {
    label: 'Everyday wanderlust',
    moods: [
      '✈️ Traveling',
      '🏔️ Hiking',
      '🌿 Serene',
      '📸 Photographing',
      '☕ Exploring Cafes',
      '🌊 Coastal Chill',
    ],
  },
  {
    label: 'Chasing adventure',
    moods: [
      '🧭 Beautifully Lost',
      '🚂 Window Seat Dreaming',
      '🚐 Road Trip Mode',
      '🎒 Off the Beaten Path',
      '🏕️ Under the Stars',
      '🤿 Beneath the Blue',
    ],
  },
  {
    label: 'Little local discoveries',
    moods: [
      '🍜 Street Food Quest',
      '🏛️ Time Traveling',
      '🎨 Art & Alleyways',
      '🛍️ Market Wandering',
      '🎶 Festival Feeling',
      '📚 Bookshop Hopping',
    ],
  },
  {
    label: 'Nature & wonder',
    moods: [
      '🌅 Chasing Sunsets',
      '🌌 Aurora Hunting',
      '🐾 Wildlife Wonder',
      '🌸 Blossom Chasing',
      '🏜️ Desert Dreaming',
      '❄️ Snow Globe Days',
    ],
  },
  {
    label: 'Your kind of escape',
    moods: [
      '🧘 Soul Reset',
      '🏝️ Island Time',
      '🌧️ Rainy Day Reverie',
      '💫 Spontaneous Escape',
      '🧳 Solo & Thriving',
      '👨‍👩‍👧‍👦 Making Family Memories',
      '🥂 Celebrating Somewhere New',
      '💌 Postcard Kind of Day',
    ],
  },
] as const;

export const TRAVEL_MOOD_GROUPS = [...ORIGINAL_TRAVEL_MOOD_GROUPS, ...EXTRA_TRAVEL_MOOD_GROUPS];

export interface MoodMatch {
  kind: 'type' | 'mood';
  label: string;
  mood?: string;
  type: string;
}

export function searchTravelMoods(query: string, limit = 24): MoodMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const matches: MoodMatch[] = [];
  for (const group of TRAVEL_MOOD_GROUPS) {
    if (group.label.toLowerCase().includes(q)) {
      matches.push({ kind: 'type', label: group.label, type: group.label });
    }
    for (const mood of group.moods) {
      if (mood.toLowerCase().includes(q) || group.label.toLowerCase().includes(q)) {
        matches.push({ kind: 'mood', label: mood, mood, type: group.label });
      }
    }
    if (matches.length >= limit) break;
  }
  return matches.slice(0, limit);
}
