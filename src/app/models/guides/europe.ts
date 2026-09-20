import { DestinationGuide } from '../destination-guide';

/** Guides for destinations in Europe. */
export const europeGuides: DestinationGuide[] = [
  {
    slug: 'paris',
    name: 'Paris',
    country: 'France',
    region: 'Île-de-France, northern France',
    tagline: 'Golden hour along the Seine',
    bestTime: 'April to June, or September to early October',
    overview: [
      'Paris rewards walking. The city is small enough to cross on foot in an afternoon and dense enough that every arrondissement changes character within a few streets — grand Haussmann boulevards in the 8th, medieval lanes on the Île de la Cité, village markets and quiet courtyards in the 11th.',
      'Its landmarks are famous to the point of cliché, and they still work: the Eiffel Tower at dusk, the glass roof of the Grand Palais, the long perspective from the Louvre through the Tuileries to the Arc de Triomphe. The pleasure is in the in-between — a coffee taken standing at a zinc counter, the bouquinistes’ green boxes along the river, an evening picnic on the Pont des Arts.',
    ],
    eat: [
      {
        name: 'Bouillon-style brasseries',
        description:
          'Traditional canteens serving onion soup, escargots and steak frites at prices that explain the queue.',
      },
      {
        name: 'Rue Cler and Rue Montorgueil markets',
        description:
          'Pedestrian market streets for cheese, charcuterie, fruit and fresh bread — ideal for a picnic lunch.',
      },
      {
        name: 'Saint-Germain and the Latin Quarter',
        description:
          'Historic cafés where the terrace matters as much as the menu; go early for a quiet coffee.',
      },
      {
        name: 'Le Marais',
        description:
          'Falafel on Rue des Rosiers, modern bistros and some of the city’s best patisseries within a few blocks.',
      },
      {
        name: 'The 11th arrondissement',
        description:
          'Paris’s busiest restaurant district, from natural-wine bars to ambitious small kitchens.',
      },
    ],
    attractions: [
      {
        name: 'Eiffel Tower & Champ de Mars',
        description:
          'Book a timed summit ticket online; the Trocadéro and the Seine banks give the best evening views.',
      },
      {
        name: 'Musée du Louvre',
        description:
          'The world’s most visited museum. Choose two or three wings rather than trying to see everything.',
      },
      {
        name: 'Musée d’Orsay',
        description:
          'Impressionist and Post-Impressionist collections inside a converted Beaux-Arts railway station.',
      },
      {
        name: 'Île de la Cité & Sainte-Chapelle',
        description:
          'The medieval heart of Paris, with 13th-century stained glass that fills the upper chapel with colour.',
      },
      {
        name: 'Montmartre & Sacré-Cœur',
        description:
          'Hilltop artists’ quarter with the best free panorama of the city, best reached before mid-morning.',
      },
      {
        name: 'Palace of Versailles',
        description:
          'A half-day trip by RER C to the Hall of Mirrors, the royal apartments and the vast formal gardens.',
      },
    ],
    history: [
      'Paris began as a Gallic settlement on the bend of the Seine and became Lutetia under Rome. From the 10th century it was the seat of the French kings, growing around the Île de la Cité, Notre-Dame and the Louvre fortress.',
      'The Bastille fell in 1789, launching the Revolution; Napoleon remade the city with monuments and the Arc de Triomphe. Baron Haussmann’s 19th-century rebuild created today’s wide boulevards and uniform limestone facades, and the city was occupied for four years in the Second World War before liberation in 1944.',
    ],
    geography: [
      'Paris sits in a shallow basin of the Seine, flanked by low hills: Montmartre to the north, Belleville to the east, Montparnasse to the south. The river splits around the Île de la Cité and the Île Saint-Louis, and its 37 bridges pin the two banks together.',
      'The city covers just 105 square kilometres, but the metropolitan area stretches far beyond the périphérique ring road, with the forests of Boulogne and Vincennes acting as green lungs at either edge.',
    ],
    culture: [
      'Paris runs on small courtesies: greet shopkeepers with “bonjour” before asking anything, and “au revoir” on the way out. Meals are events rather than stops, so a leisurely lunch is normal and kitchens often close between services.',
      'The city is a dense patchwork of museums, cinemas and neighbourhood markets, and much of its social life happens outdoors — on café terraces, along the canal at Canal Saint-Martin and on the quais in summer.',
    ],
    seasons: [
      { label: 'Spring', note: 'Mild, blossom in the parks; occasional showers.' },
      { label: 'Summer', note: 'Warm and long, busy, with music festivals and late sunsets.' },
      { label: 'Autumn', note: 'Clear light and thinner crowds — the photographer’s season.' },
      { label: 'Winter', note: 'Cold and grey but festive, with short queues at major museums.' },
    ],
    gettingAround:
      'The Métro reaches almost everywhere and is fastest for cross-city trips; buy a reusable card and top up as needed. Central Paris is genuinely walkable and Vélib’ bikes are useful for river-side stretches. Taxis and ride-hailing are best kept for late nights or luggage days.',
    practical: [
      { label: 'Language', value: 'French; English is widely understood in central Paris.' },
      { label: 'Currency', value: 'Euro (EUR)' },
      { label: 'Plugs', value: 'Type C/E, 230 V — bring an adapter for UK/US plugs.' },
      { label: 'Tipping', value: 'Service is included; round up or leave small change.' },
      { label: 'Tap water', value: 'Safe to drink; ask for “une carafe d’eau” free with meals.' },
      { label: 'Getting in', value: 'Schengen area — check your visa or visa-free allowance.' },
    ],
    facts: [
      'The Eiffel Tower was built for the 1889 World’s Fair and was meant to be dismantled after 20 years.',
      'Paris has around 300 Métro stations, some of them a century old.',
      'The Louvre would take roughly 100 days to see properly at 30 seconds per artwork.',
      'There is a Statue of Liberty replica on the Île aux Cygnes, facing her larger sister in New York.',
    ],
    currency: { code: 'EUR', name: 'Euro', symbol: '€', approximatePerUsd: 0.92 },
    timezone: 'Europe/Paris',
    coordinates: { lat: 48.8566, lon: 2.3522 },
    wikipedia: 'Paris',
  },
  {
    slug: 'switzerland',
    name: 'Switzerland',
    country: 'Switzerland',
    region: 'Bernese Oberland, central Switzerland',
    tagline: 'Lake Brienz beneath the Alps',
    bestTime: 'June to September for hiking, December to March for snow',
    overview: [
      'Switzerland is mountain country organised with clockwork precision. Interlaken, on the neck of land between Lake Thun and Lake Brienz, is the classic base: two turquoise lakes, cog railways climbing to Jungfraujoch, and villages such as Grindelwald and Lauterbrunnen within half an hour.',
      'Travel here is about elevation. A morning lake steamer, an afternoon funicular, a ridge walk with cows and cowbells, and a fondue in a timbered dining room is a complete Swiss day. Trains, boats and cable cars connect with a punctuality that makes car-free touring easy.',
    ],
    eat: [
      {
        name: 'Fondue and raclette',
        description:
          'Melted cheese as a social ritual, best in a village inn after a day outdoors.',
      },
      {
        name: 'Rösti',
        description:
          'Crisp shredded potato cake, often topped with egg, bacon or cheese — the national comfort dish.',
      },
      {
        name: 'Alpine dairies and cheese cellars',
        description:
          'Visit a Sennerei for alpine cheese, butter and yoghurt made from summer mountain milk.',
      },
      {
        name: 'Bakery lunches',
        description:
          'Take-away sandwiches, sausage rolls and Nusstorte make cheap, quick hiking food.',
      },
    ],
    attractions: [
      {
        name: 'Jungfraujoch — Top of Europe',
        description:
          'A cog railway to 3,454 m for glaciers, an ice palace and views into the Aletsch Glacier.',
      },
      {
        name: 'Lake Brienz and Giessbach Falls',
        description:
          'Steamer crossings to the Giessbach falls, with a historic funicular up to the Grandhotel terrace.',
      },
      {
        name: 'Lauterbrunnen Valley',
        description:
          'Glacier-cut valley of 72 waterfalls, with the Staubbach Falls dropping almost 300 m.',
      },
      {
        name: 'Grindelwald–First',
        description:
          'Gondola to cliff walks, mountain carts and a close-up of the Eiger north face.',
      },
      {
        name: 'Schilthorn & Piz Gloria',
        description:
          'Revolving summit restaurant from a James Bond film, reached by cable car from Mürren.',
      },
      {
        name: 'Lake Thun castles',
        description:
          'Oberhofen and Spiez castles sit above the water, reachable by boat and short walk.',
      },
    ],
    history: [
      'The Swiss Confederation grew from a defensive alliance of mountain communities in 1291. Victories over Habsburg armies at Morgarten and Sempach secured de facto independence, and by 1648 the Treaty of Westphalia recognised Switzerland’s separation from the Holy Roman Empire.',
      'Permanent neutrality was agreed after the Napoleonic wars in 1815. The 19th century brought railways and tourism: grand hotels, funiculars and the Jungfrau railway (1912) turned alpine villages into the resorts travellers know today.',
    ],
    geography: [
      'Switzerland is a landlocked knot of mountains and lakes: the Alps cover roughly 60% of the country, the Jura another 10%, leaving the populated plateau between Lake Geneva and Lake Constance. Its highest point is the Dufourspitze at 4,634 m.',
      'Rivers rise here and flow to four seas — the Rhine to the North Sea, the Rhône to the Mediterranean, the Inn to the Black Sea and the Ticino to the Adriatic. That watershed gives the country its wet, green, water-rich character.',
    ],
    culture: [
      'Four national languages — German, French, Italian and Romansh — meet in a country of about nine million people, and regional identity is strong. Village life still turns on church bells, market days, carnival and the summer return of cattle from high pastures.',
      'Orderliness is real: recycling is sorted, quiet hours are observed, and hiking trails are signposted with distances and times. Visitors are expected to keep pace with the courtesy — greet people on the trail and carry out what you carry in.',
    ],
    seasons: [
      {
        label: 'Spring',
        note: 'Snowmelt fills the waterfalls; lower trails open, high passes still closed.',
      },
      {
        label: 'Summer',
        note: 'Best hiking weather, warm lakes, and the peak season for boats and railways.',
      },
      {
        label: 'Autumn',
        note: 'Clear views, golden larch, fewer people; some cable cars pause for maintenance.',
      },
      { label: 'Winter', note: 'Ski resorts open, lakeside towns go quiet and festive.' },
    ],
    gettingAround:
      'The Swiss Travel Pass covers trains, buses, boats and many mountain railways, and connections are frequent enough to plan on the day. Postbuses reach remote valleys; scenic routes such as the GoldenPass and Glacier Express need seat reservations in summer.',
    practical: [
      { label: 'Languages', value: 'German, French, Italian, Romansh; English widely spoken.' },
      { label: 'Currency', value: 'Swiss franc (CHF) — cards accepted almost everywhere.' },
      { label: 'Plugs', value: 'Type J (three-pin), 230 V — most European adapters will not fit.' },
      { label: 'Tipping', value: 'Service included; rounding up is appreciated.' },
      {
        label: 'Tap water',
        value: 'Excellent — including from public fountains unless marked “kein Trinkwasser”.',
      },
      { label: 'Getting in', value: 'Schengen area; some nationalities need a visa.' },
    ],
    facts: [
      'Switzerland has more than 7,000 lakes and around 1,500 glaciers.',
      'Swiss trains run to a punctuality target measured in seconds, not minutes.',
      'The Jungfraujoch railway station is the highest in Europe at 3,454 m.',
      'Cows in alpine pastures wear bells so herders can find them in fog.',
    ],
    currency: { code: 'CHF', name: 'Swiss franc', symbol: 'Fr.', approximatePerUsd: 0.88 },
    timezone: 'Europe/Zurich',
    coordinates: { lat: 46.6863, lon: 7.8632 },
    wikipedia: 'Switzerland',
  },
  {
    slug: 'norway',
    name: 'Norway',
    country: 'Norway',
    region: 'Tromsø and the western fjords',
    tagline: 'Fjords beneath the northern light',
    bestTime: 'September to March for aurora, June to August for midnight sun',
    overview: [
      'Norway is a country of water and stone: deep fjords cut into a mountainous coast, waterfalls falling thousands of feet, and a shoreline so broken it would circle the planet one and a half times. In the north, the same landscape becomes the stage for the aurora borealis and the midnight sun.',
      'Tromsø sits a few hundred kilometres inside the Arctic Circle and mixes polar research, wooden wharves and aurora chases with easy day trips to fjord islands. Further south, Bergen is the gateway to the Nærøyfjord and Hardangerfjord, where ferries thread between cliffs.',
    ],
    eat: [
      {
        name: 'Arctic seafood',
        description:
          'Cod, king crab, scallops and salmon, often simply grilled with butter and lemon.',
      },
      {
        name: 'Fiskesuppe',
        description: 'Creamy fish soup with root vegetables — the northern coast’s everyday bowl.',
      },
      {
        name: 'Reindeer and game',
        description: 'Slow-braised reindeer with lingonberries, a Sami-influenced northern staple.',
      },
      {
        name: 'Cinnamon buns and brown cheese',
        description:
          'Warm skillingsboller in Bergen bakeries, plus brunost (caramelised brown cheese) on toast.',
      },
    ],
    attractions: [
      {
        name: 'Aurora nights around Tromsø',
        description:
          'Guided chases from September to March, with green light over fjords and snowfields.',
      },
      {
        name: 'Fjord cruises',
        description:
          'The Nærøyfjord and Geirangerfjord are UNESCO-listed; Trollfjord and Lysefjord add sea eagles and Pulpit Rock.',
      },
      {
        name: 'Bergen and Bryggen',
        description:
          'Hanseatic wooden wharves, a fish market and a funicular to the Mount Fløyen viewpoint.',
      },
      {
        name: 'Lofoten Islands',
        description:
          'Red rorbuer cabins, jagged peaks rising straight from the sea and cod-drying racks in spring.',
      },
      {
        name: 'The Atlantic Road',
        description:
          'Eight bridges leaping between islands on the Atlantic coast, spectacular in high seas.',
      },
      {
        name: 'North Cape & Sami country',
        description:
          'The northernmost reachable point of mainland Europe, with Sami culture along the way.',
      },
    ],
    history: [
      'Norway was settled by Norse seafarers who founded a maritime empire of exploration, trade and raiding. Harald Fairhair is traditionally credited with unifying the kingdom around 872, and medieval Norse culture produced the sagas and the first European parliament, the Gulating.',
      'Norway was in union with Denmark for four centuries and then Sweden until 1905, when it became independent and chose a Danish prince as King Haakon VII. The discovery of North Sea oil in 1969 reshaped the economy and financed today’s welfare state.',
    ],
    geography: [
      'Norway stretches 1,750 km from the North Sea to the Barents Sea, with Sweden, Finland and Russia along its eastern border. Fjords — Sognefjord deepest and longest at 204 km — were carved by ice and flooded by the sea.',
      'The coast is sheltered by tens of thousands of islands, and the Gulf Stream keeps harbours ice-free even far north. Inland, plateau and tundra give way to the high fells, home to wild reindeer and Europe’s largest mountain plateau.',
    ],
    culture: [
      'Everyday life is outdoors: cabins (hytter), cross-country skiing, berry picking and the law of allemannsretten — the right to roam freely on uncultivated land, provided you leave no trace.',
      'Equality and informality shape social life, and the north adds Sami traditions — joik songs, duodji handicrafts and reindeer herding — to the Norwegian mix.',
    ],
    seasons: [
      { label: 'Winter', note: 'Polar night in the far north, aurora, skiing and dog sledding.' },
      { label: 'Spring', note: 'Snow melting, waterfalls at full flow, quiet roads.' },
      {
        label: 'Summer',
        note: 'Midnight sun, warm fjord villages, long hiking days and ferries in full service.',
      },
      { label: 'Autumn', note: 'Aurora returns with dark skies, plus birch forests turning gold.' },
    ],
    gettingAround:
      'Trains link Oslo, Bergen and Trondheim over spectacular mountain lines, while ferries and express boats are the roads of the fjord coast. Driving gives freedom but tunnels and ferry crossings take time; in winter, plan for short daylight and studded tyres.',
    practical: [
      { label: 'Language', value: 'Norwegian; English is spoken fluently by nearly everyone.' },
      {
        label: 'Currency',
        value: 'Norwegian krone (NOK) — Norway is expensive; budget accordingly.',
      },
      { label: 'Plugs', value: 'Type C/F, 230 V.' },
      { label: 'Tipping', value: 'Not expected; service is included, rounding up is polite.' },
      { label: 'Tap water', value: 'Among the cleanest in the world.' },
      { label: 'Getting in', value: 'Schengen area; bring warm layers whatever the season.' },
    ],
    facts: [
      'Norway’s coastline, including islands, is estimated at over 100,000 km.',
      'The Sognefjord is 1,308 m deep — deeper than the North Sea in places.',
      'Norway introduced the world’s first fully electric car ferry and leads EV adoption.',
      'In Svalbard, 60% of the land is glacier and polar bears outnumber people.',
    ],
    currency: { code: 'NOK', name: 'Norwegian krone', symbol: 'kr', approximatePerUsd: 10.8 },
    timezone: 'Europe/Oslo',
    coordinates: { lat: 69.6492, lon: 18.9553 },
    wikipedia: 'Norway',
  },
  {
    slug: 'santorini',
    name: 'Santorini',
    country: 'Greece',
    region: 'Cyclades, Aegean Sea',
    tagline: 'White walls, Aegean blue',
    bestTime: 'Late April to June, or September to October',
    overview: [
      'Santorini is the rim of a flooded volcano. The caldera cliffs fall 300 m to the sea, and villages are stacked along the edge in whitewashed cubes, blue domes and cave houses — Oia and Fira above all.',
      'Days here run on light: sunrise over the caldera from the east, a swim or a sail in the afternoon, then the famous sunset on the western rim. Between them, vineyards growing in woven basket vines, black and red volcanic beaches, and the archaeological site at Akrotiri give the island more substance than the postcard suggests.',
    ],
    eat: [
      {
        name: 'Tomato keftedes and fava',
        description:
          'Cherry tomatoes, white aubergine and split-pea fava grow in volcanic ash soil; taste them as mezze.',
      },
      {
        name: 'Assyrtiko wine cellars',
        description:
          'Crisp volcanic white wine from basket-trained vines; several estate wineries offer caldera-view tastings.',
      },
      {
        name: 'Tavernas in Ammoudi Bay',
        description:
          'Fresh grilled octopus and fish at the water’s edge below Oia, reached by steps or boat.',
      },
      {
        name: 'Gyros and bakery pies',
        description:
          'Cheap, excellent lunches in Fira and Karterados — look for spinach and cheese pies.',
      },
    ],
    attractions: [
      {
        name: 'Oia and the sunset castle',
        description:
          'The classic caldera sunset; arrive early or watch from Ammoudi or Imerovigli instead.',
      },
      {
        name: 'Fira to Oia caldera walk',
        description:
          'A 10 km cliff-top trail linking the two main towns past Imerovigli and Skaros Rock.',
      },
      {
        name: 'Akrotiri archaeological site',
        description:
          'A Bronze Age town buried by eruption around 1600 BC, with frescoes and paved streets under a roof.',
      },
      {
        name: 'Sailing and hot springs',
        description:
          'Catamaran trips to Red Beach, White Beach and the sulphur hot springs of Nea Kameni.',
      },
      {
        name: 'Ancient Thera',
        description:
          'Ptolemaic and Roman ruins on the Mesa Vouno ridge above Kamari, with wide sea views.',
      },
      {
        name: 'Pyrgos and Megalochori',
        description:
          'Inland hill villages of quiet lanes, churches and rooftops away from the caldera crowds.',
      },
    ],
    history: [
      'Santorini’s Minoan town of Akrotiri was a thriving Bronze Age port before a massive eruption around 1600 BC buried it in ash — a catastrophe that preserved streets, frescoes and pottery for archaeologists.',
      'The island then passed through Dorian, Roman, Byzantine and Venetian hands; the Venetians named it Santorini after Saint Irene. A devastating earthquake in 1956 reshaped modern life, after which tourism gradually rebuilt the island economy.',
    ],
    geography: [
      'The island is the eastern remnant of a volcanic caldera rim, roughly 76 square kilometres, with a crescent shape opening west towards the small volcanic islets of Nea Kameni and Palea Kameni.',
      'Volcanic soil holds little water, which is why the island grows drought-hardy vines trained into low baskets to shelter from wind, and why sunsets from the cliff rim look so clean and unobstructed.',
    ],
    culture: [
      'Life revolves around the sea, the church calendar and the tourist season. Easter is the biggest celebration, with candle-lit processions and fireworks, and many businesses close for the winter months.',
      'Hospitality is warm and unhurried: long meals, shared mezze plates, and an easy invitation to sit and watch the light change over the caldera.',
    ],
    seasons: [
      { label: 'Spring', note: 'Wildflowers, mild days and quiet villages — wind can be strong.' },
      {
        label: 'Summer',
        note: 'Hot, dry and crowded, with the best swimming and sailing conditions.',
      },
      { label: 'Autumn', note: 'Warm sea, softer light and fewer visitors — a favourite window.' },
      {
        label: 'Winter',
        note: 'Very quiet, some closures, but dramatic weather and empty viewpoints.',
      },
    ],
    gettingAround:
      'Local buses run reliably between Fira, Oia, the beaches and the airport, and taxis are limited in number. The caldera villages are for walking — steps and cobbles everywhere, so pack accordingly. Renting a car or ATV helps for inland villages and wineries.',
    practical: [
      { label: 'Language', value: 'Greek; English is spoken in tourist areas.' },
      { label: 'Currency', value: 'Euro (EUR)' },
      { label: 'Plugs', value: 'Type C/F, 230 V.' },
      { label: 'Tipping', value: 'Small tips on top of the bill are customary.' },
      {
        label: 'Tap water',
        value: 'Technically treated but salty-tasting; most people drink bottled.',
      },
      { label: 'Getting in', value: 'Schengen area; season runs April to October.' },
    ],
    facts: [
      'The eruption that buried Akrotiri is one of the largest in recorded history.',
      'Vines here are woven into basket shapes called “kouloura” to survive wind and drought.',
      'Santorini’s black, red and white beaches each come from different volcanic layers.',
      'Some claim the island inspired the legend of Atlantis.',
    ],
    currency: { code: 'EUR', name: 'Euro', symbol: '€', approximatePerUsd: 0.92 },
    timezone: 'Europe/Athens',
    coordinates: { lat: 36.3932, lon: 25.4615 },
    wikipedia: 'Santorini',
  },
  {
    slug: 'rome',
    name: 'Rome',
    country: 'Italy',
    region: 'Lazio, central Italy',
    tagline: 'Ancient stone in the evening light',
    bestTime: 'April to May, or September to October',
    overview: [
      'Rome is a city built in layers, with three thousand years of stone still in daily use. A Roman amphitheatre frames a modern piazza, a Renaissance palazzo sits on ancient foundations, and tram lines run past temples where the Forum once was.',
      'The historic centre is compact and endlessly walkable: the Colosseum to the Pantheon in half an hour, the Spanish Steps to Trastevere across the river. Evenings are for piazzas — an aperitivo in Campo de’ Fiori, dinner in Testaccio, a walk past illuminated fountains.',
    ],
    eat: [
      {
        name: 'Cacio e pepe and carbonara',
        description:
          'Roman pasta at its finest, made with just cheese, pepper, egg and guanciale — eat it in Trastevere or Testaccio.',
      },
      {
        name: 'Pizza al taglio',
        description:
          'Rectangular pizza sold by weight with toppings from potato and rosemary to mortadella.',
      },
      {
        name: 'Testaccio market',
        description:
          'A working neighbourhood market for supplì, porchetta sandwiches and Roman-Jewish classics.',
      },
      {
        name: 'Gelato tradition',
        description:
          'Small artisan gelaterie keep to natural flavours; pistachio and stracciatella are good tests.',
      },
      {
        name: 'Carciofi alla giudia',
        description:
          'Fried artichokes from the Jewish Ghetto, best in spring when the season peaks.',
      },
    ],
    attractions: [
      {
        name: 'Colosseum, Forum and Palatine Hill',
        description:
          'One ticket covers all three; book a timed slot and see the underground chambers if you can.',
      },
      {
        name: 'Vatican Museums and St Peter’s',
        description:
          'The Sistine Chapel, Raphael Rooms and the basilica dome — book ahead and dress modestly.',
      },
      {
        name: 'Pantheon and Piazza Navona',
        description: 'A perfectly preserved Roman dome, then Bernini fountains a few streets away.',
      },
      {
        name: 'Trevi Fountain and Spanish Steps',
        description:
          'Early morning or after midnight avoids the crush at these baroque set pieces.',
      },
      {
        name: 'Trastevere',
        description: 'Cobbled lanes, ivy-covered facades and the city’s liveliest dinner scene.',
      },
      {
        name: 'Appian Way and catacombs',
        description:
          'Ancient paving stones, aqueduct park and early Christian underground cemeteries.',
      },
    ],
    history: [
      'Tradition dates Rome’s founding to 753 BC; by the 2nd century AD it ruled an empire ringing the Mediterranean, and its population passed a million. The Pantheon, Colosseum and Aqueducts date from that peak.',
      'After the fall of the western empire, Rome became the seat of the popes and the centre of European Christendom. It was capital of a unified Italy from 1871, and Mussolini’s regime, wartime occupation and post-war boom shaped the modern city.',
    ],
    geography: [
      'Rome sits on the Tiber about 24 km from the Tyrrhenian Sea, spread over the classic seven hills — Aventine, Caelian, Capitoline, Esquiline, Palatine, Quirinal and Viminal — plus the Janiculum across the river.',
      'Volcanic hills to the south-east supply the tufa stone and pozzolana ash that Romans used for concrete, while the surrounding Campagna countryside opens into vineyards and ruins.',
    ],
    culture: [
      'Rome’s mood changes street by street. Locals take coffee standing at the bar, eat dinner late, and treat the neighbourhood piazza as an extension of the living room.',
      'Dress matters at churches and in the Vatican, churches are closed at midday, and August empties parts of the city as families head for the coast.',
    ],
    seasons: [
      { label: 'Spring', note: 'Warm, blooming and busy, with Easter crowds around the Vatican.' },
      { label: 'Summer', note: 'Hot and humid; start sights at dawn and rest in the afternoon.' },
      {
        label: 'Autumn',
        note: 'Golden light and comfortable temperatures — arguably the best season.',
      },
      { label: 'Winter', note: 'Cool and quiet, festive nativity scenes and short queues.' },
    ],
    gettingAround:
      'Two Metro lines, trams and frequent buses cover the centre, but Rome is best on foot with comfortable shoes. Trains from Termini reach Florence, Naples and the coast in hours, and the Leonardo Express links the airport to Termini in 32 minutes.',
    practical: [
      { label: 'Language', value: 'Italian; English is common in the centre.' },
      { label: 'Currency', value: 'Euro (EUR)' },
      { label: 'Plugs', value: 'Type C/F/L, 230 V.' },
      { label: 'Tipping', value: 'Not required; a small “coperto” charge appears on bills.' },
      {
        label: 'Tap water',
        value: 'Safe and good; the street fountains (nasoni) run drinkable water.',
      },
      { label: 'Getting in', value: 'Schengen area; book major sites in advance.' },
    ],
    facts: [
      'The Pantheon’s dome is still the largest unreinforced concrete dome in the world.',
      'Rome has around 900 churches, more than any other city.',
      'Trevi Fountain collects thousands of euros a day, donated to charity.',
      'Cats have legal protection in the city’s ancient ruins, cared for by volunteers.',
    ],
    currency: { code: 'EUR', name: 'Euro', symbol: '€', approximatePerUsd: 0.92 },
    timezone: 'Europe/Rome',
    coordinates: { lat: 41.9028, lon: 12.4964 },
    wikipedia: 'Rome',
  },
  {
    slug: 'london',
    name: 'London',
    country: 'United Kingdom',
    region: 'Greater London, England',
    tagline: 'Rain over the Thames',
    bestTime: 'May to September, when the light lasts late',
    overview: [
      'London is a collection of villages stitched together by a river, a Tube map and roughly 1,700 years of building. Roman walls, Georgian squares, Victorian markets and glass towers sit within a few minutes of each other.',
      'It is a city of free museums, enormous parks and neighbourhoods with distinct characters — the City and Southwark for history, Soho and Shoreditch for food and nightlife, Notting Hill and Hampstead for quiet streets.',
    ],
    eat: [
      {
        name: 'Borough Market',
        description:
          'A thousand-year-old food market under railway arches — cheese, oysters, paella and pastries.',
      },
      {
        name: 'Sunday roasts',
        description: 'A pub tradition: roast beef or lamb, Yorkshire pudding, potatoes and gravy.',
      },
      {
        name: 'Brick Lane curries',
        description:
          'Bangladeshi-Indian restaurants in the East End, the historic heart of the city’s curry scene.',
      },
      {
        name: 'Chinatown and Covent Garden',
        description: 'Dim sum, pho and ramen around Gerrard Street, plus street performers nearby.',
      },
      {
        name: 'Afternoon tea',
        description:
          'From grand hotels to small tearooms — scones, clotted cream and a pot of English breakfast.',
      },
    ],
    attractions: [
      {
        name: 'British Museum',
        description: 'The Rosetta Stone, Parthenon sculptures and Egyptian mummies, free to enter.',
      },
      {
        name: 'Tower of London and Tower Bridge',
        description:
          'Nearly a thousand years of royal history, the Crown Jewels and a glass-floor walkway.',
      },
      {
        name: 'Westminster and the South Bank',
        description:
          'Big Ben, the Houses of Parliament and a riverside walk to the London Eye and Tate Modern.',
      },
      {
        name: 'The National Gallery and Tate Modern',
        description:
          'World-class art from Renaissance masters to contemporary installations, both free.',
      },
      {
        name: 'Camden and Portobello markets',
        description:
          'Vintage clothing, street food and canal-side life in two very different markets.',
      },
      {
        name: 'Royal parks and palaces',
        description:
          'Hyde Park, Regent’s Park and Kensington Gardens, plus Buckingham and Kensington palaces.',
      },
    ],
    history: [
      'Londinium was founded by the Romans around AD 47 on the Thames. It grew into medieval England’s capital, surviving the plague and the Great Fire of 1666, which destroyed most of the city and prompted the rebuilding of St Paul’s.',
      'Victorian London became the largest city in the world, powered by empire and industry, and the Blitz in 1940–41 tested it again. Since the 1990s, regeneration of the docklands and the 2012 Olympics have reshaped the east of the city.',
    ],
    geography: [
      'London straddles the Thames in a wide basin of low hills — Hampstead Heath to the north, the North Downs visible to the south. The river, tidal and embanked, cuts the city into north and south.',
      'It covers over 1,500 square kilometres with some eight million trees, which is why it is often called a forest city, and around 47% of it is green space or water.',
    ],
    culture: [
      'More than 300 languages are spoken here, and the food, festivals and neighbourhoods show it. Queuing is a social contract, and the Tube runs on unspoken rules of quiet and personal space.',
      'Museums are free by law, pubs are the democratic living room, and Sunday markets and football afternoons set the weekly rhythm.',
    ],
    seasons: [
      { label: 'Spring', note: 'Blossom in the parks, mild days and changeable weather.' },
      { label: 'Summer', note: 'Long evenings, festivals and beer gardens — book hotels early.' },
      {
        label: 'Autumn',
        note: 'Crisp, sometimes sunny, with the season’s cultural programme opening.',
      },
      {
        label: 'Winter',
        note: 'Early darkness, Christmas lights along Oxford Street and pantomime season.',
      },
    ],
    gettingAround:
      'Contactless bank cards and phones work on the Tube, buses and trains, with daily caps. The Underground is fastest for long hops; buses and walking show you more. Heathrow and Gatwick connect by train in well under an hour.',
    practical: [
      { label: 'Language', value: 'English.' },
      { label: 'Currency', value: 'Pound sterling (GBP)' },
      { label: 'Plugs', value: 'Type G (three-pin), 230 V.' },
      { label: 'Tipping', value: '10–12.5% in restaurants if service is not already added.' },
      { label: 'Tap water', value: 'Safe to drink and served free on request.' },
      { label: 'Getting in', value: 'Not in Schengen — check UK entry rules separately.' },
    ],
    facts: [
      'The Tube began in 1863 as the world’s first underground railway.',
      'Big Ben is the bell; the tower is officially the Elizabeth Tower.',
      'There is a Roman amphitheatre under the Guildhall Art Gallery.',
      'London has around 170 museums, many of them free.',
    ],
    currency: { code: 'GBP', name: 'Pound sterling', symbol: '£', approximatePerUsd: 0.79 },
    timezone: 'Europe/London',
    coordinates: { lat: 51.5074, lon: -0.1278 },
    wikipedia: 'London',
  },
  {
    slug: 'reykjavik',
    name: 'Reykjavik',
    country: 'Iceland',
    region: 'Capital region, south-west Iceland',
    tagline: 'Quiet colour beneath northern skies',
    bestTime: 'June to August for light, September to March for aurora',
    overview: [
      'Reykjavik is the world’s northernmost capital and one of its smallest, a low-rise city of corrugated iron and bright paint where the sea and the mountains are always in view. It runs on geothermal heat, and the hot water that reaches every tap smells faintly of sulphur.',
      'The city is a comfortable base for the island’s greatest hits: the Golden Circle, the south-coast waterfalls, glacier lagoons and lava fields, all reachable as day trips. Within the city itself there are volcano and settlement museums, geothermal pools, and a compact downtown of cafés, bookshops and music venues.',
    ],
    eat: [
      {
        name: 'Icelandic lamb',
        description:
          'Free-range mountain lamb, slow-cooked with root vegetables or served as tender fillet.',
      },
      {
        name: 'Seafood from the harbour',
        description:
          'Langoustine, cod, Arctic char and fish stew in restaurants around the old harbour.',
      },
      {
        name: 'Skyr and bakery pastries',
        description:
          'Icelandic yoghurt with berries, plus cinnamon rolls and rye bread baked in geothermal ground.',
      },
      {
        name: 'Hot dog carts',
        description:
          'The famous downtown stand serves lamb-based hot dogs with crunchy onion and remoulade.',
      },
      {
        name: 'Geothermal food tours',
        description:
          'Rye bread and eggs cooked in hot sand, then tomato-greenhouse lunches outside the city.',
      },
    ],
    attractions: [
      {
        name: 'Hallgrímskirkja tower',
        description:
          'Reykjavik’s landmark church, with a lift to the top for rooftop views over the city.',
      },
      {
        name: 'Blue Lagoon and Sky Lagoon',
        description:
          'Geothermal spa bathing in mineral-rich water, both within easy reach of the city and airport.',
      },
      {
        name: 'Golden Circle',
        description:
          'Þingvellir National Park, the Geysir geothermal area and Gullfoss waterfall in one loop.',
      },
      {
        name: 'South coast waterfalls',
        description:
          'Seljalandsfoss, where you can walk behind the falls, and the much larger Skógafoss.',
      },
      {
        name: 'Northern lights',
        description: 'Aurora tours leave the city lights behind between September and March.',
      },
      {
        name: 'Whale watching and puffin boats',
        description:
          'Departures from the old harbour for humpbacks, minkes and, in summer, puffin colonies.',
      },
    ],
    history: [
      'Iceland was settled by Norse explorers and Irish monks in the 9th century, with the Althing in AD 930 recognised as one of the world’s oldest parliaments. Saga literature from this period remains a cornerstone of European storytelling.',
      'Reykjavik grew slowly as a fishing and trading post, and only became a city in 1786. Independence from Denmark came in 1944, and geothermal development plus fisheries wealth transformed Iceland in the 20th century.',
    ],
    geography: [
      'Iceland sits astride the Mid-Atlantic Ridge, where the North American and Eurasian plates pull apart, which is why the island has volcanoes, geysers, earthquakes and lava fields. Reykjavik occupies a peninsula of lava and basalt in the south-west.',
      'The Gulf Stream keeps winters milder than the latitude suggests, though weather changes fast. Winter daylight can be as short as four hours; June nights never quite go dark, and the city celebrates the midnight sun.',
    ],
    culture: [
      'Icelanders take geothermal pools seriously — the local pool is the social equivalent of a pub. Literature and music loom large, and belief in elves and hidden people is often kept playfully alive.',
      'The language is Norse-derived and actively protected, with new words coined rather than borrowed. Public life is orderly and quiet, and nature is treated with real respect.',
    ],
    seasons: [
      {
        label: 'Spring',
        note: 'Ice caves close, aurora fades, puffy Fulmars arrive and roads reopen slowly.',
      },
      {
        label: 'Summer',
        note: 'Midnight sun, green landscapes, puffins and full access to the highlands.',
      },
      {
        label: 'Autumn',
        note: 'Aurora returns, and the low light makes waterfalls and lava fields glow.',
      },
      {
        label: 'Winter',
        note: 'Short days, ice caves, snow-covered mountains and strong aurora potential.',
      },
    ],
    gettingAround:
      'Downtown Reykjavik is walkable and bikeable, with frequent buses; most visitors rent a car for day trips. Keflavík airport is a 45-minute drive or Flybus ride from the centre. Winter driving needs care — check road.is and vedur.is before setting out.',
    practical: [
      { label: 'Language', value: 'Icelandic; English is spoken almost universally.' },
      { label: 'Currency', value: 'Icelandic króna (ISK) — cards accepted nearly everywhere.' },
      { label: 'Plugs', value: 'Type C/F, 230 V.' },
      { label: 'Tipping', value: 'Not customary; service is included.' },
      {
        label: 'Tap water',
        value: 'Excellent — geothermal hot water smells of sulphur but is safe.',
      },
      {
        label: 'Getting in',
        value: 'Schengen area; weather can change plans quickly at any time of year.',
      },
    ],
    facts: [
      'Reykjavik has the northernmost capital-city location of any sovereign state.',
      'Iceland runs almost entirely on renewable geothermal and hydro power.',
      'There are no mosquitoes in Iceland, and no railways.',
      'The Þingvellir rift valley is where you can walk between two tectonic plates.',
    ],
    currency: { code: 'ISK', name: 'Icelandic króna', symbol: 'kr', approximatePerUsd: 138 },
    timezone: 'Atlantic/Reykjavik',
    coordinates: { lat: 64.1466, lon: -21.9426 },
    wikipedia: 'Reykjavík',
  },
  {
    slug: 'istanbul',
    name: 'Istanbul',
    country: 'Turkey',
    region: 'Marmara region, on the Bosphorus',
    tagline: 'Two continents, one golden horizon',
    bestTime: 'April to May, or September to November',
    overview: [
      'Istanbul is the only major city on two continents, split by the Bosphorus strait and layered with Byzantine and Ottoman history. The historic peninsula holds Hagia Sophia, the Blue Mosque and Topkapı Palace within walking distance of each other.',
      'Away from the monuments, the city is ferries, tea gardens, fish markets and bazaars. Cross to the Asian side for Kadıköy’s food streets, or take a morning boat up the strait past wooden yalı mansions towards the Black Sea.',
    ],
    eat: [
      {
        name: 'Street simit and balık ekmek',
        description:
          'Sesame bread rings and grilled-fish sandwiches sold beside the Galata Bridge.',
      },
      {
        name: 'Turkish breakfast',
        description:
          'A table of cheeses, olives, jams, eggs and endless tea — a weekend ritual, not a quick meal.',
      },
      {
        name: 'Kebabs and pide',
        description:
          'From Adana kebab to boat-shaped pide with cheese and sucuk, in grilled-food districts like Beyoğlu.',
      },
      {
        name: 'Baklava and künefe',
        description: 'Pistachio baklava and hot cheese pastry dessert from Gaziantep-style shops.',
      },
      {
        name: 'Kadıköy market',
        description:
          'The Asian side’s produce market and meyhane lanes, a ferry ride from Eminönü.',
      },
    ],
    attractions: [
      {
        name: 'Hagia Sophia and Blue Mosque',
        description:
          'A 6th-century basilica-turned-mosque facing a 17th-century mosque famous for its blue İznik tiles.',
      },
      {
        name: 'Topkapı Palace',
        description:
          'Ottoman court, treasury and harem overlooking the Bosphorus and the Sea of Marmara.',
      },
      {
        name: 'Grand Bazaar and Spice Bazaar',
        description:
          'Thousands of shops in a covered 15th-century market, plus the aromatic spice market at Eminönü.',
      },
      {
        name: 'Basilica Cistern',
        description:
          'An underground forest of columns built by Justinian, now atmospherically lit.',
      },
      {
        name: 'Bosphorus ferry and Galata Tower',
        description:
          'A commuter boat up the strait and a rooftop view over the Golden Horn from Beyoğlu.',
      },
      {
        name: 'Chora Church and city walls',
        description:
          'Some of the finest Byzantine mosaics in the world, near the ancient land walls.',
      },
    ],
    history: [
      'Founded as Byzantium, the city became Constantinople in AD 330 as capital of the eastern Roman Empire. For a thousand years it was the largest city in Europe, until the Fourth Crusade sacked it in 1204 and the Ottomans took it in 1453.',
      'As Ottoman capital it ruled three continents, and after the republic was declared in 1923 the capital moved to Ankara. Istanbul kept its role as Turkey’s cultural and economic centre, and the Bosphorus bridges have since linked Asia and Europe by road.',
    ],
    geography: [
      'Istanbul wraps around the Bosphorus, a 30 km strait joining the Black Sea to the Sea of Marmara and, through the Dardanelles, to the Mediterranean. The Golden Horn inlet divides the European side into the historic peninsula and Beyoğlu.',
      'The city is built on hills, so views open up constantly. It also sits on the North Anatolian Fault, making earthquakes a permanent part of planning and construction.',
    ],
    culture: [
      'Istanbul runs on tea and conversation: shopkeepers deliver glasses of çay on trays, and ferry commuters throw bread to the gulls. Hospitality is generous and bargaining in the bazaars is friendly rather than confrontational.',
      'Mosques are active places of worship — dress modestly, remove shoes and avoid prayer times. Cats, meanwhile, are the city’s unofficial mascots and are fed everywhere.',
    ],
    seasons: [
      { label: 'Spring', note: 'Tulips in the parks, mild days and the best walking weather.' },
      {
        label: 'Summer',
        note: 'Hot and humid; ferry trips and rooftop terraces come into their own.',
      },
      { label: 'Autumn', note: 'Clear, comfortable and golden — a strong season for photography.' },
      {
        label: 'Winter',
        note: 'Cold, sometimes snowy, with fewer crowds and cosy çay bahçesi days.',
      },
    ],
    gettingAround:
      'Istanbulkart works on metro, tram, funicular, bus and ferry. Ferries are the most enjoyable way to cross the Bosphorus, and the T1 tram links most historic sights. Traffic is heavy, so allow generous time for road transfers.',
    practical: [
      { label: 'Language', value: 'Turkish; English is common in tourist districts.' },
      { label: 'Currency', value: 'Turkish lira (TRY) — prices move with inflation; check rates.' },
      { label: 'Plugs', value: 'Type C/F, 230 V.' },
      { label: 'Tipping', value: 'Around 5–10% in restaurants and a little for hotel staff.' },
      { label: 'Tap water', value: 'Generally not drunk; bottled water is cheap and universal.' },
      { label: 'Getting in', value: 'Visa or e-visa may be required depending on nationality.' },
    ],
    facts: [
      'Hagia Sophia has served as a cathedral, a mosque and a museum across 1,500 years.',
      'The Grand Bazaar has around 4,000 shops and 60 streets.',
      'Istanbul’s Basilica Cistern was built with columns recycled from older temples.',
      'By population, Istanbul is among the largest cities in Europe.',
    ],
    currency: { code: 'TRY', name: 'Turkish lira', symbol: '₺', approximatePerUsd: 34 },
    timezone: 'Europe/Istanbul',
    coordinates: { lat: 41.0082, lon: 28.9784 },
    wikipedia: 'Istanbul',
  },
  {
    slug: 'netherlands',
    name: 'Netherlands',
    country: 'Netherlands',
    region: 'North and South Holland, plus the Zeeland delta',
    tagline: 'Canals, bicycles and gabled houses',
    bestTime: 'April to May for the bulb fields, or September for quiet canals',
    overview: [
      'The Netherlands is a country you experience at bicycle speed. Amsterdam’s canal ring is still the best first impression — narrow gabled houses leaning over black water, houseboats with geraniums on the roof, and the flat clatter of bikes on cobbles — but Leiden, Utrecht, Delft and Haarlem hold the same picture on a smaller, quieter scale.',
      'Beyond the old towns the country is a working landscape of polders, dykes, windmills and greenhouses, and almost all of it is engineered. Around a quarter of the land sits below sea level, and the Dutch have been holding back the North Sea since the thirteenth century. Trains cross the whole country in a couple of hours, so the coast, the bulb fields and the delta islands are easy day trips.',
    ],
    eat: [
      {
        name: 'Bruin cafés',
        description:
          'Brown cafés, named for their smoke-darkened wooden interiors, serve beer, bitterballen and plain good bar food — the social heart of most neighbourhoods.',
      },
      {
        name: 'Stroopwafel and poffertjes',
        description:
          'Warm syrup waffles pressed to order at market stalls, and tiny buttered pancakes dusted with icing sugar and served with butter.',
      },
      {
        name: 'Rijsttafel',
        description:
          'The Dutch–Indonesian rice table: a dozen small dishes with rice, sambal and satay, a colonial legacy that became a national favourite.',
      },
      {
        name: 'Haring stalls',
        description:
          'Raw herring with onions and pickles, or kibbeling — battered fish bites with garlic sauce — eaten standing at harbour and market stands.',
      },
      {
        name: 'Albert Cuyp and Noordermarkt',
        description:
          'Amsterdam’s daily street market and its Saturday farmers’ market for cheese, bread, bulbs and flowers straight from the growers.',
      },
    ],
    attractions: [
      {
        name: 'Amsterdam canal ring',
        description:
          'The seventeenth-century girdle of waterways, best seen by boat at dusk or on foot through the Jordaan and the Nine Streets.',
      },
      {
        name: 'Rijksmuseum and Van Gogh Museum',
        description:
          'The Dutch Golden Age and the largest Van Gogh collection anywhere, side by side on Museumplein. Timed tickets are essential.',
      },
      {
        name: 'Anne Frank House',
        description:
          'The canal-side hiding place, now a museum. Tickets are released online only, weeks ahead, for a specific time slot.',
      },
      {
        name: 'Keukenhof and the bulb fields',
        description:
          'Open from roughly late March to mid-May, when the fields around Lisse are striped with tulips, hyacinths and daffodils.',
      },
      {
        name: 'Kinderdijk windmills',
        description:
          'Nineteen eighteenth-century windmills standing in one polder, a UNESCO site about 25 km from Rotterdam and reachable by waterbus.',
      },
      {
        name: 'De Hoge Veluwe National Park',
        description:
          'Sand drifts, heath and pine woods, with the Kröller-Müller Museum and its Van Goghs in the middle of the park.',
      },
    ],
    history: [
      'The Low Countries were a patchwork of counties and duchies until the Dutch Revolt against Spain in the late sixteenth century; the Dutch Republic that followed became the world’s first great trading power, and the canal ring of Amsterdam was dug during that boom in the 1600s.',
      'The nineteenth century added railways, canals and huge drainage works, and the twentieth brought the Zuiderzee Works and the Delta Works after the North Sea flood of 1953. The Netherlands was occupied during the Second World War, and the postwar years saw it become a founding member of what is now the European Union.',
    ],
    geography: [
      'The country is flat, low and shaped by rivers. The Rhine, Maas and Scheldt meet the sea in a shared delta, and long dune barriers run down the North Sea coast, protecting polders that are pumped dry by a national network of dykes, canals and pumping stations.',
      'The west is the most densely built — Amsterdam, Rotterdam, The Hague and Utrecht form one urban region — while the north and east are farmland, heath and the shallow Wadden Sea, whose tidal islands are a UNESCO site.',
    ],
    culture: [
      'Dutch life runs on directness and planning: appointments are kept, agendas are consulted, and a bicycle has right of way in most situations. Greet shopkeepers on entering and leave a small tip in cafés rather than a large one.',
      'There is a strong tradition of gezelligheid — cosy togetherness — which explains the crowded terraces, the candlelit brown cafés and the national enthusiasm for sitting by water with coffee and cake.',
    ],
    seasons: [
      {
        label: 'Spring',
        note: 'Tulips, blossom and unpredictable showers; the busiest month is April.',
      },
      {
        label: 'Summer',
        note: 'Mild and long, with festivals, terraces and open-air swimming in the canals.',
      },
      { label: 'Autumn', note: 'Grey skies, golden parks and fewer queues at the big museums.' },
      {
        label: 'Winter',
        note: 'Cold, damp and quiet, with Sinterklaas lights and occasional ice-skating.',
      },
    ],
    gettingAround:
      'The train network is fast, frequent and covers every city worth seeing; buy a contactless card or use a tap-in, tap-out bank card. Amsterdam is small enough to walk, and rental bikes — with hand brakes — are the local way to travel. Trams fill the gaps in the larger cities.',
    practical: [
      { label: 'Language', value: 'Dutch; almost everyone speaks fluent English.' },
      { label: 'Currency', value: 'Euro (EUR)' },
      { label: 'Plugs', value: 'Type C/F, 230 V, two round pins.' },
      { label: 'Tipping', value: 'Not expected — round up or leave 5–10% in restaurants.' },
      { label: 'Tap water', value: 'Clean and excellent; cafés will provide it free on request.' },
      {
        label: 'Getting in',
        value: 'Schengen area — check your visa-free allowance before booking.',
      },
    ],
    facts: [
      'About a quarter of the Netherlands lies below sea level, and Schiphol Airport sits on land that was once a lake.',
      'The Netherlands has more bicycles than people — roughly 23 million of them.',
      'There are over 4,000 kilometres of cycle paths in the country.',
      'Amsterdam’s canal houses lean forward on purpose so goods could be hoisted to the top floors without hitting the façade.',
    ],
    currency: { code: 'EUR', name: 'Euro', symbol: '€', approximatePerUsd: 0.92 },
    timezone: 'Europe/Amsterdam',
    coordinates: { lat: 52.3676, lon: 4.9041 },
    wikipedia: 'Netherlands',
  },
  {
    slug: 'austria',
    name: 'Austria',
    country: 'Austria',
    region: 'Vienna, the Salzkammergut lakes and the Tyrol',
    tagline: 'A lakeside village beneath the Alps',
    bestTime: 'May to June for green valleys, or September to early October for clear light',
    overview: [
      'Austria packs an opera house, a string of imperial palaces and a full mountain range into a country the size of Bavaria. Vienna is the grandest of its cities — coffee houses, Jugendstil metro stations and the Hofburg — while Salzburg, Innsbruck and Graz are more walkable and no less beautiful.',
      'The Salzkammergut lakes and the Tyrol are where the postcard image comes from: wooden houses, church spires, water you can drink and meadows that turn yellow with gentian in June. In winter the same valleys become some of the most reliable ski country in the Alps.',
    ],
    eat: [
      {
        name: 'Wiener schnitzel',
        description:
          'Veal pounded thin, breaded and fried in butter — always served with a slice of lemon, and best in a traditional Beisl.',
      },
      {
        name: 'Coffee houses',
        description:
          'Viennese cafés where a melange comes with a glass of water on a silver tray and the newspaper is meant to be read slowly.',
      },
      {
        name: 'Sachertorte and strudel',
        description:
          'The famous chocolate torte with apricot jam, plus apple or curd strudel served warm with whipped cream.',
      },
      {
        name: 'Alpine mountain huts',
        description:
          'Hütten above the tree line serving dumplings, goulash soup and board of speck to anyone who walked up for them.',
      },
      {
        name: 'Heuriger wine taverns',
        description:
          'On the edges of Vienna, family wine growers open their doors to serve young wine with cold platters and bread spreads.',
      },
    ],
    attractions: [
      {
        name: 'Vienna’s Hofburg and Museumsquartier',
        description:
          'The imperial apartments, the Spanish Riding School and the Kunsthistorisches Museum, all within a short walk.',
      },
      {
        name: 'Schönbrunn Palace',
        description:
          'The Habsburg summer residence, with 1,441 rooms, formal gardens, the Gloriette and a zoo that dates from 1752.',
      },
      {
        name: 'Hallstatt and the Salzkammergut',
        description:
          'A village on a lake between mountains, with a salt mine above it and the Dachstein glacier beyond. Go early.',
      },
      {
        name: 'Salzburg’s old town',
        description:
          'Mozart’s birthplace, the fortress Hohensalzburg and the Mirabell gardens, all protected as a UNESCO site.',
      },
      {
        name: 'Innsbruck and the Nordkette',
        description:
          'A cable car rises from the city centre to a 2,300 m ridge with a view over the whole Inn valley.',
      },
      {
        name: 'Grossglockner High Alpine Road',
        description:
          'Thirty-six hairpin bends up Austria’s highest mountain, open in summer and worth the toll in good weather.',
      },
    ],
    history: [
      'Austria began as a border march of the Frankish empire, grew rich on salt and silver, and by the fifteenth century the Habsburgs were marrying their way across Europe. For centuries Vienna was the capital of an empire that stretched from the Netherlands to Transylvania.',
      'The empire collapsed in 1918, and the first republic gave way to annexation by Nazi Germany in 1938 and occupation until 1955, when Austria declared permanent neutrality. It joined the European Union in 1995.',
    ],
    geography: [
      'Roughly two thirds of the country is mountainous. The Alps run in ridges from the Rhine valley in the west to the Danube in the east, with the highest peaks in the Hohe Tauern and the Tyrol. Valleys such as the Inn, the Danube and the Mur hold most of the cities and almost all the farmland.',
      'The east opens into the Pannonian plain: vineyards, reed lakes and warmer, drier weather than the alpine west.',
    ],
    culture: [
      'Austrian life is formal but warm: greet people on entering a shop or a lift, and say goodbye when leaving. Coffee house culture rewards patience — nobody will bring you the bill until you ask for it.',
      'Music is treated as civic infrastructure rather than decoration: Vienna’s opera and concert halls are subsidised, and the city holds a ball season that runs from November to February.',
    ],
    seasons: [
      { label: 'Spring', note: 'Green valleys, blossom and changeable weather in the mountains.' },
      {
        label: 'Summer',
        note: 'Warm and long, with lakes warm enough to swim and mountain huts open.',
      },
      { label: 'Autumn', note: 'Clear light, golden larch and the grape harvest in the east.' },
      { label: 'Winter', note: 'Reliable snow, Christmas markets and the Viennese ball season.' },
    ],
    gettingAround:
      'Trains run on time and reach almost every valley — the ÖBB network plus regional lines is the simplest way to travel. Vienna’s metro, tram and bus network is cheap and dense, and most of the old towns are pedestrian. A rental car only pays off for remote alpine roads.',
    practical: [
      {
        label: 'Language',
        value: 'German; English is widely spoken in cities and tourist regions.',
      },
      { label: 'Currency', value: 'Euro (EUR)' },
      { label: 'Plugs', value: 'Type F, 230 V.' },
      {
        label: 'Tipping',
        value: 'Around 5–10%, rounded up, and stated with the total when you pay.',
      },
      {
        label: 'Tap water',
        value: 'Excellent, and free — a glass of Hochquellwasser is a Vienna institution.',
      },
      { label: 'Getting in', value: 'Schengen area; motorway driving needs a vignette.' },
    ],
    facts: [
      'Austria is one of the most mountainous countries in Europe — about 62% of its area is alpine.',
      'Vienna’s drinking water arrives by gravity through pipelines from springs in the Alps.',
      'The Vienna Philharmonic’s New Year’s Concert is broadcast to more than 90 countries.',
      'Grossglockner, the highest peak at 3,798 m, has its own high alpine road with 36 bends.',
    ],
    currency: { code: 'EUR', name: 'Euro', symbol: '€', approximatePerUsd: 0.92 },
    timezone: 'Europe/Vienna',
    coordinates: { lat: 48.2082, lon: 16.3738 },
    wikipedia: 'Austria',
  },
  {
    slug: 'denmark',
    name: 'Denmark',
    country: 'Denmark',
    region: 'Copenhagen and the Øresund coast',
    tagline: 'Nyhavn in the long summer light',
    bestTime: 'May to August for long evenings, or December for Christmas markets',
    overview: [
      'Denmark is small, flat and extremely easy to like. Copenhagen holds most of the clichés worth having — the painted houses of Nyhavn, the Little Mermaid, bikes streaming over the harbour bridges — and it is compact enough to cross on foot or by bicycle in an afternoon.',
      'Away from the capital the country turns rural fast: thatched farmhouses, beech woods, Viking burial mounds and wide empty beaches on the North Sea coast. Everywhere is within a few hours of everywhere else, which makes the whole country a plausible long weekend.',
    ],
    eat: [
      {
        name: 'Smørrebrød',
        description:
          'Open sandwiches on dense rye bread, topped with pickled herring, shrimp, egg and dill, and eaten with a knife and fork.',
      },
      {
        name: 'New Nordic kitchens',
        description:
          'Copenhagen’s restaurant scene made local, seasonal and foraged cooking famous worldwide; many of its kitchens take walk-ins at lunch.',
      },
      {
        name: 'Torvehallerne and Reffen',
        description:
          'The city’s food halls for cheese, pastries and coffee, and the street-food yard at Refshaleøen for everything cooked outdoors.',
      },
      {
        name: 'Hot dogs and wienerbrød',
        description:
          'Street pølser with pickles and fried onion, and proper Danish pastry — not sweet, and best with an espresso.',
      },
      {
        name: 'Harbour swimming and bakeries',
        description:
          'A morning swim in the clean harbour baths followed by a cardamom bun is a genuine Copenhagen routine.',
      },
    ],
    attractions: [
      {
        name: 'Nyhavn',
        description:
          'The seventeenth-century canal with 17th- and 18th-century townhouses in ochre and blue; take a boat rather than paying for a table.',
      },
      {
        name: 'Tivoli Gardens',
        description:
          'A pleasure garden from 1843 with wooden roller coasters, lantern-lit lanes and evening concerts in summer.',
      },
      {
        name: 'Christiansborg and Rosenborg castles',
        description:
          'Parliament above the ruins of a medieval fortress, and the crown jewels in a Renaissance palace in the park.',
      },
      {
        name: 'Louisiana Museum of Modern Art',
        description:
          'Modern art in a garden by the Øresund, 35 minutes north of the city, with the sea on three sides.',
      },
      {
        name: 'Roskilde and the Viking ships',
        description:
          'A UNESCO cathedral and the Viking Ship Museum, where five ninth-century vessels were raised from the fjord.',
      },
      {
        name: 'North Zealand beaches',
        description:
          'Wide sand beaches at Tisvildeleje and Hornbæk, reachable by train, with summer houses in the beech woods behind them.',
      },
    ],
    history: [
      'Denmark was a Viking kingdom by the tenth century and later ruled Norway, Iceland and parts of Sweden from Copenhagen. The Kalmar Union and the Reformation reshaped the region, and defeats in the seventeenth century shrank the kingdom to roughly its present shape.',
      'The nineteenth century brought a constitution, a farming revival and the cooperative movement, and the twentieth made Denmark a welfare state and, in 1973, a member of what became the European Union.',
    ],
    geography: [
      'The country is a peninsula and more than 400 islands, none of them more than about 170 m above sea level. The highest point, Møllehøj, is a rounded hill of just 171 m, and much of the landscape was shaped by ice sheets that left fertile moraine in the east and sandy heath in the west.',
      'The coastline runs for over 7,000 km, with broad tidal flats on the Wadden Sea side and long beaches on the North Sea, where the wind is a permanent feature.',
    ],
    culture: [
      'Danish design, cycling and hygge are exports, but they are also just how the country works: town halls are glass boxes, half of Copenhagen cycles to work, and evenings are spent indoors with candles and friends.',
      'Informality is genuine — students call professors by first names — and trust is high, which is why bicycles are parked unlocked on city streets.',
    ],
    seasons: [
      {
        label: 'Spring',
        note: 'Late and sudden; beech trees leaf out in May and the city fills with bicycles.',
      },
      {
        label: 'Summer',
        note: 'Long bright evenings, harbour swimming, festivals and almost no darkness in late June.',
      },
      { label: 'Autumn', note: 'Windy and golden, with fewer visitors and open museums.' },
      {
        label: 'Winter',
        note: 'Short, grey and cold, brightened by Christmas markets and Tivoli’s lights.',
      },
    ],
    gettingAround:
      'Copenhagen is a bicycle city: rent one and use the separated paths, which have their own traffic lights. The metro runs all night and the S-tog covers the suburbs, while trains reach the rest of the country in a few hours. The Øresund bridge links the city to Malmö in Sweden in 35 minutes.',
    practical: [
      { label: 'Language', value: 'Danish; nearly everyone speaks excellent English.' },
      { label: 'Currency', value: 'Danish krone (DKK) — most places take cards, cash is rare.' },
      { label: 'Plugs', value: 'Type C/F (K), 230 V.' },
      { label: 'Tipping', value: 'Service is included and tips are genuinely optional.' },
      { label: 'Tap water', value: 'Clean, free and served by default in restaurants.' },
      { label: 'Getting in', value: 'Schengen area — check your visa-free allowance.' },
    ],
    facts: [
      'The Danish word hygge is roughly “cosy”, and it explains a national obsession with candles and blankets.',
      'Denmark has more than 7,000 km of coastline for a country of just under six million people.',
      'Copenhagen’s harbour is clean enough to swim in, with public baths in the middle of the city.',
      'The Øresund Bridge between Denmark and Sweden is roughly 16 km long and carries both cars and trains.',
    ],
    currency: { code: 'DKK', name: 'Danish krone', symbol: 'kr', approximatePerUsd: 6.9 },
    timezone: 'Europe/Copenhagen',
    coordinates: { lat: 55.6761, lon: 12.5683 },
    wikipedia: 'Denmark',
  },
  {
    slug: 'finland',
    name: 'Finland',
    country: 'Finland',
    region: 'Helsinki and Finnish Lapland',
    tagline: 'Aurora over a Lapland road',
    bestTime: 'September to March for the aurora, or June to July for the midnight sun',
    overview: [
      'Finland is a country of forests, lakes and long light. Helsinki is small, design-minded and walkable, with a sea fortress offshore, a working sauna on a Ferris wheel and ferries leaving for Stockholm and Tallinn from the harbour.',
      'Most of what people imagine about Finland is further north: pine and birch forest, villages of wooden houses, huskies, reindeer and the aurora, which appears on roughly 150 nights a year in Lapland. In summer the sun simply refuses to set, and the same lakes are warm enough to swim in at midnight.',
    ],
    eat: [
      {
        name: 'Market halls and kauppahalli',
        description:
          'Helsinki’s Old Market Hall for salmon soup, rye bread and cinnamon buns, eaten at a counter with the harbour outside.',
      },
      {
        name: 'Karelian pasties and salmon soup',
        description:
          'Rye-crust pasties with rice or potato filling, and lohikeitto — a creamy salmon soup that appears on every lunch menu.',
      },
      {
        name: 'Reindeer and game',
        description:
          'In Lapland: sautéed reindeer with mashed potato and lingonberry, plus elk, whitefish and cloudberry desserts.',
      },
      {
        name: 'Berry season',
        description:
          'Everyman’s right lets anyone pick bilberries, lingonberries and cloudberries in the forest, and markets fill with them in late summer.',
      },
      {
        name: 'Coffee and korvapuusti',
        description:
          'Finland drinks more coffee per person than almost anywhere; the cardamom bun is the standard accompaniment.',
      },
    ],
    attractions: [
      {
        name: 'Suomenlinna sea fortress',
        description:
          'An eighteenth-century fortress on islands 15 minutes by ferry from Helsinki’s market square, now a UNESCO site with a village on it.',
      },
      {
        name: 'Helsinki design district and Temppeliaukio',
        description:
          'Design shops, the Rock Church carved into granite, and the Ateneum and Amos Rex galleries.',
      },
      {
        name: 'Finnish sauna',
        description:
          'More saunas than cars: public ones such as Löyly and Kotiharju, then a plunge into the Baltic or a lake.',
      },
      {
        name: 'Rovaniemi and the Arctic Circle',
        description:
          'The official Santa Claus village, husky and reindeer farms, and the Arktikum museum on the polar night.',
      },
      {
        name: 'Aurora hunting in Lapland',
        description:
          'Inari, Saariselkä and Kilpisjärvi are among the best places on earth to watch the northern lights from September to March.',
      },
      {
        name: 'Finnish Lakeland',
        description:
          'Saimaa’s islands, canal cruises and summer cottages, with the world’s rarest seal living in the same water.',
      },
    ],
    history: [
      'Finland was part of Sweden for six centuries and then an autonomous grand duchy of Russia from 1809, a period in which Helsinki was rebuilt in neoclassical style and Finnish language and culture were deliberately cultivated.',
      'Independence came in 1917. Finland fought the Winter War and Continuation War against the Soviet Union, then rebuilt as a Nordic welfare state, joining the European Union in 1995 and NATO in 2023.',
    ],
    geography: [
      'Finland has around 188,000 lakes and roughly 70% of its land under forest, most of it pine, spruce and birch. The south is relatively flat and fertile; the north rises into fells, treeless rounded hills that are the last foothills of the Scandinavian range.',
      'Lapland lies mostly above the Arctic Circle, where the polar night lasts for weeks in December and the midnight sun for weeks in June.',
    ],
    culture: [
      'Finnish social life is quiet and deliberate: personal space is respected, small talk is optional and a sauna is where serious conversation happens. Everyone observes Everyman’s right, which allows walking, skiing and foraging on almost any land.',
      'Design and functionalism are national values — Marimekko, Iittala and Aalto are household names — and public libraries, including Helsinki’s Oodi, are treated as civic living rooms.',
    ],
    seasons: [
      { label: 'Spring', note: 'Snow melts late in the north; the south turns green in May.' },
      {
        label: 'Summer',
        note: 'Long light, warm lakes, festivals and the midnight sun above the Arctic Circle.',
      },
      {
        label: 'Autumn',
        note: 'Ruska colours — red and gold forests — and the aurora season begins.',
      },
      {
        label: 'Winter',
        note: 'Snow, silence and the best northern lights; temperatures can fall below −30 °C in Lapland.',
      },
    ],
    gettingAround:
      'Helsinki’s tram and metro network is simple and reliable, and the archipelago is served by ferries. Overnight trains with car transporters run from Helsinki to Rovaniemi and Kolari, and long-distance buses fill in the rest. In winter, drive only with proper studded tyres and a block heater.',
    practical: [
      { label: 'Language', value: 'Finnish and Swedish; English is spoken almost everywhere.' },
      { label: 'Currency', value: 'Euro (EUR) — card payments are universal.' },
      { label: 'Plugs', value: 'Type C/F, 230 V.' },
      { label: 'Tipping', value: 'Not expected; service is included in the bill.' },
      { label: 'Tap water', value: 'Among the cleanest in the world and always free.' },
      { label: 'Getting in', value: 'Schengen area; winter travel needs serious clothing.' },
    ],
    facts: [
      'Finland has around 3.3 million saunas for 5.6 million people.',
      'In Lapland the aurora is visible on roughly 150 nights a year.',
      'Everyman’s right allows anyone to walk, ski, camp briefly and pick berries on private land.',
      'The sun does not set in northernmost Finland for about 70 days each summer.',
    ],
    currency: { code: 'EUR', name: 'Euro', symbol: '€', approximatePerUsd: 0.92 },
    timezone: 'Europe/Helsinki',
    coordinates: { lat: 60.1699, lon: 24.9384 },
    wikipedia: 'Finland',
  },
];
