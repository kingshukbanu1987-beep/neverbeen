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
];
