import { ChatMessage, Circle } from './community';

/** Logged-in member may admin at most this many Circles. */
export const MAX_ADMIN_CIRCLES = 500;
/** Logged-in member may belong to at most this many Circles where they are not an admin. */
export const MAX_MEMBER_CIRCLES = 1000;

export const CIRCLES_SEED_VERSION = 'travel-circles-47-v2';
export const CIRCLES_SEED_VERSION_KEY = 'neverbeen_circles_seed';

const PHOTOS = [
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1482192505345-5655af888cc4?auto=format&fit=crop&w=900&q=70',
];

const ICONS = ['🏔️', '🌊', '📸', '🚂', '🏕️', '✈️', '🌅', '🗺️', '🏝️', '🎒', '☕', '🌋'];
const COLORS = ['#0284c7', '#059669', '#d97706', '#7c3aed', '#e11d48', '#0f766e', '#2563eb', '#b45309'];

/** Real companion ids used as fellow travelers inside dummy Circles. */
const POOL = [33, 12, 42, 88, 55, 101, 102, 103, 104, 105, 106, 107];

interface CircleDraft {
  name: string;
  description: string;
}

const ADMIN_CIRCLES: CircleDraft[] = [
  { name: 'Alpine Dawn Walkers', description: 'Sunrise ridge walks and hut-to-hut routes across the Alps.' },
  { name: 'Sahara Night Skies', description: 'Desert camps, dune sunsets and stargazing beyond the last road.' },
  { name: 'Kyoto Temple Trails', description: 'Quiet shrine paths, tea houses and maple seasons in Kansai.' },
  { name: 'Amalfi Cliff Hoppers', description: 'Coastal buses, lemon groves and cliffside swims on the Amalfi.' },
  { name: 'Patagonia Wind Riders', description: 'Torres lookouts, glacier walks and wind-cut steppe roads.' },
  { name: 'Bali Rice Terrace Club', description: 'Subak walks, dawn offerings and slow mornings in Ubud.' },
  { name: 'Iceland Ring Road', description: 'Waterfalls, black-sand beaches and hot springs around the island.' },
  { name: 'Moroccan Medina Wanderers', description: 'Souk alleys, riad courtyards and Atlas day trips.' },
  { name: 'Norwegian Fjord Sailors', description: 'Quiet ferry decks, cabin stays and midnight-sun harbours.' },
  { name: 'Himalayan Base Camp', description: 'Tea-house treks, prayer flags and high-pass acclimatisation.' },
  { name: 'Lisbon Tram Hoppers', description: 'Miradouros, pastel de nata and tram 28 detours.' },
  { name: 'Santorini Sunset Circle', description: 'Caldera walks, whitewashed lanes and late swims.' },
  { name: 'Amazon Canopy Watch', description: 'River lodges, dawn birding and rainforest night walks.' },
  { name: 'Scottish Highland Rovers', description: 'Loch drives, bothy nights and island ferries.' },
  { name: 'Tokyo Night Markets', description: 'Neon alleys, late ramen and dawn temple visits.' },
  { name: 'Cinque Terre Hikers', description: 'Coastal sentieri, harbour swims and pesto kitchens.' },
  { name: 'New Zealand Glaciers', description: 'Alpine tracks, fjord cruises and glacier viewpoints.' },
  { name: 'Petra Rose City', description: 'Siq walks, candlelit trails and Wadi Rum camps.' },
  { name: 'Venice Gondola Stories', description: 'Quiet canals, cicchetti bars and island day hops.' },
];

const MEMBER_CIRCLES: CircleDraft[] = [
  { name: 'Cape Town Coastliners', description: 'Peninsula drives, tidal pools and Table Mountain sunrises.' },
  { name: 'Banff Lake Seekers', description: 'Turquoise lakes, canoe mornings and lodge fireplaces.' },
  { name: 'Vietnam Street Food', description: 'Night markets, train seats and bowl-by-bowl city hops.' },
  { name: 'Machu Picchu Pilgrims', description: 'Inca trail pacing, cloud forest and Sacred Valley stays.' },
  { name: 'Dubrovnik Old Walls', description: 'City-wall walks, island ferries and limestone lanes.' },
  { name: 'Kerala Backwaters', description: 'Houseboats, spice gardens and monsoon verandahs.' },
  { name: 'Paris Hidden Courtyards', description: 'Passage couverts, dawn markets and quiet museum hours.' },
  { name: 'Atacama Star Camp', description: 'High desert lagoons, salt flats and night-sky camps.' },
  { name: 'Swiss Chocolate Trains', description: 'Scenic rail cars, alpine villages and slow mountain days.' },
  { name: 'Greek Island Hoppers', description: 'Ferry decks, white chapels and late tavern dinners.' },
  { name: 'Canadian Rockies', description: 'Icefields parkway stops, wildlife pullouts and cabin nights.' },
  { name: 'Jordan Desert Camps', description: 'Wadi Rum jeeps, Bedouin tea and canyon hikes.' },
  { name: 'Bali Surf Dawn', description: 'Early lineups, warungs and temple-day rests.' },
  { name: 'Scottish Isle Ferries', description: 'Hebridean crossings, peat paths and harbour pubs.' },
  { name: 'Tuscany Vine Roads', description: 'Cypress lanes, hill towns and long lunch tables.' },
  { name: 'Nepal Tea House Trek', description: 'Rhododendron forests, suspension bridges and dal bhat.' },
  { name: 'Iceland Hot Springs', description: 'Secret pools, lava fields and wool-sweater weather.' },
  { name: 'Morocco Atlas Mules', description: 'High-valley walks, kasbah stays and mint tea stops.' },
  { name: 'Japan Onsen Towns', description: 'Ryokan evenings, cedar baths and snowy station towns.' },
  { name: 'Peru Rainbow Mountain', description: 'High-altitude day hikes and Cusco slow mornings.' },
  { name: 'Croatia Island Sail', description: 'Anchor coves, stone towns and shared skipper notes.' },
  { name: 'India Palace Circuits', description: 'Forts, stepwells and sunrise courtyards across Rajasthan.' },
  { name: 'Norway Arctic Lights', description: 'Aurora chases, cabin silence and coastal express stops.' },
  { name: 'Spain Camino Walkers', description: 'Waymarks, albergues and long golden evenings.' },
  { name: 'Thailand Island Hops', description: 'Longtails, night markets and quiet beach mornings.' },
  { name: 'Egypt Nile Slow Boats', description: 'Felucca drifts, temple dawns and river sunsets.' },
  { name: 'Australia Reef Divers', description: 'Reef days, rainforest drives and coastal camps.' },
  { name: 'Alaska Wilderness Camps', description: 'Fjord flights, bear-country trails and cabin stoves.' },
];

/** Spread last-chat times so the Circles page shows Active, hours, days, months, and years. */
function activityAge(index: number): number {
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const ages = [
    2 * minute,
    6 * minute,
    3 * hour,
    14 * hour,
    2 * day,
    9 * day,
    45 * day,
    4 * 30 * day,
    2 * 365 * day,
  ];
  return ages[index % ages.length];
}

function greeting(name: string, fromId: number, circleId: number, ageMs: number): ChatMessage[] {
  const latest = Date.now() - ageMs;
  const earlier = latest - 26 * 60 * 60 * 1000;
  return [
    {
      id: circleId * 10 + 1,
      senderId: fromId,
      receiverId: 0,
      text: `Welcome to ${name}. Drop your next travel dates here and we will sketch a loose plan.`,
      sentAtUtc: new Date(earlier).toISOString(),
    },
    {
      id: circleId * 10 + 2,
      senderId: fromId,
      receiverId: 0,
      text: 'I pinned a few photos from the last trip — steal whatever is useful for the itinerary.',
      sentAtUtc: new Date(latest).toISOString(),
    },
  ];
}

/**
 * 47 travel Circles for the signed-in member: admin of the first 19, ordinary
 * member of the remaining 28.
 */
export function buildTravelCircles(me = 1): Circle[] {
  const admin = ADMIN_CIRCLES.map((draft, i) => {
    const id = 5001 + i;
    const fellows = [POOL[i % POOL.length], POOL[(i + 3) % POOL.length], POOL[(i + 7) % POOL.length]];
    return {
      id,
      name: draft.name,
      description: draft.description,
      icon: ICONS[i % ICONS.length],
      color: COLORS[i % COLORS.length],
      photoUrl: PHOTOS[i % PHOTOS.length],
      ownerId: me,
      adminIds: [me],
      memberIds: Array.from(new Set([me, ...fellows])),
      createdAtUtc: new Date(Date.UTC(2026, 5, 1 + i, 9, 0, 0)).toISOString(),
      messages: greeting(draft.name, fellows[0], id, activityAge(i)),
    } satisfies Circle;
  });

  const member = MEMBER_CIRCLES.map((draft, i) => {
    const id = 5101 + i;
    const host = POOL[i % POOL.length];
    const extra = POOL[(i + 4) % POOL.length];
    return {
      id,
      name: draft.name,
      description: draft.description,
      icon: ICONS[(i + 3) % ICONS.length],
      color: COLORS[(i + 2) % COLORS.length],
      photoUrl: PHOTOS[(i + 5) % PHOTOS.length],
      ownerId: host,
      adminIds: [host],
      memberIds: Array.from(new Set([me, host, extra])),
      createdAtUtc: new Date(Date.UTC(2026, 6, 1 + (i % 28), 11, 15, 0)).toISOString(),
      messages: greeting(draft.name, host, id, activityAge(i + 3)),
    } satisfies Circle;
  });

  return [...admin, ...member];
}

export function circleAdminIds(circle: Circle, fallbackOwner = 1): number[] {
  if (circle.adminIds && circle.adminIds.length > 0) return circle.adminIds;
  return [circle.ownerId ?? fallbackOwner];
}

export function isCircleAdmin(circle: Circle, userId: number): boolean {
  return circleAdminIds(circle).includes(userId);
}

export function isCircleParticipant(circle: Circle, userId: number): boolean {
  return isCircleAdmin(circle, userId) || (circle.memberIds ?? []).includes(userId);
}

export function normalizeCircle(circle: Circle, fallbackOwner = 1): Circle {
  const adminIds = circleAdminIds(circle, fallbackOwner);
  const ownerId = circle.ownerId ?? adminIds[0] ?? fallbackOwner;
  const memberIds = Array.from(new Set([...(circle.memberIds ?? []), ...adminIds, ownerId]));
  return {
    ...circle,
    ownerId,
    adminIds: Array.from(new Set([ownerId, ...adminIds])),
    memberIds,
    messages: circle.messages ?? [],
  };
}
