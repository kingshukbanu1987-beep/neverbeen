/*
 * NeverBeen visitor brochure — traveller review slides (14 ultra-modern full-bleed slides).
 *
 * Fourteen breathtaking full-bleed quotation slides featuring 100% opacity photographic
 * backgrounds from iconic world destinations (Singapore, Malaysia, Paris, Netherlands,
 * Innsbruck, Thailand, Black Forest, Antarctica, New York, London, Scotland, Amazon).
 *
 * Each slide features ultra-modern glassmorphic card design with elaborate client testimonials,
 * ratings, verified badges, destination pins, and reviewer details while keeping the
 * breathtaking 100% opacity background prominent and visual.
 */
const { PAGE, MARGIN, WHITE, INK } = require('./brochure-kit');

const W = PAGE.W; // 842
const H = PAGE.H; // 595

/**
 * 14 Client Reviews with elaborate testimonials praising NeverBeen services and concepts.
 */
const REVIEWS = [
  {
    key: 'singaporeMbsCouple',
    scene: 'Marina Bay Sands, Singapore',
    subject: 'Young European and Indian couple',
    name: 'Priya Banerjee & Julian Moreau',
    place: 'Kolkata, India & Paris, France',
    tag: 'Starter Collection \u00B7 48-Hour Delivery',
    accent: '#FFD166',
    quote:
      'We spent years talking about celebrating our anniversary at Marina Bay, but between work deadlines and transatlantic logistics, the trip remained a calendar wish. NeverBeen changed everything. We submitted two simple phone selfies from our apartment, and 48 hours later, we had an editorial-grade portrait standing in front of the illuminated Marina Bay Sands that looked impossibly real. Even our parents thought we had secretly flown out for the weekend. The lighting, natural skin tones, and subtle reflections in the water are astonishing.',
  },
  {
    key: 'malaysiaPetronasBengaliLady',
    scene: 'Petronas Twin Towers, Kuala Lumpur',
    subject: 'Solo young beautiful Bengali lady from Kolkata',
    name: 'Debolina Sen',
    place: 'Salt Lake, Kolkata, India',
    tag: 'Economy Class \u00B7 Revision Included',
    accent: '#00D2A8',
    quote:
      'As a solo architect from Kolkata, standing beneath the towering steel spires of the Petronas Towers at midnight has always been on my travel vision board. NeverBeen\u2019s concept sounded almost too futuristic to believe, but the delivery left me speechless. The nighttime city glare, the metallic sheen of the bridge, and the way my sari caught the ambient light were rendered with absolute fidelity. Not having to navigate visa queues or holiday crowds to hold this memory is revolutionary. I paid only after previewing the high-res file, and I clicked approve immediately.',
  },
  {
    key: 'parisEiffelOldCouple',
    scene: 'Eiffel Tower, Paris, France',
    subject: 'Photo of an old couple',
    name: 'Amitav & Sharmistha Mukherjee',
    place: 'Ballygunge, Kolkata, India',
    tag: 'Golden Years \u00B7 4K Print Ready',
    accent: '#FF3D6E',
    quote:
      'For our 40th wedding anniversary, our children wanted to gift us an international holiday, but long-haul flights and cobblestone walking are hard on our joints. When our daughter revealed this NeverBeen portrait of us embraced before the sparkling Eiffel Tower, tears came to our eyes. It hangs proudly in our drawing room in Kolkata, framed in gold. Relatives and neighbours genuinely ask who took the photograph for us in France. NeverBeen has given an elderly couple the romance of Paris without any travel strain.',
  },
  {
    key: 'netherlandsTulipsBengaliLady',
    scene: 'Keukenhof Tulip Gardens, Netherlands',
    subject: 'Solo young beautiful Bengali lady from Kolkata',
    name: 'Sreemoyee Roy',
    place: 'New Town, Kolkata, India',
    tag: 'Economy Class \u00B7 Natural Colour Grade',
    accent: '#FFE066',
    quote:
      'I have dreamed of standing amidst the endless blooming tulip ribbons of Keukenhof since studying botanical illustrations in college. NeverBeen\u2019s studio didn\u2019t just paste my face onto a generic stock photo; they composed the morning Dutch mist, the wind in my hair, and the gentle warm sunlight filtering across the flower beds. It captures the exact mood of quiet wonder I always imagined feeling there. The concept of democratic, passport-free travel photography is pure genius, and the resolution is crisp enough for full-wall canvas printing.',
  },
  {
    key: 'innsbruckRiverCouple',
    scene: 'River Inn & Old Town, Innsbruck',
    subject: 'Young European and Indian couple',
    name: 'Ananya Roy & Florian Weber',
    place: 'Vienna, Austria & Kolkata, India',
    tag: 'Starter Duo \u00B7 Alpine Sunlight',
    accent: '#7FD8FF',
    quote:
      'Living between two continents, finding a travel window where Florian and I could take a relaxed holiday together in the Tyrolean Alps was proving impossible this year. NeverBeen delivered a picture-perfect memory along the River Inn with the iconic pastel houses and snow-dusted mountains behind us. What impressed us most was how human the process felt: a studio artist clearly balanced our skin undertones against the crisp alpine daylight. It looks completely uncurated and spontaneous, exactly like a candid moment from a dream vacation.',
  },
  {
    key: 'thailandMayaBayFriends',
    scene: 'Maya Bay, Koh Phi Phi, Thailand',
    subject: 'Group photo of friends in adventure',
    name: 'Rohan, Kabir, Tanvi & Aditya',
    place: 'Mumbai & New Delhi, India',
    tag: 'Adventure Crew \u00B7 Commercial Rights',
    accent: '#00D2A8',
    quote:
      'Our college gang has been promising a Thailand island adventure for seven years in our WhatsApp group, but someone\u2019s leave always got cancelled. NeverBeen finally brought all four of us together on the white sands of Maya Bay. The turquoise water reflections, the rugged limestone cliffs, and the candid laughter look so effortless that none of our friends believe we didn\u2019t rent a speedboat out of Phuket. The studio nailed the group composition and lighting consistency across all of us. Worth every single rupee!',
  },
  {
    key: 'germanyBlackForestLady',
    scene: 'Black Forest, Baden-W\u00FCrttemberg',
    subject: 'Old aristocrat lady',
    name: 'Baroness Helene von Bergmann',
    place: 'Baden-Baden, Germany',
    tag: 'Heritage Portrait \u00B7 Film Texture',
    accent: '#B4F461',
    quote:
      'In my youth, our family spent countless autumns walking the high evergreen trails of the Black Forest. Now in my late seventies, I rarely venture deep into the mountain paths. Seeing myself once more amid the towering pines, wrapped in my favourite wool coat with the gentle morning fog rolling through the trees, was deeply emotional. NeverBeen respects dignity, proportion, and artistic restraint. There is no artificial sheen; it possesses the timeless texture of authentic medium-format film photography.',
  },
  {
    key: 'antarcticaPenguinsFriends',
    scene: 'Antarctic Peninsula, Antarctica',
    subject: 'Group photo of friends in adventure',
    name: 'Marcus, Elena, Liam & Dev',
    place: 'London, UK & Bengaluru, India',
    tag: 'Expedition Look \u00B7 High Dynamic Range',
    accent: '#7FD8FF',
    quote:
      'An expedition cruise to the Antarctic Peninsula was completely out of reach for our post-grad budget\u2014tens of thousands of pounds we simply didn\u2019t have. NeverBeen composed the four of us in bright expedition parkas right alongside a colony of Emperor penguins on sea ice, with colossal sapphire icebergs towering in the background. The sub-zero frost on our hoods, the polar sunlight, and the sheer vibrancy of the frame blew our minds. It proves that imagination and top-tier studio artists can take you to the ends of the Earth.',
  },
  {
    key: 'newYorkTimesSquareCouple',
    scene: 'Times Square, New York City',
    subject: 'Young European and Indian couple',
    name: 'Sneha Patel & Lucas Bennett',
    place: 'Manhattan, New York & Mumbai, India',
    tag: 'Night Collection \u00B7 Cinematic Grade',
    accent: '#FF3D6E',
    quote:
      'Times Square at night can be notoriously overwhelming to photograph in person\u2014crowds jostling, harsh billboard glare, and blurry reflections. NeverBeen created the definitive version of us in the middle of Broadway\u2019s neon heart: vibrant, impeccably framed, and cinematic. The neon cyan and magenta lights reflecting off the asphalt and our jackets look like a still from a high-budget romance film. The turnaround was under 36 hours, and the customer service on WhatsApp was exceptionally responsive and polite.',
  },
  {
    key: 'londonTowerBridgeLady',
    scene: 'Tower Bridge & Thames, London',
    subject: 'Old aristocrat lady',
    name: 'Gayatri Devi Roychowdhury',
    place: 'Kensington, London & Kolkata, India',
    tag: 'Heritage Collection \u00B7 Private Sharing',
    accent: '#FFD166',
    quote:
      'Having lived between Kolkata and London for several decades, I wanted a quiet, dignified portrait capturing the Thames and Tower Bridge without facing the winter chill and blustery winds. NeverBeen\u2019s bespoke approach created a timeless image: my silk pashmina caught in the gentle breeze, the historic suspension towers glowing in dusk light, and an expression of serene contentment. The team verified my identity securely and treated my family heirlooms and attire with utmost cultural sensitivity.',
  },
  {
    key: 'scotlandCastleOldCouple',
    scene: 'Eilean Donan Castle, Scotland',
    subject: 'Photo of an old couple',
    name: 'Alistair & Rohini MacLeod',
    place: 'Edinburgh & Aberdeen, Scotland',
    tag: 'Highlands Romance \u00B7 4K Editorial',
    accent: '#B621FE',
    quote:
      'We always wanted a moody, romantic photograph beside an illuminated Scottish castle beneath the northern stars, but rain and Scottish weather usually have other plans! NeverBeen made it happen flawlessly. The ancient stone ramparts reflecting into the loch, the warm golden castle floodlights, and the tender look between Rohini and me are captured with such artistic depth. It feels like an oil painting brought into the digital age. Having complete control to request subtle revisions gave us immense peace of mind.',
  },
  {
    key: 'amazonRainforestFriends',
    scene: 'Amazon Basin Rainforest, Brazil',
    subject: 'Group photo of friends in adventure',
    name: 'Carlos, Priya, Arjun & Maya',
    place: 'Manaus, Brazil & Bengaluru, India',
    tag: 'Expedition Plan \u00B7 Commercial Rights',
    accent: '#3EE6A0',
    quote:
      'Trekking deep inside the heart of the Amazon basin requires months of vaccination prep and extreme physical endurance. With NeverBeen, our travel circle explored the emerald heart of the rainforest from the comfort of our homes. The lush jungle canopy, hanging tropical lianas, and authentic outdoor humidity reflected on our faces made the picture unbelievable. Our travel blog audience was stunned by the realism. NeverBeen is transforming how stories can be told and shared globally.',
  },
  {
    key: 'singaporeGardensLady',
    scene: 'Marina Bay Waterfront, Singapore',
    subject: 'Solo young beautiful Bengali lady from Kolkata',
    name: 'Rituparna Dasgupta',
    place: 'Alipore, Kolkata, India',
    tag: 'Solo Explorer \u00B7 Verified Review',
    accent: '#FF6B00',
    quote:
      'Taking solo travel photos usually means awkward tripod setups or asking strangers for blurry snapshots. NeverBeen solved that forever. I uploaded one passport-style portrait and received a stunning, magazine-cover-ready composition standing on the Marina Bay waterfront with the world-famous hotel and skyline glowing behind me. The composition captured my natural posture and smile without any distortion. I love the concept of paying only if you genuinely fall in love with the result\u2014it shows how confident NeverBeen is in their artistry.',
  },
  {
    key: 'londonBigBenCouple',
    scene: 'Westminster & Big Ben, London',
    subject: 'Young European and Indian couple',
    name: 'Sophie Dubois & Arka Sen',
    place: 'Camden, London & Kolkata, India',
    tag: 'Starter Duo \u00B7 Golden Hour Grade',
    accent: '#FFD166',
    quote:
      'We were sceptical about whether AI travel portraiture could look convincing rather than plastic. NeverBeen completely proved us wrong. The golden hour sunset over the Palace of Westminster, the iconic face of Big Ben, and the natural grain in our knitwear look indistinguishable from a shoot by a National Geographic photographer. It\u2019s our favourite photograph of us as a couple. NeverBeen isn\u2019t just a technological marvel; it\u2019s a portal to the places you hold in your heart.',
  },
];

/**
 * 1-based page positions in the 36-page brochure after which the 14 new review slides
 * are inserted. Spread evenly and in shuffled order strictly between Slide 4 and Slide 36.
 */
const INSERT_AFTER_36 = [4, 6, 8, 10, 13, 15, 17, 20, 22, 24, 27, 29, 31, 34];

/**
 * Draws one ultra-modern quotation page: 100% opacity background photograph,
 * subtle bottom vignette scrim, and a frosted glass floating dock carrying the
 * elaborate testimonial in small, clean, ultra-modern typography.
 */
function drawReviewPage(k, ctx, spec) {
  k.startPage({ chrome: 'dark', accent: spec.accent || '#FFD166', section: 'Traveller Stories' });
  const d = k.doc;

  // 100% opacity background photograph — prominent, breathtaking, and visual.
  k.photoBackground(ctx.IMG[spec.key], 1.0);

  // Subtle bottom vignette scrim ensuring glass card contrast without dimming the scene.
  const scrim = d.linearGradient(0, H * 0.65, 0, H);
  scrim.stop(0, '#07172B', 0).stop(0.55, '#07172B', 0.3).stop(1, '#07172B', 0.72);
  d.save();
  d.rect(0, H * 0.65, W, H * 0.35).fill(scrim);
  d.restore();

  // Floating ultra-modern frosted glass dock
  const cardX = MARGIN;
  const cardW = W - MARGIN * 2; // 730
  const cardH = 142;
  const cardY = H - 38 - cardH - 12; // 403

  // Drop shadow
  k.shadow(cardX, cardY, cardW, cardH, 20, 0.45);

  // Frosted obsidian glass
  k.roundRect(cardX, cardY, cardW, cardH, 20, '#07172B', 0.86);

  // Glowing subtle border
  k.outline(cardX, cardY, cardW, cardH, 20, spec.accent || '#FFD166', 1.2, null, 0.42);

  // Top neon accent tab
  k.roundRect(cardX + 28, cardY, 80, 3, 1.5, spec.accent || '#FFD166', 1);

  // Card Header: Badge & Star Rating on left
  k.roundRect(cardX + 20, cardY + 12, 136, 19, 9.5, spec.accent || '#FFD166', 0.2);
  k.text('\u2726 VERIFIED CLIENT', cardX + 20, cardY + 16, {
    font: 'BodyBlack',
    size: 7.2,
    color: spec.accent || '#FFD166',
    width: 136,
    align: 'center',
    characterSpacing: 0.8,
  });
  k.text('\u2605 \u2605 \u2605 \u2605 \u2605', cardX + 166, cardY + 15, {
    font: 'BodyBold',
    size: 8.8,
    color: '#FFD166',
    width: 90,
    characterSpacing: 1.2,
  });

  // Card Header: Scene Pin on right
  k.icon('pin', cardX + cardW - 250, cardY + 20.5, 5, spec.accent || '#FFD166');
  k.text(spec.scene, cardX + cardW - 240, cardY + 16.5, {
    font: 'BodyBold',
    size: 8.4,
    color: WHITE,
    width: 220,
    align: 'right',
  });

  // Quote text: elaborate, inside quotes, small font size for sleek modern aesthetic
  k.fit('\u201C' + spec.quote + '\u201D', cardX + 22, cardY + 39, cardW - 44, 56, {
    font: 'Body',
    size: 9.4,
    minSize: 7.8,
    color: WHITE,
    lineGap: 2.8,
    opacity: 0.96,
  });

  // Divider line
  k.line(cardX + 20, cardY + 101, cardX + cardW - 20, cardY + 101, '#FFFFFF', 0.8, 0.12);

  // Bottom row: Reviewer Name & City
  k.text(spec.name, cardX + 24, cardY + 107, {
    font: 'BodyBold',
    size: 10.8,
    color: WHITE,
    width: 360,
    lineGap: 0,
  });
  k.text(spec.place, cardX + 24, cardY + 122, {
    font: 'BodySemi',
    size: 8.4,
    color: spec.accent || '#FFD166',
    width: 360,
    lineGap: 0,
  });

  // Bottom row: Package Tag
  k.text(spec.tag, cardX + cardW - 260, cardY + 114, {
    font: 'BodySemi',
    size: 8.4,
    color: WHITE,
    opacity: 0.82,
    align: 'right',
    width: 236,
  });
}

const reviewPages = REVIEWS.map((spec) => (k, ctx) => drawReviewPage(k, ctx, spec));

/**
 * Inserts the 14 review pages into the 36-page brochure array at the positions
 * specified by INSERT_AFTER_36.
 */
function interleaveReviews(thirtySixPages, reviews = reviewPages) {
  if (reviews.length !== INSERT_AFTER_36.length) {
    throw new Error(
      `Brochure has ${reviews.length} review pages but ${INSERT_AFTER_36.length} insertion points.`,
    );
  }
  const inserts = new Map(
    INSERT_AFTER_36.map((pageNumber, index) => [pageNumber, reviews[index]]),
  );
  const result = [];
  thirtySixPages.forEach((draw, index) => {
    result.push(draw);
    const extra = inserts.get(index + 1);
    if (extra) result.push(extra);
  });
  return result;
}

module.exports = {
  REVIEWS,
  INSERT_AFTER_36,
  reviewPages,
  interleaveReviews,
  drawReviewPage,
};
