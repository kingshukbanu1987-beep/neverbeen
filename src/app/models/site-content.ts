import { slugify } from './slug';

export interface Destination {
  /** URL segment for the destination guide page, e.g. "machu-picchu". */
  slug: string;
  name: string;
  country: string;
  caption: string;
  image: string;
  images: string[];
}

export interface GalleryItem {
  title: string;
  location: string;
  image: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  cta: string;
  cadence: string;
  description: string;
  featured: boolean;
  features: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface HowItWorksStep {
  number: string;
  title: string;
  description: string;
}

const destinationSeed: Omit<Destination, 'images' | 'slug'>[] = [
  {
    name: 'Paris',
    country: 'France',
    caption: 'Golden hour along the Seine',
    image:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Antarctica',
    country: 'Antarctica',
    caption: 'Penguins on the edge of the world',
    image:
      'https://images.unsplash.com/photo-1517783999520-f068d7431a60?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Switzerland',
    country: 'Interlaken, Switzerland',
    caption: 'Lake Brienz beneath the Alps',
    image:
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'New Zealand',
    country: 'New Zealand',
    caption: 'Southern Alps beyond the lake',
    image:
      'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Norway',
    country: 'Norway',
    caption: 'Fjords beneath the northern light',
    image:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Santorini',
    country: 'Greece',
    caption: 'White walls, Aegean blue',
    image:
      'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Rome',
    country: 'Italy',
    caption: 'Ancient stone in the evening light',
    image:
      'https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'London',
    country: 'United Kingdom',
    caption: 'Rain over the Thames',
    image:
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Dubai',
    country: 'United Arab Emirates',
    caption: 'A skyline rising from the desert',
    image:
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Reykjavik',
    country: 'Iceland',
    caption: 'Quiet color beneath northern skies',
    image:
      'https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Marrakech',
    country: 'Morocco',
    caption: 'Terracotta walls and market light',
    image:
      'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Cape Town',
    country: 'South Africa',
    caption: 'Ocean air beneath Table Mountain',
    image:
      'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Tokyo',
    country: 'Japan',
    caption: 'Neon streets after rain',
    image:
      'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Seoul',
    country: 'South Korea',
    caption: 'Old roofs beneath a modern skyline',
    image:
      'https://images.unsplash.com/photo-1546874177-9e664107314e?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Egypt',
    country: 'Egypt',
    caption: 'Ancient wonders beneath the desert sun',
    image:
      'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Machu Picchu',
    country: 'Peru',
    caption: 'Clouds over the ancient citadel',
    image:
      'https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Serengeti',
    country: 'Tanzania',
    caption: 'Endless plains beneath a wide sky',
    image:
      'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Istanbul',
    country: 'Turkey',
    caption: 'Two continents, one golden horizon',
    image:
      'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Netherlands',
    country: 'Netherlands',
    caption: 'Canals and tulip fields in soft light',
    image:
      'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Austria',
    country: 'Austria',
    caption: 'Alpine lakes beneath snow-capped peaks',
    image:
      'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Canada',
    country: 'Canada',
    caption: 'Turquoise lakes and mountain wilderness',
    image:
      'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'United States',
    country: 'United States of America',
    caption: 'City lights and endless horizons',
    image:
      'https://1.bp.blogspot.com/-klHXHFbBkcg/Vh_oH8aFeyI/AAAAAAAADkI/WvdVpR4LWTc/s1600/CORT-NYC-StudyUSA07.jpg?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Maldives',
    country: 'Maldives',
    caption: 'Overwater villas above turquoise lagoons',
    image:
      'https://www.thetravelmagazine.net/wp-content/uploads/Bodu.jpg?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Thailand',
    country: 'Thailand',
    caption: 'Golden temples and tropical light',
    image:
      'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Malaysia',
    country: 'Malaysia',
    caption: 'Twin towers above vibrant streets',
    image:
      'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Singapore',
    country: 'Singapore',
    caption: 'Future city by the bay',
    image:
      'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Indonesia',
    country: 'Indonesia',
    caption: 'Temple mist among rice terraces',
    image:
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Australia',
    country: 'Australia',
    caption: 'Harbour sails beneath summer sun',
    image:
      'https://images.unsplash.com/photo-1523428096881-5bd79d043006?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Denmark',
    country: 'Denmark',
    caption: 'Harbour colours and Nordic calm',
    image:
      'https://media.bookmundi.com/travel-guides/great-denmark-itineraries-how-many-days-to-spend/banner-image.jpg?format=auto&quality=90&width=1920?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Finland',
    country: 'Finland',
    caption: 'Northern lights over silent lakes',
    image:
      'https://images.unsplash.com/photo-1520769945061-0a448c463865?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Japan',
    country: 'Japan',
    caption: 'Mount Fuji in morning mist',
    image:
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Korea',
    country: 'South Korea',
    caption: 'Palaces beneath modern skylines',
    image:
      'https://www.realholidays.co.uk/wp-content/uploads/2025/12/AdobeStock_151235300-scaled.jpeg?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Brazil',
    country: 'Brazil',
    caption: 'Mountain, ocean and city below',
    image:
      'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1400&q=80',
  },
];

const destinationRotationImages: Record<string, string[]> = {
  Paris: [
    'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1400&q=85',
  ],
  Antarctica: [
    'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?auto=format&fit=crop&w=1400&q=85',
  ],
  Switzerland: [
    'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=85',
  ],
  'New Zealand': [
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1517783999520-f068d7431a60?auto=format&fit=crop&w=1400&q=85',
  ],
  Norway: [
    'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=1400&q=85',
  ],
  Santorini: [
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1514282401047-d79a71a5906e?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&w=1400&q=85',
  ],
  Rome: [
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1400&q=85',
  ],
  London: [
    'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1485875437342-9b39470b3d95?auto=format&fit=crop&w=1400&q=85',
  ],
  Dubai: [
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&w=1400&q=85',
  ],
  Reykjavik: [
    'https://images.unsplash.com/photo-1520637736862-4d197d17c90a?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1517783999520-f068d7431a60?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=85',
  ],
  Marrakech: [
    'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&w=1400&q=85',
  ],
  'Cape Town': [
    'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1400&q=85',
  ],
  Tokyo: [
    'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=1400&q=85',
  ],
  Seoul: [
    'https://images.unsplash.com/photo-1538485399081-7c897a5d0c3b?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=85',
  ],
  Egypt: [
    'https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&w=1400&q=85',
  ],
  'Machu Picchu': [
    'https://images.unsplash.com/photo-1521336575822-6da63fb45455?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1400&q=85',
  ],
  Serengeti: [
    'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1535338454770-8be927b5a00b?auto=format&fit=crop&w=1400&q=85',
  ],
  Istanbul: [
    'https://images.unsplash.com/photo-1527838832700-5059252407fa?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1400&q=85',
  ],
  Netherlands: [
    'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1400&q=85',
  ],
  Austria: [
    'https://images.unsplash.com/photo-1491557345352-11d52307057d?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=85',
  ],
  Canada: [
    'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=1400&q=85',
  ],
  'United States': [
    'https://images.unsplash.com/photo-1485738422979-b5b79d8491e8?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1400&q=85',
  ],
  Maldives: [
    'https://images.unsplash.com/photo-1514282401047-d79a71a5906e?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1400&q=85',
  ],
  Thailand: [
    'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?auto=format&fit=crop&w=1400&q=85',
  ],
  Malaysia: [
    'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=85',
  ],
  Singapore: [
    'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1538485399081-7c897a5d0c3b?auto=format&fit=crop&w=1400&q=85',
  ],
  Indonesia: [
    'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=1400&q=85',
  ],
  Australia: [
    'https://images.unsplash.com/photo-1523428096881-5bd79d043006?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=85',
  ],
  Denmark: [
    'https://images.unsplash.com/photo-1513622790541-b874313bd645?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1491557345352-11d52307057d?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1400&q=85',
  ],
  Finland: [
    'https://images.unsplash.com/photo-1520769945061-0a448c463865?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1400&q=85',
  ],
  Japan: [
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=1400&q=85',
  ],
  Korea: [
    'https://images.unsplash.com/photo-1538485399081-7c897a5d0c3b?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1546874177-9e664107314e?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1400&q=85',
  ],
  Brazil: [
    'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&w=1400&q=85',
  ],
};

export const destinations: Destination[] = destinationSeed.map((destination) => ({
  ...destination,
  slug: slugify(destination.name),
  images: [destination.image, ...(destinationRotationImages[destination.name] ?? [])].slice(0, 4),
}));

const contactDestinationOptions: string[] = [
  ...destinations.map((destination) => destination.name),
  'Amsterdam',
  'Athens',
  'Barcelona',
  'Berlin',
  'Lisbon',
  'Madrid',
  'Vienna',
  'Prague',
  'Budapest',
  'Copenhagen',
  'Dublin',
  'Edinburgh',
  'Florence',
  'Venice',
  'Milan',
  'Naples',
  'Nice',
  'Brussels',
  'Zurich',
  'Geneva',
  'Lucerne',
  'Zermatt',
  'Interlaken',
  'Salzburg',
  'Munich',
  'Oslo',
  'Stockholm',
  'Helsinki',
  'Tallinn',
  'Riga',
  'Vilnius',
  'Warsaw',
  'Krakow',
  'Bucharest',
  'Sofia',
  'Belgrade',
  'Dubrovnik',
  'Split',
  'Ljubljana',
  'Sarajevo',
  'Cairo',
  'Luxor',
  'Casablanca',
  'Tunis',
  'Algiers',
  'Dakar',
  'Accra',
  'Lagos',
  'Kigali',
  'Windhoek',
  'Gaborone',
  'Maputo',
  'Mauritius',
  'Seychelles',
  'Doha',
  'Abu Dhabi',
  'Muscat',
  'Riyadh',
  'Jeddah',
  'Jerusalem',
  'Amman',
  'Beirut',
  'Tehran',
  'Baku',
  'Tbilisi',
  'Yerevan',
  'Delhi',
  'Mumbai',
  'Jaipur',
  'Goa',
  'Bengaluru',
  'Kathmandu',
  'Colombo',
  'Bangkok',
  'Phuket',
  'Singapore',
  'Kuala Lumpur',
  'Hanoi',
  'Ho Chi Minh City',
  'Hong Kong',
  'Shanghai',
  'Beijing',
  'Taipei',
  'Osaka',
  'Nara',
  'Busan',
  'Jeju',
  'Manila',
  'Palawan',
  'Perth',
  'Melbourne',
  'Brisbane',
  'Auckland',
  'Queenstown',
  'Honolulu',
  'Vancouver',
  'Toronto',
  'Montreal',
  'Mexico City',
  'Cancun',
  'Others',
];

/** Every place name offered in the contact form, without duplicates. */
export const contactDestinations = Array.from(new Set(contactDestinationOptions));

export const galleryItems: GalleryItem[] = [
  {
    title: 'Morning in Amalfi',
    location: 'Italy',
    image:
      'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'A terrace in Kyoto',
    location: 'Japan',
    image:
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Sahara after rain',
    location: 'Morocco',
    image:
      'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Fjords at dusk',
    location: 'Norway',
    image:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Lagoon quiet',
    location: 'French Polynesia',
    image:
      'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Desert camp light',
    location: 'Jordan',
    image:
      'https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Aria above the valley',
    location: 'Manali, India',
    image:
      'https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1200&q=85',
  },
  {
    title: 'Mateo in the color',
    location: 'Rio de Janeiro, Brazil',
    image:
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1200&q=85',
  },
  {
    title: 'Two tickets to the coast',
    location: 'Mallorca, Spain',
    image:
      'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=85',
  },
  {
    title: 'The summer table',
    location: 'Crete, Greece',
    image:
      'https://images.unsplash.com/photo-1504150558240-0b4fd8946624?auto=format&fit=crop&w=1200&q=85',
  },
  {
    title: 'Four friends, one island',
    location: 'Bali, Indonesia',
    image:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85',
  },
  {
    title: 'Nia at golden hour',
    location: 'Nairobi, Kenya',
    image:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1200&q=85',
  },
  {
    title: 'A family weekend north',
    location: 'Banff, Canada',
    image:
      'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85',
  },
  {
    title: 'Luca by the blue hour',
    location: 'Lisbon, Portugal',
    image:
      'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=85',
  },
];

export const pricingPlans: PricingPlan[] = [
  {
    name: 'Starter',
    price: '₹499',
    cta: 'Starter',
    cadence: 'one collection',
    description: 'A first trip, finished like a studio portrait.',
    featured: false,
    features: [
      '3 destination looks',
      'Print-ready 4K files',
      'Natural color grading',
      '48-hour delivery',
    ],
  },
  {
    name: 'Economy Class',
    price: '₹999',
    cta: 'Economy Class',
    cadence: 'per trip',
    description: 'A complete album for the place you have never been.',
    featured: true,
    features: [
      '12 destination looks',
      'Portrait & landscape crops',
      'Film & daylight grades',
      'Priority 24-hour delivery',
      'One revision pass',
    ],
  },
  {
    name: 'Business Class',
    price: '₹1999',
    cta: 'Business Class',
    cadence: 'season',
    description: 'Ongoing portraits across a world of destinations.',
    featured: false,
    features: [
      '40 destination looks',
      'Private gallery sharing',
      'Custom wardrobe notes',
      'Dedicated editor',
      'Commercial license',
    ],
  },
  {
    name: 'First Class',
    price: '₹4999',
    cta: 'First Class',
    cadence: 'season',
    description: 'The most complete way to see yourself anywhere in the world.',
    featured: false,
    features: [
      '100 destination looks',
      'Portrait & landscape crops',
      'Priority editorial delivery',
      'Dedicated creative direction',
      'Commercial license',
    ],
  },
];

export const faqItems: FaqItem[] = [
  {
    question: 'Do I need to have visited the destination?',
    answer:
      'No. NeverBeen is built for places you have never stood. Upload a clear portrait, choose a destination, and we compose a photograph that looks like you were there.',
  },
  {
    question: 'What kind of photo should I upload?',
    answer:
      'A well-lit, front-facing portrait with a simple background works best. Avoid heavy filters, sunglasses, and group shots for your first collection.',
  },
  {
    question: 'Will the photographs look like travel photography?',
    answer:
      'Yes. We grade for editorial travel work—soft film color, natural skin, and destination light—not a generic AI collage look.',
  },
  {
    question: 'Can I share or print the images?',
    answer:
      'Personal sharing and printing are included on every plan. Atlas includes a commercial license for campaigns and portfolios.',
  },
  {
    question: 'How long does a collection take?',
    answer:
      'Postcard collections typically arrive within 48 hours. Wanderer and Atlas include faster editorial queues.',
  },
  {
    question: 'How do I submit my photographs?',
    answer:
      'Our team will connect with you using the details you provide, either by email or WhatsApp. You can send your photographs through whichever of those channels is most convenient for you.',
  },
  {
    question: 'How many photographs do I need to send?',
    answer:
      'The number depends on what we need to analyse your face and body measurements accurately. Preferably, send one passport-size photograph and one full-body picture.',
  },
  {
    question: 'Can I choose my outfits?',
    answer:
      'Yes, you can choose your desired outfit. Higher packages enable more customisation for outfits, accessories, and moments in every scene.',
  },
  {
    question: 'Can I have photographs with celebrities?',
    answer: 'No. Creating photographs with celebrities is against our policy.',
  },
  {
    question: 'Do I need to sign any documents?',
    answer:
      'Yes. You may need to sign a document confirming your approval for us to use your photographs for AI content generation.',
  },
  {
    question: 'Can I choose a revealing outfit or romantic moments?',
    answer:
      'This depends on how revealing the outfit is and the sensitivity of the romantic content. We do not support vulgarity, sexuality, or nudity.',
  },
  {
    question: 'Why is ID verification required?',
    answer:
      'We verify the photographs and the real person they belong to in order to help prevent identity misuse.',
  },
  {
    question: 'How will ID verification be done?',
    answer:
      'Our team will connect with you and request verification through a government ID, a video call, or both, to maintain integrity and security.',
  },
  {
    question: 'Do I need to pay the full amount before delivery?',
    answer: 'No. Payment is required only at the time of delivery.',
  },
  {
    question: 'Will I get my money back if I am not satisfied with the delivery?',
    answer:
      'Yes. We offer a 100% refund if you do not like the delivery. You will only be asked to pay when you are happy with the generated content and want to receive it.',
  },
  {
    question: 'Will NeverBeen store, keep, or use my photographs after the deal?',
    answer: 'No. We will delete all of your photographs after the contract ends.',
  },
];

export const howItWorksSteps: HowItWorksStep[] = [
  {
    number: '01',
    title: 'Submit Neverbeen Request',
    description:
      'Complete the request form with your details, destination preferences, and the package you selected.',
  },
  {
    number: '02',
    title: 'Submit Photos and ID for Verification',
    description:
      'Share a clear photo and valid ID so our team can verify your request and prepare your personalized experience.',
  },
  {
    number: '03',
    title: 'Let AI create your vacation',
    description:
      'Our studio model places you in destination light, wardrobe, and atmosphere—then an editor refines the still.',
  },
  {
    number: '04',
    title: 'Download and share',
    description:
      'Receive print-ready photographs for albums, frames, and the trip you always meant to take.',
  },
];

export interface HeroDestination {
  place: string;
  caption: string;
  image: string;
}

export const heroDestinations: HeroDestination[] = [
  {
    place: 'Paris, France',
    caption: 'The Eiffel Tower at golden hour',
    image:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Lake Brienz, Switzerland',
    caption: 'Turquoise water beneath the Alps',
    image:
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Mount Everest, India',
    caption: 'Above the clouds in the Himalayas',
    image:
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Antarctica',
    caption: 'Penguins on the edge of the world',
    image:
      'https://images.unsplash.com/photo-1517783999520-f068d7431a60?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Santorini, Greece',
    caption: 'White walls above the Aegean',
    image:
      'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Tokyo, Japan',
    caption: 'Neon streets after rain',
    image:
      'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Kyoto, Japan',
    caption: 'A quiet terrace beneath maple leaves',
    image:
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'New York, United States',
    caption: 'City lights after dusk',
    image:
      'https://images.unsplash.com/photo-1485875437342-9b39470b3d95?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Bali, Indonesia',
    caption: 'Temple mist among the rice terraces',
    image:
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Amalfi Coast, Italy',
    caption: 'Morning light on the Mediterranean',
    image:
      'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Sahara, Morocco',
    caption: 'Desert light after the rain',
    image:
      'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Fjords, Norway',
    caption: 'Blue dusk between quiet peaks',
    image:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Bora Bora, French Polynesia',
    caption: 'Lagoon water under a wide sky',
    image:
      'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Wadi Rum, Jordan',
    caption: 'A camp beneath the desert stars',
    image:
      'https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'London, United Kingdom',
    caption: 'Evening beside the River Thames',
    image:
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Rome, Italy',
    caption: 'Ancient stone beneath the Roman sun',
    image:
      'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Dubai, United Arab Emirates',
    caption: 'A skyline rising from the desert',
    image:
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Rio de Janeiro, Brazil',
    caption: 'Mountain, ocean, and city below',
    image:
      'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Machu Picchu, Peru',
    caption: 'Ruins above the cloud forest',
    image:
      'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Serengeti, Tanzania',
    caption: 'Open grassland beneath a vast sky',
    image:
      'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Great Barrier Reef, Australia',
    caption: 'A blue world beneath the surface',
    image:
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Reykjavik, Iceland',
    caption: 'Northern light over volcanic ground',
    image:
      'https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Cappadocia, Turkey',
    caption: 'Balloons floating over the valleys',
    image:
      'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Prague, Czech Republic',
    caption: 'Old-world rooftops at first light',
    image:
      'https://images.unsplash.com/photo-1541849546-216549ae216d?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Havana, Cuba',
    caption: 'Color and music along the old streets',
    image:
      'https://images.unsplash.com/photo-1500759285222-a95626b934cb?auto=format&fit=crop&w=1800&q=80',
  },
];

export interface AudienceProfile {
  emoji: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  alt: string;
}

export interface PrivacyPromise {
  number: string;
  title: string;
  description: string;
}

export const audienceProfiles: AudienceProfile[] = [
  {
    emoji: '❤️',
    name: 'Couples',
    tagline: 'Create the honeymoon you always dreamed of.',
    description:
      'Sunset on a Santorini cliff, a slow walk through Rome, a quiet morning on a Maldivian beach. Send two portraits and we compose the two of you together, in the light and the season you imagined — no flights, no leave requests, no compromise.',
    image: '/audience/couples.jpg',
    imageWidth: 928,
    imageHeight: 1152,
    alt: 'A couple walking hand in hand along a whitewashed Santorini lane at golden hour',
  },
  {
    emoji: '👨‍👩‍👧',
    name: 'Families',
    tagline: 'Put the whole family in their dream destination.',
    description:
      'Gather every generation into one frame at last: grandparents beside an alpine lake, children meeting snow for the first time, cousins photographed under the same skyline. Each person is composed from a photograph you own, so nobody is left out of the picture.',
    image: '/audience/families.jpg',
    imageWidth: 928,
    imageHeight: 1152,
    alt: 'A laughing family of four standing on a mountain jetty above turquoise water',
  },
  {
    emoji: '🎁',
    name: 'Birthday gifts',
    tagline: 'Give someone a vacation without buying a flight.',
    description:
      'The gift that fits in an envelope and still feels like a boarding pass. Present the birthday person in the place they have pinned for years — Tokyo, Cape Town, a desert camp beneath the stars — ready for the reveal, the party wall, or the moment they open it.',
    image: '/audience/birthday.jpg',
    imageWidth: 928,
    imageHeight: 1152,
    alt: 'A smiling woman holding a pastel wrapped birthday gift with balloons behind her',
  },
  {
    emoji: '📱',
    name: 'Social media show-offs',
    tagline: 'Create extraordinary travel content from ordinary photographs.',
    description:
      'Your grid, upgraded. Turn the photographs already on your phone into a scroll-stopping travel series — Milan at blue hour, Iceland beneath the aurora, a balcony above the Aegean — with the colour, styling, and framing of editorial travel magazines. Post a new city every week.',
    image: '/audience/social.jpg',
    imageWidth: 928,
    imageHeight: 1152,
    alt: 'A traveller photographing herself on a phone on a European street at dusk',
  },
  {
    emoji: '🌎',
    name: 'Dream destinations',
    tagline: 'See yourself anywhere in the world.',
    description:
      'Somewhere has been waiting for you: the fjord, the desert road, the temple terrace, the iceberg. Choose the place you have never stood and NeverBeen places you in its weather, its light, and its hour — a photograph of a destination you can finally picture yourself in.',
    image: '/audience/dream-destinations.jpg',
    imageWidth: 928,
    imageHeight: 1152,
    alt: 'A lone traveller on a cliff top looking over a misty fjord at dawn',
  },
  {
    emoji: '🎬',
    name: 'Content creators',
    tagline: 'Create characters and photos for your content.',
    description:
      'Build a cast, not just a portfolio. Design characters with a consistent face, wardrobe, and world across every post, story, and reel — plus destination backdrops for thumbnails, covers, and brand campaigns. Original, documented, and cleared for commercial use.',
    image: '/audience/creators.jpg',
    imageWidth: 928,
    imageHeight: 1152,
    alt: 'A content creator editing character artwork in a bright home studio',
  },
  {
    emoji: '🧓',
    name: 'Old folks',
    tagline: 'Travel without the airport queues — whatever your age.',
    description:
      'A veranda above the Mediterranean, the rim of the Grand Canyon, the city where you first fell in love. You choose the view, our editors do all the work, and your photographs arrive print-ready for the mantelpiece, the album, and the family group chat.',
    image: '/audience/golden-years.jpg',
    imageWidth: 1376,
    imageHeight: 768,
    alt: 'An older couple laughing together on a sunlit Mediterranean terrace above the sea',
  },
];

export const privacyPromises: PrivacyPromise[] = [
  {
    number: '01',
    title: 'Only photographs you own or may use',
    description:
      'We create images only from photographs you provide, or from photographs you have documented permission to use.',
  },
  {
    number: '02',
    title: 'No deceptive documents, no impersonation',
    description:
      'NeverBeen does not produce fake documents, IDs, or passports, and we will not place you in scenes built to impersonate someone else or mislead anyone.',
  },
  {
    number: '03',
    title: 'Handled only for the service you request',
    description:
      'Your photographs are used to build your collection and nothing else. No resale, no side projects, and no training our own models on your face.',
  },
  {
    number: '04',
    title: 'You remain in control of your images',
    description:
      'You decide what is composed, what is shared, and what is deleted. Ask us to remove your files at any time and we will confirm once it is done.',
  },
  {
    number: '05',
    title: 'Every photograph is verified before use',
    description:
      'Before a single scene is composed, our editors verify that the person in the photograph matches the request and the identification you provided.',
  },
  {
    number: '06',
    title: 'A model contract permission is signed',
    description:
      'Every engagement is covered by a signed model release and usage agreement, so permission is written down, dated, and clear on both sides.',
  },
];
