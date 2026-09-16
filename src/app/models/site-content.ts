export interface Destination {
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

const destinationSeed: Omit<Destination, 'images'>[] = [
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
];

const destinationRotationImages = [
  'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=85',
];

export const destinations: Destination[] = destinationSeed.map((destination) => ({
  ...destination,
  images: [destination.image, ...destinationRotationImages],
}));

export const contactDestinations = [
  ...destinations.map((destination) => destination.name),
  'Amsterdam', 'Athens', 'Barcelona', 'Berlin', 'Lisbon', 'Madrid', 'Vienna', 'Prague', 'Budapest',
  'Copenhagen', 'Dublin', 'Edinburgh', 'Florence', 'Venice', 'Milan', 'Naples', 'Nice', 'Brussels',
  'Zurich', 'Geneva', 'Lucerne', 'Zermatt', 'Interlaken', 'Salzburg', 'Munich', 'Oslo', 'Stockholm',
  'Helsinki', 'Tallinn', 'Riga', 'Vilnius', 'Warsaw', 'Krakow', 'Bucharest', 'Sofia', 'Belgrade',
  'Dubrovnik', 'Split', 'Ljubljana', 'Sarajevo', 'Cairo', 'Luxor', 'Casablanca', 'Tunis', 'Algiers',
  'Dakar', 'Accra', 'Lagos', 'Kigali', 'Windhoek', 'Gaborone', 'Maputo', 'Mauritius', 'Seychelles',
  'Doha', 'Abu Dhabi', 'Muscat', 'Riyadh', 'Jeddah', 'Jerusalem', 'Amman', 'Beirut', 'Tehran', 'Baku',
  'Tbilisi', 'Yerevan', 'Delhi', 'Mumbai', 'Jaipur', 'Goa', 'Bengaluru', 'Kathmandu', 'Colombo',
  'Bangkok', 'Phuket', 'Singapore', 'Kuala Lumpur', 'Hanoi', 'Ho Chi Minh City', 'Hong Kong', 'Shanghai',
  'Beijing', 'Taipei', 'Osaka', 'Nara', 'Busan', 'Jeju', 'Manila', 'Palawan', 'Perth', 'Melbourne',
  'Brisbane', 'Auckland', 'Queenstown', 'Honolulu', 'Vancouver', 'Toronto', 'Montreal', 'Mexico City',
  'Cancun', 'Others',
] as const;

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
    features: ['3 destination looks', 'Print-ready 4K files', 'Natural color grading', '48-hour delivery'],
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
    description: 'Complete the request form with your details, destination preferences, and the package you selected.',
  },
  {
    number: '02',
    title: 'Submit Photos and ID for Verification',
    description: 'Share a clear photo and valid ID so our team can verify your request and prepare your personalized experience.',
  },
  {
    number: '03',
    title: 'Let AI create your vacation',
    description: 'Our studio model places you in destination light, wardrobe, and atmosphere—then an editor refines the still.',
  },
  {
    number: '04',
    title: 'Download and share',
    description: 'Receive print-ready photographs for albums, frames, and the trip you always meant to take.',
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
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Lake Brienz, Switzerland',
    caption: 'Turquoise water beneath the Alps',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Mount Everest, India',
    caption: 'Above the clouds in the Himalayas',
    image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Antarctica',
    caption: 'Penguins on the edge of the world',
    image: 'https://images.unsplash.com/photo-1517783999520-f068d7431a60?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Santorini, Greece',
    caption: 'White walls above the Aegean',
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Tokyo, Japan',
    caption: 'Neon streets after rain',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Kyoto, Japan',
    caption: 'A quiet terrace beneath maple leaves',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'New York, United States',
    caption: 'City lights after dusk',
    image: 'https://images.unsplash.com/photo-1485875437342-9b39470b3d95?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Bali, Indonesia',
    caption: 'Temple mist among the rice terraces',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Amalfi Coast, Italy',
    caption: 'Morning light on the Mediterranean',
    image: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Sahara, Morocco',
    caption: 'Desert light after the rain',
    image: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Fjords, Norway',
    caption: 'Blue dusk between quiet peaks',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Bora Bora, French Polynesia',
    caption: 'Lagoon water under a wide sky',
    image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Wadi Rum, Jordan',
    caption: 'A camp beneath the desert stars',
    image: 'https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'London, United Kingdom',
    caption: 'Evening beside the River Thames',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Rome, Italy',
    caption: 'Ancient stone beneath the Roman sun',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Dubai, United Arab Emirates',
    caption: 'A skyline rising from the desert',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Rio de Janeiro, Brazil',
    caption: 'Mountain, ocean, and city below',
    image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Machu Picchu, Peru',
    caption: 'Ruins above the cloud forest',
    image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Serengeti, Tanzania',
    caption: 'Open grassland beneath a vast sky',
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Great Barrier Reef, Australia',
    caption: 'A blue world beneath the surface',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Reykjavik, Iceland',
    caption: 'Northern light over volcanic ground',
    image: 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Cappadocia, Turkey',
    caption: 'Balloons floating over the valleys',
    image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Prague, Czech Republic',
    caption: 'Old-world rooftops at first light',
    image: 'https://images.unsplash.com/photo-1541849546-216549ae216d?auto=format&fit=crop&w=1800&q=80',
  },
  {
    place: 'Havana, Cuba',
    caption: 'Color and music along the old streets',
    image: 'https://images.unsplash.com/photo-1500759285222-a95626b934cb?auto=format&fit=crop&w=1800&q=80',
  },
];
