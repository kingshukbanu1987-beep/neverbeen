export interface BrochureSlide {
  /** 1-based page number in the NeverBeen Brochure PDF. */
  page: number;
  /** Public URL of the brochure page photograph. */
  src: string;
  /** Destination scene shown on the brochure page. */
  scene: string;
  /** Traveller quotation printed on the brochure page. */
  quote: string;
  /** Traveller attribution name. */
  name: string;
  /** Traveller home city/country. */
  place: string;
  /** Small pill label shown above the headline. */
  tag: string;
  /** Headline shown on the memo card. */
  header: string;
  /** Supporting quotation shown on the memo card. */
  copy: string;
  /** Accessible image description. */
  alt: string;
}

export const BROCHURE_SLIDE_PAGE_NUMBERS = [
  6, 8, 9, 12, 13, 16, 17, 20, 21, 23, 25, 27, 33, 34, 36, 37, 39, 40, 44, 46, 47, 49,
] as const;

interface RawBrochurePage {
  page: number;
  file: string;
  scene: string;
  quote: string;
  name: string;
  place: string;
}

const RAW_BROCHURE_PAGES: RawBrochurePage[] = [
  {
    page: 6,
    file: 'testimonial-singapore-marina-bay.jpg',
    scene: 'Marina Bay Sands · Singapore',
    quote:
      'We kept moving our anniversary trip down the calendar, but the Singapore skyline had been on our list for years. The first portrait felt considered rather than templated: it kept our expressions, made room for the details we shared, and gave us a beautiful reminder of the trip we still want to take.',
    name: 'Mira & Oliver',
    place: 'Bristol, United Kingdom',
  },
  {
    page: 8,
    file: 'paris-solo-traveller.jpg',
    scene: 'Paris, France',
    quote: 'I asked for Paris in the rain. They gave me Paris in the rain.',
    name: 'Inès Duval',
    place: 'Lyon, France',
  },
  {
    page: 9,
    file: 'testimonial-petronas-kuala-lumpur.jpg',
    scene: 'Petronas Twin Towers · Kuala Lumpur',
    quote:
      'I have always preferred a portrait that still looks like me. The studio kept my familiar features and the quiet smile I asked for, then placed me beneath the Petronas Towers at night. The result felt polished without losing warmth, and the simple back-and-forth made it easy to share what mattered.',
    name: 'Ananya Mukherjee',
    place: 'Kolkata, India',
  },
  {
    page: 12,
    file: 'florence-couple-selfie.jpg',
    scene: 'Florence, Italy',
    quote: 'One portrait on a Tuesday. Florence by Thursday evening.',
    name: 'Giulia & Marco',
    place: 'Verona, Italy',
  },
  {
    page: 13,
    file: 'testimonial-netherlands-tulips.jpg',
    scene: 'Tulip fields · Netherlands',
    quote:
      'Our group chat is full of plans that never quite meet three calendars. The tulip-garden portrait gave us a bright, joyful version of the spring trip we keep promising to take. The best part was how personal it felt: the colour, mood and small styling notes all came through.',
    name: 'Nina, Saar & Coen',
    place: 'Utrecht, Netherlands',
  },
  {
    page: 16,
    file: 'testimonial-innsbruck-river.jpg',
    scene: 'River Inn · Innsbruck, Austria',
    quote:
      'We sent a few reference images and a short note about the atmosphere we wanted. The Innsbruck riverfront became the perfect backdrop, but the portrait still felt like us rather than a postcard. Being able to ask for a small adjustment made the experience feel collaborative from the first look.',
    name: 'Maya & Jonas',
    place: 'Graz, Austria',
  },
  {
    page: 17,
    file: 'vienna-older-couple.jpg',
    scene: 'Vienna, Austria',
    quote: 'Fifty years of talking about Vienna, finally on the wall.',
    name: 'Hans & Rosmarie',
    place: 'Lucerne, Switzerland',
  },
  {
    page: 20,
    file: 'testimonial-maya-bay-thailand.jpg',
    scene: 'Maya Bay · Thailand',
    quote:
      'Maya Bay has lived on my travel list for years. I wanted the turquoise water and limestone cliffs, but not a plastic-looking face or an overdone filter. The finished portrait felt relaxed and recognisable, like a candid moment from a journey I hope to make in person one day.',
    name: 'Leela Desai',
    place: 'Pune, India',
  },
  {
    page: 21,
    file: 'interlaken-couple-selfie.jpg',
    scene: 'Interlaken, Switzerland',
    quote: 'It does not look generated. It looks like a memory I misplaced.',
    name: 'Elin Bergström',
    place: 'Stockholm, Sweden',
  },
  {
    page: 23,
    file: 'testimonial-black-forest.jpg',
    scene: 'Black Forest · Germany',
    quote:
      'We are not usually drawn to digital portraits, so we were careful about what we asked for. The Black Forest scene felt calm and natural, and the details in our faces still looked familiar. It was lovely to turn a shared daydream into something we could send to family.',
    name: 'Helga & Dieter',
    place: 'Freiburg, Germany',
  },
  {
    page: 25,
    file: 'dubai-burj-khalifa-friends.jpg',
    scene: 'Burj Khalifa · Downtown Dubai',
    quote: 'Four friends, four cities, one afternoon. Nobody flew anywhere.',
    name: 'Nora, Bea, Fenna & Luuk',
    place: 'Ghent, Belgium',
  },
  {
    page: 27,
    file: 'testimonial-antarctica-penguins.jpg',
    scene: 'Antarctica · penguin colony',
    quote:
      'Our hiking group keeps a list of places we might never reach together. Antarctica was at the top. Seeing all of us framed beside the ice and penguins made us laugh, then immediately plan a print for our next reunion. It felt imaginative, personal and unmistakably about our friendship.',
    name: 'The Saturday Walkers',
    place: 'Cape Town, South Africa',
  },
  {
    page: 33,
    file: 'paris-couple-selfie.jpg',
    scene: 'Paris, France',
    quote: 'Our save-the-date came from a bridge we have never crossed.',
    name: 'Théo & Anaïs',
    place: 'Brussels, Belgium',
  },
  {
    page: 34,
    file: 'testimonial-london-tower-bridge.jpg',
    scene: 'Tower Bridge · London',
    quote:
      'Three friends, one London evening, and a destination we have all loved from films. The finished image gave us the feeling of being there together, without turning the landmarks into the whole story. We appreciated how our different reference photos came together in one consistent scene.',
    name: 'Asha, Imogen & Tom',
    place: 'Leicester, United Kingdom',
  },
  {
    page: 36,
    file: 'innsbruck-couple-selfie.jpg',
    scene: 'Innsbruck, Austria',
    quote: 'Mum opened the envelope and went quiet for a whole minute.',
    name: 'The Kovac family',
    place: 'Ljubljana, Slovenia',
  },
  {
    page: 37,
    file: 'testimonial-paris-eiffel-scenic.jpg',
    scene: 'Eiffel Tower · Paris',
    quote:
      'We chose Paris because it was the first trip we had postponed, not because it was the easiest backdrop. The final frame felt thoughtful: soft evening light, the river, and a version of us that looked completely at home. It made an ordinary week feel a little more celebratory.',
    name: 'Louise & Arjun',
    place: 'Brussels, Belgium',
  },
  {
    page: 39,
    file: 'florence-solo-traveller.jpg',
    scene: 'Florence, Italy',
    quote: 'One photograph in, and the whole city showed up.',
    name: 'Noor Haddad',
    place: 'Rotterdam, Netherlands',
  },
  {
    page: 40,
    file: 'rome-friends-group.jpg',
    scene: 'Colosseum · Rome',
    quote:
      'At first we thought one picture of each friend would look like a collage. Instead, the Roman scene felt warm and cohesive, and each person still had a recognisable expression. We loved that the idea did not need everyone in the same city—or the same original picture—to feel shared.',
    name: 'Amira, Luca & Théo',
    place: 'Rotterdam, Netherlands',
  },
  {
    page: 44,
    file: 'vienna-older-couple.jpg',
    scene: 'Belvedere Palace · Vienna',
    quote:
      'We have been married longer than most of our favourite cafés have been open, and Vienna was always the anniversary trip we never planned. The portrait gave us a gentle, elegant version of that memory. It felt respectful of our age and our real faces, which mattered more than any filter.',
    name: 'Helene & Wolfgang',
    place: 'Salzburg, Austria',
  },
  {
    page: 46,
    file: 'vienna-couple-selfie.jpg',
    scene: 'Vienna, Austria',
    quote: 'I paid only when I loved it. I loved the very first one.',
    name: 'Rohan & Ananya',
    place: 'Bengaluru, India',
  },
  {
    page: 47,
    file: 'florence-solo-traveller.jpg',
    scene: 'Florence · Italy',
    quote:
      'I was curious but cautious about putting my portrait into a destination I had never visited. The Florence frame kept the mood light and recognisable, and the process made it easy to describe the kind of image I wanted. Now it is the picture friends ask me about first.',
    name: 'Noor Rahman',
    place: 'Dhaka, Bangladesh',
  },
  {
    page: 49,
    file: 'testimonial-scotland-castle.jpg',
    scene: 'Highlands castle · Scotland',
    quote:
      'One clear portrait and a small idea became a whole travel scene. I liked that the result was treated like a photograph rather than a novelty graphic, with the landmark still visible and the styling kept simple. It is a lovely reminder that a dream destination can start with one image.',
    name: 'Annelies De Vries',
    place: 'Antwerp, Belgium',
  },
];

export const brochureSlides: BrochureSlide[] = RAW_BROCHURE_PAGES.map((item) => ({
  page: item.page,
  src: `/brochure/${item.file}`,
  scene: item.scene,
  quote: item.quote,
  name: item.name,
  place: item.place,
  tag: `Page ${item.page} · ${item.scene}`,
  header: `${item.name} — ${item.place}`,
  copy: `“${item.quote}”`,
  alt: `Brochure Page ${item.page} — ${item.scene} (${item.name}, ${item.place})`,
}));
