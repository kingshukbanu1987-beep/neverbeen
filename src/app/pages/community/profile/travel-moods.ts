/** Keep stored mood values as their display text for compatibility with existing Journey posts. */
export const TRAVEL_MOOD_GROUPS = [
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
