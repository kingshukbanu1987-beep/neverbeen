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
    region: 'Banff and Rocky Mountains, Alberta',
    tagline: 'Turquoise lakes and mountain wilderness',
    bestTime: 'June to September for hiking, December to March for skiing',
    overview: [
      'Canada is vast, with wilderness that dwarfs its cities. The Rocky Mountains hold turquoise glacial lakes like Lake Louise and Moraine Lake, while Banff and Jasper National Parks offer bear sightings, hot springs and alpine trails.',
      'Beyond the mountains are vibrant cities — Vancouver on the Pacific, Toronto on Lake Ontario, Montreal with French heritage — and experiences from Niagara Falls to northern lights in Yukon.',
    ],
    eat: [
      { name: 'Poutine', description: 'Fries topped with cheese curds and gravy, the Quebec classic.' },
      { name: 'Maple syrup and pancakes', description: 'Breakfast with pure maple syrup from Quebec forests.' },
      { name: 'Pacific salmon', description: 'Wild salmon grilled on cedar planks in British Columbia.' },
      { name: 'Butter tarts', description: 'Sweet pastry tarts with raisins, a Canadian bakery staple.' },
    ],
    attractions: [
      { name: 'Banff and Lake Louise', description: 'Turquoise glacial lakes and gondola views above the Rockies.' },
      { name: 'Niagara Falls', description: 'Three waterfalls on the US border, best seen by boat and at night.' },
      { name: 'Vancouver and Stanley Park', description: 'Seawall cycling and mountain views minutes from downtown.' },
      { name: 'Old Quebec City', description: 'Walled French colonial streets and Château Frontenac.' },
      { name: 'CN Tower and Toronto Islands', description: 'City panorama and beach escape across the harbour.' },
      { name: 'Northern lights in Yukon', description: 'Aurora viewing in Whitehorse and wilderness lodges.' },
    ],
    history: [
      'Canada was inhabited by Indigenous peoples for millennia before French and British colonization. Confederation in 1867 united colonies into a dominion.',
      'It became fully independent with the Constitution Act of 1982 and is now a bilingual, multicultural federation known for politeness and natural resources.',
    ],
    geography: [
      'Canada is the world’s second-largest country by area, spanning six time zones from Atlantic to Pacific to Arctic. The Rocky Mountains run along the west.',
      'Forests cover 38% of the land, and it holds 20% of the world’s fresh water, with the Great Lakes and countless glacial lakes.',
    ],
    culture: [
      'Multiculturalism is official policy, with English and French as official languages. Ice hockey is a national obsession.',
      'Politeness, queuing and saying sorry are stereotypically Canadian, and Indigenous heritage is increasingly recognized.',
    ],
    seasons: [
      { label: 'Spring', note: 'Snowmelt, maple syrup season and cherry blossoms in Vancouver.' },
      { label: 'Summer', note: 'Warm, long days perfect for hiking and lake swimming.' },
      { label: 'Autumn', note: 'Spectacular maple colours, especially in Quebec and Ontario.' },
      { label: 'Winter', note: 'Ski season, ice hotels and northern lights — cold but magical.' },
    ],
    gettingAround:
      'VIA Rail connects Quebec City to Windsor, and domestic flights cover long distances. Driving is best for Rockies, with winter tyres essential. City transit is good in Vancouver, Toronto and Montreal.',
    practical: [
      { label: 'Languages', value: 'English and French.' },
      { label: 'Currency', value: 'Canadian dollar (CAD)' },
      { label: 'Plugs', value: 'Type A/B, 120 V.' },
      { label: 'Tipping', value: '15-20% in restaurants, expected.' },
      { label: 'Tap water', value: 'Safe to drink everywhere.' },
      { label: 'Getting in', value: 'eTA required for visa-free visitors; very safe.' },
    ],
    facts: [
      'Canada has more lakes than the rest of the world combined.',
      'The CN Tower was the world’s tallest free-standing structure until 2007.',
      'Canada has the longest coastline in the world at 202,080 km.',
      'Banff National Park is Canada’s oldest national park, founded in 1885.',
    ],
    currency: { code: 'CAD', name: 'Canadian dollar', symbol: '$', approximatePerUsd: 1.35 },
    timezone: 'America/Toronto',
    coordinates: { lat: 51.1784, lon: -115.5708 },
    wikipedia: 'Canada',
  },
  {
    slug: 'united-states',
    name: 'United States',
    country: 'United States of America',
    region: 'New York, California and the Grand Canyon',
    tagline: 'City lights and endless horizons',
    bestTime: 'April to June and September to October for mild weather',
    overview: [
      'The United States spans a continent of deserts, forests, mountains and megacities. New York’s skyline, the Grand Canyon’s vastness, California’s beaches and Yellowstone’s geysers all belong to the same country.',
      'Road trips are the classic way to see it — Route 66, Pacific Coast Highway, Blue Ridge Parkway — with national parks, diners and small towns in between. Each region feels like a different country.',
    ],
    eat: [
      { name: 'Burgers and BBQ', description: 'Regional barbecue styles from Texas brisket to Carolina pulled pork.' },
      { name: 'Diner breakfast', description: 'Pancakes, eggs and coffee in 24-hour diners.' },
      { name: 'New York pizza and bagels', description: 'Thin foldable slices and chewy bagels with lox.' },
      { name: 'Cajun and soul food', description: 'Gumbo, jambalaya and fried chicken from Louisiana and the South.' },
    ],
    attractions: [
      { name: 'Grand Canyon', description: '277-mile canyon carved by the Colorado River, best at sunrise.' },
      { name: 'New York City', description: 'Times Square, Central Park, Statue of Liberty and Broadway.' },
      { name: 'Yellowstone and Yosemite', description: 'Geysers, waterfalls and granite cliffs in first national parks.' },
      { name: 'Golden Gate Bridge', description: 'Iconic suspension bridge and foggy bay views in San Francisco.' },
      { name: 'Las Vegas Strip', description: 'Neon lights, shows and desert escape.' },
      { name: 'Hawaii beaches', description: 'Volcanoes and surf on islands in the Pacific.' },
    ],
    history: [
      'Inhabited for millennia by Indigenous peoples, colonized by Europeans from 1607, independence declared in 1776. Westward expansion, civil war and immigration shaped the modern nation.',
      'The 20th century brought it to superpower status after two world wars, with cultural exports of jazz, Hollywood and technology influencing the world.',
    ],
    geography: [
      'The US spans from Atlantic to Pacific, with Alaska separated by Canada and Hawaii in the Pacific. The Rockies, Appalachians, Great Plains and deserts define regions.',
      'It has 63 national parks, from arctic tundra in Alaska to tropical reefs in Florida, and the Grand Canyon exposes two billion years of geology.',
    ],
    culture: [
      'Melting pot of cultures with regional identities — New England, South, Midwest, West Coast. Tipping is expected and small talk is common.',
      'National parks, baseball and road trips are cultural staples, and diversity is celebrated in food and festivals.',
    ],
    seasons: [
      { label: 'Spring', note: 'Mild, blossom in Washington DC, good for city trips.' },
      { label: 'Summer', note: 'Hot, busy national parks and beach season.' },
      { label: 'Autumn', note: 'Fall colours in New England and mild weather nationwide.' },
      { label: 'Winter', note: 'Ski season in Colorado and festive lights in New York.' },
    ],
    gettingAround:
      'Domestic flights are essential for long distances. Amtrak covers some corridors, but driving is best for national parks. Car rental is cheap, and interstates are well-maintained.',
    practical: [
      { label: 'Language', value: 'English; Spanish widely spoken.' },
      { label: 'Currency', value: 'US dollar (USD)' },
      { label: 'Plugs', value: 'Type A/B, 120 V.' },
      { label: 'Tipping', value: '15-20% expected in restaurants, bars and taxis.' },
      { label: 'Tap water', value: 'Safe to drink in most places.' },
      { label: 'Getting in', value: 'ESTA for visa-free nationals; very large country.' },
    ],
    facts: [
      'The US has 63 national parks covering 85 million acres.',
      'Route 66 originally ran 2,448 miles from Chicago to Santa Monica.',
      'The Grand Canyon is 277 miles long and up to 18 miles wide.',
      'The US has the world’s largest economy by nominal GDP.',
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
    region: 'Indian Ocean, south of India',
    tagline: 'Overwater villas above turquoise lagoons',
    bestTime: 'November to April for dry season and clear water',
    overview: [
      'The Maldives is 1,192 coral islands grouped into 26 atolls in the Indian Ocean, where overwater bungalows sit above lagoons so clear you can count fish from the deck. It is the lowest country on Earth, averaging 1.5 m above sea level.',
      'Days are spent snorkelling with manta rays, diving with whale sharks, and watching sunsets that turn the water pink. Each resort occupies its own island, so privacy and barefoot luxury are the norm.',
    ],
    eat: [
      { name: 'Mas huni and roshi', description: 'Tuna, coconut, onion and chilli breakfast with flatbread.' },
      { name: 'Garudhiya', description: 'Fragrant tuna soup with rice, lime and chilli.' },
      { name: 'Resort seafood grills', description: 'Fresh reef fish and lobster grilled over coconut husks.' },
      { name: 'Bajiya and hedhikaa', description: 'Savoury pastries and short eats for afternoon tea.' },
    ],
    attractions: [
      { name: 'Overwater villas', description: 'Private decks with direct lagoon access and glass floors.' },
      { name: 'Manta and whale shark dives', description: 'Hanifaru Bay and South Ari Atoll for seasonal gatherings.' },
      { name: 'Bioluminescent beaches', description: 'Vaadhoo Island glows with phytoplankton at night.' },
      { name: 'Sandbank picnics', description: 'Private lunches on disappearing strips of white sand.' },
      { name: 'Underwater restaurants', description: 'Glass dining rooms surrounded by reef fish.' },
      { name: 'Local island visits', description: 'Maafushi and fishing villages for authentic Maldivian life.' },
    ],
    history: [
      'The Maldives was a Buddhist kingdom before converting to Islam in 1153. It was a trading hub for cowrie shells and coir rope on Indian Ocean routes.',
      'A British protectorate from 1887 to 1965, it became a republic and then a luxury tourism destination from the 1970s, now facing sea-level rise challenges.',
    ],
    geography: [
      'The islands are coral atolls built on ancient volcanoes, with lagoons and reefs protecting them. The highest natural point is only 2.4 m above sea level.',
      'The Indian Ocean is warm year-round at 28-30°C, with monsoons shaping seasons — northeast dry and southwest wet.',
    ],
    culture: [
      'Maldivian culture is Islamic, with Friday prayers and modest dress on local islands. Resort islands are more relaxed.',
      'Bodu Beru drumming and lacquerwork are traditional arts, and fishing remains central to life.',
    ],
    seasons: [
      { label: 'Dry season', note: 'Nov-Apr — best visibility, calm seas, peak prices.' },
      { label: 'Wet season', note: 'May-Oct — lush, cheaper, with occasional rain and surf.' },
      { label: 'Manta season', note: 'Jun-Nov in Hanifaru Bay — plankton brings hundreds of mantas.' },
      { label: 'Whale shark season', note: 'Year-round in South Ari Atoll, best Aug-Nov.' },
    ],
    gettingAround:
      'Seaplanes and speedboats transfer to resorts from Malé. Local ferries connect inhabited islands cheaply but slowly. Private yachts offer liveaboard diving.',
    practical: [
      { label: 'Language', value: 'Dhivehi; English widely spoken in resorts.' },
      { label: 'Currency', value: 'Maldivian rufiyaa (MVR) — USD accepted in resorts.' },
      { label: 'Plugs', value: 'Type D/G, 230 V.' },
      { label: 'Tipping', value: 'Not expected but appreciated; service charge included.' },
      { label: 'Tap water', value: 'Desalinated — drink bottled water.' },
      { label: 'Getting in', value: 'Free 30-day visa on arrival for most nationalities.' },
    ],
    facts: [
      'The Maldives is the lowest country in the world by average elevation.',
      'It has 1,192 islands, of which about 200 are inhabited.',
      'The Maldives was the first country to hold an underwater cabinet meeting.',
      'Bioluminescent beaches glow due to dinoflagellate plankton.',
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
    region: 'Bangkok and Chiang Mai, Southeast Asia',
    tagline: 'Golden temples and tropical light',
    bestTime: 'November to February for cool dry season',
    overview: [
      'Thailand blends gilded temples, jungle mountains and tropical islands. Bangkok’s Grand Palace and floating markets contrast with Chiang Mai’s old city and the limestone karsts of Krabi.',
      'Street food is a way of life — pad thai, mango sticky rice and boat noodles from carts — and hospitality is famously warm. It is easy to travel, affordable and endlessly photogenic.',
    ],
    eat: [
      { name: 'Pad Thai and Som Tum', description: 'Stir-fried noodles and green papaya salad with lime and peanuts.' },
      { name: 'Tom Yum and curries', description: 'Hot and sour soup and coconut curries — green, red and massaman.' },
      { name: 'Mango sticky rice', description: 'Sweet coconut rice with ripe mango, a national dessert.' },
      { name: 'Street satay', description: 'Grilled skewers with peanut sauce from night markets.' },
    ],
    attractions: [
      { name: 'Grand Palace Bangkok', description: 'Gold-spired royal palace and Wat Phra Kaew with Emerald Buddha.' },
      { name: 'Chiang Mai old city', description: 'Temples, night bazaar and elephant sanctuaries in the north.' },
      { name: 'Phi Phi and Krabi islands', description: 'Limestone cliffs, turquoise water and long-tail boats.' },
      { name: 'Ayutthaya ruins', description: 'Ancient capital with Buddha heads entwined in tree roots.' },
      { name: 'Floating markets', description: 'Damnoen Saduak and Amphawa — boats piled with fruit and noodles.' },
      { name: 'Night markets', description: 'Chiang Mai and Bangkok markets for food, crafts and vintage.' },
    ],
    history: [
      'Thailand was never colonized, with Sukhothai and Ayutthaya kingdoms before Bangkok became capital in 1782. It is the only Southeast Asian nation to avoid European rule.',
      'A constitutional monarchy since 1932, it balances tradition with rapid modernization and tourism.',
    ],
    geography: [
      'Thailand stretches from mountains in the north to islands in the south, with Bangkok on the Chao Phraya River delta.',
      'Monsoons shape climate — cool dry Nov-Feb, hot Mar-May, wet Jun-Oct — and islands differ between Andaman and Gulf coasts.',
    ],
    culture: [
      'Buddhism shapes daily life — wai greeting, temple etiquette and respect for the monarchy. Removing shoes and modest dress are important.',
      'Sanuk — fun — is a cultural value, and street food, festivals and markets are social centres.',
    ],
    seasons: [
      { label: 'Cool dry', note: 'Nov-Feb — best weather, busy and festive.' },
      { label: 'Hot', note: 'Mar-May — very hot, good for islands early.' },
      { label: 'Rainy', note: 'Jun-Oct — lush, cheaper, with afternoon downpours.' },
      { label: 'Festivals', note: 'Songkran in April and Loy Krathong in November.' },
    ],
    gettingAround:
      'BTS Skytrain and MRT metro in Bangkok, tuk-tuks for short hops. Domestic flights to islands are cheap. Trains to Chiang Mai and Ayutthaya are scenic.',
    practical: [
      { label: 'Language', value: 'Thai; English in tourist areas.' },
      { label: 'Currency', value: 'Thai baht (THB)' },
      { label: 'Plugs', value: 'Type A/B/C/O, 230 V.' },
      { label: 'Tipping', value: 'Not expected but appreciated; 10% in nice restaurants.' },
      { label: 'Tap water', value: 'Do not drink; bottled water everywhere.' },
      { label: 'Getting in', value: 'Visa-free for many nationalities for 30-60 days.' },
    ],
    facts: [
      'Bangkok’s full ceremonial name is the longest city name in the world.',
      'Thailand has over 40,000 temples.',
      'Thailand is the world’s largest exporter of rice and orchids.',
      'The tuk-tuk was originally imported from Japan.',
    ],
    currency: { code: 'THB', name: 'Thai baht', symbol: '฿', approximatePerUsd: 36 },
    timezone: 'Asia/Bangkok',
    coordinates: { lat: 13.7563, lon: 100.5018 },
    wikipedia: 'Thailand',
  },
  {
    slug: 'malaysia',
    name: 'Malaysia',
    country: 'Malaysia',
    region: 'Kuala Lumpur and Borneo, Southeast Asia',
    tagline: 'Twin towers above vibrant streets',
    bestTime: 'March to October for west coast, May to September for east',
    overview: [
      'Malaysia mixes Malay, Chinese and Indian cultures with rainforest and islands. Kuala Lumpur’s Petronas Towers rise above street-food stalls, while Borneo holds orangutans, tea plantations and dive sites.',
      'It is affordable, easy to travel and famous for food — laksa, satay and roti canai from hawker stalls — with British colonial architecture beside mosques and temples.',
    ],
    eat: [
      { name: 'Nasi lemak', description: 'Coconut rice with sambal, anchovies and egg — national dish.' },
      { name: 'Laksa and char kway teow', description: 'Spicy noodle soups and wok-fried flat noodles with prawns.' },
      { name: 'Roti canai', description: 'Flaky flatbread with dhal curry, best at mamak stalls.' },
      { name: 'Satay', description: 'Grilled meat skewers with peanut sauce and ketupat rice cakes.' },
    ],
    attractions: [
      { name: 'Petronas Towers', description: '88-storey twin towers with skybridge and city views.' },
      { name: 'Batu Caves', description: 'Hindu shrine in limestone caves with 272 colourful steps.' },
      { name: 'Georgetown Penang', description: 'UNESCO street art, clan jetties and hawker food.' },
      { name: 'Borneo rainforest', description: 'Orangutans in Sepilok and diving in Sipadan.' },
      { name: 'Langkawi islands', description: 'Beaches, cable car and mangrove tours.' },
      { name: 'Cameron Highlands', description: 'Tea plantations and strawberry farms in cool hills.' },
    ],
    history: [
      'Malaysia was a British colony and trading hub for tin and rubber, gaining independence in 1957. It formed as a federation including Sabah and Sarawak on Borneo.',
      'Kuala Lumpur grew from tin mining to a modern capital, hosting the 1998 Commonwealth Games and building the Petronas Towers as a symbol of progress.',
    ],
    geography: [
      'Malaysia is split into Peninsular Malaysia and East Malaysia on Borneo, separated by the South China Sea. Rainforest covers 60% of the land.',
      'Mount Kinabalu at 4,095 m is the highest peak in Southeast Asia between Himalayas and New Guinea.',
    ],
    culture: [
      'Multicultural — Malay, Chinese, Indian — with Islam as official religion but freedom of worship. Festivals like Hari Raya, Chinese New Year and Deepavali are all public holidays.',
      'Hawker culture is central, and shopping malls are social centres with air conditioning.',
    ],
    seasons: [
      { label: 'West coast', note: 'Dec-Apr wet, May-Nov drier — best for Penang and Langkawi.' },
      { label: 'East coast', note: 'Mar-Oct dry for Perhentian and Redang islands.' },
      { label: 'Borneo', note: 'Mar-Oct drier for wildlife and diving.' },
      { label: 'Highlands', note: 'Cool year-round, good for tea and hiking.' },
    ],
    gettingAround:
      'KL has LRT, MRT and monorail; Grab ride-hailing is cheap and reliable. Domestic flights to Borneo and islands are frequent. Buses cover the peninsula.',
    practical: [
      { label: 'Languages', value: 'Malay, English, Chinese, Tamil.' },
      { label: 'Currency', value: 'Malaysian ringgit (MYR)' },
      { label: 'Plugs', value: 'Type G (three-pin), 240 V.' },
      { label: 'Tipping', value: 'Not expected; service charge often included.' },
      { label: 'Tap water', value: 'Boil or drink bottled water.' },
      { label: 'Getting in', value: 'Visa-free for many nationalities for 90 days.' },
    ],
    facts: [
      'The Petronas Towers were the world’s tallest buildings from 1998-2004.',
      'Malaysia has one of the oldest rainforests in the world at 130 million years.',
      'Borneo is the third-largest island in the world.',
      'Malaysia’s flag has 14 stripes for 13 states and federal territories.',
    ],
    currency: { code: 'MYR', name: 'Malaysian ringgit', symbol: 'RM', approximatePerUsd: 4.6 },
    timezone: 'Asia/Kuala_Lumpur',
    coordinates: { lat: 3.139, lon: 101.6869 },
    wikipedia: 'Malaysia',
  },
  {
    slug: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    region: 'Marina Bay and Gardens by the Bay',
    tagline: 'Future city by the bay',
    bestTime: 'February to April for drier weather, year-round tropical',
    overview: [
      'Singapore is a city-state where futuristic gardens, hawker centres and colonial shophouses coexist. Marina Bay Sands, Gardens by the Bay and the Merlion sit minutes from Little India and Chinatown.',
      'It is spotlessly clean, efficient and green — 47% green cover — with street food that has Michelin stars and a skyline that glows at night. It is small enough to see by MRT in a day.',
    ],
    eat: [
      { name: 'Chilli crab', description: 'Sweet and spicy crab with mantou buns for mopping sauce.' },
      { name: 'Hainanese chicken rice', description: 'Poached chicken with fragrant rice and chilli sauce — national dish.' },
      { name: 'Laksa', description: 'Coconut curry noodle soup with prawns and fish cake.' },
      { name: 'Hawker stalls', description: 'Michelin-starred Liao Fan soya chicken and endless satay.' },
    ],
    attractions: [
      { name: 'Marina Bay Sands and Gardens', description: 'Infinity pool and Supertree light show at night.' },
      { name: 'Hawker centres', description: 'Lau Pa Sat, Maxwell and Old Airport Road for $5 meals.' },
      { name: 'Sentosa Island', description: 'Beaches, Universal Studios and aquarium.' },
      { name: 'Chinatown and Little India', description: 'Temples, mosques and colourful shophouses.' },
      { name: 'Botanic Gardens', description: 'UNESCO World Heritage orchid garden and swan lake.' },
      { name: 'Clarke Quay', description: 'Riverside nightlife with boat rides.' },
    ],
    history: [
      'Founded as a British trading post by Stamford Raffles in 1819, occupied by Japan in WWII, independent in 1965 under Lee Kuan Yew who turned it into a financial hub.',
      'It grew from swamp to skyscraper in 50 years, with public housing, strict laws and a focus on education and trade.',
    ],
    geography: [
      'Singapore is one island plus 62 islets at the tip of Peninsular Malaysia, just 1 degree north of the equator. It is 50 km east-west and 27 km north-south.',
      'It has reclaimed 25% of its land from the sea and aims to be a City in Nature with parks and reservoirs everywhere.',
    ],
    culture: [
      'Multicultural — Chinese, Malay, Indian, Eurasian — with four official languages and hawker culture UNESCO-listed. Cleanliness and order are enforced.',
      'Shopping and eating are national pastimes, and Singlish — English with Malay and Hokkien — is the informal language.',
    ],
    seasons: [
      { label: 'Dry', note: 'Feb-Apr — slightly less rain and haze.' },
      { label: 'Wet', note: 'Nov-Jan monsoon with afternoon showers.' },
      { label: 'Hot', note: 'Year-round 30-33°C and humid.' },
      { label: 'Festivals', note: 'Chinese New Year, Hari Raya and Deepavali all celebrated.' },
    ],
    gettingAround:
      'MRT metro is fast, cheap and covers the island. Buses and Grab are easy. Walking is possible but hot — use sheltered walkways. Changi Airport is world’s best many times.',
    practical: [
      { label: 'Languages', value: 'English, Mandarin, Malay, Tamil.' },
      { label: 'Currency', value: 'Singapore dollar (SGD)' },
      { label: 'Plugs', value: 'Type G, 230 V.' },
      { label: 'Tipping', value: 'Not expected; service charge included.' },
      { label: 'Tap water', value: 'Safe to drink — very clean.' },
      { label: 'Getting in', value: 'Visa-free for many nationalities; strict laws.' },
    ],
    facts: [
      'Singapore has the world’s highest percentage of millionaires per capita.',
      'It has a Michelin-starred street-food stall.',
      'Changi Airport has a rooftop pool and indoor waterfall.',
      'Chewing gum is banned except for dental gum.',
    ],
    currency: { code: 'SGD', name: 'Singapore dollar', symbol: '$', approximatePerUsd: 1.33 },
    timezone: 'Asia/Singapore',
    coordinates: { lat: 1.3521, lon: 103.8198 },
    wikipedia: 'Singapore',
  },
  {
    slug: 'indonesia',
    name: 'Indonesia',
    country: 'Indonesia',
    region: 'Bali and Java, Southeast Asia',
    tagline: 'Temple mist among rice terraces',
    bestTime: 'May to September for dry season',
    overview: [
      'Indonesia is 17,000 islands of volcanoes, temples and jungle. Bali’s rice terraces and temples, Java’s Borobudur and Bromo volcano, and Komodo’s dragons all belong to one country.',
      'It is diverse — 700 languages — with Hindu Bali, Muslim Java and tribal Papua each distinct. Surfing, diving and temple ceremonies shape daily life.',
    ],
    eat: [
      { name: 'Nasi goreng', description: 'Fried rice with egg, chicken and sweet soy sauce.' },
      { name: 'Satay and rendang', description: 'Grilled skewers and slow-cooked dry curry from Padang.' },
      { name: 'Babi guling Bali', description: 'Suckling pig with crispy skin and sambal, a Balinese ceremony dish.' },
      { name: 'Gado-gado', description: 'Vegetables with peanut sauce and krupuk crackers.' },
    ],
    attractions: [
      { name: 'Bali rice terraces', description: 'Tegallalang and Jatiluwih UNESCO terraces at sunrise.' },
      { name: 'Borobudur', description: '9th-century Buddhist temple, largest in the world, at sunrise.' },
      { name: 'Mount Bromo', description: 'Jeep ride and horse trek to volcano viewpoint for sunrise.' },
      { name: 'Komodo dragons', description: 'Boat trip to see giant lizards on Komodo and Rinca islands.' },
      { name: 'Ubud art and temples', description: 'Monkey forest, art galleries and water temples.' },
      { name: 'Gili Islands', description: 'Car-free islands with turtles and beach bars.' },
    ],
    history: [
      'Indonesia was a Hindu-Buddhist kingdom with Borobudur and Prambanan, then Islamic sultanates and a Dutch colony for 350 years. Independence declared in 1945 under Sukarno.',
      'It is now the world’s largest archipelago nation and fourth most populous, with rapid growth and volcanic activity.',
    ],
    geography: [
      'Indonesia straddles the equator with 17,508 islands, of which about 6,000 are inhabited. The Ring of Fire gives it 130 active volcanoes.',
      'Bali is Hindu, Java is volcanic and crowded, Borneo and Papua hold rainforest and tribes, and Wallace Line divides Asian and Australian fauna.',
    ],
    culture: [
      'Gotong royong — mutual assistance — is central, with village ceremonies and gamelan music. Bali’s daily offerings of flowers and incense are everywhere.',
      'Respect for elders and modest dress at temples matter, and Ramadan changes hours in Muslim areas.',
    ],
    seasons: [
      { label: 'Dry', note: 'May-Sep — best for Bali, Bromo and Borobudur.' },
      { label: 'Wet', note: 'Oct-Apr — rain, lush rice terraces and fewer tourists.' },
      { label: 'Surf', note: 'Apr-Oct best swell on Bali’s west coast.' },
      { label: 'Dive', note: 'Year-round, best Apr-Nov for Komodo and Raja Ampat.' },
    ],
    gettingAround:
      'Domestic flights connect islands cheaply via Lion Air and Garuda. Ferries are slow but scenic. In Bali, scooters are common but traffic is chaotic — Grab is safer.',
    practical: [
      { label: 'Language', value: 'Indonesian (Bahasa); English in Bali and tourist areas.' },
      { label: 'Currency', value: 'Indonesian rupiah (IDR)' },
      { label: 'Plugs', value: 'Type C/F, 230 V.' },
      { label: 'Tipping', value: 'Not expected but appreciated; 10% in restaurants.' },
      { label: 'Tap water', value: 'Do not drink; bottled water everywhere.' },
      { label: 'Getting in', value: 'Visa on arrival or e-visa for 30 days for many nationalities.' },
    ],
    facts: [
      'Indonesia is the world’s largest island country with 17,000+ islands.',
      'Borobudur is the largest Buddhist temple in the world.',
      'Indonesia has 130 active volcanoes, most of any country.',
      'Bali has a Day of Silence Nyepi where the whole island shuts down.',
    ],
    currency: { code: 'IDR', name: 'Indonesian rupiah', symbol: 'Rp', approximatePerUsd: 15500 },
    timezone: 'Asia/Jakarta',
    coordinates: { lat: -8.4095, lon: 115.1889 },
    wikipedia: 'Indonesia',
  },
  {
    slug: 'australia',
    name: 'Australia',
    country: 'Australia',
    region: 'Sydney and Great Barrier Reef, Oceania',
    tagline: 'Harbour sails beneath summer sun',
    bestTime: 'September to November and March to May for mild weather',
    overview: [
      'Australia is a continent of beaches, reefs and outback. Sydney’s Opera House and harbour, the Great Barrier Reef’s underwater world, Uluru’s red desert and Melbourne’s laneways all fit in one trip with domestic flights.',
      'It is laid-back and outdoors-focused, with barbecues, surfing and coffee culture. Wildlife — kangaroos, koalas and platypus — is a major draw.',
    ],
    eat: [
      { name: 'Avocado toast and flat white', description: 'Café breakfast that Australia exported to the world.' },
      { name: 'Barbecue and meat pies', description: 'Sausage sizzle and meat pies with tomato sauce.' },
      { name: 'Seafood and barramundi', description: 'Fresh fish, prawns and barramundi from tropical waters.' },
      { name: 'Tim Tam and Vegemite', description: 'Chocolate biscuits and salty yeast spread — try both.' },
    ],
    attractions: [
      { name: 'Sydney Opera House', description: 'Sails on the harbour and coastal walk to Bondi Beach.' },
      { name: 'Great Barrier Reef', description: 'Snorkelling and diving on the world’s largest reef system.' },
      { name: 'Uluru', description: 'Sacred red rock in the desert, best at sunrise and sunset.' },
      { name: 'Melbourne laneways', description: 'Coffee, street art and hidden bars.' },
      { name: 'Great Ocean Road', description: 'Coastal drive with Twelve Apostles sea stacks.' },
      { name: 'Tasmania wilderness', description: 'Cradle Mountain and white-sand beaches.' },
    ],
    history: [
      'Aboriginal peoples lived here for 65,000 years before British colonization in 1788 as a penal colony. Gold rushes in the 1850s built cities.',
      'Federation in 1901 created modern Australia, which is now multicultural with immigration from Europe and Asia.',
    ],
    geography: [
      'Australia is the world’s sixth-largest country and only island continent, with desert covering 70% of it. The Great Barrier Reef is 2,300 km long.',
      'The east coast is green and populated, the centre is red desert, and the north is tropical with crocodiles and rainforest.',
    ],
    culture: [
      'No worries attitude, barbecues and beach life. Coffee culture is serious — Melbourne has world-class baristas.',
      'Aboriginal culture is 65,000 years old with dot painting and Dreamtime stories, and mateship is valued.',
    ],
    seasons: [
      { label: 'Spring', note: 'Sep-Nov — mild, wildflowers and good for Sydney and Melbourne.' },
      { label: 'Summer', note: 'Dec-Feb — hot, beach season and festive.' },
      { label: 'Autumn', note: 'Mar-May — mild and less humid, good for reef and outback.' },
      { label: 'Winter', note: 'Jun-Aug — ski season in Snowy Mountains and whale watching.' },
    ],
    gettingAround:
      'Domestic flights are essential — distances are huge. Greyhound buses and trains cover east coast. Driving is on left side. City transit is good in Sydney and Melbourne.',
    practical: [
      { label: 'Language', value: 'English.' },
      { label: 'Currency', value: 'Australian dollar (AUD)' },
      { label: 'Plugs', value: 'Type I, 230 V.' },
      { label: 'Tipping', value: 'Not expected; rounding up is polite.' },
      { label: 'Tap water', value: 'Safe to drink everywhere.' },
      { label: 'Getting in', value: 'eVisitor or ETA required for most nationalities.' },
    ],
    facts: [
      'Australia has 10,685 beaches — you could visit one a day for 29 years.',
      'The Great Barrier Reef is visible from space.',
      'Australia has more kangaroos than people.',
      'Uluru is 348 m high and 9.4 km around.',
    ],
    currency: { code: 'AUD', name: 'Australian dollar', symbol: '$', approximatePerUsd: 1.5 },
    timezone: 'Australia/Sydney',
    coordinates: { lat: -33.8688, lon: 151.2093 },
    wikipedia: 'Australia',
  },
  {
    slug: 'japan',
    name: 'Japan',
    country: 'Japan',
    region: 'Tokyo, Kyoto and Mount Fuji, East Asia',
    tagline: 'Mount Fuji in morning mist',
    bestTime: 'March to May for cherry blossom, October to November for autumn',
    overview: [
      'Japan blends ancient temples with neon cities. Tokyo’s crossing, Kyoto’s shrines, Mount Fuji’s perfect cone and Hiroshima’s peace park all show different faces of the same meticulous culture.',
      'It is famous for politeness, bullet trains that run to the second, and food that ranges from $2 convenience store onigiri to $300 sushi counters. Cherry blossom and autumn colours are national events.',
    ],
    eat: [
      { name: 'Sushi and ramen', description: 'From conveyor belts to Michelin counters, plus tonkotsu ramen.' },
      { name: 'Tempura and kaiseki', description: 'Light battered vegetables and multi-course imperial cuisine.' },
      { name: 'Takoyaki and okonomiyaki', description: 'Osaka street snacks — octopus balls and savoury pancakes.' },
      { name: 'Convenience store snacks', description: 'Onigiri, melon pan and egg sandwiches — surprisingly excellent.' },
    ],
    attractions: [
      { name: 'Mount Fuji', description: 'Climb in summer or view from Hakone and Kawaguchiko lakes.' },
      { name: 'Kyoto temples', description: 'Fushimi Inari gates, Golden Pavilion and bamboo grove.' },
      { name: 'Tokyo crossing and shrines', description: 'Shibuya scramble and Meiji Shrine forest in one day.' },
      { name: 'Hiroshima and Miyajima', description: 'Peace museum and floating torii gate at high tide.' },
      { name: 'Osaka food streets', description: 'Dotonbori neon and takoyaki stalls.' },
      { name: 'Bullet train rides', description: 'Shinkansen at 320 km/h with Mount Fuji views.' },
    ],
    history: [
      'Japan was isolated under Tokugawa shoguns from 1603-1868, then modernized rapidly in Meiji Restoration, becoming an industrial power by 1900.',
      'Devastated in WWII, it rebuilt into a technology powerhouse with Sony, Toyota and Nintendo, while keeping shrines and tea ceremony.',
    ],
    geography: [
      'Japan is four main islands — Honshu, Hokkaido, Kyushu, Shikoku — plus 6,800 smaller ones, 70% mountainous and volcanic with 111 active volcanoes.',
      'Mount Fuji at 3,776 m is sacred and climbs are popular in July-August. Cherry blossom moves north like a wave in spring.',
    ],
    culture: [
      'Omotenashi — selfless hospitality — shapes service, with bows, quiet trains and no tipping. Onsen hot springs are social and healing.',
      'Matsuri festivals, anime and tea ceremony coexist, and respect for seasons shows in food and gardens.',
    ],
    seasons: [
      { label: 'Spring', note: 'Cherry blossom Mar-May — beautiful and very crowded.' },
      { label: 'Summer', note: 'Hot, humid and festival-filled with fireworks.' },
      { label: 'Autumn', note: 'Clear, colourful and arguably best weather.' },
      { label: 'Winter', note: 'Snow in Hokkaido, illuminations and quiet temples.' },
    ],
    gettingAround:
      'Shinkansen bullet trains link Tokyo, Kyoto, Osaka and Hiroshima fast. Suica card works on trains, metro and shops. Buses reach mountain areas.',
    practical: [
      { label: 'Language', value: 'Japanese; English signage in cities, limited spoken English.' },
      { label: 'Currency', value: 'Japanese yen (JPY) — cash still important.' },
      { label: 'Plugs', value: 'Type A/B, 100 V.' },
      { label: 'Tipping', value: 'Not done; can cause confusion.' },
      { label: 'Tap water', value: 'Safe to drink.' },
      { label: 'Getting in', value: 'Visa-free for many nationalities for 90 days.' },
    ],
    facts: [
      'Japan has over 1,500 earthquakes a year.',
      'Mount Fuji was first climbed by a monk in 663 AD.',
      'Tokyo has more Michelin stars than any city.',
      'Japan has 6,852 islands, of which 430 are inhabited.',
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
    region: 'Seoul and Jeju Island, East Asia',
    tagline: 'Palaces beneath modern skylines',
    bestTime: 'April for cherry blossom, October for autumn colours',
    overview: [
      'Korea mixes ancient palaces with K-pop and high tech. Seoul’s Gyeongbokgung Palace sits beneath glass towers, while Jeju Island offers volcanic craters and beaches.',
      'Food, skincare and music export worldwide, but hiking, temple stays and street markets remain daily life. It is compact, fast and very photogenic.',
    ],
    eat: [
      { name: 'Bibimbap and kimchi', description: 'Rice bowls with vegetables and fermented spicy cabbage with every meal.' },
      { name: 'Korean BBQ', description: 'Pork belly grilled at the table with lettuce wraps and soju.' },
      { name: 'Tteokbokki and street toast', description: 'Spicy rice cakes and egg toast from street carts.' },
      { name: 'Fried chicken and beer', description: 'Chimaek — double-fried chicken with cold beer.' },
    ],
    attractions: [
      { name: 'Gyeongbokgung Palace', description: 'Joseon palace with guard-changing ceremony and hanbok rental.' },
      { name: 'Bukchon Hanok Village', description: 'Traditional houses between palaces with city views.' },
      { name: 'Jeju Island', description: 'Volcanic island with waterfalls, lava tubes and beaches.' },
      { name: 'N Seoul Tower', description: 'Mountain-top tower with city panorama.' },
      { name: 'DMZ tour', description: 'Border with North Korea, tunnels and observation posts.' },
      { name: 'Hongdae and Gangnam', description: 'Street music, shopping and nightlife.' },
    ],
    history: [
      'Korea has 5,000 years of history with Joseon dynasty ruling from 1392-1910. Hangul alphabet invented in 1443 under King Sejong.',
      'Occupied by Japan 1910-45, divided after WWII into North and South, with Korean War 1950-53. South Korea then became a technology powerhouse.',
    ],
    geography: [
      'South Korea is mountainous peninsula with 70% mountains, plus Jeju volcanic island. Four distinct seasons with monsoon in summer.',
      'Seoul sits on Han River with mountains inside city limits, making hiking an everyday activity.',
    ],
    culture: [
      'Confucian hierarchy and age respect matter, with bowing and formal speech. K-pop, K-drama and esports are global exports.',
      'Hanbok traditional dress, kimchi making and temple stays continue alongside modern life.',
    ],
    seasons: [
      { label: 'Spring', note: 'Cherry blossom April — mild and clear.' },
      { label: 'Summer', note: 'Hot, humid monsoon late June-July.' },
      { label: 'Autumn', note: 'Cool, colourful and best for hiking.' },
      { label: 'Winter', note: 'Cold, dry and festive with ski resorts.' },
    ],
    gettingAround:
      'Seoul metro is world-class with T-money card for subway, bus and taxis. KTX bullet train to Busan in 2.5 hours. Buses cover country.',
    practical: [
      { label: 'Language', value: 'Korean; English signage widespread.' },
      { label: 'Currency', value: 'South Korean won (KRW)' },
      { label: 'Plugs', value: 'Type C/F, 220 V.' },
      { label: 'Tipping', value: 'Not expected.' },
      { label: 'Tap water', value: 'Safe but locals prefer filtered.' },
      { label: 'Getting in', value: 'K-ETA for visa-free visitors.' },
    ],
    facts: [
      'South Korea has the fastest internet in the world on average.',
      'Seoul has over 100 museums and 1,000 hiking trails.',
      'Korea invented metal movable type before Gutenberg.',
      'Jeju Island has a matriarchal diving culture with haenyeo women divers.',
    ],
    currency: { code: 'KRW', name: 'South Korean won', symbol: '₩', approximatePerUsd: 1350 },
    timezone: 'Asia/Seoul',
    coordinates: { lat: 37.5665, lon: 126.978 },
    wikipedia: 'South Korea',
  },
  {
    slug: 'brazil',
    name: 'Brazil',
    country: 'Brazil',
    region: 'Rio de Janeiro and Amazon, South America',
    tagline: 'Mountain, ocean and city below',
    bestTime: 'December to March for Rio summer, June to September for Amazon dry',
    overview: [
      'Brazil is continent-sized with rainforest, beaches and megacities. Rio’s Christ the Redeemer above Copacabana, the Amazon’s river and jungle, Iguazu’s waterfalls and Salvador’s colonial colours all belong to one country.',
      'It is famous for carnival, football and music, with churrasco barbecue and caipirinha. Portuguese heritage mixes with African and Indigenous influences.',
    ],
    eat: [
      { name: 'Feijoada and churrasco', description: 'Black bean stew and barbecue with chimichurri.' },
      { name: 'Açaí and pão de queijo', description: 'Açaí bowls and cheese bread from Minas Gerais.' },
      { name: 'Caipirinha', description: 'Lime, sugar and cachaça cocktail — national drink.' },
      { name: 'Moqueca', description: 'Bahian fish stew with coconut milk and dendê oil.' },
    ],
    attractions: [
      { name: 'Christ the Redeemer Rio', description: 'Art Deco statue with city and bay panorama.' },
      { name: 'Iguazu Falls', description: '275 waterfalls on Brazil-Argentina border, taller than Niagara.' },
      { name: 'Amazon rainforest', description: 'River cruises and jungle lodges from Manaus.' },
      { name: 'Copacabana and Ipanema', description: 'Beaches, samba and sunset at Arpoador.' },
      { name: 'Salvador Pelourinho', description: 'Colonial old town with Afro-Brazilian culture.' },
      { name: 'Fernando de Noronha', description: 'Protected islands with diving and spinner dolphins.' },
    ],
    history: [
      'Brazil was Portuguese colony from 1500, with sugar, gold and coffee booms using enslaved African labour. Independence in 1822 under Emperor Pedro I.',
      'It became a republic in 1889 and is now the largest country in South America and fifth in world, with carnival and football as cultural exports.',
    ],
    geography: [
      'Brazil is fifth-largest country, covering 47% of South America with Amazon rainforest holding 10% of world’s species. The Amazon River is 6,400 km long.',
      'The coastline is 7,491 km with beaches, while the interior has highlands, wetlands Pantanal and Iguaçu falls.',
    ],
    culture: [
      'Samba, carnival and football are national passions. Portuguese is official language, with diverse regional accents.',
      'Jeitinho — creative workaround — and warmth shape social life, with beach and barbecue as weekend rituals.',
    ],
    seasons: [
      { label: 'Summer', note: 'Dec-Mar — hot, carnival in Feb, beach season.' },
      { label: 'Winter', note: 'Jun-Sep — mild in Rio, dry in Amazon and good for Iguazu.' },
      { label: 'Spring', note: 'Sep-Nov — blooming and good for Pantanal wildlife.' },
      { label: 'Autumn', note: 'Mar-May — shoulder season with fewer crowds.' },
    ],
    gettingAround:
      'Domestic flights essential for long distances — country is huge. Buses cover regions. In Rio, metro and taxis are easy. Amazon boats are classic.',
    practical: [
      { label: 'Language', value: 'Portuguese; English limited outside tourist areas.' },
      { label: 'Currency', value: 'Brazilian real (BRL)' },
      { label: 'Plugs', value: 'Type N/C, 127/220 V — voltage varies.' },
      { label: 'Tipping', value: '10% service charge often included.' },
      { label: 'Tap water', value: 'Do not drink; bottled water.' },
      { label: 'Getting in', value: 'Visa-free for many nationalities; yellow fever vaccine recommended.' },
    ],
    facts: [
      'Brazil has 60% of the Amazon rainforest.',
      'Rio’s carnival is the largest carnival in the world.',
      'Brazil has won the FIFA World Cup 5 times, most of any country.',
      'The Amazon River has over 3,000 species of fish.',
    ],
    currency: { code: 'BRL', name: 'Brazilian real', symbol: 'R$', approximatePerUsd: 5.2 },
    timezone: 'America/Sao_Paulo',
    coordinates: { lat: -22.9068, lon: -43.1729 },
    wikipedia: 'Brazil',
  },
];

