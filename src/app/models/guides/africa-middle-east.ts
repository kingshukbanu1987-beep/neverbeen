import { DestinationGuide } from '../destination-guide';

/** Guides for destinations in Africa and the Middle East. */
export const africaMiddleEastGuides: DestinationGuide[] = [
  {
    slug: 'marrakech',
    name: 'Marrakech',
    country: 'Morocco',
    region: 'Marrakech-Safi, at the foot of the High Atlas',
    tagline: 'Terracotta walls and market light',
    bestTime: 'March to May, or October to November',
    overview: [
      'Marrakech is a warren of ochre lanes inside rose-coloured ramparts, with the High Atlas snow-capped on the horizon. The medina is a UNESCO-listed maze of riads, craft workshops and souks, while the newer Guéliz quarter adds galleries, gardens and contemporary dining.',
      'Days begin cool and end loud: the Jemaa el-Fnaa square shifts from juice stalls and storytellers to a vast open-air kitchen after sunset. Beyond the city walls, gardens, palm groves and Atlas valleys are within easy reach.',
    ],
    eat: [
      {
        name: 'Jemaa el-Fnaa food stalls',
        description:
          'Grilled skewers, harira soup and snail broth cooked in the square every evening.',
      },
      {
        name: 'Tagine and couscous',
        description:
          'Slow-cooked lamb with apricots, preserved lemon and olives, or Friday couscous with vegetables.',
      },
      {
        name: 'Riad dining',
        description:
          'Courtyard dinners — often the best food in the medina — with rooftop views of the Atlas.',
      },
      {
        name: 'Msemen and mint tea',
        description:
          'Flaky pancakes and sweet mint tea for breakfast on a terrace above the souks.',
      },
      {
        name: 'Orange juice and dates',
        description:
          'Fresh-pressed juice in the square, plus dates, almonds and olives from the spice souks.',
      },
    ],
    attractions: [
      {
        name: 'Jemaa el-Fnaa',
        description:
          'The city’s great square: musicians, acrobats, henna artists and food stalls until late.',
      },
      {
        name: 'Bahia Palace and Saadian Tombs',
        description:
          'Carved cedar, zellij tilework and painted ceilings in two of the city’s finest historic interiors.',
      },
      {
        name: 'Majorelle Garden and Yves Saint Laurent Museum',
        description:
          'Cobalt-blue garden buildings beside a museum dedicated to the designer’s Moroccan years.',
      },
      {
        name: 'Koutoubia Mosque',
        description:
          'The city’s 12th-century minaret — the tallest building in Marrakech — seen from the gardens.',
      },
      {
        name: 'Souks and the tanneries',
        description:
          'Leather, lanterns, carpets and metalwork along the souk lanes; mornings are quieter.',
      },
      {
        name: 'Atlas Mountains and Agafay desert',
        description:
          'Day trips to Berber villages, Ourika Valley waterfalls, or sunset dinner in the stony Agafay desert.',
      },
      {
        name: 'Hammam and rooftop terraces',
        description:
          'Traditional steam baths with black-soap scrubs, followed by tea on a riad roof at dusk.',
      },
    ],
    history: [
      'Marrakech was founded in 1070 by the Almoravids as a desert capital, and grew rich on trans-Saharan trade in gold, salt and slaves. The Almohads followed, building the Koutoubia Mosque and the city walls that still define the medina.',
      'The Saadians and then the Alaouites added palaces and gardens, and the city became a favoured winter retreat for European artists and writers in the 20th century. Its craft traditions — leather, metal, tile and carpet — remain the lifeblood of the souks.',
    ],
    geography: [
      'Marrakech sits on a fertile plain at about 460 m, with the snow-covered High Atlas rising roughly 40 km to the south and the drier Jbilet hills to the north. The Ourika and Nfis rivers feed the palm groves and gardens.',
      'The climate is semi-arid: hot, dry summers and mild winters, with the Atlas catching the rain and snow. That proximity to the mountains is why a morning in the souks and an afternoon in alpine air is genuinely possible.',
    ],
    culture: [
      'Marrakech is a Muslim city with a strong Berber (Amazigh) heritage. Hospitality is a point of pride — tea is poured from height and offered three times — and bargaining in the souks is a conversation rather than a confrontation.',
      'Dress modestly away from riads and pools, ask before photographing people, and remember that during Ramadan daytime eating and drinking in public is restricted.',
    ],
    seasons: [
      {
        label: 'Spring',
        note: 'Warm days, cool nights and green Atlas foothills — the best window.',
      },
      { label: 'Summer', note: 'Very hot inland; start early, rest at midday, seek riad pools.' },
      { label: 'Autumn', note: 'Comfortable heat, clear light and good trekking conditions.' },
      { label: 'Winter', note: 'Cool days, cold nights, snow on the Atlas and quiet souks.' },
    ],
    gettingAround:
      'The medina is walkable, though you will get lost — that is part of it. Petit taxis are metered and cheap for hops, but negotiate or insist on the meter. Horse-drawn calèches serve the tourist routes, and drivers with cars are useful for Atlas day trips.',
    practical: [
      {
        label: 'Languages',
        value: 'Arabic and Amazigh; French widely spoken, English in tourist areas.',
      },
      {
        label: 'Currency',
        value: 'Moroccan dirham (MAD) — closed currency, exchange on arrival and keep receipts.',
      },
      { label: 'Plugs', value: 'Type C/E, 220 V.' },
      {
        label: 'Tipping',
        value: 'Expected and appreciated — small notes for guides, drivers and hammam staff.',
      },
      { label: 'Tap water', value: 'Do not drink; bottled water is cheap.' },
      { label: 'Getting in', value: 'Visa-free for many nationalities; check current rules.' },
    ],
    facts: [
      'The medina walls run for about 19 km and are a UNESCO World Heritage Site.',
      'Koutoubia’s minaret is a twin of Seville’s Giralda and Rabat’s Hassan Tower.',
      'Majorelle blue was registered by Jacques Majorelle; the garden was later saved by Yves Saint Laurent.',
      'The city is nicknamed the “Red City” for its ochre ramparts and buildings.',
    ],
    currency: { code: 'MAD', name: 'Moroccan dirham', symbol: 'د.م.', approximatePerUsd: 9.9 },
    timezone: 'Africa/Casablanca',
    coordinates: { lat: 31.6295, lon: -7.9811 },
    wikipedia: 'Marrakesh',
  },
  {
    slug: 'cape-town',
    name: 'Cape Town',
    country: 'South Africa',
    region: 'Western Cape, at the Cape Peninsula',
    tagline: 'Ocean air beneath Table Mountain',
    bestTime: 'November to March for warm, dry weather',
    overview: [
      'Cape Town is squeezed between a flat-topped mountain and two oceans. Table Mountain rises more than a kilometre straight out of the city, with beaches, vineyards and penguin colonies all inside an hour’s drive.',
      'The city mixes colonial-era streets and a working harbour with museums that confront its difficult history, and neighbourhoods that run from historic Bo-Kaap to the buzzing V&A Waterfront. Two oceans meet nearby, so the water temperature changes markedly from one side of the peninsula to the other.',
    ],
    eat: [
      {
        name: 'Cape Malay cooking',
        description:
          'Bobotie, denningvleis and koesisters in the Bo-Kaap, tracing the city’s Southeast Asian heritage.',
      },
      {
        name: 'Braai and game',
        description:
          'Wood-fired grills, springbok, ostrich and kudu in city restaurants and wineland farm kitchens.',
      },
      {
        name: 'V&A Waterfront and Old Biscuit Mill',
        description: 'Harbour seafood plus the weekend market of small producers at Woodstock.',
      },
      {
        name: 'Cape wines',
        description:
          'Chenin blanc, Cape blends and sparkling MCC in Stellenbosch, Franschhoek and Constantia.',
      },
      {
        name: 'Gatsby and bunny chow',
        description:
          'Huge South African-Indian sandwiches and curry-filled loaves for a cheap, filling lunch.',
      },
    ],
    attractions: [
      {
        name: 'Table Mountain cableway and hikes',
        description:
          'A rotating cable car or the Platteklip Gorge trail to the plateau, with city and ocean views.',
      },
      {
        name: 'Cape of Good Hope and Cape Point',
        description:
          'The peninsula’s dramatic cliffs, funicular and the walk to the famous signpost.',
      },
      {
        name: 'Boulders Beach penguins',
        description: 'Boardwalks over a colony of African penguins near Simon’s Town.',
      },
      {
        name: 'Robben Island',
        description:
          'Ferry trip to the prison island where Nelson Mandela was held, guided by former political prisoners.',
      },
      {
        name: 'Bo-Kaap and the city centre',
        description:
          'Colourful houses, cobbled lanes and the District Six Museum’s account of forced removals.',
      },
      {
        name: 'Chapman’s Peak Drive and Kirstenbosch',
        description:
          'A cliff-hugging coastal road plus a botanical garden of fynbos on the mountain’s slopes.',
      },
      {
        name: 'Cape Winelands',
        description:
          'Historic estates in Stellenbosch, Franschhoek and Paarl, 45 to 75 minutes from the city.',
      },
    ],
    history: [
      'The Khoisan peoples lived here for millennia before Dutch settlers arrived in 1652 to grow produce for ships travelling to the East. The Cape changed hands with the British, and slavery shaped its early economy until abolition in 1834.',
      'Cape Town was the legislative capital of the Union of South Africa from 1910 and a focal point of the anti-apartheid struggle. Nelson Mandela’s 1990 walk to freedom from Victor Verster prison and the 1994 elections reshaped the country, and the city’s museums still document those decades.',
    ],
    geography: [
      'The city centres on Table Mountain and its flanking peaks — Devil’s Peak and Lion’s Head — with Table Bay to the north. The Cape Peninsula runs south for about 50 km to Cape Point.',
      'It is a biodiversity hotspot: the Cape Floristic Region holds thousands of plant species found nowhere else, and the cold Benguela current on the Atlantic side makes for dramatic coastlines and chilly water.',
    ],
    culture: [
      'Cape Town is a layered, multilingual city — isiXhosa, Afrikaans and English all in daily use — with Cape Malay, Khoisan, European and Indian Ocean influences in its food and music.',
      'Jazz and minstrel traditions are strong, and the streets of Bo-Kaap are famous for their bright colours and cobblestones. Visitors should be aware of safety advice, especially after dark and outside the centre.',
    ],
    seasons: [
      { label: 'Spring', note: 'Wildflowers bloom and whales appear along the Overberg coast.' },
      { label: 'Summer', note: 'Dry, warm and windy — the best beach and mountain weather.' },
      {
        label: 'Autumn',
        note: 'Mild, golden vineyard season with harvest activity in the Winelands.',
      },
      {
        label: 'Winter',
        note: 'Rain and big Atlantic swells, but also green mountains and lower prices.',
      },
    ],
    gettingAround:
      'A car makes the peninsula much easier — the coastal drives and Winelands are the highlight. Metered taxis, ride-hailing and the MyCiTi bus network cover the city, and the Hop-On Hop-Off bus links the main sights. The cableway runs weather-permitting.',
    practical: [
      { label: 'Languages', value: 'English, Afrikaans and isiXhosa.' },
      { label: 'Currency', value: 'South African rand (ZAR)' },
      { label: 'Plugs', value: 'Type M/D/N, 230 V — a South African adapter is needed.' },
      {
        label: 'Tipping',
        value: '10–15% in restaurants; small tips for car guards and drivers are expected.',
      },
      { label: 'Tap water', value: 'Safe to drink in the city.' },
      {
        label: 'Getting in',
        value: 'Check visa rules; some nationalities are visa-free for short stays.',
      },
    ],
    facts: [
      'Table Mountain is home to more plant species than the whole of the United Kingdom.',
      'The Cape Floristic Region is one of the world’s smallest floral kingdoms.',
      'Two oceans influence the peninsula — warmer Indian Ocean water faces False Bay.',
      'Robben Island is a UNESCO World Heritage Site used as a prison for over 300 years.',
    ],
    currency: { code: 'ZAR', name: 'South African rand', symbol: 'R', approximatePerUsd: 18 },
    timezone: 'Africa/Johannesburg',
    coordinates: { lat: -33.9249, lon: 18.4241 },
    wikipedia: 'Cape Town',
  },
  {
    slug: 'egypt',
    name: 'Egypt',
    country: 'Egypt',
    region: 'Cairo and Giza, with the Nile valley southwards',
    tagline: 'Ancient wonders beneath the desert sun',
    bestTime: 'October to April, when the desert cools',
    overview: [
      'Egypt is the Nile and everything built beside it: pyramids, temples, tombs and cities that span five thousand years. Giza’s plateau, the Egyptian Museum and the old Islamic and Coptic quarters of Cairo make up a formidable first stop.',
      'Travel south along the river and the scale changes — Luxor’s temple complexes and Valley of the Kings, Aswan’s islands and Nubian villages, Abu Simbel’s colossal rock-cut facade. A Nile cruise between Luxor and Aswan links them with the patience the landscape deserves.',
    ],
    eat: [
      {
        name: 'Koshari',
        description:
          'Egypt’s national street dish: rice, lentils, pasta, tomato sauce and fried onions.',
      },
      {
        name: 'Ful and taameya',
        description:
          'Stewed fava beans and Egyptian-style falafel for breakfast with flat bread and pickles.',
      },
      {
        name: 'Grilled Nile fish and kofta',
        description:
          'River fish and spiced minced-meat skewers, served with tahini and rice-stuffed vegetables.',
      },
      {
        name: 'Cairo coffee houses',
        description:
          'Historic cafés in Khan el-Khalili for Turkish coffee, shisha and people-watching.',
      },
      {
        name: 'Nubian cooking in Aswan',
        description: 'Colourful riverside houses serving tagines, hibiscus tea and date desserts.',
      },
    ],
    attractions: [
      {
        name: 'Pyramids of Giza and the Sphinx',
        description:
          'The last surviving wonder of the ancient world, plus the Grand Egyptian Museum nearby.',
      },
      {
        name: 'Karnak and Luxor Temples',
        description:
          'A vast temple complex of pylons, obelisks and the colonnade of Amenhotep III.',
      },
      {
        name: 'Valley of the Kings and Hatshepsut Temple',
        description: 'Underground royal tombs with painted ceilings, across the Nile from Luxor.',
      },
      {
        name: 'Abu Simbel',
        description:
          'Ramesses II’s temple, moved entirely to save it from Lake Nasser, aligned with the sun twice a year.',
      },
      {
        name: 'Nile cruise and feluccas',
        description:
          'Sail between Luxor and Aswan on a dahabiya or glide past islands in a felucca at sunset.',
      },
      {
        name: 'Islamic Cairo and Khan el-Khalili',
        description: 'Medieval mosques, gates and the bustling bazaar beneath the city’s minarets.',
      },
      {
        name: 'Alexandria',
        description:
          'A Mediterranean day or weekend trip for the Bibliotheca Alexandrina and Roman-era catacombs.',
      },
    ],
    history: [
      'Ancient Egypt unified around 3100 BC and built a civilisation lasting three millennia, with pharaohs, hieroglyphs, pyramid engineering and temples at Memphis, Thebes and Abu Simbel. It was absorbed into the Roman Empire in 30 BC after Cleopatra’s reign.',
      'Arab conquest in AD 641 brought Islam and the founding of Cairo, which became a centre of medieval learning. The Suez Canal opened in 1869, Britain occupied the country in 1882, and Egypt became a republic after the 1952 revolution.',
    ],
    geography: [
      'Egypt is overwhelmingly desert, bisected by the Nile, which flows north for some 1,500 km from Sudan to the Mediterranean delta. Nearly the entire population lives along the river and the delta.',
      'The Western Desert holds oases and sand seas, the Eastern Desert granite mountains and Red Sea reefs, and the Sinai Peninsula rises to Mount Sinai and the resort coast of Sharm el-Sheikh.',
    ],
    culture: [
      'Egyptian life is warm, sociable and often loud. Tea, football and family visits fill the evenings, and hospitality towards visitors is genuine and often insistent.',
      'Modest dress, especially for women, is respectful outside resorts, and Ramadan shifts the daily rhythm. Photography of military sites and some infrastructure is restricted.',
    ],
    seasons: [
      {
        label: 'Spring',
        note: 'Warm and often dusty with khamsin winds; good prices outside Easter.',
      },
      {
        label: 'Summer',
        note: 'Very hot, especially in the south; sights open early and close early.',
      },
      { label: 'Autumn', note: 'Cooling, clear and ideal for Luxor and Aswan — a great window.' },
      { label: 'Winter', note: 'Mild days, cold nights, the peak season for Nile cruises.' },
    ],
    gettingAround:
      'Domestic flights link Cairo, Luxor, Aswan and Abu Simbel; overnight trains do the same at lower cost and are a classic experience. In Cairo, the metro and ride-hailing apps are the practical options. Nile cruises and feluccas handle the river. Allow plenty of time for checkpoints and traffic.',
    practical: [
      { label: 'Language', value: 'Arabic; English is common in tourism.' },
      {
        label: 'Currency',
        value: 'Egyptian pound (EGP) — carry small notes for tips and tickets.',
      },
      { label: 'Plugs', value: 'Type C/F, 220 V.' },
      {
        label: 'Tipping',
        value:
          '“Baksheesh” is part of daily life — small notes for guides, drivers and attendants.',
      },
      { label: 'Tap water', value: 'Avoid; drink sealed bottled water.' },
      {
        label: 'Getting in',
        value: 'Visa on arrival or e-visa for many nationalities — check current rules.',
      },
    ],
    facts: [
      'The Great Pyramid was the tallest structure in the world for nearly 4,000 years.',
      'Ancient Egyptians invented a calendar of 365 days and early forms of paper from papyrus.',
      'Abu Simbel was dismantled and rebuilt in the 1960s to escape rising Lake Nasser water.',
      'The Nile is one of the few major rivers that flows north.',
    ],
    currency: { code: 'EGP', name: 'Egyptian pound', symbol: 'E£', approximatePerUsd: 48 },
    timezone: 'Africa/Cairo',
    coordinates: { lat: 29.9792, lon: 31.1342 },
    wikipedia: 'Egypt',
  },
  {
    slug: 'serengeti',
    name: 'Serengeti',
    country: 'Tanzania',
    region: 'Mara and Simiyu regions, northern Tanzania',
    tagline: 'Endless plains beneath a wide sky',
    bestTime: 'June to October for wildlife, January to March for calving',
    overview: [
      'The Serengeti is a 14,750 square kilometre savanna where wildlife moves with the rains. Grass plains stretch to the horizon, broken by granite kopjes, riverine forest and seasonal rivers, and the soundscape is birdsong, wind and, at night, distant lions.',
      'It forms part of the wider Serengeti–Mara ecosystem with Kenya’s Maasai Mara, host to the great migration of around 1.5 million wildebeest, hundreds of thousands of zebras and the predators that follow them. Game drives, walking safaris and balloon flights are the ways to see it.',
    ],
    eat: [
      {
        name: 'Lodge and camp kitchens',
        description: 'Set menus of soups, grills and curries prepared around safari drive times.',
      },
      {
        name: 'Bush breakfast and lunch',
        description:
          'Tables laid under acacia trees, with hot coffee and a full breakfast on the plains.',
      },
      {
        name: 'Nyama choma',
        description:
          'Charcoal-grilled meat with kachumbari salad, a Tanzanian favourite on lodge menus.',
      },
      {
        name: 'Pilau and chipsi mayai',
        description:
          'Spiced rice and the Tanzanian omelette-and-chips dish eaten at gateway towns like Arusha.',
      },
    ],
    attractions: [
      {
        name: 'Great migration river crossings',
        description:
          'Between July and September, herds cross the Mara River past crocodiles and waiting lions.',
      },
      {
        name: 'Seronera Valley',
        description:
          'The park’s central heart, with year-round game and the highest density of leopards.',
      },
      {
        name: 'Ngorongoro Crater',
        description:
          'A UNESCO caldera nearby that holds elephants, black rhinos and huge predator numbers.',
      },
      {
        name: 'Hot-air balloon safaris',
        description: 'Sunrise flights over the plains, followed by breakfast in the bush.',
      },
      {
        name: 'Maasai villages',
        description:
          'Cultural visits to bomas that explain pastoral life, beadwork and cattle herding.',
      },
      {
        name: 'Olduvai Gorge',
        description:
          'The “Cradle of Mankind”, where some of the earliest hominin fossils were discovered.',
      },
      {
        name: 'Northern Serengeti kopjes',
        description:
          'Granite outcrops near the Kenyan border, classic lion country with wide views.',
      },
    ],
    history: [
      'The Serengeti’s name comes from the Maasai “siringet”, meaning the place where the land runs on forever. Maasai pastoralists grazed cattle here for centuries before the area became a game reserve in 1921 and a national park in 1951.',
      'The biologist Bernhard Grzimek and his son Michael produced the 1959 film and book “Serengeti Shall Not Die”, which helped establish global protection for the ecosystem. Research at the Serengeti Research Institute has been running since the 1960s.',
    ],
    geography: [
      'The park lies between 920 and 1,850 m on high volcanic plains, with the Ngorongoro highlands to the south-east, Lake Victoria to the west, and the Grumeti and Mara rivers cutting northwards to Kenya.',
      'Rainfall drives everything: roughly 1,000 mm a year in the north-west and only 500 mm in the south-east, so the herds follow the green flush in a clockwise annual circuit.',
    ],
    culture: [
      'The Maasai are the region’s best-known people, living in semi-nomadic bomas and keeping cattle as the centre of their economy and culture. Visits are usually arranged through camps and should be done with respect and fair payment.',
      'Safari etiquette matters here: stay in the vehicle, keep to tracks, keep noise low and never crowd wildlife. Guides are licensed and trained, and responsible operators will not guarantee a sighting or chase an animal for a photograph.',
    ],
    seasons: [
      {
        label: 'Peak dry season',
        note: 'June to October — best general game viewing and river crossings.',
      },
      {
        label: 'Short dry season',
        note: 'January to February — the calving season in the southern plains.',
      },
      {
        label: 'Long rains',
        note: 'March to May — green, cheap and quiet, with heavy afternoon showers.',
      },
      {
        label: 'Short rains',
        note: 'November to December — lush and changeable, excellent birding.',
      },
    ],
    gettingAround:
      'Fly-in safaris use small airstrips at Seronera and Kogatende for quick access to remote camps; driving from Arusha takes a full day but passes the Ngorongoro Crater and Maasai country. Vehicles must be 4x4 with a licensed guide, and driving after dark is not permitted in the park.',
    practical: [
      { label: 'Languages', value: 'Swahili and English; Maasai in the region.' },
      {
        label: 'Currency',
        value: 'Tanzanian shilling (TZS) — US dollars widely accepted for park fees.',
      },
      {
        label: 'Plugs',
        value: 'Type D/G, 230 V — camps vary, so bring an adapter and power bank.',
      },
      {
        label: 'Tipping',
        value: 'Guides, cooks and camp staff rely on tips; plan per-day amounts.',
      },
      {
        label: 'Tap water',
        value: 'Do not drink; bottled or filtered water is provided at camps.',
      },
      {
        label: 'Getting in',
        value: 'Visa or e-visa required for most visitors; yellow fever certificate may be needed.',
      },
    ],
    facts: [
      'The great migration covers roughly 800 km each year in a loop between Tanzania and Kenya.',
      'The Serengeti hosts the largest land mammal migration on Earth.',
      'Balloon safaris operate year-round near Seronera.',
      'Over 500 bird species have been recorded in the ecosystem.',
    ],
    currency: { code: 'TZS', name: 'Tanzanian shilling', symbol: 'TSh', approximatePerUsd: 2700 },
    timezone: 'Africa/Dar_es_Salaam',
    coordinates: { lat: -2.3333, lon: 34.8333 },
    wikipedia: 'Serengeti National Park',
  },
  {
    slug: 'dubai',
    name: 'Dubai',
    country: 'United Arab Emirates',
    region: 'Emirate of Dubai, Persian Gulf coast',
    tagline: 'A skyline rising from the desert',
    bestTime: 'November to March, when the heat eases',
    overview: [
      'Dubai is a city that decides what it wants to be and builds it: the world’s tallest building, artificial islands, indoor ski slopes and a metro that runs driverless through the middle of it all. Beneath the spectacle is a trading port with a creek, souks and a long pearling history.',
      'The city works as a stopover or a destination in its own right — beach clubs and desert dunes by afternoon, museums and malls in the heat of the day, and old Dubai’s abra boats crossing the creek for a dirham.',
    ],
    eat: [
      {
        name: 'Emirati and Gulf cooking',
        description: 'Majboos, machboos and harees with cardamom-spiced coffee and dates.',
      },
      {
        name: 'Mezze and grills',
        description:
          'Levantine and Iranian restaurants across the city, from casual cafeterias to fine dining.',
      },
      {
        name: 'Old Dubai food streets',
        description:
          'Fahidi, Al Seef and Satwa for shawarma, karak chai and South Asian classics at low prices.',
      },
      {
        name: 'Beach clubs and brunch',
        description:
          'JBR, Palm Jumeirah and Dubai Marina for Friday brunch and long waterfront lunches.',
      },
      {
        name: 'Global fine dining',
        description:
          'An unusual concentration of celebrity-chef and award-winning restaurants, alcohol served in licensed venues.',
      },
    ],
    attractions: [
      {
        name: 'Burj Khalifa and Dubai Fountain',
        description:
          'The world’s tallest building at 828 m, with observation decks and a nightly fountain show below.',
      },
      {
        name: 'Dubai Mall and Aquarium',
        description:
          'A cathedral of retail with an ice rink, waterfall and one of the largest indoor aquariums.',
      },
      {
        name: 'Desert safari and dune drives',
        description:
          '4x4 dune bashing, camel rides, sunset photography and camp dinners under the stars.',
      },
      {
        name: 'Old Dubai and the Creek',
        description:
          'Abra crossings, gold and spice souks, and the Al Fahidi historic district’s wind-tower houses.',
      },
      {
        name: 'Museum of the Future and Alserkal Avenue',
        description: 'A striking new museum plus a warehouse district of contemporary galleries.',
      },
      {
        name: 'Palm Jumeirah and beaches',
        description:
          'JBR, Kite Beach and the Palm’s resorts for swimming, water sports and skyline views.',
      },
      {
        name: 'Abu Dhabi day trip',
        description: 'The Sheikh Zayed Grand Mosque and Louvre Abu Dhabi, about 90 minutes away.',
      },
    ],
    history: [
      'Dubai grew from a small fishing and pearling village on the creek. In 1833 the Al Maktoum family settled here, and by the early 20th century the city was a busy trading port with some 300 dhows and a reputation for low customs duties.',
      'Oil was struck in 1966, and in 1971 Dubai joined the newly formed United Arab Emirates. Rather than depending on oil, the emirate built trade, tourism and aviation — Emirates airline, Jebel Ali port and free zones — into the base of its economy.',
    ],
    geography: [
      'Dubai faces the Persian Gulf with about 70 km of coastline, plus the creek that divides Deira from Bur Dubai. Beyond the city, the Rub’ al Khali desert and the Hajar Mountains rise to the east.',
      'Summer heat is extreme — humid, well above 40 °C — so life is built around air conditioning, evening activity and winter tourism. Sea temperatures stay warm enough to swim from October to May.',
    ],
    culture: [
      'Dubai is a Muslim city in a country of over 200 nationalities, and the balance shows. Dress is relaxed in malls and resorts but modest in mosques and older neighbourhoods, and public behaviour is more conservative than in European cities.',
      'Hospitality is central: Arabic coffee with dates is offered before anything else, and the malls and mosques run on a mix of Emirati and expatriate staff. Friday is a weekend day, with altered opening hours.',
    ],
    seasons: [
      {
        label: 'Winter',
        note: 'November to March is the visitor season — warm days, cool evenings.',
      },
      { label: 'Spring', note: 'Warming quickly; good for beaches early and desert trips late.' },
      {
        label: 'Summer',
        note: 'Very hot and humid; indoor attractions and evening life dominate.',
      },
      {
        label: 'Autumn',
        note: 'Onwards from October the humidity lifts and outdoor season begins.',
      },
    ],
    gettingAround:
      'The driverless metro and the tram cover most of the coast and downtown, and Nol cards work across metro, bus and water bus. Taxis and ride-hailing are cheap by world-city standards. The creek abra is the cheapest crossing in the city.',
    practical: [
      { label: 'Languages', value: 'Arabic official; English is the working language.' },
      { label: 'Currency', value: 'UAE dirham (AED), pegged at about 3.67 to the US dollar.' },
      { label: 'Plugs', value: 'Type G (three-pin), 230 V.' },
      { label: 'Tipping', value: '10% is normal in restaurants when service is not included.' },
      {
        label: 'Tap water',
        value: 'Desalinated and technically safe, but most people drink bottled.',
      },
      {
        label: 'Getting in',
        value: 'Visa-free or visa-on-arrival for many nationalities; check UAE rules.',
      },
    ],
    facts: [
      'Burj Khalifa’s observation deck is on the 124th and 148th floors.',
      'The Palm Jumeirah is one of the largest man-made islands in the world.',
      'Dubai has no income tax; government revenue comes mainly from fees, trade and tourism.',
      'The Dubai Metro opened in 2009 and is fully driverless.',
    ],
    currency: { code: 'AED', name: 'UAE dirham', symbol: 'د.إ', approximatePerUsd: 3.67 },
    timezone: 'Asia/Dubai',
    coordinates: { lat: 25.2048, lon: 55.2708 },
    wikipedia: 'Dubai',
  },
];
