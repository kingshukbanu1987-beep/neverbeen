import { DestinationGuide } from '../destination-guide';

/** Guides for destinations in Asia, Oceania, the Americas and the polar regions. */
export const asiaPacificAmericasGuides: DestinationGuide[] = [
  {
    slug: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    region: 'Kantō region, on Tokyo Bay',
    tagline: 'Neon streets after rain',
    bestTime: 'March to May for cherry blossom, October to November for autumn colour',
    overview: [
      'Tokyo is a dozen cities stacked into one: shrine gardens and wooden shopping lanes, six-storey electronics shops, Michelin-starred counters in basement food halls, and suburban streets that go quiet by nine.',
      'It is vast but navigable. Each neighbourhood has a centre of gravity — Shibuya for its crossing, Shinjuku for nightlife, Asakusa for temples, Ginza for department stores, Yanaka for old low-rise Tokyo — and the rail network connects them with seconds-level punctuality.',
    ],
    eat: [
      {
        name: 'Sushi counters',
        description:
          'From ¥300 conveyor plates to master-run counters in Ginza; go early for lunch value.',
      },
      {
        name: 'Ramen and tsukemen',
        description:
          'Tonkotsu, shoyu, miso and dipping noodles — buy tickets from a machine and slurp.',
      },
      {
        name: 'Izakaya alleys',
        description:
          'Smoky six-seat bars in Omoide Yokochō and Hoppy Street for skewers, sashimi and sake.',
      },
      {
        name: 'Depachika food halls',
        description:
          'Basement floors of department stores selling bento, wagashi and perfect fruit at closing-time discounts.',
      },
      {
        name: 'Tempura and soba tradition',
        description: 'Century-old shops for crisp seasonal tempura and handmade buckwheat noodles.',
      },
      {
        name: 'Convenience store food',
        description:
          'Onigiri, egg sandwiches and hot coffee — genuinely good, cheap and open all night.',
      },
    ],
    attractions: [
      {
        name: 'Senso-ji, Asakusa',
        description:
          'Tokyo’s oldest temple, reached through the Kaminarimon gate and Nakamise shopping street.',
      },
      {
        name: 'Shibuya Crossing and Shibuya Sky',
        description:
          'The world’s busiest pedestrian scramble, plus an open-air observation deck above it.',
      },
      {
        name: 'Meiji Shrine and Yoyogi Park',
        description:
          'A forested shrine complex beside Harajuku’s fashion streets and weekend rockabilly dancers.',
      },
      {
        name: 'Tsukiji and Toyosu markets',
        description:
          'Toyosu for the tuna auctions and Tsukiji’s outer market for breakfast sushi and knives.',
      },
      {
        name: 'Shinjuku Gyoen and Tokyo Metropolitan views',
        description:
          'A large garden across from the city hall’s free observatory on the 45th floor.',
      },
      {
        name: 'teamLab and Odaiba',
        description: 'Digital art museums and bay-side waterfront parks on the artificial islands.',
      },
      {
        name: 'Day trips: Nikko, Hakone, Kamakura',
        description:
          'Shrines in cedar forest, Mount Fuji views over hot-spring lakes, and the Great Buddha by the sea.',
      },
    ],
    history: [
      'Tokyo began as Edo, a castle town founded in 1457 and made the seat of the Tokugawa shoguns in 1603. It grew into one of the largest cities in the world, sustained by a rigid feudal order and a thriving merchant culture of theatre, woodblock prints and food.',
      'In 1868 the emperor moved from Kyoto and the city was renamed Tokyo. It was devastated by the 1923 earthquake and again by American bombing in 1945, then rebuilt into the global capital of the post-war economic boom.',
    ],
    geography: [
      'Tokyo occupies the Kantō plain on Tokyo Bay, with the Sumida and Arakawa rivers cutting through it and the Okutama mountains to the west within the metropolitan area. The bay has been extensively reclaimed for islands and port facilities.',
      'The climate is humid subtropical: hot, wet summers with typhoon season in late summer, mild springs, and winters cold enough for occasional snow. Mount Fuji is visible on clear days from the west of the city.',
    ],
    culture: [
      'Politeness is structural here: queueing, quiet on trains, no eating while walking, and a small bow for thanks. Tipping is not practised and can cause awkwardness.',
      'Order and aesthetics coexist with exuberance — matsuri festivals, karaoke rooms, baseball crowds and the noise and colour of Shibuya at night. Many shrines, temples and neighbourhood associations still run local festivals through the year.',
    ],
    seasons: [
      {
        label: 'Spring',
        note: 'Cherry blossom late March to early April — beautiful and very crowded.',
      },
      {
        label: 'Summer',
        note: 'Hot, humid and rainy in June, with festivals and fireworks in July and August.',
      },
      {
        label: 'Autumn',
        note: 'Clear, comfortable and golden — arguably the best month-to-month weather.',
      },
      { label: 'Winter', note: 'Cold but dry and sunny, with illuminations and quieter museums.' },
    ],
    gettingAround:
      'Trains and metro are the only sensible way to move; a Suica or Pasmo card covers almost everything and works in convenience stores too. Shinjuku and Tokyo stations are cities in themselves, so allow time. Taxis are immaculate but expensive; cycling works in flatter neighbourhoods.',
    practical: [
      {
        label: 'Language',
        value: 'Japanese; signage is bilingual, English spoken in tourist areas.',
      },
      {
        label: 'Currency',
        value: 'Japanese yen (JPY) — cash still matters in small shops and shrines.',
      },
      { label: 'Plugs', value: 'Type A/B, 100 V — flat two-pin plugs.' },
      { label: 'Tipping', value: 'Not customary anywhere; service is included.' },
      { label: 'Tap water', value: 'Safe to drink throughout the city.' },
      {
        label: 'Getting in',
        value: 'Visa-free for many nationalities for short stays; check current rules.',
      },
    ],
    facts: [
      'The Greater Tokyo Area is the most populous metropolitan area in the world.',
      'Shinjuku Station handles more than three million passengers a day.',
      'Tokyo has more Michelin-starred restaurants than any other city.',
      'Yoyogi Park’s forest was a parade ground and an Olympic village before it became a park.',
    ],
    currency: { code: 'JPY', name: 'Japanese yen', symbol: '¥', approximatePerUsd: 150 },
    timezone: 'Asia/Tokyo',
    coordinates: { lat: 35.6762, lon: 139.6503 },
    wikipedia: 'Tokyo',
  },
  {
    slug: 'seoul',
    name: 'Seoul',
    country: 'South Korea',
    region: 'Sudogwon, on the Han River',
    tagline: 'Old roofs beneath a modern skyline',
    bestTime: 'April for blossom, October for clear autumn skies',
    overview: [
      'Seoul is a city that keeps its history close to its technology. Joseon-era palaces sit a few stops from K-pop studios, and 600-year-old markets trade beside glass towers and a river park system that runs for 40 km.',
      'It is also a city built for walking and eating: hillside villages, hanok lanes in Bukchon, university districts, night markets and 24-hour cafés. The food alone justifies the trip, from royal court cuisine to charcoal-grilled pork and street toast.',
    ],
    eat: [
      {
        name: 'Korean barbecue',
        description:
          'Charcoal grills set in the table for pork belly and beef, with kimchi, ssamjang and lettuce wraps.',
      },
      {
        name: 'Gwangjang Market',
        description:
          'Bindaetteok mung-bean pancakes, mayak gimbap and knife-cut noodles in Seoul’s oldest market.',
      },
      {
        name: 'Bibimbap and hanjeongsik',
        description:
          'Rice bowls with vegetables and gochujang, or a full multi-course traditional table.',
      },
      {
        name: 'Fried chicken and beer',
        description:
          '“Chimaek” is a national institution, with crisp double-fried chicken and cold lager.',
      },
      {
        name: 'Cafés and bingsu',
        description:
          'Design-led cafés in Ikseon-dong and Yeonnam, plus shaved-ice dessert bowls in summer.',
      },
    ],
    attractions: [
      {
        name: 'Gyeongbokgung and Changdeokgung palaces',
        description:
          'Joseon royal architecture with changing-of-the-guard ceremonies and hanbok free entry.',
      },
      {
        name: 'Bukchon Hanok Village',
        description: 'Traditional tiled-roof houses on hillside lanes between the palaces.',
      },
      {
        name: 'N Seoul Tower and Namsan',
        description:
          'Cable car or trail up the mountain in the middle of the city for the classic skyline view.',
      },
      {
        name: 'Dongdaemun and Myeongdong',
        description:
          'Design plaza, night markets and street food in two of the busiest shopping districts.',
      },
      {
        name: 'Han River parks and cycling',
        description:
          'Riverside parks with bike hire, picnic mats and ramen machines at convenience stores.',
      },
      {
        name: 'Hongdae, Gangnam and Insadong',
        description:
          'Street music, upscale karaoke and traditional teahouses and craft shops, each in their own quarter.',
      },
      {
        name: 'DMZ day trip',
        description:
          'A guided trip to the Demilitarized Zone, observation posts and tunnels north of the city.',
      },
    ],
    history: [
      'Seoul has been Korea’s capital since 1394, when the Joseon dynasty moved the court here and laid out the palaces, gates and city walls that still frame the centre. Hangul, the Korean alphabet, was created under King Sejong in the 15th century.',
      'The city was occupied by Japan from 1910 to 1945, then devastated by the Korean War, which left it changing hands four times. Rebuilding from the 1960s turned it into a manufacturing and technology powerhouse and, later, the centre of the Korean pop-culture wave.',
    ],
    geography: [
      'Seoul sits in a bowl of low mountains — Namsan in the centre, Bukhansan and Dobongsan to the north — with the Han River running east to west through the middle, over 20 bridges wide.',
      'Four distinct seasons are a defining feature: hot, wet summers with monsoon rains, crisp autumns, cold dry winters and quick, flowering springs. Mountains inside the city limits make hiking a genuine everyday activity.',
    ],
    culture: [
      'Age, hierarchy and group harmony shape social rules, and polite forms of speech matter. Ritual occasions, from weddings to ancestral rites, still carry Confucian structure.',
      'Contemporary culture moves fast: music, television, fashion, gaming and skincare all export from here, while the older traditions of tea, calligraphy and temple life continue alongside them.',
    ],
    seasons: [
      { label: 'Spring', note: 'Cherry and azalea blossom in April; mild and clear.' },
      { label: 'Summer', note: 'Hot and humid with monsoon rain in late June and July.' },
      { label: 'Autumn', note: 'Cool, dry and vividly colourful — the best season for hiking.' },
      {
        label: 'Winter',
        note: 'Very cold and dry, with ice festivals and ski resorts within reach.',
      },
    ],
    gettingAround:
      'The metro is fast, cheap, bilingual and reaches everything; a T-money card covers subway, bus and taxis. Night buses run after the metro closes. KTX high-speed trains reach Busan in about 2.5 hours and the airport express links Incheon in 43 minutes.',
    practical: [
      { label: 'Language', value: 'Korean; English signage is widespread, spoken English varies.' },
      { label: 'Currency', value: 'South Korean won (KRW) — cards accepted almost everywhere.' },
      { label: 'Plugs', value: 'Type C/F, 220 V — two round pins.' },
      { label: 'Tipping', value: 'Not expected; it can be refused.' },
      { label: 'Tap water', value: 'Safe, though many locals prefer filtered or bottled water.' },
      {
        label: 'Getting in',
        value: 'Check visa rules; K-ETA may be required for some visa-free visitors.',
      },
    ],
    facts: [
      'Seoul’s subway is among the longest and busiest metro systems in the world.',
      'The Cheonggyecheon stream was a road until 2003, when it was restored as a public waterway.',
      'Gyeongbokgung has been rebuilt several times, including after the Japanese occupation.',
      'Seoul has more than 100 museums and around 1,000 hiking trails in and around the city.',
    ],
    currency: { code: 'KRW', name: 'South Korean won', symbol: '₩', approximatePerUsd: 1350 },
    timezone: 'Asia/Seoul',
    coordinates: { lat: 37.5665, lon: 126.978 },
    wikipedia: 'Seoul',
  },
  {
    slug: 'new-zealand',
    name: 'New Zealand',
    country: 'New Zealand',
    region: 'Queenstown and the Southern Alps, South Island',
    tagline: 'Southern Alps beyond the lake',
    bestTime: 'December to March for summer, June to August for skiing',
    overview: [
      'New Zealand compresses glaciers, fjords, rainforest and alpine lakes into two islands the size of Britain with a fraction of the population. Queenstown sits on Lake Wakatipu beneath the Remarkables, a base for hiking, bungee jumping, wine and road trips to Milford Sound.',
      'The South Island is the dramatic one — Aoraki/Mount Cook, the Franz Josef and Fox glaciers, the braided rivers of Canterbury — while the North Island adds geothermal Rotorua, volcanic Tongariro and the harbours of Auckland and Wellington.',
    ],
    eat: [
      {
        name: 'Lamb and green-lipped mussels',
        description: 'Grass-fed lamb and Marlborough mussels, staples of menus nationwide.',
      },
      {
        name: 'Fergburger and pie shops',
        description:
          'Queenstown’s famous burger queue, plus savoury meat pies from bakeries everywhere.',
      },
      {
        name: 'Māori hāngī',
        description:
          'Meat and vegetables steam-cooked in an earth oven, part of Māori cultural experiences.',
      },
      {
        name: 'Central Otago wines',
        description:
          'Pinot noir and cool-climate whites from vineyards around Queenstown, Gibbston and Bannockburn.',
      },
      {
        name: 'Pavlova and hokey pokey',
        description:
          'The national dessert and the honeycomb-toffee ice cream flavour invented here.',
      },
    ],
    attractions: [
      {
        name: 'Milford Sound',
        description:
          'Fjord cruises beneath Mitre Peak, past waterfalls and penguins, on a road through the Homer Tunnel.',
      },
      {
        name: 'Queenstown adventure sports',
        description:
          'Bungee jumping at the original Kawarau Bridge site, jet boats, skydiving and paragliding.',
      },
      {
        name: 'Aoraki / Mount Cook National Park',
        description: 'New Zealand’s highest peak, glacier lakes and the Hooker Valley Track.',
      },
      {
        name: 'Franz Josef and Fox glaciers',
        description:
          'Two of the world’s most accessible glaciers, reached by helicopter or valley walks.',
      },
      {
        name: 'Rotorua geothermal fields',
        description:
          'Geysers, mud pools, Māori villages and lakes on the North Island’s volcanic plateau.',
      },
      {
        name: 'Tongariro Alpine Crossing',
        description: 'A 19.4 km day hike past emerald crater lakes and volcanic vents.',
      },
      {
        name: 'Wine and food trails',
        description: 'Marlborough sauvignon blanc, Hawke’s Bay reds and Central Otago pinot noir.',
      },
    ],
    history: [
      'Māori ancestor navigators settled Aotearoa from Polynesia by the 13th century, developing a culture of fortified pā, carving, weaving and a deep relationship with land and sea. Dutch explorer Abel Tasman sighted the coast in 1642, and James Cook charted it in 1769.',
      'Systematic British colonisation followed the Treaty of Waitangi in 1840 between the Crown and Māori chiefs, a document whose interpretation remains central to New Zealand law and politics. The country became a dominion in 1907 and today honours both Māori and British heritage.',
    ],
    geography: [
      'New Zealand straddles the boundary of the Pacific and Indo-Australian plates, which pushes up the Southern Alps and fuels the North Island’s volcanoes and hot springs. The South Island holds 18 peaks over 3,000 m.',
      'Landscapes change within an hour’s drive: rainforest, tussock grassland, fjord, glacier and golden-sand beach. Rivers run braided and turquoise from glacial flour, and much of the country’s land is protected national park.',
    ],
    culture: [
      'Māori language, protocol and art are woven into public life — official bilingual signage, pōwhiri welcomes, waiata and kapa haka performances — and the greeting “Kia ora” is used by everyone.',
      'New Zealanders are casual, outdoors-focused and practical, with a strong conservation ethic and the famous “number 8 wire” improvisation. Tramping, fishing and rugby are close to the national identity.',
    ],
    seasons: [
      {
        label: 'Spring',
        note: 'Wildflowers, lambing season and changeable weather with late snow on the peaks.',
      },
      {
        label: 'Summer',
        note: 'Long daylight, warm lakes, busy trails and the best road-trip conditions.',
      },
      { label: 'Autumn', note: 'Clear, still days, golden vineyards and cooler, quieter trails.' },
      {
        label: 'Winter',
        note: 'Ski season in Queenstown, Wanaka and Canterbury; alpine roads need chains.',
      },
    ],
    gettingAround:
      'Driving is the way to see the country, and roads are good — but distances are long and the left-hand side of the road takes adjustment. Scenic trains, InterCity coaches and domestic flights link the main centres, and ferries cross Cook Strait between the islands.',
    practical: [
      { label: 'Languages', value: 'English and te reo Māori, both official.' },
      { label: 'Currency', value: 'New Zealand dollar (NZD) — cards accepted almost everywhere.' },
      { label: 'Plugs', value: 'Type I (angled two-pin), 230 V.' },
      { label: 'Tipping', value: 'Not expected; optional in restaurants and for good service.' },
      { label: 'Tap water', value: 'Safe to drink everywhere.' },
      {
        label: 'Getting in',
        value: 'Visa or NZeTA may be required; strict biosecurity rules at arrival.',
      },
    ],
    facts: [
      'New Zealand has about five million people and roughly ten times as many sheep once did — the ratio is now closer to five sheep per person.',
      'Milford Sound is technically a fjord, not a sound, being carved by glaciers.',
      'The country was the first in the world to give women the vote, in 1893.',
      'There are no native land mammals except bats.',
    ],
    currency: { code: 'NZD', name: 'New Zealand dollar', symbol: '$', approximatePerUsd: 1.66 },
    timezone: 'Pacific/Auckland',
    coordinates: { lat: -45.0312, lon: 168.6626 },
    wikipedia: 'New Zealand',
  },
  {
    slug: 'machu-picchu',
    name: 'Machu Picchu',
    country: 'Peru',
    region: 'Cusco region, Urubamba Province',
    tagline: 'Clouds over the ancient citadel',
    bestTime: 'May to September for dry, clear weather',
    overview: [
      'Machu Picchu sits at 2,430 m on a ridge above the Urubamba valley, wrapped in cloud forest and green terraces. Built in the mid-15th century and abandoned within a century, it was never found by the Spanish and came to international attention in 1911.',
      'Reaching it is part of the experience: the classic Inca Trail, shorter jungle treks, or the train to Aguas Calientes followed by a bus, or a steep staircase walk up to the Sun Gate. Sunrise mist rolling off the stones is the image most travellers carry home.',
    ],
    eat: [
      {
        name: 'Cusco market food',
        description:
          'San Pedro market for soups, tamales and fresh juice, the local daily-cooking circuit.',
      },
      {
        name: 'Andean dishes',
        description:
          'Lomo saltado, ají de gallina, alpaca steak and roast cuy, plus quinoa in every form.',
      },
      {
        name: 'Ceviche',
        description:
          'Fresh fish cured in lime and ají, best eaten at lunchtime near the coast or in Lima.',
      },
      {
        name: 'Coca tea and chicha',
        description:
          'Coca leaf tea for altitude, and purple chicha morada or fermented corn chicha.',
      },
      {
        name: 'Sacred Valley lunches',
        description:
          'Farm-to-table restaurants in Urubamba and Ollantaytambo using Andean produce.',
      },
    ],
    attractions: [
      {
        name: 'The citadel circuit',
        description:
          'Temple of the Sun, Intihuatana, the Royal Tomb and the terraced agricultural sector on timed routes.',
      },
      {
        name: 'Huayna Picchu and Machu Picchu Mountain',
        description: 'Steep extra hikes with permits limited to a few hundred people each day.',
      },
      {
        name: 'Sun Gate (Inti Punku)',
        description:
          'The Inca Trail’s arrival point, with the first wide view of the citadel below.',
      },
      {
        name: 'Inca Trail and alternative treks',
        description:
          'Four days of Andean passes and cloud forest, or shorter routes like the Salkantay and Lares treks.',
      },
      {
        name: 'Sacred Valley',
        description:
          'Pisac, Ollantaytambo, Moray and the Maras salt pans between Cusco and the citadel.',
      },
      {
        name: 'Cusco',
        description:
          'The Inca capital, with Qorikancha, Sacsayhuamán and a colonial centre built on Inca stonework.',
      },
      {
        name: 'Rainbow Mountain and Ausangate',
        description: 'High-altitude day hikes over mineral-striped ridges above 5,000 m.',
      },
    ],
    history: [
      'Machu Picchu was built around 1450 during the reign of the Inca emperor Pachacuti, most likely as a royal estate. It was abandoned about a century later, during or after the Spanish conquest, and the jungle gradually closed over it.',
      'The site was brought to worldwide attention in 1911 by the American historian Hiram Bingham, guided by local farmers who already knew it. Restoration began in the 1930s, and in 1983 it was declared a UNESCO World Heritage Site; today visitor numbers are capped to protect the stonework.',
    ],
    geography: [
      'The citadel occupies a granite saddle between Machu Picchu mountain and Huayna Picchu peak, above a switchback bend of the Urubamba River some 450 m below. Its terraces, drainage channels and stone foundations were engineered to survive earthquakes and heavy rain.',
      'The surrounding cloud forest is one of the richest biodiversity zones in the Andes, home to orchids, hummingbirds, spectacled bears and the cock-of-the-rock. The dry season runs from May to September.',
    ],
    culture: [
      'Quechua-speaking communities still farm the terraces of the Sacred Valley with the same crops the Incas grew: potatoes, maize, quinoa and coca. Weaving traditions, with textiles dyed from plants and insects, remain a living craft.',
      'Visitors are asked to follow the rules strictly: no food, no umbrellas with points, no tripods, no climbing on walls, and a single direction of travel on the one-way circuits. Local guides are licensed and required for several routes.',
    ],
    seasons: [
      {
        label: 'Dry season',
        note: 'May to September — clear skies and firm trails, the busiest months.',
      },
      {
        label: 'Shoulder months',
        note: 'April and October — mixed weather, fewer visitors, green terraces.',
      },
      {
        label: 'Wet season',
        note: 'November to March — heavy rain, muddy trails, some closures, but lush and quiet.',
      },
      {
        label: 'Festivals',
        note: 'Inti Raymi in June in Cusco is the biggest Inca festival of the year.',
      },
    ],
    gettingAround:
      'Most visitors fly to Cusco, acclimatise for a few days, then take a train from Poroy or Ollantaytambo to Aguas Calientes and a bus up to the citadel. The Inca Trail requires a permit booked months ahead with a licensed operator. Altitude is the main practical concern — take the first days slowly.',
    practical: [
      { label: 'Languages', value: 'Spanish and Quechua; English with guides.' },
      { label: 'Currency', value: 'Peruvian sol (PEN) — carry small notes for buses and markets.' },
      { label: 'Plugs', value: 'Type A/C, 220 V — bring an adapter.' },
      {
        label: 'Tipping',
        value:
          'Guides, porters and drivers expect modest tips; it is a big part of trekking income.',
      },
      { label: 'Tap water', value: 'Do not drink; bottled or purified water only.' },
      { label: 'Getting in', value: 'Entry tickets are timed and limited; book well in advance.' },
    ],
    facts: [
      'Machu Picchu was never found by the Spanish conquistadors.',
      'The site has more than 600 terraces and an Inca drainage system that still works.',
      'The Intihuatana stone is aligned so that it casts almost no shadow at the December solstice.',
      'Hiram Bingham was actually looking for the last Inca capital, Vilcabamba.',
    ],
    currency: { code: 'PEN', name: 'Peruvian sol', symbol: 'S/', approximatePerUsd: 3.8 },
    timezone: 'America/Lima',
    coordinates: { lat: -13.1631, lon: -72.545 },
    wikipedia: 'Machu Picchu',
  },
  {
    slug: 'antarctica',
    name: 'Antarctica',
    country: 'Antarctica',
    region: 'Antarctic Peninsula and the Ross Sea sector',
    tagline: 'Penguins on the edge of the world',
    bestTime: 'November to March, the southern summer',
    overview: [
      'Antarctica is the coldest, driest and windiest continent, holding around 90% of the world’s ice. There are no cities and no permanent residents — only research stations, and in summer a few thousand scientists, support staff and expedition travellers.',
      'Most visitors arrive by expedition ship from Ushuaia across the Drake Passage to the Antarctic Peninsula, a mountainous arm of ice and rock that reaches towards South America. Days are spent on zodiac landings among penguin colonies, at research huts and beneath glaciers that calve into the sea.',
    ],
    eat: [
      {
        name: 'Expedition ship dining',
        description:
          'Three meals a day with a kitchen built for rough seas: soups, roasts, stews and hot bread.',
      },
      {
        name: 'Argentine gateway food',
        description:
          'Ushuaia is the departure point — expect Patagonian lamb and king crab before boarding.',
      },
      {
        name: 'Polar tea and thermos coffee',
        description: 'Zodiac excursions run on flasks of hot drinks handed out at the gangway.',
      },
      {
        name: 'Antarctic trivia',
        description:
          'Some cuisines stretch to volcano-heated stone cooking and very carefully rationed fresh greens.',
      },
    ],
    attractions: [
      {
        name: 'Penguin colonies',
        description:
          'Adélie, gentoo and chinstrap rookeries, with strict distance rules to protect nesting birds.',
      },
      {
        name: 'Lemaire Channel and Paradise Harbour',
        description:
          'Narrow, iceberg-strewn channels framed by towering ice cliffs, sailed by expedition ships.',
      },
      {
        name: 'Deception Island',
        description:
          'A drowned volcanic caldera used in the whaling era, with a shoreline of black volcanic sand.',
      },
      {
        name: 'Historic huts and whaling stations',
        description:
          'Shackleton-era huts and derelict whaling facilities preserved as heritage sites.',
      },
      {
        name: 'Scientific research stations',
        description:
          'Port Lockroy’s post office and museum, and international bases studying ice, climate and wildlife.',
      },
      {
        name: 'Camping, kayaking and polar plunges',
        description: 'Optional expedition activities, weather and permits permitting.',
      },
      {
        name: 'The Drake Passage',
        description:
          'Two days of open Southern Ocean — rough in reputation, unforgettable in albatross sightings.',
      },
    ],
    history: [
      'Explorers only sighted the continent in 1820, with Irishman Edward Bransfield and Russian Fabian Gottlieb von Bellingshausen among the first. The 19th century brought sealers and whalers in enormous numbers, followed by scientific expeditions.',
      'The race to the South Pole ended with Roald Amundsen’s Norwegian team reaching it in December 1911, a month before Robert Falcon Scott’s party. The 1959 Antarctic Treaty reserved the continent for peaceful and scientific use, and tourism has been regulated under it since the 1960s.',
    ],
    geography: [
      'Antarctica is the fifth-largest continent at roughly 14 million square kilometres, with the Ross Ice Shelf and Ronne Ice Shelf the largest floating ice bodies. The ice sheet averages about 1.9 km thick and holds most of the planet’s fresh water.',
      'It is a polar desert — the interior receives almost no precipitation — and recorded temperatures have fallen below −89 °C. Winds and the ozone hole are part of the science; in summer the sun does not set, giving 24-hour daylight for fieldwork and excursions.',
    ],
    culture: [
      'Antarctic culture is scientific and expeditionary: rotating research teams, shared stations, multilingual crews and a strict international etiquette. Nobody holds citizenship of Antarctica, and every activity is governed by the Antarctic Treaty and IAATO guidelines.',
      'For visitors that means biosecurity: vacuum your clothing to remove seeds, disinfect boots between landings, keep the prescribed distance from wildlife and take nothing but photographs. The continent has no indigenous population and no fixed currency.',
    ],
    seasons: [
      {
        label: 'Early summer',
        note: 'November to early December — pristine snow, courtship displays, colder and quieter.',
      },
      {
        label: 'High summer',
        note: 'Late December to January — long daylight, hatching chicks, peak expedition season.',
      },
      {
        label: 'Late summer',
        note: 'February to March — whales are most numerous and penguin chicks fledge.',
      },
      {
        label: 'Polar winter',
        note: 'April to October — stations run on skeleton crews; tourism does not operate.',
      },
    ],
    gettingAround:
      'Expedition ships are the transport system, sailing from Ushuaia, Punta Arenas or Christchurch; the flight-and-cruise option skips the Drake Passage from Chile. Landings are made by zodiac or helicopter, always with a guide, and itineraries change with ice and weather. Nothing here is on a timetable you control.',
    practical: [
      {
        label: 'Language',
        value: 'No official language — English is the working language of most expeditions.',
      },
      {
        label: 'Currency',
        value: 'None official; US dollars circulate at stations and shipboard accounts.',
      },
      { label: 'Plugs', value: 'Ship- and station-specific — bring adapters and a power bank.' },
      {
        label: 'Tipping',
        value: 'Not part of local culture, but expedition staff tips are customary on some ships.',
      },
      {
        label: 'Water',
        value: 'Provided aboard ship; the interior is a desert with almost no liquid water.',
      },
      {
        label: 'Getting in',
        value:
          'No visa — but you must travel with an IAATO-member operator and pass biosecurity checks.',
      },
    ],
    facts: [
      'Antarctica holds about 90% of the world’s ice and 70% of its fresh water.',
      'It is the only continent with no permanent human residents and no native land mammals.',
      'The Antarctic Treaty of 1959 bans military activity, mining and nuclear tests.',
      'Emperor penguins are the only birds that breed in the Antarctic winter.',
    ],
    currency: { code: 'USD', name: 'US dollar (unofficial)', symbol: '$', approximatePerUsd: 1 },
    timezone: 'Antarctica/McMurdo',
    coordinates: { lat: -77.8419, lon: 166.6863 },
    wikipedia: 'Antarctica',
  },
  {
    slug: 'canada',
    name: 'Canada',
    country: 'Canada',
    region: 'Banff and the Canadian Rockies, with the big cities beyond',
    tagline: 'Mountain town mornings in Banff',
    bestTime: 'June to September for hiking, or January to March for snow',
    overview: [
      'Canada is a country built at two scales at once. Toronto, Montreal and Vancouver are dense, cosmopolitan and easy to travel without a car, while the Rockies, the prairies and the far north are measured in days of driving and weeks of silence.',
      'Banff, in Alberta, is the classic first stop: a small town in a national park, ringed by peaks, with turquoise lakes an hour away in every direction. From there the Icefields Parkway runs north through the mountains to Jasper, one of the great drives on earth.',
    ],
    eat: [
      {
        name: 'Poutine',
        description:
          'Fries, cheese curds and hot gravy — the Quebec invention that became a national dish, best from a roadside diner.',
      },
      {
        name: 'Butter tarts and Nanaimo bars',
        description:
          'Two sweet national institutions: runny butter tarts from Ontario and the layered chocolate-custard bar named after a Vancouver Island city.',
      },
      {
        name: 'Pacific salmon and seafood',
        description:
          'Sockeye, halibut and spot prawns in Vancouver and on Vancouver Island, grilled or as fish and chips on the dock.',
      },
      {
        name: 'Sugar shacks',
        description:
          'In Quebec in early spring, cabanes à sucre serve maple syrup poured over snow, ham, eggs and beans.',
      },
      {
        name: 'Markets and food halls',
        description:
          'Toronto’s St Lawrence Market, Montreal’s Jean-Talon and Vancouver’s Granville Island for cheese, bread and smoked meat.',
      },
    ],
    attractions: [
      {
        name: 'Banff and Lake Louise',
        description:
          'A national park town with hot springs, a gondola up Sulphur Mountain and the glacier-fed lake an hour up the valley.',
      },
      {
        name: 'Icefields Parkway',
        description:
          'The 230 km drive from Lake Louise to Jasper, past glaciers, waterfalls and the Columbia Icefield.',
      },
      {
        name: 'Niagara Falls',
        description:
          'Three waterfalls on the US border, an easy day trip from Toronto; the boat ride into the mist is worth the raincoat.',
      },
      {
        name: 'Vancouver and Stanley Park',
        description:
          'Rainforest, seawall and mountains within a city of glass towers, with Whistler two hours north.',
      },
      {
        name: 'Old Québec and Montreal',
        description:
          'A walled French-speaking city on a cliff, and Canada’s most European metropolis an hour away.',
      },
      {
        name: 'Yukon and the northern lights',
        description:
          'Whitehorse and Dawson City in winter, with aurora season running from late August to mid-April.',
      },
    ],
    history: [
      'Indigenous peoples have lived across what is now Canada for thousands of years, and their languages, treaties and land claims shape the country today. French and British colonies followed from the sixteenth century, and the two powers fought over the territory until Britain took Quebec in 1759.',
      'Confederation in 1867 joined four provinces into a self-governing dominion, and the transcontinental railway pulled the rest together over the following decades. Canada became fully independent in law in 1982, and today it is officially bilingual and among the most multicultural countries in the world.',
    ],
    geography: [
      'Canada is the second-largest country by area. The Canadian Shield, a vast expanse of ancient rock and lake, covers much of the centre and north; the prairies run down the middle; the Rockies and Coast Mountains wall off the Pacific; and the Arctic archipelago reaches to the pole.',
      'It holds more lakes than the rest of the world combined, and the longest coastline of any country — over 200,000 km including islands.',
    ],
    culture: [
      'Bilingualism is real: French is the first language of Quebec and is protected by law, and signs, services and schools are mirrored across the country. Politeness is not a myth either — “sorry” is reflexive, and queues form without being asked.',
      'Hockey functions as a shared second language in winter, and the country’s self-image leans on wildness: the cottage, the canoe and the long drive over the mountains.',
    ],
    seasons: [
      {
        label: 'Spring',
        note: 'Late and wet in most of the country; ski season runs into May in the Rockies.',
      },
      {
        label: 'Summer',
        note: 'Long, warm and crowded in the parks; daylight stretches past 10 pm.',
      },
      {
        label: 'Autumn',
        note: 'Maple colour from late September, sharp light and fewer visitors.',
      },
      {
        label: 'Winter',
        note: 'Serious cold in the east, powder and aurora in the west and north.',
      },
    ],
    gettingAround:
      'Distances are continental, so most trips mix flights with a rental car. In the cities, Toronto, Montreal and Vancouver have clean, safe metro systems. VIA Rail’s corridor service links Toronto, Ottawa and Montreal, and the Rocky Mountaineer and the Canadian cross the west by rail.',
    practical: [
      { label: 'Language', value: 'English and French; French dominates in Quebec.' },
      { label: 'Currency', value: 'Canadian dollar (CAD) — cards accepted almost everywhere.' },
      { label: 'Plugs', value: 'Type A/B, 120 V — bring an adapter for European plugs.' },
      { label: 'Tipping', value: 'Expected: 15–20% in restaurants and for taxis.' },
      { label: 'Tap water', value: 'Safe to drink everywhere, including in the parks.' },
      {
        label: 'Getting in',
        value: 'Visa or eTA depending on nationality; national park passes are separate.',
      },
    ],
    facts: [
      'Canada has the longest coastline of any country — more than 200,000 km.',
      'It contains more lakes than every other country in the world combined.',
      'Almost half the country is forest, and most Canadians live within 300 km of the US border.',
      'Banff, founded in 1885, was Canada’s first national park and only the third in the world.',
    ],
    currency: { code: 'CAD', name: 'Canadian dollar', symbol: 'C$', approximatePerUsd: 1.37 },
    timezone: 'America/Edmonton',
    coordinates: { lat: 51.1784, lon: -115.5708 },
    wikipedia: 'Canada',
  },
  {
    slug: 'united-states-of-america',
    name: 'United States of America',
    country: 'United States of America',
    region: 'New York City, the national parks and the Pacific coast',
    tagline: 'Bridge lights and the Manhattan skyline',
    bestTime: 'April to June and September to October in most of the country',
    overview: [
      'The United States rewards choosing a shape for your trip rather than trying to see the whole thing. New York is the easiest city to arrive in: walkable, loud and dense, with the skyline, the bridges and a different neighbourhood every twenty blocks.',
      'From there the country opens out. The national parks of the west — Grand Canyon, Yellowstone, Yosemite — are best done by road, with long drives between them, and the Pacific coast from San Francisco to Seattle is one of the great coastal roads.',
    ],
    eat: [
      {
        name: 'Diners and breakfast',
        description:
          'Pancakes, eggs over easy and bottomless coffee, served all day in a booth — the most American meal there is.',
      },
      {
        name: 'Barbecue',
        description:
          'Regional and serious: brisket and sausage in Texas, pulled pork and vinegar sauce in the Carolinas, ribs and burnt ends in Kansas City.',
      },
      {
        name: 'Pizza by the slice',
        description:
          'A New York slice eaten standing up, or Chicago’s deep dish — a long-running argument best settled by trying both.',
      },
      {
        name: 'Food trucks and taco trucks',
        description:
          'Korean-Mexican fusion in Los Angeles, birria and al pastor anywhere in the south-west, lobster rolls in New England.',
      },
      {
        name: 'Southern and soul food',
        description:
          'Fried chicken, gumbo, shrimp and grits, collard greens and cornbread across Louisiana, Georgia and the Carolinas.',
      },
    ],
    attractions: [
      {
        name: 'New York City',
        description:
          'The Brooklyn Bridge at sunrise, the Met, Central Park, and views from the Empire State Building outside rush hour.',
      },
      {
        name: 'Grand Canyon',
        description:
          'Twenty-nine kilometres of canyon in Arizona, best at sunrise from the South Rim or from a raft on the river.',
      },
      {
        name: 'Yellowstone and Grand Teton',
        description:
          'Geysers, hot springs, bison and grizzly country in Wyoming, linked by a short drive over the pass.',
      },
      {
        name: 'Yosemite',
        description:
          'Granite walls and waterfalls in California, an easy drive from San Francisco and busiest from May to September.',
      },
      {
        name: 'Washington, D.C.',
        description:
          'The National Mall, the Smithsonian museums — most of them free — and the monuments lit up after dark.',
      },
      {
        name: 'Pacific Coast Highway',
        description:
          'The Big Sur stretch between San Francisco and Los Angeles, with elephant seals, redwoods and constant ocean views.',
      },
    ],
    history: [
      'Indigenous nations had lived across the continent for millennia before European colonisation, and thirteen British colonies declared independence in 1776. The constitution of 1787 created a federal republic, and the nineteenth century expanded it across the continent through purchase, war and settlement.',
      'A civil war between 1861 and 1865 ended slavery, and the twentieth century saw mass immigration, industrial power and the civil rights movement. The United States remains a federal union of fifty states, each with its own laws.',
    ],
    geography: [
      'The lower forty-eight states run from the Atlantic coastal plain to the Appalachian mountains, across the Mississippi basin and the Great Plains, up to the Rockies and down to the deserts and Pacific coast. Alaska adds glaciers and tundra; Hawaii adds tropical volcanoes.',
      'The scale is the point: California is roughly the size of Germany, and driving from New York to Los Angeles takes about four days.',
    ],
    culture: [
      'American friendliness is genuine and relatively unguarded — strangers will ask how you are and mean it loosely. Tipping is not optional: 15–20% at table service, and a dollar or two per drink at a bar.',
      'Regional identity is strong, from Southern hospitality to Pacific Northwest coffee culture, and road trips, diners and college sports bind the country loosely together.',
    ],
    seasons: [
      {
        label: 'Spring',
        note: 'Blossom in the east, wildflower desert in the south-west, still snowy in the high parks.',
      },
      {
        label: 'Summer',
        note: 'Hot and heavily booked; national parks fill up and reserving is essential.',
      },
      {
        label: 'Autumn',
        note: 'New England foliage and clear desert weather — the best all-round month.',
      },
      {
        label: 'Winter',
        note: 'Skiing in the Rockies and New England; mild in Florida and the south-west.',
      },
    ],
    gettingAround:
      'Flying is the default between regions, and Amtrak works well in the north-east corridor. A car is essential in the west and for national parks — book early, as one-way rentals are common. New York, Chicago, Washington and Boston have good subway systems; almost everywhere else expects you to drive.',
    practical: [
      {
        label: 'Language',
        value: 'English; Spanish is widely spoken in the south-west and Florida.',
      },
      { label: 'Currency', value: 'US dollar (USD)' },
      { label: 'Plugs', value: 'Type A/B, 120 V, 60 Hz.' },
      { label: 'Tipping', value: 'Expected — 15–20% in restaurants, plus tax added at the till.' },
      { label: 'Tap water', value: 'Safe to drink almost everywhere.' },
      {
        label: 'Getting in',
        value: 'Visa or ESTA; national park entry often needs a timed reservation.',
      },
    ],
    facts: [
      'The national park system covers more than 400 sites, including 63 designated national parks.',
      'Yellowstone, established in 1872, was the world’s first national park.',
      'Around 40% of Americans live within 100 km of a coastline.',
      'Route 66, opened in 1926, once ran over 3,900 km from Chicago to Santa Monica.',
    ],
    currency: { code: 'USD', name: 'US dollar', symbol: '$', approximatePerUsd: 1 },
    timezone: 'America/New_York',
    coordinates: { lat: 40.7128, lon: -74.006 },
    wikipedia: 'United States',
  },
  {
    slug: 'maldives',
    name: 'Maldives',
    country: 'Maldives',
    region: 'Malé, the atolls and the resort islands',
    tagline: 'Lagoon water in every shade of blue',
    bestTime: 'November to April, the north-east monsoon and the dry season',
    overview: [
      'The Maldives is 1,192 coral islands spread across 26 atolls, and just about 200 of them are inhabited. Resorts occupy their own islands, which means the standard day is unusually simple: reef, lagoon, sandbank, dinner, stars.',
      'Above the water the country is flatter than almost anywhere on earth — the highest natural point is under three metres — and the light does most of the work. Under the water it is one of the best diving destinations in the world, with manta rays, whale sharks and coral gardens on the atoll edges.',
    ],
    eat: [
      {
        name: 'Mas huni and roshi',
        description:
          'The classic Maldivian breakfast: shredded smoked tuna with coconut, onion and chilli, wrapped in a flatbread.',
      },
      {
        name: 'Garudhiya',
        description:
          'A clear fish broth served with rice, lime and chilli; the everyday dish of the islands and usually the best thing on the table.',
      },
      {
        name: 'Hedhikaa',
        description:
          'Short eats sold from small cafés — deep-fried fish balls, tuna rolls and sweet coconut parcels — best with black tea.',
      },
      {
        name: 'Reef fish',
        description:
          'Tuna, snapper and jobfish, grilled with lime and chilli. Fishing is still the second pillar of the economy after tourism.',
      },
      {
        name: 'Resort dining',
        description:
          'Island resorts run buffets and overwater restaurants, often with a sandbank picnic or a private dinner on the beach.',
      },
    ],
    attractions: [
      {
        name: 'Overwater villas',
        description:
          'The signature stay: rooms on stilts above the lagoon with a ladder into the water and glass panels in the floor.',
      },
      {
        name: 'Snorkelling and diving',
        description:
          'House reefs are swimmable from shore; boat dives reach channels where mantas and whale sharks feed on plankton.',
      },
      {
        name: 'South Ari atoll',
        description:
          'One of the few places where whale sharks are resident all year, making sightings very likely.',
      },
      {
        name: 'Malé',
        description:
          'The crowded, colourful capital with a fish market, the seventeenth-century Old Friday Mosque and the artificial beach.',
      },
      {
        name: 'Sandbanks and picnic islands',
        description:
          'Bare white sandbanks that appear at low tide, plus local islands with guesthouses and public beaches.',
      },
      {
        name: 'Seaplane atolls',
        description:
          'Flying between atolls at low altitude is the best sightseeing in the country, and often the only way to reach a resort.',
      },
    ],
    history: [
      'The islands were settled over two thousand years ago from South Asia and became Buddhist, before converting to Islam in the twelfth century. A sultanate ruled for centuries, with Portuguese, Dutch and finally British influence arriving through the colonial era.',
      'The Maldives became a British protectorate and then, in 1965, an independent sultanate, followed by a republic in 1968. Tourism began in 1972 with one resort, and the industry has since transformed the country’s economy.',
    ],
    geography: [
      'The archipelago is a double chain of coral atolls running north to south for about 870 km, built on the tops of ancient volcanic ridges. Each atoll is a ring of reef and islands around a lagoon, averaging little more than a metre above sea level.',
      'Because the islands are so low, tides, monsoon swell and sea-level rise are existential concerns, and the country has been among the loudest voices in international climate negotiations.',
    ],
    culture: [
      'The Maldives is a Muslim country: alcohol is served in resorts but not on inhabited local islands, and conservative dress is expected in villages and in Malé.',
      'Dhivehi, the local language, uses its own script, and the culture is carried by fishing, boat-building and the rhythms of the monsoon. Island life is unhurried, and hospitality is taken seriously.',
    ],
    seasons: [
      {
        label: 'North-east monsoon',
        note: 'November to April: dry, sunny and calm — the peak and most expensive season.',
      },
      {
        label: 'South-west monsoon',
        note: 'May to October: wetter and windier, lower prices, and the best manta and whale-shark plankton blooms.',
      },
      {
        label: 'Shoulder months',
        note: 'April and November bring the best balance of weather and value.',
      },
      { label: 'Temperature', note: 'Close to 30 °C year round, with warm water and humidity.' },
    ],
    gettingAround:
      'Inter-island travel is by seaplane, domestic flight, speedboat or the public dhoni ferries that link local islands. Resorts arrange transfers to match flight arrivals, and seaplane transfers operate in daylight only. Within an island, everything is walkable or a short buggy ride.',
    practical: [
      { label: 'Language', value: 'Dhivehi; English is widely spoken in tourism.' },
      { label: 'Currency', value: 'Maldivian rufiyaa (MVR); US dollars are accepted at resorts.' },
      { label: 'Plugs', value: 'Type D/G, 230 V — most resorts also have universal sockets.' },
      {
        label: 'Tipping',
        value: 'Around 10% in resorts, plus a small note for transfers and housekeeping.',
      },
      { label: 'Tap water', value: 'Desalinated or rain-fed; bottled water is the norm.' },
      { label: 'Getting in', value: 'Thirty-day free visa on arrival for most nationalities.' },
    ],
    facts: [
      'The Maldives is the world’s lowest-lying country, with a highest natural point of about 2.4 m.',
      'Around 99% of the country is water and just 0.3% of its area is land.',
      'In 2009 the government held a cabinet meeting underwater in scuba gear to highlight sea-level rise.',
      'The country has grown its population from about 100,000 in 1965 to over 500,000 today.',
    ],
    currency: { code: 'MVR', name: 'Maldivian rufiyaa', symbol: 'Rf', approximatePerUsd: 15.4 },
    timezone: 'Indian/Maldives',
    coordinates: { lat: 3.2028, lon: 73.2207 },
    wikipedia: 'Maldives',
  },
  {
    slug: 'thailand',
    name: 'Thailand',
    country: 'Thailand',
    region: 'Bangkok, the northern temples and the Andaman coast',
    tagline: 'Temple roofs and river light',
    bestTime: 'November to February, the cool dry season',
    overview: [
      'Thailand is the classic first trip to Southeast Asia, and it still lives up to the reputation. Bangkok is loud, hot and wonderful, with golden temples along a working river, a canal network, and street food that is among the best in the world.',
      'North of the capital the country becomes cooler and calmer: Chiang Mai and the old kingdom of Lanna, elephants, rice terraces and mountain roads. South, the peninsula splits into the Gulf and the Andaman coast, where limestone islands rise straight out of green water.',
    ],
    eat: [
      {
        name: 'Street food',
        description:
          'Grills, noodle carts and woks on every corner; Bangkok and Chiang Mai both run famous night markets where a full meal costs very little.',
      },
      {
        name: 'Pad thai and som tam',
        description:
          'Rice noodles with tamarind and peanuts, and green papaya salad pounded with lime, chilli and fish sauce.',
      },
      {
        name: 'Curries',
        description:
          'Green, red, massaman and the northern curry khao soi — coconut broth, egg noodles and pickles.',
      },
      {
        name: 'Northern cooking',
        description:
          'Sai ua sausage, nam prik dips and sticky rice in Chiang Mai, served in bamboo baskets with the fingers.',
      },
      {
        name: 'Mango sticky rice',
        description:
          'Glutinous rice, coconut cream and ripe mango in season from April to May, and often year round in markets.',
      },
    ],
    attractions: [
      {
        name: 'Grand Palace and Wat Phra Kaew',
        description:
          'The royal compound and the Emerald Buddha in Bangkok; go at opening time to beat the heat and the crowds.',
      },
      {
        name: 'Wat Pho and Wat Arun',
        description:
          'The reclining Buddha and the riverside Temple of Dawn, best crossed by the orange-flag ferry for a few baht.',
      },
      {
        name: 'Ayutthaya',
        description:
          'The ruined capital of a kingdom that ruled for four centuries, an hour north of Bangkok and easily cycled.',
      },
      {
        name: 'Chiang Mai',
        description:
          'A walled old town of temples and cafés, with Doi Suthep on the mountain above it and markets every night.',
      },
      {
        name: 'Andaman islands',
        description:
          'Phang Nga Bay’s limestone towers, Phi Phi’s beaches and the quieter diving islands of Ko Lanta and Ko Lipe.',
      },
      {
        name: 'Khao Yai and Khao Sok',
        description:
          'National parks with gibbons, hornbills and, at Khao Sok, a lake of drowned mountains and floating huts.',
      },
    ],
    history: [
      'Thai history runs through the kingdoms of Sukhothai and Ayutthaya, which traded with China, India and Europe and left behind the country’s defining temple styles. Ayutthaya fell to Burma in 1767, and the capital moved to Bangkok shortly afterwards.',
      'Thailand was never colonised, which it regards as a point of national pride. The absolute monarchy ended in 1932, and the country has alternated between elected governments and military rule ever since, with the monarchy still central to public life.',
    ],
    geography: [
      'Thailand has four natural regions: the northern mountains, the central plain of the Chao Phraya river, the dry north-eastern plateau of Isan, and the long southern peninsula between the Gulf of Thailand and the Andaman Sea.',
      'The peninsula narrows to the Isthmus of Kra and carries rainforest, rubber plantations and the limestone karsts that give the Andaman coast its shape.',
    ],
    culture: [
      'The wai — palms pressed together with a slight bow — is the standard greeting, and the head and feet carry symbolic weight: do not touch either. Shoes come off in temples and homes, and shoulders and knees should be covered at religious sites.',
      'The monarchy is deeply revered and protected by law, so keep comment neutral. Beyond the formalities Thai social life is famously relaxed: sanuk (fun) and sabai (comfortable) are treated as legitimate goals.',
    ],
    seasons: [
      {
        label: 'Cool season',
        note: 'November to February: dry, comfortable and busy — the best time to travel.',
      },
      {
        label: 'Hot season',
        note: 'March to May: temperatures above 35 °C, with Songkran water festival in April.',
      },
      {
        label: 'Green season',
        note: 'June to October: rain in short heavy bursts, lush landscapes and lower prices.',
      },
      {
        label: 'Coasts differ',
        note: 'The Gulf and Andaman monsoons peak at different times, so one coast is usually workable.',
      },
    ],
    gettingAround:
      'Bangkok’s BTS Skytrain and MRT metro avoid the worst traffic; elsewhere use the meter or a ride-hailing app rather than negotiating with tuk-tuks. Domestic flights are cheap and quick, overnight trains reach Chiang Mai, and ferries and speedboats link the islands; on the Andaman coast, check sea conditions in the monsoon.',
    practical: [
      { label: 'Language', value: 'Thai; English works in hotels and tourist areas.' },
      { label: 'Currency', value: 'Thai baht (THB)' },
      { label: 'Plugs', value: 'Type A/B/C, 230 V — adapters are easy to buy locally.' },
      {
        label: 'Tipping',
        value: 'Not expected; rounding up or 10% in restaurants is appreciated.',
      },
      {
        label: 'Tap water',
        value: 'Not recommended — bottled or filtered water is cheap and universal.',
      },
      { label: 'Getting in', value: 'Visa exemption or visa on arrival depending on nationality.' },
    ],
    facts: [
      'Thailand means “land of the free” and is the only Southeast Asian country never colonised.',
      'Bangkok’s full ceremonial name is the longest place name in the world.',
      'There are more than 40,000 Buddhist temples in the country.',
      'Songkran, the April new year festival, has become the world’s largest water fight.',
    ],
    currency: { code: 'THB', name: 'Thai baht', symbol: '฿', approximatePerUsd: 35 },
    timezone: 'Asia/Bangkok',
    coordinates: { lat: 13.7563, lon: 100.5018 },
    wikipedia: 'Thailand',
  },
  {
    slug: 'malaysia',
    name: 'Malaysia',
    country: 'Malaysia',
    region: 'Kuala Lumpur, Penang and Malaysian Borneo',
    tagline: 'Twin towers above a green city',
    bestTime: 'February to April, or June to September',
    overview: [
      'Malaysia splits into two halves: the peninsula, where Kuala Lumpur’s skyline sits an hour from colonial hill towns and beaches, and Borneo, where the rainforest is older than the Amazon and orangutans still live wild.',
      'It is also the easiest place in Southeast Asia to eat well cheaply. Hawker centres and mamak stalls run late into the night, Chinese, Malay and Indian kitchens sit side by side, and the food is arguably the main reason to come.',
    ],
    eat: [
      {
        name: 'Nasi lemak',
        description:
          'Rice cooked in coconut milk with sambal, anchovies, peanuts and egg — the national breakfast, wrapped in banana leaf.',
      },
      {
        name: 'Hawker centres',
        description:
          'Open-air food courts where each stall specialises in one dish; pick a table, order drinks and eat from several stalls.',
      },
      {
        name: 'Penang street food',
        description:
          'Char kway teow, assam laksa and cendol in George Town, widely considered the best food city in the country.',
      },
      {
        name: 'Mamak stalls',
        description:
          'Indian-Muslim cafés open around the clock for roti canai, teh tarik and nasi kandar, and the default late-night stop.',
      },
      {
        name: 'Durian season',
        description:
          'From June to August, roadside stalls sell the famously pungent fruit, including the prized Musang King variety.',
      },
    ],
    attractions: [
      {
        name: 'Petronas Twin Towers',
        description:
          'The 452 m towers in Kuala Lumpur, joined by a skybridge; the observation deck needs a timed ticket.',
      },
      {
        name: 'Batu Caves',
        description:
          'A limestone cave temple reached by 272 painted steps, 13 km north of the city and busiest at Thaipusam.',
      },
      {
        name: 'George Town, Penang',
        description:
          'A UNESCO heritage city of shophouses, clan jetties, street art and food courts on every corner.',
      },
      {
        name: 'Langkawi and the west coast',
        description:
          'Duty-free island with cable car, mangroves and quiet beaches, reachable by ferry or a short flight.',
      },
      {
        name: 'Cameron Highlands',
        description:
          'Tea plantations and cloud forest at 1,500 m, cool enough for strawberries and a break from the humidity.',
      },
      {
        name: 'Sabah and Sarawak',
        description:
          'Mount Kinabalu, the Sepilok orangutan centre and the caves of Mulu in Malaysian Borneo.',
      },
    ],
    history: [
      'Indian and Chinese traders shaped the peninsula for centuries, and the Malacca Sultanate made the strait a global trading hub before the Portuguese, Dutch and British took it in turn. British rule reorganised the region around tin and rubber.',
      'Independence came in 1957, and the federation of Malaysia was formed in 1963 with Sabah, Sarawak and briefly Singapore. The country has since industrialised rapidly while keeping a constitutional monarchy and a parliamentary system.',
    ],
    geography: [
      'Peninsular Malaysia runs south from Thailand to Singapore, divided by the Titiwangsa range, with rainforest, tin-mining valleys and mangrove coasts on both sides. The east coast faces the South China Sea, and the west the Malacca Strait.',
      'Borneo Malaysia — Sabah and Sarawak — holds some of the oldest rainforest on earth, along with Mount Kinabalu at 4,095 m and the limestone caves of Mulu.',
    ],
    culture: [
      'Malaysia is officially Muslim, with significant Chinese, Indian and indigenous populations. That means Ramadan bazaars, Chinese New Year, Deepavali and Gawai are all public celebrations, and “open house” during festivals genuinely means anyone may visit.',
      'Everyday customs vary by community: shoes off in homes and temples, right hand for eating and giving, and dress that is modest in rural areas and on the east coast.',
    ],
    seasons: [
      {
        label: 'Dry west coast',
        note: 'December to March is the best window for Langkawi, Penang and Kuala Lumpur.',
      },
      {
        label: 'Dry east coast',
        note: 'April to October suits the Perhentian islands and the South China Sea side.',
      },
      {
        label: 'Borneo',
        note: 'Rain year round; the driest months are March to April and September.',
      },
      {
        label: 'Heat',
        note: 'Hot and humid all year, with heavy afternoon downpours possible in any month.',
      },
    ],
    gettingAround:
      'Kuala Lumpur is well served by the LRT, MRT and monorail, and the KLIA Ekspres links the airport in 28 minutes; Grab works across the country. Buses and ferries run to Penang and Langkawi, and cheap domestic flights are the practical way to reach Borneo.',
    practical: [
      {
        label: 'Language',
        value: 'Malay; English is widely spoken, with Chinese and Tamil communities too.',
      },
      { label: 'Currency', value: 'Malaysian ringgit (MYR)' },
      { label: 'Plugs', value: 'Type G, 240 V — the same three-pin plugs as the UK.' },
      {
        label: 'Tipping',
        value: 'Not expected; service charges appear on hotel and restaurant bills.',
      },
      { label: 'Tap water', value: 'Boil or filter it; bottled water is cheap.' },
      {
        label: 'Getting in',
        value: 'Visa-free entry for many nationalities; check the limit for yours.',
      },
    ],
    facts: [
      'The Petronas Twin Towers were the world’s tallest buildings from 1998 to 2004.',
      'Malaysian Borneo’s rainforest is estimated at around 130 million years old, older than the Amazon.',
      'The country is one of the world’s largest producers of palm oil and rubber.',
      'Mount Kinabalu, at 4,095 m, is one of the highest peaks in Southeast Asia and climbable in two days.',
    ],
    currency: { code: 'MYR', name: 'Malaysian ringgit', symbol: 'RM', approximatePerUsd: 4.4 },
    timezone: 'Asia/Kuala_Lumpur',
    coordinates: { lat: 3.139, lon: 101.6869 },
    wikipedia: 'Malaysia',
  },
  {
    slug: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    region: 'Marina Bay, the historic districts and the nature reserves',
    tagline: 'Marina Bay glowing at dusk',
    bestTime: 'Year round; February to April is usually the driest',
    overview: [
      'Singapore is a city-state, an island and, in practice, a single continuous garden. It is small enough to cross in forty minutes by metro, immaculately run, and unexpectedly green — rainforest reserves, tree-lined expressways and a botanic garden that is a UNESCO site.',
      'The centre divides neatly: colonial-era riverfront and Marina Bay with its light show, and the historic quarters of Chinatown, Little India and Kampong Glam, each with its own temples, mosques and food. Almost everything worth seeing is on the metro.',
    ],
    eat: [
      {
        name: 'Hawker centres',
        description:
          'The city’s collective canteen, and the cheapest good food anywhere: Maxwell, Old Airport Road and Tekka are all worth a detour.',
      },
      {
        name: 'Hainanese chicken rice',
        description:
          'Poached chicken, fragrant rice and chilli sauce — the national dish, and the one Singaporeans argue about most.',
      },
      {
        name: 'Chilli crab',
        description:
          'Whole crab in a sweet, sour, egg-thickened sauce, eaten with fried mantou buns and far too many napkins.',
      },
      {
        name: 'Laksa and bak chor mee',
        description:
          'Coconut curry noodle soup and minced pork noodles — two of the dishes that draw queues across the island.',
      },
      {
        name: 'Kaya toast and kopi',
        description:
          'Breakfast of coconut jam on thin toast with soft-boiled eggs and strong local coffee, served in old-school coffee shops.',
      },
    ],
    attractions: [
      {
        name: 'Gardens by the Bay',
        description:
          'The Supertree grove and the cooled glass conservatories beside Marina Bay, best at dusk when the light show starts.',
      },
      {
        name: 'Marina Bay Sands',
        description:
          'The boat-shaped skyline icon, with the observation deck, a light and water show below and the ArtScience Museum next door.',
      },
      {
        name: 'Singapore Botanic Gardens',
        description:
          'A UNESCO site with the National Orchid Garden inside; free to enter and open from early morning.',
      },
      {
        name: 'Chinatown, Little India and Kampong Glam',
        description:
          'Three heritage districts with temples, mosques and shophouses, all within a few metro stops of each other.',
      },
      {
        name: 'Sentosa and the southern islands',
        description:
          'Beaches, cable car and theme parks for families, with quieter stretches on Lazarus and St John islands.',
      },
      {
        name: 'Night Safari and MacRitchie',
        description:
          'The world’s first nocturnal wildlife park, and a treetop walk through primary rainforest in the city centre.',
      },
    ],
    history: [
      'Singapore was a fishing village and trading post for centuries before Stamford Raffles established a British free port there in 1819. Its position on the Malacca Strait made it a hub for tin, rubber and shipping, and waves of migration created today’s multi-ethnic society.',
      'The island was occupied during the Second World War and then merged briefly with Malaysia before becoming fully independent in 1965. From there, industrial policy, public housing and a raw port turned it into one of the world’s wealthiest countries per head.',
    ],
    geography: [
      'Singapore is one main island and around 60 smaller ones, with a land area that has grown by about a quarter through reclamation since independence. It sits just north of the equator, warm and humid all year, with no true dry season.',
      'Four water catchments and a network of reservoirs supply much of its water, alongside desalination and imported supplies and recycled NEWater.',
    ],
    culture: [
      'Four official languages — English, Malay, Mandarin and Tamil — and a habit of mixing them in the same sentence. Harmony is managed deliberately: rules are clear, fines are real and enforcement is consistent.',
      'Hawker culture was added to UNESCO’s intangible heritage list in 2020, which is fitting: the food centres are where the country’s different communities actually eat together.',
    ],
    seasons: [
      {
        label: 'February to April',
        note: 'Driest stretch, with clearer skies and slightly less humidity.',
      },
      {
        label: 'May to September',
        note: 'Warm and humid with short downpours and occasional haze.',
      },
      {
        label: 'November to January',
        note: 'The wet north-east monsoon — heavy showers, but rarely all day.',
      },
      {
        label: 'Temperature',
        note: 'Around 26–32 °C all year; pack light clothes and expect air conditioning.',
      },
    ],
    gettingAround:
      'The MRT is fast, cheap and air-conditioned, and covers almost everywhere worth visiting; use a contactless card or phone, or the Singapore Tourist Pass. Buses fill the gaps, taxis and ride-hailing are metered and reliable, and the downtown areas are genuinely walkable if you accept the heat.',
    practical: [
      {
        label: 'Language',
        value: 'English is the working language, alongside Malay, Mandarin and Tamil.',
      },
      { label: 'Currency', value: 'Singapore dollar (SGD)' },
      { label: 'Plugs', value: 'Type G, 230 V.' },
      { label: 'Tipping', value: 'Not expected — a 10% service charge usually appears on bills.' },
      { label: 'Tap water', value: 'Safe to drink.' },
      {
        label: 'Getting in',
        value: 'Visa-free for most nationalities; drugs laws are extremely strict.',
      },
    ],
    facts: [
      'Singapore is one of only three surviving city-states, along with Monaco and the Vatican.',
      'The Botanic Gardens became the country’s first UNESCO World Heritage Site in 2015.',
      'Hawker culture joined UNESCO’s intangible heritage list in 2020.',
      'About 47% of the island is covered by greenery, including rooftop gardens and vertical planting.',
    ],
    currency: { code: 'SGD', name: 'Singapore dollar', symbol: 'S$', approximatePerUsd: 1.33 },
    timezone: 'Asia/Singapore',
    coordinates: { lat: 1.3521, lon: 103.8198 },
    wikipedia: 'Singapore',
  },
  {
    slug: 'indonesia',
    name: 'Indonesia',
    country: 'Indonesia',
    region: 'Bali, Java and the wider archipelago',
    tagline: 'Rice terraces north of Ubud',
    bestTime: 'May to September, the dry season in most of the country',
    overview: [
      'Indonesia is the largest archipelago in the world — over 17,000 islands strung across 5,000 km — and the most rewarding way to approach it is one island at a time. Bali is the familiar entry point: rice terraces, temples, surf beaches and a café culture that has made Ubud a destination in itself.',
      'Java holds the crowds and the monuments, from the Buddhist stupas of Borobudur to the sunrise volcanoes at Bromo and Ijen. Further east, Komodo has dragons and pink beaches, Sulawesi has reef diving around Bunaken, and Raja Ampat has the richest coral biodiversity on the planet.',
    ],
    eat: [
      {
        name: 'Nasi goreng and mie goreng',
        description:
          'Fried rice and fried noodles, the everyday staple, best from a street warung with a fried egg on top and crackers on the side.',
      },
      {
        name: 'Rendang',
        description:
          'Beef slow-cooked in coconut milk and spices until nearly dry — from West Sumatra, and repeatedly voted among the world’s best dishes.',
      },
      {
        name: 'Balinese cooking',
        description:
          'Babi guling (spit-roast pork), lawar and sate lilit, with the island’s own Hindu offering-based food culture behind it.',
      },
      {
        name: 'Warungs',
        description:
          'Small family restaurants where a full plate costs a very small amount; the freshest, cheapest and most local option.',
      },
      {
        name: 'Kopi and jamu',
        description:
          'Strong sweet coffee from Java and Sumatra, and jamu — turmeric, ginger and tamarind tonics sold in bottles on the street.',
      },
    ],
    attractions: [
      {
        name: 'Tegallalang and Ubud',
        description:
          'The terraced rice paddies north of Ubud, with the Sacred Monkey Forest and the morning market in town.',
      },
      {
        name: 'Borobudur and Prambanan',
        description:
          'The world’s largest Buddhist temple and a vast Hindu complex, both near Yogyakarta and best at sunrise.',
      },
      {
        name: 'Mount Bromo',
        description:
          'A sunrise over a volcanic caldera on Java, reached by jeep from Cemoro Lawang in the early hours.',
      },
      {
        name: 'Komodo National Park',
        description:
          'The only place on earth with wild Komodo dragons, plus Padar island viewpoints and manta dives.',
      },
      {
        name: 'Balinese temples',
        description:
          'Tanah Lot at sunset, Uluwatu above the surf, and the water temples of the interior with their purification pools.',
      },
      {
        name: 'Raja Ampat',
        description:
          'Remote West Papuan reefs with more recorded coral species than anywhere else; reached via Sorong and a liveaboard.',
      },
    ],
    history: [
      'Hindu and Buddhist kingdoms traded across the archipelago for more than a thousand years, and the Majapahit empire of Java controlled much of the region in the fourteenth century. Islam arrived through traders, and it gradually replaced Hinduism across most of the islands — Bali being the exception.',
      'The Dutch East India Company took control of the spice trade and then the territory, ruling until the Second World War and the Japanese occupation. Independence was declared in 1945 and recognised in 1949, and the republic has since grown into the world’s fourth most populous country.',
    ],
    geography: [
      'Indonesia sits on the Ring of Fire, where the Indo-Australian plate meets the Eurasian plate, giving it around 130 active volcanoes and frequent earthquakes. The archipelago has three time zones and spans the width of the United States.',
      'Rainforest covers much of Sumatra, Borneo and Papua, while the islands around Nusa Tenggara are drier and more sparsely vegetated, with savannah and scrub.',
    ],
    culture: [
      'More than 700 languages are spoken across the country, and nearly every island has its own customs. Balinese Hinduism is visible in daily offerings, temple ceremonies and cremation processions; Java is largely Muslim with a strong tradition of tolerance and mysticism.',
      'Small courtesies matter: pass things with the right hand, dress modestly at temples with a sarong and sash, and never step on the offerings left on the pavement in Bali.',
    ],
    seasons: [
      {
        label: 'Dry season',
        note: 'May to September across Java and Bali: blue skies, low humidity, and the peak months of July and August.',
      },
      {
        label: 'Wet season',
        note: 'November to March: heavy afternoon rain, greener landscapes and lower prices.',
      },
      {
        label: 'Surf season',
        note: 'April to October brings the best swell to Bali’s west coast and Uluwatu.',
      },
      {
        label: 'Diving',
        note: 'Komodo and Raja Ampat are best between October and April, when visibility peaks.',
      },
    ],
    gettingAround:
      'Domestic flights connect the main islands in an hour or two, and fast boats link Bali to the Gilis and Lombok. On Bali and in major cities, use Grab or Gojek apps for cars and scooters — a scooter is the local transport, but you need an international driving permit and a helmet. Traffic in Jakarta and southern Bali is legendary.',
    practical: [
      {
        label: 'Language',
        value: 'Indonesian (Bahasa Indonesia); English is common in tourist areas.',
      },
      { label: 'Currency', value: 'Indonesian rupiah (IDR)' },
      { label: 'Plugs', value: 'Type C/F, 230 V — bring an adapter.' },
      { label: 'Tipping', value: 'Around 5–10% is welcome in restaurants and for drivers.' },
      {
        label: 'Tap water',
        value: 'Not safe to drink; bottled water everywhere, and beware ice outside tourist areas.',
      },
      { label: 'Getting in', value: 'Visa on arrival or e-visa for most nationalities.' },
    ],
    facts: [
      'Indonesia is the world’s largest archipelago, with more than 17,000 islands.',
      'Borobudur is the largest Buddhist temple in the world, built in the ninth century.',
      'The country sits on the Ring of Fire and has around 130 active volcanoes.',
      'Komodo dragons live wild only in Komodo National Park and on a few nearby islands.',
    ],
    currency: { code: 'IDR', name: 'Indonesian rupiah', symbol: 'Rp', approximatePerUsd: 15800 },
    timezone: 'Asia/Makassar',
    coordinates: { lat: -8.4095, lon: 115.1889 },
    wikipedia: 'Indonesia',
  },
  {
    slug: 'australia',
    name: 'Australia',
    country: 'Australia',
    region: 'Sydney, the east coast and the Outback',
    tagline: 'Harbour sails and Sydney light',
    bestTime: 'September to November, and March to May',
    overview: [
      'Australia is a continent-sized country where almost everything lives on the edges. Sydney is the showpiece — a harbour you can cross by ferry, beaches inside the city and the Opera House lit up on the water — with Melbourne, Brisbane and Cairns offering very different versions of the same relaxed, outdoor life.',
      'Inland, the country empties out fast. The Outback runs from the Blue Mountains to Uluru and beyond: red dirt, empty roads, and distances measured in hours between fuel stops. Further north the Great Barrier Reef and the rainforests of Queensland turn the coast tropical.',
    ],
    eat: [
      {
        name: 'Coffee and brunch',
        description:
          'Australia takes coffee seriously — the flat white and the long black were invented here — and weekend brunch is a national ritual.',
      },
      {
        name: 'Rock oysters and seafood',
        description:
          'Sydney rock oysters, Queensland prawns and barramundi, best eaten at a fish market or a beachside takeaway.',
      },
      {
        name: 'Meat pies and sausage rolls',
        description:
          'The standard road-trip lunch, with tomato sauce; bakeries in country towns do them best.',
      },
      {
        name: 'Multicultural food cities',
        description:
          'Vietnamese in Sydney’s Cabramatta and Melbourne’s Richmond, Greek in Melbourne, Lebanese in Sydney — a legacy of postwar migration.',
      },
      {
        name: 'Barbecues',
        description:
          'Free electric and gas barbecues sit in most public parks and beaches, and locals use them constantly.',
      },
    ],
    attractions: [
      {
        name: 'Sydney Opera House and Harbour Bridge',
        description:
          'The two icons on the same water; walk the harbour foreshore at dusk or climb the bridge for the view back.',
      },
      {
        name: 'Bondi to Coogee walk',
        description:
          'A six-kilometre coastal path past beaches, cliffs and ocean pools, one of the best short walks in the country.',
      },
      {
        name: 'Great Barrier Reef',
        description:
          'The largest living structure on earth, reached from Cairns or the Whitsundays, with diving and snorkelling from the outer reefs.',
      },
      {
        name: 'Uluru and Kata Tjuta',
        description:
          'Sacred Anangu sites in the red centre, where the light changes the rock from ochre to scarlet at sunset.',
      },
      {
        name: 'Great Ocean Road',
        description:
          'The Twelve Apostles, rainforest and surf coast on a 240 km drive west of Melbourne.',
      },
      {
        name: 'Kakadu and Daintree',
        description:
          'Wetlands with crocodiles and rock art of enormous age, and the oldest tropical rainforest on earth.',
      },
    ],
    history: [
      'Aboriginal and Torres Strait Islander peoples have lived on the continent for at least 65,000 years, with cultures, languages and land management practices that are the oldest continuous traditions on earth.',
      'The First Fleet arrived in 1788, and the following century brought convict settlements, pastoral expansion, a gold rush and, in 1901, federation into a single nation. Postwar migration from Europe and then Asia reshaped the country into one of the most multicultural societies in the world.',
    ],
    geography: [
      'Australia is the world’s sixth-largest country and the only one covering an entire continent. The Great Dividing Range runs down the east coast, separating a narrow green strip from the vast inland plains and the arid centre, where rainfall is minimal and summer temperatures soar.',
      'The north is tropical, with monsoonal wet and dry seasons; the south-east and south-west have four temperate seasons; and Tasmania, across Bass Strait, is cooler and wetter than anywhere on the mainland.',
    ],
    culture: [
      'Australian social style is informal and direct — first names immediately, self-deprecation expected, and an unwritten rule against taking yourself too seriously. Sport, beaches and the outdoors organise much of public life.',
      'Aboriginal and Torres Strait Islander cultures are central to national identity, and visiting country respectfully — engaging Indigenous-owned tours and operators — is the best way to understand the landscape.',
    ],
    seasons: [
      {
        label: 'Spring',
        note: 'September to November: wildflowers, warm days and the best all-round conditions.',
      },
      {
        label: 'Summer',
        note: 'December to February: hot, crowded and, in the south-east, a serious bushfire season.',
      },
      {
        label: 'Autumn',
        note: 'March to May: mild, dry and ideal for the Outback and the southern cities.',
      },
      {
        label: 'Winter',
        note: 'June to August: cool in the south, dry and sunny in the north — the best time for the Top End.',
      },
    ],
    gettingAround:
      'Domestic flights are the practical way between cities, since distances are enormous. In Sydney, use the Opal card on trains, ferries and buses — the ferry to Manly is a cheap harbour cruise. Driving long distances in the Outback requires planning for fuel, water and wildlife at dusk; trains such as the Ghan and Indian Pacific cover the great inland routes.',
    practical: [
      { label: 'Language', value: 'English, with a fast-moving local idiom and slang.' },
      { label: 'Currency', value: 'Australian dollar (AUD)' },
      { label: 'Plugs', value: 'Type I, 230 V — the angled two-pin plug.' },
      { label: 'Tipping', value: 'Optional; 10% is generous and cafés often have a tip jar.' },
      { label: 'Tap water', value: 'Safe to drink everywhere.' },
      {
        label: 'Getting in',
        value: 'ETA or eVisitor visa; sunscreen and a hat are non-negotiable.',
      },
    ],
    facts: [
      'The Great Barrier Reef is the largest living structure on earth and visible from space.',
      'Aboriginal and Torres Strait Islander cultures are the oldest continuous cultures on the planet.',
      'About 85% of Australians live within 50 km of the coast.',
      'Uluru is roughly 3.6 km long and extends several kilometres underground.',
    ],
    currency: { code: 'AUD', name: 'Australian dollar', symbol: 'A$', approximatePerUsd: 1.5 },
    timezone: 'Australia/Sydney',
    coordinates: { lat: -33.8688, lon: 151.2093 },
    wikipedia: 'Australia',
  },
  {
    slug: 'japan',
    name: 'Japan',
    country: 'Japan',
    region: 'Tokyo, Kyoto and the Japan Alps between them',
    tagline: 'Mount Fuji above the still water',
    bestTime: 'Late March to May for cherry blossom, or October to November for autumn colour',
    overview: [
      'Japan is a country of contrasts that fit together surprisingly well: neon Tokyo and silent mountain shrines, convenience-store precision and centuries-old craft, crowded commuter trains and moss gardens where nobody speaks.',
      'The classic first route runs between Tokyo and Kyoto, with Mount Fuji somewhere in the middle. Add a night in a ryokan, a few temple days in Nara or Nikko, and the country opens up: the Japanese Alps, Hokkaido’s powder snow, and the islands of the Inland Sea.',
    ],
    eat: [
      {
        name: 'Sushi and sashimi',
        description:
          'From conveyor-belt chains to counter seats in a market — the fish comes daily and the rice is taken seriously.',
      },
      {
        name: 'Ramen',
        description:
          'Regional and fiercely debated: Sapporo miso, Tokyo shoyu, Hakata tonkotsu; order from a ticket machine and eat standing.',
      },
      {
        name: 'Izakaya',
        description:
          'Japanese pubs for small plates, sake and beer after work — the most enjoyable way to eat widely without a big bill.',
      },
      {
        name: 'Konbini food',
        description:
          'Convenience-store onigiri, egg sandwiches and hot snacks that are genuinely good, open all night on every corner.',
      },
      {
        name: 'Kaiseki and regional specialities',
        description:
          'Seasonal multi-course dinners in Kyoto, wagyu in Kobe or Matsusaka, soba and apples in Nagano, seafood in Hokkaido.',
      },
    ],
    attractions: [
      {
        name: 'Tokyo',
        description:
          'Shibuya crossing, Senso-ji temple in Asakusa, the teamLab digital museums and the fish market at Toyosu.',
      },
      {
        name: 'Kyoto',
        description:
          'Fushimi Inari’s thousand gates, Kinkaku-ji’s golden pavilion and the bamboo grove at Arashiyama — early mornings are essential.',
      },
      {
        name: 'Mount Fuji',
        description:
          'The Chureito Pagoda at Fujiyoshida, the lakes of Fuji Five Lakes, and the official climbing season in July and August.',
      },
      {
        name: 'Nara',
        description:
          'Free-roaming deer, the colossal bronze Buddha of Todai-ji and one of Japan’s oldest capitals, an easy day trip from Kyoto.',
      },
      {
        name: 'Hiroshima and Miyajima',
        description:
          'The Peace Memorial Park, and the floating torii of Itsukushima shrine at high tide.',
      },
      {
        name: 'Hokkaido',
        description:
          'World-class powder snow in Niseko and Furano, lavender fields in July, and seafood in Sapporo.',
      },
    ],
    history: [
      'Japan’s imperial line is traditionally dated to 660 BC, and for centuries power sat with shoguns and samurai rather than the court. The Edo period brought more than 200 years of enforced isolation, during which cities, theatre and a distinctly urban culture flourished.',
      'The arrival of American ships in 1853 ended that seclusion, and the Meiji Restoration of 1868 launched rapid industrialisation and imperial expansion. Defeat in 1945 was followed by occupation and an economic transformation so complete that Japan became the world’s second-largest economy by the 1980s.',
    ],
    geography: [
      'Japan is an archipelago of around 14,000 islands, though four of them hold almost all the population. Roughly three quarters of the land is mountainous, which is why cities are dense and the coast is so heavily developed.',
      'The islands sit on the Pacific Ring of Fire, with more than a hundred active volcanoes and thousands of earthquakes a year, plus the hot springs that come with them. The climate runs from subarctic Hokkaido to subtropical Okinawa.',
    ],
    culture: [
      'Manners are careful and specific: do not tip, do not eat while walking, queue where marked, and take your shoes off in homes, ryokan and some restaurants. On escalators, stand left in Tokyo and right in Osaka.',
      'Onsen etiquette matters too — wash thoroughly before entering the bath, tie long hair up, and keep towels out of the water. Politeness is a form of respect rather than distance, and small attempts at Japanese are warmly received.',
    ],
    seasons: [
      {
        label: 'Spring',
        note: 'Cherry blossom moves north from late March to early May; the busiest travel season.',
      },
      {
        label: 'Summer',
        note: 'Hot and humid, with festivals, fireworks and the Fuji climbing season in July and August.',
      },
      {
        label: 'Autumn',
        note: 'October to November: maple colour, clear air and the best all-round weather.',
      },
      {
        label: 'Winter',
        note: 'Cold and dry on the Pacific side, heavy snow on the Japan Sea and in Hokkaido.',
      },
    ],
    gettingAround:
      'The Shinkansen bullet trains are fast, punctual and the best way to travel between cities; a Japan Rail Pass pays off on long routes. In cities, IC cards such as Suica work on trains, buses and in shops, and the metro systems are bilingual and easy to navigate. Buses cover the countryside, and luggage forwarding between hotels is normal.',
    practical: [
      {
        label: 'Language',
        value: 'Japanese; English signage is common but spoken English less so.',
      },
      {
        label: 'Currency',
        value: 'Japanese yen (JPY) — carry some cash, many places are still cash-only.',
      },
      { label: 'Plugs', value: 'Type A/B, 100 V — the lowest voltage in the developed world.' },
      { label: 'Tipping', value: 'Not customary and can cause confusion; service is included.' },
      { label: 'Tap water', value: 'Safe and pleasant to drink.' },
      { label: 'Getting in', value: 'Visa-free for most nationalities for up to 90 days.' },
    ],
    facts: [
      'Japan consists of around 14,000 islands, though most people live on four of them.',
      'The Shinkansen has carried passengers since 1964 with no derailment or collision fatalities.',
      'There are more than 25,000 hot springs used as onsen across the country.',
      'Tokyo is the world’s largest metropolitan area, with around 37 million people.',
    ],
    currency: { code: 'JPY', name: 'Japanese yen', symbol: '¥', approximatePerUsd: 150 },
    timezone: 'Asia/Tokyo',
    coordinates: { lat: 35.6762, lon: 139.6503 },
    wikipedia: 'Japan',
  },
  {
    slug: 'korea',
    name: 'Korea',
    country: 'South Korea',
    region: 'Seoul, with Jeju and Busan beyond',
    tagline: 'Palaces and skylines in Seoul',
    bestTime: 'April to June, or September to November',
    overview: [
      'South Korea is a country of mountains and megacities, where a five-hundred-year-old palace stands at the end of a metro line and a hiking trail starts inside the city limits. Seoul holds most of it: hanbok-clad visitors at Gyeongbokgung, night markets, and a food scene that runs from temple kitchens to 3 a.m. fried chicken.',
      'Outside the capital, Busan has beaches and a giant fish market, Gyeongju is an open-air museum of the Silla kingdom, and Jeju island — volcanic, green and ringed by lava tubes — is a short flight away and feels like a different country.',
    ],
    eat: [
      {
        name: 'Korean barbecue',
        description:
          'Grilled pork belly and beef with lettuce, garlic and ssamjang, cooked at the table and shared, with unlimited side dishes.',
      },
      {
        name: 'Bibimbap',
        description:
          'Rice with vegetables, egg and gochujang, served in a hot stone bowl in Jeonju — the dish most often named as the national favourite.',
      },
      {
        name: 'Street food',
        description:
          'Tteokbokki, hotteok, tornado potatoes and fish cake soup from market stalls, especially at Gwangjang market in Seoul.',
      },
      {
        name: 'Jjigae and banchan',
        description:
          'Bubbling stews — kimchi, soybean and seafood — served with a table full of small side dishes that refill without asking.',
      },
      {
        name: 'Chimaek',
        description:
          'Fried chicken with cold beer, eaten late at night on a plastic stool by the river — a genuine national institution.',
      },
    ],
    attractions: [
      {
        name: 'Gyeongbokgung Palace',
        description:
          'Seoul’s main royal palace, with a guard-changing ceremony and free entry for anyone wearing a rented hanbok.',
      },
      {
        name: 'Bukchon Hanok Village',
        description:
          'Traditional tiled houses on the hill between the palaces, still lived in — keep quiet and respect residents.',
      },
      {
        name: 'Jeju Island',
        description:
          'A volcanic island with the Seongsan Ilchulbong crater, lava tubes, mandarin groves and black-stone walls.',
      },
      {
        name: 'Busan',
        description:
          'Haeundae beach, the colourful hillside village of Gamcheon and Jagalchi, the country’s largest seafood market.',
      },
      {
        name: 'Gyeongju',
        description:
          'The ancient Silla capital, with royal tombs, Bulguksa temple and the Seokguram grotto.',
      },
      {
        name: 'Seoraksan and the national parks',
        description:
          'Granite peaks, autumn colour and hiking within reach of Seoul by bus; Korea is 70% mountains.',
      },
    ],
    history: [
      'The Joseon dynasty ruled from 1392 to 1897 and left the country its palaces, Confucian academies and much of its social etiquette. Japan annexed Korea in 1910, and the colonial period lasted until 1945, followed by division and the Korean War from 1950 to 1953.',
      'The decades after the war mixed rapid industrialisation with authoritarian rule, until protests in 1987 brought democratic elections. South Korea is now an industrial and cultural power, exporting everything from semiconductors to films and music.',
    ],
    geography: [
      'The Korean peninsula is roughly 70% mountainous, with the Taebaek range running down the east coast and the flatter west giving way to rice plains and mudflats. Seoul sits near the west coast behind the Han river, which divides the city in half.',
      'Jeju, 85 km south of the mainland, is a volcanic island with a lava plateau, more than 350 parasitic cones and a network of lava tubes listed by UNESCO.',
    ],
    culture: [
      'Confucian habits persist: respect for elders, a question or two about age and work when you meet someone, and alcohol poured for others rather than yourself. Shoes come off in homes and many restaurants, and both hands are used when giving or receiving.',
      'Modern Korean culture moves fast — PC bangs, norae-bang, convenience-store dinners, coffee shops on every block — and the country’s pop culture has made the language and food familiar far beyond Asia.',
    ],
    seasons: [
      {
        label: 'Spring',
        note: 'Cherry blossom late March to mid-April, then clean, warm days into June.',
      },
      {
        label: 'Summer',
        note: 'Hot, humid and rainy from late June to July, with typhoons possible in late summer.',
      },
      {
        label: 'Autumn',
        note: 'September to November: dry, clear and the most beautiful season, with maple colour in the mountains.',
      },
      {
        label: 'Winter',
        note: 'Cold and dry, with snow in the mountains and skiing at Pyeongchang and Yongpyong.',
      },
    ],
    gettingAround:
      'Seoul’s subway is one of the largest and cheapest in the world, with English signage throughout; a T-money card covers bus and metro. The KTX high-speed rail crosses the country in two to three hours, and domestic flights reach Jeju in under an hour. Kakao Taxi is the local ride-hailing app.',
    practical: [
      { label: 'Language', value: 'Korean; English is limited outside Seoul and tourist areas.' },
      {
        label: 'Currency',
        value: 'South Korean won (KRW) — cards are accepted almost everywhere.',
      },
      { label: 'Plugs', value: 'Type C/F, 220 V, two round pins.' },
      { label: 'Tipping', value: 'Not expected and not practised.' },
      {
        label: 'Tap water',
        value: 'Generally safe, though most people drink filtered or bottled water.',
      },
      { label: 'Getting in', value: 'Visa-free entry or K-ETA depending on nationality.' },
    ],
    facts: [
      'About 70% of South Korea is mountainous, and hiking is a mainstream weekend activity.',
      'Jeju’s lava tubes are a UNESCO World Heritage Site and among the longest in the world.',
      'The country has around 200 recorded varieties of kimchi.',
      'Seoul’s subway system is one of the longest and busiest in the world.',
    ],
    currency: { code: 'KRW', name: 'South Korean won', symbol: '₩', approximatePerUsd: 1330 },
    timezone: 'Asia/Seoul',
    coordinates: { lat: 37.5665, lon: 126.978 },
    wikipedia: 'South Korea',
  },
  {
    slug: 'brazil',
    name: 'Brazil',
    country: 'Brazil',
    region: 'Rio de Janeiro and the wider country',
    tagline: 'Sugarloaf, sea and sunset',
    bestTime: 'May to September, Rio’s dry season',
    overview: [
      'Brazil is a continent pretending to be a country: the Amazon basin in the north, the wetlands of the Pantanal in the centre, the waterfalls of Iguaçu in the south and Rio de Janeiro, improbably beautiful, on the Atlantic coast.',
      'Rio is where most trips begin and end. Mountains drop straight into the sea, neighbourhoods climb the hills, and the daily rhythm runs between the beach, the bakery and the sunset. From there, the rest of the country is a set of flights and long bus rides away.',
    ],
    eat: [
      {
        name: 'Feijoada',
        description:
          'The national dish: black bean stew with pork, served with rice, farofa, kale and orange slices, traditionally on a Saturday.',
      },
      {
        name: 'Churrasco',
        description:
          'Southern Brazilian barbecue, where waiters bring skewers of beef, lamb and sausage to the table until you surrender.',
      },
      {
        name: 'Pão de queijo and tapioca',
        description:
          'Warm cheese bread from Minas Gerais, and tapioca crêpes filled sweet or savoury — the standard snack at any time of day.',
      },
      {
        name: 'Açaí and fruit',
        description:
          'Açaí bowls with granola and banana, plus mango, papaya and passion fruit that taste nothing like the exported versions.',
      },
      {
        name: 'Kilo restaurants',
        description:
          'Buffet restaurants where you fill a plate and pay by weight — the cheapest way to eat a varied lunch anywhere in the country.',
      },
    ],
    attractions: [
      {
        name: 'Christ the Redeemer',
        description:
          'The 30 m statue on Corcovado, reached by the cog train through Tijuca forest; go early for clear skies.',
      },
      {
        name: 'Sugarloaf Mountain',
        description:
          'Two cable cars to the top of the granite peak, with the best view of the bay, Botafogo and the beaches.',
      },
      {
        name: 'Copacabana and Ipanema',
        description:
          'Rio’s famous beaches, busy with football, vendors and sunset applause; stay aware of your belongings.',
      },
      {
        name: 'Iguaçu Falls',
        description:
          'A horseshoe of 275 waterfalls on the Argentine border, best seen from the Brazilian side for the panorama.',
      },
      {
        name: 'The Amazon',
        description:
          'River trips and jungle lodges from Manaus, with pink river dolphins and the meeting of the waters.',
      },
      {
        name: 'The Pantanal',
        description:
          'The world’s largest tropical wetland and the best place in Brazil to see jaguars, caimans and macaws.',
      },
    ],
    history: [
      'Millions of Indigenous people lived across the territory before Portuguese arrival in 1500, and their descendants still make up hundreds of distinct peoples. The colony grew rich on sugar, then on gold from Minas Gerais, and on the labour of enslaved Africans — Brazil was the last country in the Americas to abolish slavery, in 1888.',
      'Independence from Portugal came in 1822, followed by an empire and then a republic in 1889. The twentieth century brought industrialisation, a capital built from scratch in Brasília, and two decades of military rule from 1964 to 1985, since when the country has been a democracy.',
    ],
    geography: [
      'Brazil is the fifth-largest country in the world and covers almost half of South America. The Amazon basin occupies the north, the Pantanal wetlands sit in the centre-west, the highlands run down the south-east, and the Atlantic coastline stretches for more than 7,000 km.',
      'The Amazon rainforest covers roughly 60% of the country and is the most biodiverse place on earth, holding around a tenth of all known species.',
    ],
    culture: [
      'Brazilian social life is warm and physical: people greet with hugs and kisses, and lunch and dinner run long. Football is a shared language, and the beach is a genuine public square.',
      'Carnival is the obvious expression of the country’s musical culture, but samba, bossa nova and forró are played somewhere in every city all year. In Rio, safety is a practical matter: use registered taxis at night, carry little and take local advice.',
    ],
    seasons: [
      {
        label: 'Dry season',
        note: 'May to September: mild, sunny days in Rio and the best time for the Pantanal.',
      },
      {
        label: 'Summer',
        note: 'December to March: hot and wet, with Carnival in February and New Year on Copacabana beach.',
      },
      {
        label: 'Amazon',
        note: 'Wet season from December to May floods the forest; the dry months are easier for hiking.',
      },
      {
        label: 'South',
        note: 'Iguaçu and the southern states are cooler and can be cold in winter from June to August.',
      },
    ],
    gettingAround:
      'Brazil is the size of a continent, so long-haul travel means flying — domestic fares are high, so book early. In Rio and São Paulo the metro and suburban trains are the safest ways to move, and Uber works well. Long-distance buses are comfortable and overnight services cover routes of 12 hours or more.',
    practical: [
      { label: 'Language', value: 'Portuguese — Spanish will get you only so far.' },
      { label: 'Currency', value: 'Brazilian real (BRL)' },
      {
        label: 'Plugs',
        value: 'Type N/C, 127–220 V depending on the city — check before plugging in.',
      },
      { label: 'Tipping', value: 'Usually a 10% service charge is already on the bill.' },
      {
        label: 'Tap water',
        value: 'Safe in most cities but widely avoided; bottled or filtered water is the norm.',
      },
      {
        label: 'Getting in',
        value:
          'Visa-free or e-visa depending on nationality; yellow fever vaccination may be required.',
      },
    ],
    facts: [
      'Brazil is the fifth-largest country in the world and shares a border with every South American country except Chile and Ecuador.',
      'It has won the football World Cup five times, more than any other nation.',
      'The Amazon covers around 60% of Brazil and holds roughly a tenth of all known species.',
      'Portuguese is spoken by more than 200 million people in Brazil alone.',
    ],
    currency: { code: 'BRL', name: 'Brazilian real', symbol: 'R$', approximatePerUsd: 5.4 },
    timezone: 'America/Sao_Paulo',
    coordinates: { lat: -22.9068, lon: -43.1729 },
    wikipedia: 'Brazil',
  },
];
