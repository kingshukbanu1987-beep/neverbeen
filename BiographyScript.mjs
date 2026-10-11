#!/usr/bin/env node
/**
 * Create a clearly fictional, alternate-universe biography for a NeverBeen AI model.
 *
 * Usage:
 *   node BiographyScript.mjs --model "Model Name"
 *   npm run biography -- --model "Model Name"
 *
 * The script writes Biography/biography.json and a ten-frame image prompt queue to
 * public/NeverBeenModels/<ModelName>/Biography/. It never presents invented education,
 * employment or family details as real. The photo prompts are ready for the image-generation
 * tool; generated JPGs should be saved using the filenames in the prompt queue. The portfolio
 * manifest is refreshed after the biography is written.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const modelsDir = join(projectRoot, 'public', 'NeverBeenModels');
const sharedProfilesFile = join(projectRoot, 'data', 'ai-models', 'profiles.json');
const biographyTitle = 'In the Multiverse of NeverBeen';
const currentYear = new Date().getUTCFullYear();
const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const neighborhoods = {
  'abu dhabi': ['Al Bateen', 'Al Khalidiyah', 'Al Zahiyah'],
  alexandria: ['Anfushi', 'Sidi Gaber', 'Raml Station'],
  amman: ['Jabal Amman', 'Jabal Al-Weibdeh', 'Abdoun'],
  baghdad: ['Karrada', 'Al-Mansour', 'Adhamiyah'],
  baku: ['Icherisheher', 'Yasamal', 'Bayil'],
  beirut: ['Hamra', 'Achrafieh', 'Mar Mikhaël'],
  bogotá: ['La Candelaria', 'Chapinero', 'Usaquén'],
  'buenos aires': ['San Telmo', 'Palermo', 'Recoleta'],
  cairo: ['Zamalek', 'Maadi', 'Downtown Cairo'],
  casablanca: ['Habous', 'Gauthier', 'Aïn Diab'],
  cork: ['Shandon', "Sunday's Well", 'Montenotte'],
  damascus: ['Bab Touma', 'Al-Midan', 'the Old City lanes'],
  darjeeling: ['Chowrasta', 'Lebong', 'Singamari'],
  doha: ['Msheireb', 'Al Sadd', 'The Pearl district'],
  dubai: ['Al Fahidi', 'Al Satwa', 'Jumeirah'],
  dublin: ['Rathmines', 'Stoneybatter', 'Portobello'],
  erbil: ['Ankawa', 'the Citadel quarter', 'Bakhtiari'],
  homs: ['Al-Waer', 'Khaldiyeh', 'the Old City quarter'],
  isfahan: ['Jolfa', 'Chaharbagh', 'the Naqsh-e Jahan quarter'],
  istanbul: ['Kadıköy', 'Balat', 'Moda'],
  jeddah: ['Al-Balad', 'Al-Rawdah', 'Al-Hamra'],
  kolkata: ['Ballygunge', 'Shyambazar', 'the lanes of North Kolkata'],
  'kuala lumpur': ['Bangsar', 'Brickfields', 'Kampung Baru'],
  'kuwait city': ['Salmiya', 'Dasman', 'Sharq'],
  limerick: ['the Georgian Quarter', 'Castletroy', 'Thomondgate'],
  london: ['Camden', 'Hackney', 'Brixton'],
  manchester: ['the Northern Quarter', 'Chorlton', 'Didsbury'],
  mashhad: ['Ahmadabad', 'Kūh-e Sangi', 'the old bazaar quarter'],
  montevideo: ['Ciudad Vieja', 'Pocitos', 'Parque Rodó'],
  muscat: ['Muttrah', 'Qurum', 'Al-Khuwair'],
  riyadh: ['Al-Murabba', 'Olaya', 'Diriyah'],
  sarajevo: ['Baščaršija', 'Marijin Dvor', 'Vratnik'],
  shantiniketan: ['Bolpur', 'Sriniketan', 'the lanes near Visva-Bharati'],
  shiraz: ['Zand Avenue', 'Qasr-e Dasht', 'the Eram quarter'],
  srinagar: ['Rainawari', 'Rajbagh', 'Hazratbal'],
  tabriz: ['El Goli', 'Sheshghelan', 'Maqsoodieh'],
  tbilisi: ['Sololaki', 'Vera', 'Avlabari'],
  tehran: ['Tajrish', 'Niavaran', 'the old lanes of central Tehran'],
  tripoli: ['El Mina', 'Qobbe', 'the old souk quarter'],
  yazd: ['Fahadan', 'Amir Chakhmaq', 'the Old Town lanes'],
};

const studyTracks = [
  {
    field: 'visual communication and editorial design',
    degree: 'Bachelor of Arts in Visual Communication',
    postgraduate: 'Master of Arts in Art Direction',
    juniorRole: 'Junior Visual Designer',
    seniorRole: 'Art Direction Associate',
    employers: ['Copper Frame Studio', 'North Star Creative House'],
    strengths: ['composition', 'colour theory', 'visual storytelling'],
  },
  {
    field: 'brand strategy and digital marketing',
    degree: 'Bachelor of Business in Brand Strategy',
    postgraduate: 'Master of Business Administration in Creative Enterprise',
    juniorRole: 'Brand Strategy Assistant',
    seniorRole: 'Campaign Partnerships Lead',
    employers: ['Fieldnote Brand Lab', 'Bright Hours Collective'],
    strengths: ['audience research', 'campaign planning', 'brand voice'],
  },
  {
    field: 'fashion communication and sustainable textiles',
    degree: 'Bachelor of Arts in Fashion Communication',
    postgraduate: 'Master of Arts in Sustainable Fashion Futures',
    juniorRole: 'Fashion Desk Assistant',
    seniorRole: 'Editorial Styling Coordinator',
    employers: ['Studio Threadline', 'Common Ground Editorial'],
    strengths: ['styling', 'material research', 'editorial production'],
  },
  {
    field: 'architecture and spatial design',
    degree: 'Bachelor of Design in Spatial Practice',
    postgraduate: 'Master of Architecture in Adaptive Spaces',
    juniorRole: 'Design Research Assistant',
    seniorRole: 'Spatial Design Coordinator',
    employers: ['Open Courtyard Workshop', 'Civic Form Studio'],
    strengths: ['spatial composition', 'model-making', 'human-centred design'],
  },
  {
    field: 'media studies and documentary practice',
    degree: 'Bachelor of Arts in Media and Cultural Studies',
    postgraduate: 'Master of Arts in Documentary Practice',
    juniorRole: 'Production Assistant',
    seniorRole: 'Creative Producer',
    employers: ['Windowlight Films', 'The Story Room'],
    strengths: ['interviewing', 'creative research', 'story editing'],
  },
];

const relatedNameStyles = {
  persian: {
    feminine: ['Laleh', 'Shirin', 'Parisa', 'Neda', 'Roya', 'Darya', 'Simin', 'Mahsa'],
    masculine: ['Reza', 'Farhad', 'Kaveh', 'Navid', 'Arman', 'Mehrdad', 'Siamak', 'Behzad'],
    surnames: ['Farzan', 'Mehr', 'Rahimi', 'Naderi', 'Azimi', 'Vaziri'],
  },
  arabic: {
    feminine: ['Layla', 'Mariam', 'Nour', 'Yasmin', 'Rania', 'Salma', 'Huda', 'Amira'],
    masculine: ['Omar', 'Karim', 'Samir', 'Tarek', 'Ziad', 'Youssef', 'Rami', 'Hadi'],
    surnames: ['Haddad', 'Mansour', 'Khalil', 'Farouk', 'Nasser', 'Saad'],
  },
  southAsian: {
    feminine: ['Ananya', 'Kavya', 'Aditi', 'Mira', 'Riya', 'Tara', 'Nisha', 'Ishani'],
    masculine: ['Arjun', 'Dev', 'Karan', 'Rohan', 'Kabir', 'Neel', 'Adil', 'Raj'],
    surnames: ['Sen', 'Banerjee', 'Mukherjee', 'Sharma', 'Qureshi', 'Das'],
  },
  malay: {
    feminine: ['Aisyah', 'Nurul', 'Hana', 'Siti', 'Amira', 'Farah', 'Nadia', 'Zahra'],
    masculine: ['Amir', 'Hakim', 'Danial', 'Firdaus', 'Iqbal', 'Rizwan', 'Arif', 'Zain'],
    surnames: ['Ismail', 'Rahman', 'Abdullah', 'Zainal', 'Osman', 'Aziz'],
  },
  celtic: {
    feminine: ['Maeve', 'Aisling', 'Nora', 'Alice', 'Erin', 'Grace', 'Clara', 'Wren'],
    masculine: ['Cian', 'Eoin', 'Liam', 'Thomas', 'Owen', 'James', 'Niall', 'Rowan'],
    surnames: ['O’Connell', 'Reed', 'Byrne', 'Murphy', 'Gallagher', 'Vale'],
  },
  british: {
    feminine: ['Amelia', 'Charlotte', 'Freya', 'Isla', 'Georgia', 'Imogen', 'Maya', 'Sophie'],
    masculine: ['Oliver', 'George', 'Harry', 'Arthur', 'Theo', 'Noah', 'Jack', 'Callum'],
    surnames: ['Bennett', 'Parker', 'Hughes', 'Williams', 'Carter', 'Reed'],
  },
  latin: {
    feminine: ['Lucía', 'Valentina', 'Camila', 'Emilia', 'Sofía', 'Inés', 'Julieta', 'Rosa'],
    masculine: ['Mateo', 'Diego', 'Martín', 'Nicolás', 'Santiago', 'Rafael', 'Andrés', 'Tomás'],
    surnames: ['Álvarez', 'Pereira', 'Rojas', 'Navarro', 'Silva', 'Torres'],
  },
  turkic: {
    feminine: ['Leyla', 'Aylin', 'Zeynep', 'Elif', 'Selin', 'Aysel', 'Nigar', 'Derya'],
    masculine: ['Emre', 'Murad', 'Kemal', 'Arda', 'Deniz', 'Kaan', 'Cem', 'Orhan'],
    surnames: ['Yılmaz', 'Demir', 'Aliyev', 'Kaya', 'Mammadov', 'Arslan'],
  },
  caucasus: {
    feminine: ['Nino', 'Tamara', 'Ana', 'Mariam', 'Salome', 'Ketevan', 'Lela', 'Tamar'],
    masculine: ['Giorgi', 'Luka', 'Nika', 'Levan', 'Zurab', 'Irakli', 'Davit', 'Gela'],
    surnames: ['Beridze', 'Kapanadze', 'Maisuradze', 'Gelashvili', 'Dolidze', 'Vale'],
  },
  balkan: {
    feminine: ['Amina', 'Lejla', 'Ema', 'Hana', 'Sara', 'Amra', 'Jasna', 'Mira'],
    masculine: ['Emir', 'Tarik', 'Adnan', 'Mirza', 'Jasmin', 'Haris', 'Amar', 'Nedim'],
    surnames: ['Hadžić', 'Kovač', 'Marković', 'Begić', 'Ilić', 'Petrović'],
  },
  international: {
    feminine: ['Ari', 'Lina', 'Mira', 'Sami', 'Rumi', 'Yara', 'Noor', 'Eli'],
    masculine: ['Ari', 'Niko', 'Sami', 'Theo', 'Kian', 'Rami', 'Dara', 'Eli'],
    surnames: ['Vale', 'Rahman', 'Sen', 'Marlow', 'Qadir', 'Bennett'],
  },
};

const countryNameStyles = {
  argentina: 'latin',
  colombia: 'latin',
  uruguay: 'latin',
  iran: 'persian',
  iraq: 'arabic',
  syria: 'arabic',
  egypt: 'arabic',
  jordan: 'arabic',
  kuwait: 'arabic',
  lebanon: 'arabic',
  morocco: 'arabic',
  oman: 'arabic',
  qatar: 'arabic',
  'saudi arabia': 'arabic',
  'united arab emirates': 'arabic',
  india: 'southAsian',
  malaysia: 'malay',
  ireland: 'celtic',
  'united kingdom': 'british',
  türkiye: 'turkic',
  azerbaijan: 'turkic',
  georgia: 'caucasus',
  'bosnia and herzegovina': 'balkan',
};

const cityTimeZones = {
  'abu dhabi': 'Asia/Dubai',
  alexandria: 'Africa/Cairo',
  amman: 'Asia/Amman',
  baghdad: 'Asia/Baghdad',
  baku: 'Asia/Baku',
  beirut: 'Asia/Beirut',
  bogotá: 'America/Bogota',
  'buenos aires': 'America/Argentina/Buenos_Aires',
  cairo: 'Africa/Cairo',
  casablanca: 'Africa/Casablanca',
  cork: 'Europe/Dublin',
  damascus: 'Asia/Damascus',
  darjeeling: 'Asia/Kolkata',
  doha: 'Asia/Qatar',
  dubai: 'Asia/Dubai',
  dublin: 'Europe/Dublin',
  erbil: 'Asia/Baghdad',
  galway: 'Europe/Dublin',
  homs: 'Asia/Damascus',
  isfahan: 'Asia/Tehran',
  istanbul: 'Europe/Istanbul',
  jeddah: 'Asia/Riyadh',
  kolkata: 'Asia/Kolkata',
  'kuala lumpur': 'Asia/Kuala_Lumpur',
  'kuwait city': 'Asia/Kuwait',
  limerick: 'Europe/Dublin',
  london: 'Europe/London',
  manchester: 'Europe/London',
  mashhad: 'Asia/Tehran',
  montevideo: 'America/Montevideo',
  muscat: 'Asia/Muscat',
  riyadh: 'Asia/Riyadh',
  sarajevo: 'Europe/Sarajevo',
  shantiniketan: 'Asia/Kolkata',
  shiraz: 'Asia/Tehran',
  srinagar: 'Asia/Kolkata',
  tabriz: 'Asia/Tehran',
  tbilisi: 'Asia/Tbilisi',
  tehran: 'Asia/Tehran',
  tripoli: 'Asia/Beirut',
  yazd: 'Asia/Tehran',
};
const hobbyPool = [
  ['film photography', 'late-night city walks', 'making playlists'],
  ['ceramics', 'bouldering', 'collecting old maps'],
  ['cooking family recipes', 'swimming at sunrise', 'second-hand bookshops'],
  ['street sketching', 'independent cinema', 'learning new languages'],
  ['gardening on a balcony', 'long-distance running', 'live music'],
  ['dance classes', 'museum afternoons', 'analogue journaling'],
];
const passionPool = [
  [
    'fairer opportunities for emerging creatives',
    'responsible fashion',
    'telling place-led stories',
  ],
  ['accessible arts education', 'low-waste production', 'community-led design'],
  ['women-led creative businesses', 'ethical campaigns', 'cross-cultural collaboration'],
  ['public libraries', 'climate-conscious design', 'honest representation'],
];

const memories = [
  {
    id: 'childhood-home',
    file: '01-childhood-home.jpg',
    period: 'Early childhood',
    ageAtCapture: 4,
    hourRange: [8, 8],
    caption: 'A slow morning at home',
    alt: 'A fictional, family-friendly childhood memory at home with generic parent figures',
    scene:
      'a warm, ordinary morning at home in the imagined Eram quarter of Shiraz, showing her as a {age}-year-old child beside two generic, non-identifiable parent figures; modest lived-in room, candid family snapshot',
  },
  {
    id: 'neighbourhood',
    file: '02-neighbourhood.jpg',
    period: 'Growing up',
    ageAtCapture: 8,
    hourRange: [17, 17],
    caption: 'The neighbourhood after the rain',
    alt: 'A fictional childhood memory outdoors in the model’s imagined home neighbourhood',
    scene:
      'a {age}-year-old child exploring a leafy residential street in the imagined Eram quarter of Shiraz after a light rain, with a generic parent nearby and no identifiable addresses or landmarks',
  },
  {
    id: 'school-days',
    file: '03-school-days.jpg',
    period: 'School years',
    ageAtCapture: 16,
    hourRange: [14, 17],
    caption: 'The last bell of the day',
    alt: 'A fictional, fully clothed school-age memory with anonymous classmates',
    scene:
      'a {age}-year-old schoolgirl in modest, age-appropriate clothes leaving a fictional secondary-school courtyard in {year} with a small group of anonymous classmates; joyful, natural and fully clothed, backpacks and everyday school details appropriate to that year',
  },
  {
    id: 'school-project',
    file: '04-school-project.jpg',
    period: 'School years',
    ageAtCapture: 14,
    hourRange: [15, 19],
    caption: 'A project built after class',
    alt: 'A fictional school project memory around a table with friends',
    scene:
      'a school-age girl and anonymous classmates making a colourful class project around a kitchen table, paper scraps and pencils, adults supervising in the background',
  },
  {
    id: 'college',
    file: '05-college-studio.jpg',
    period: 'College',
    ageAtCapture: 20,
    hourRange: [21, 23],
    caption: 'A studio night before the deadline',
    alt: 'A fictional college memory in a design studio with anonymous classmates',
    scene:
      'the same person as a young adult college student in a late-night creative studio with anonymous classmates, sketchbooks and fabric or design samples, candid and relaxed',
  },
  {
    id: 'first-workplace',
    file: '06-first-workplace.jpg',
    period: 'First role',
    ageAtCapture: 21,
    hourRange: [9, 17],
    caption: 'The first day that felt like hers',
    alt: 'A fictional early-career memory at a creative workplace',
    scene:
      'the same adult woman at her first fictional creative-workplace desk, with anonymous colleagues, coffee cups and an in-progress mood board; everyday smartphone snapshot',
  },
  {
    id: 'first-editorial',
    file: '07-first-editorial.jpg',
    period: 'Creative career',
    ageAtCapture: 22,
    hourRange: [13, 18],
    caption: 'A small crew, a big idea',
    alt: 'A fictional behind-the-scenes editorial memory with a small creative team',
    scene:
      'the same adult woman between takes on a small independent editorial set, fully clothed in contemporary fashion, laughing with an anonymous photographer and stylist, no branded equipment',
  },
  {
    id: 'friends',
    file: '08-close-friends.jpg',
    period: 'Off duty',
    ageAtCapture: 'current',
    hourRange: [15, 19],
    caption: 'The people who know every version of her',
    alt: 'A fictional casual memory with adult friends',
    scene:
      'the same adult woman sharing an unposed outdoor café moment with a few anonymous adult friends in her city, natural expressions, no legible signage',
  },
  {
    id: 'family-now',
    file: '09-family-table.jpg',
    period: 'Family',
    ageAtCapture: 'current',
    hourRange: [18, 21],
    caption: 'Everyone talking at once',
    alt: 'A fictional family gathering with generic, non-identifiable family members',
    scene:
      'a warm, modest family meal with the adult woman and generic, non-identifiable family members; if the story includes a partner or child, include them as fictional characters; wholesome, candid, fully clothed',
  },
  {
    id: 'present-day',
    file: '10-present-day.jpg',
    period: 'Today',
    ageAtCapture: 'current',
    hourRange: [16, 18],
    caption: 'A new frame, on her own terms',
    alt: 'A fictional present-day outdoor portrait from the model’s creative life',
    scene:
      'the same adult woman taking a spontaneous golden-hour walk outdoors in her city, confident and self-possessed, a personal rather than commercial moment',
  },
];

function readJson(file, fallback = {}) {
  if (!existsSync(file)) return fallback;
  try {
    const value = JSON.parse(readFileSync(file, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
  } catch (error) {
    throw new Error(`Could not parse ${file}: ${error.message}`);
  }
}

function normalized(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function humanize(folder) {
  return folder
    .replaceAll('_', ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readModelDirectories() {
  return readdirSync(modelsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function sharedProfileFor(folder) {
  const sharedProfiles = readJson(sharedProfilesFile);
  const match = Object.entries(sharedProfiles).find(([key, value]) => {
    const cleanKey = key.replace(/\.[^.]+$/, '');
    return (
      normalized(cleanKey) === normalized(folder) ||
      normalized(cleanKey) === normalized(humanize(folder)) ||
      normalized(value?.name) === normalized(folder) ||
      normalized(value?.name) === normalized(humanize(folder))
    );
  });
  return match?.[1] ?? {};
}

function coverReference(folder, albumDir, name, localProfile, sharedProfile) {
  const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
  const files = readdirSync(albumDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && imageExtensions.has(extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  const preferred = [localProfile.cover, sharedProfile.cover]
    .map((value) =>
      String(value ?? '')
        .replaceAll('\\', '/')
        .split('/')
        .pop(),
    )
    .find((fileName) => fileName && files.includes(fileName));
  const nameMatch = files.find((fileName) => {
    const stem = fileName.replace(/\.[^.]+$/, '');
    return normalized(stem) === normalized(name) || normalized(stem) === 'cover';
  });
  const fileName = preferred || nameMatch || files[0];
  if (!fileName) return null;
  const segments = ['NeverBeenModels', folder, fileName].map((segment) =>
    encodeURIComponent(segment),
  );
  return `/${segments.join('/')}`;
}

function findModel(requestedName) {
  const directories = readModelDirectories();
  const requestedKey = normalized(requestedName);
  const matches = directories
    .map((folder) => {
      const albumDir = join(modelsDir, folder);
      const localProfile = readJson(join(albumDir, 'profile.json'));
      const sharedProfile = sharedProfileFor(folder);
      const name = localProfile.name || sharedProfile.name || humanize(folder);
      const slug = name
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      const identityReference = coverReference(folder, albumDir, name, localProfile, sharedProfile);
      return { folder, albumDir, localProfile, sharedProfile, name, slug, identityReference };
    })
    .filter(({ folder, name, slug }) => {
      return (
        requestedKey === normalized(folder) ||
        requestedKey === normalized(name) ||
        requestedKey === normalized(slug)
      );
    });

  if (matches.length === 1) return matches[0];
  if (matches.length > 1)
    throw new Error(`More than one model matches “${requestedName}”. Use the exact album name.`);

  const examples = directories
    .slice(0, 5)
    .map((folder) => humanize(folder))
    .join(', ');
  throw new Error(
    `Could not find model “${requestedName}” in ${modelsDir}. Example album names: ${examples}.`,
  );
}

function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function pick(values, seed, offset = 0) {
  return values[(seed + offset) % values.length];
}

function relatedNameStyle(country) {
  return relatedNameStyles[
    countryNameStyles[String(country).toLocaleLowerCase()] ?? 'international'
  ];
}

function relatedName(country, gender, seed, offset, familySurname = '') {
  const style = relatedNameStyle(country);
  const given = pick(style[gender] ?? style.feminine, seed, offset);
  const surname = familySurname || pick(style.surnames, seed, offset + 17);
  return `${given} ${surname}`;
}

function timeZoneForCity(city) {
  return cityTimeZones[String(city).toLocaleLowerCase()] ?? 'local time';
}

function fictionalDateTime(year, seed, offset = 0, latestDate = null, hourRange = null) {
  const now = new Date();
  const explicitLimit = latestDate?.year === year ? latestDate : null;
  const maxMonth =
    explicitLimit?.monthIndex ?? (year === now.getUTCFullYear() ? now.getUTCMonth() : 11);
  const monthIndex = Math.abs(seed + offset * 13) % (maxMonth + 1);
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const latestDay = explicitLimit
    ? monthIndex === explicitLimit.monthIndex
      ? Math.min(daysInMonth, explicitLimit.day)
      : daysInMonth
    : year === now.getUTCFullYear() && monthIndex === now.getUTCMonth()
      ? Math.min(daysInMonth, now.getUTCDate())
      : daysInMonth;
  const day = (Math.abs(Math.floor(seed / 13) + offset * 7) % latestDay) + 1;
  const earliestHour = Math.max(0, Math.min(23, hourRange?.[0] ?? 0));
  const latestHour = Math.max(earliestHour, Math.min(23, hourRange?.[1] ?? 23));
  const hour = (earliestHour + (Math.abs(seed + offset * 11) % (latestHour - earliestHour + 1)))
    .toString()
    .padStart(2, '0');
  const minute = (Math.abs(Math.floor(seed / 5) + offset * 19) % 60).toString().padStart(2, '0');
  const month = (monthIndex + 1).toString().padStart(2, '0');
  const date = day.toString().padStart(2, '0');
  const shortYear = String(year).slice(-2);

  return {
    year,
    monthIndex,
    month,
    day,
    date,
    hour,
    minute,
    dateLabel: `${day} ${monthNames[monthIndex]} ${year}`,
    timeLabel: `${hour}:${minute}`,
    cameraStamp: `${month}/${date}/${shortYear} ${hour}:${minute}`,
  };
}

function memoryAge(memory, currentAge) {
  if (memory.ageAtCapture === 'current') return currentAge;
  return Number.isInteger(memory.ageAtCapture) ? Math.min(memory.ageAtCapture, currentAge) : null;
}

// A month and year for the story timeline. When the year is the current year, `latestDate`
// keeps the month in the past, so an ongoing role never starts in a month that has not
// happened yet in the fictional timeline.
function monthYear(year, seed, offset = 0, latestDate = null) {
  const monthIndex = (seed + offset) % monthNames.length;
  const capped =
    latestDate && latestDate.year === year
      ? Math.min(monthIndex, latestDate.monthIndex)
      : monthIndex;
  return `${monthNames[capped]} ${year}`;
}

function period(startYear, endYear, seed, offset = 0, ongoing = false, latestDate = null) {
  const start = monthYear(startYear, seed, offset, ongoing ? latestDate : null);
  return ongoing ? `${start} – Present` : `${start} – ${monthYear(endYear, seed, offset + 3)}`;
}

function memoryPeriod(memory, birthYear, currentAge) {
  const ageAtCapture = memoryAge(memory, currentAge);
  if (!Number.isInteger(ageAtCapture)) return memory.period;
  return `${memory.period} · ${birthYear + ageAtCapture} · age ${ageAtCapture}`;
}

function memoryCamera(year) {
  if (year <= 1998) {
    return `a ${year}-era consumer 35mm point-and-shoot film photograph, with a 3:2 print scan, direct on-camera flash, visible fine film grain, slight focus softness, mild red-eye or hand-shake where natural, uneven lab-print colour and a casually tilted crop; no phone or digital-camera artifacts`;
  }
  if (year <= 2002) {
    return `a ${year}-era pocket point-and-shoot photograph, either a compact 35mm print scan or an early 1–3 megapixel digital compact, with soft focus, weak flash, noisy shadows, uneven colour, imperfect crop and a slight tilt; never a modern smartphone`;
  }
  if (year <= 2008) {
    return `a ${year}-era 3–5 megapixel compact digital camera or basic early camera-phone snapshot: small 4:3 JPEG, slow autofocus, direct-flash hotspots, hand-shake blur, visible sensor noise and compression, casually tilted framing`;
  }
  if (year <= 2013) {
    return `a ${year}-era feature-phone camera or modest compact-camera snapshot: low-resolution 4:3 compressed JPEG, imperfect auto white balance, soft focus, motion smear, sensor noise, slightly tilted horizon and imperfect crop`;
  }
  if (year <= 2018) {
    return `a ${year}-era early-smartphone snapshot: modest 4:3 phone-camera framing, imperfect autofocus, slight motion blur, clipped highlights, noisy shadows, mild compression and a crooked horizon`;
  }
  return `a ${year}-era mid-range smartphone snapshot: casual 4:3 framing, slightly smudged lens, mild motion blur, small focus miss, clipped highlights, compressed shadows and a crooked horizon`;
}

function memoryPhotoFlaws(year) {
  if (year <= 1998) {
    return 'fine analog film grain, slight point-and-shoot focus softness, uneven lab-print colour, a little scan dust, natural flash falloff and a subtle 1–2 degree tilted horizon; no digital-camera artifacts';
  }
  if (year <= 2002) {
    return 'soft compact-camera focus, mild film grain or early-CCD noise, weak direct flash, imperfect crop and a slight tilted horizon; no smartphone processing';
  }
  if (year <= 2008) {
    return 'visible but restrained JPEG compression, small-sensor chroma noise, slow autofocus, slight hand-shake blur, direct-flash hotspots and a casually tilted horizon';
  }
  if (year <= 2013) {
    return 'low-resolution JPEG softness, sensor noise in shadows, imperfect white balance, slight motion smear, a modest focus miss and a crooked horizon';
  }
  if (year <= 2018) {
    return 'mild compression, clipped highlights, noisy shadows, small autofocus miss, slight motion blur and an imperfectly tilted crop';
  }
  return 'a slightly smudged lens, gentle compressed-shadow noise, a small focus miss, mild hand-shake blur and a casual 1–2 degree tilted frame';
}

function makeBiography(model) {
  const seed = hash(model.name);
  const profile = { ...model.sharedProfile, ...model.localProfile };
  const locationParts = String(profile.location || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const city = locationParts[0] || 'a city to be confirmed';
  const country = locationParts.slice(1).join(', ') || 'a country to be confirmed';
  const area = pick(neighborhoods[city.toLocaleLowerCase()] ?? ['a fictional neighbourhood'], seed);
  const age = Math.max(21, Number.parseInt(profile.age, 10) || 25);
  const birthYear = currentYear - age;
  const birthMoment = fictionalDateTime(birthYear, seed, 29, {
    year: birthYear,
    monthIndex: new Date().getUTCMonth(),
    day: new Date().getUTCDate(),
  });
  const birthTimeZone = timeZoneForCity(city);
  const birthFacility = 'NeverBeen House of Birth';
  const birthDetails = {
    date: birthMoment.dateLabel,
    time: birthMoment.timeLabel,
    timeZone: birthTimeZone,
    facility: birthFacility,
    neighborhood: area,
    city,
    country,
    note: 'This venue, date and time are invented for the NeverBeen story; no real address or medical record is represented.',
  };
  const memoryCaptures = new Map(
    memories.map((memory) => {
      const ageAtCapture = memoryAge(memory, age);
      const captureYear = Number.isInteger(ageAtCapture) ? birthYear + ageAtCapture : null;
      const moment = captureYear
        ? fictionalDateTime(
            captureYear,
            hash(`${model.name}:${memory.id}`),
            3,
            null,
            memory.hourRange,
          )
        : null;
      return [
        memory.id,
        {
          age: ageAtCapture,
          year: captureYear,
          timestamp: moment ? `${moment.dateLabel} · ${moment.timeLabel} ${birthTimeZone}` : '',
          cameraStamp:
            moment && captureYear >= 2000 && captureYear <= 2013 ? moment.cameraStamp : '',
          date: moment?.dateLabel ?? '',
          time: moment?.timeLabel ?? '',
        },
      ];
    }),
  );
  const track = pick(studyTracks, seed, 2);
  const hobbies = pick(hobbyPool, seed, 1);
  const passions = pick(passionPool, seed, 3);
  const firstName = model.name.split(/\s+/)[0] || model.name;
  const familySurname = model.name.trim().split(/\s+/).at(-1) || model.name;
  const declaredReligion = String(profile.religion ?? '').trim();
  const declaredCulture = String(profile.culturalContext ?? '').trim();
  const wardrobeContext = [
    `Choose everyday clothing, hair and grooming that are plausible for ${city}, ${country}, the exact year and the depicted setting; reflect local climate, materials, school/work conventions and ordinary cultural diversity rather than costume.`,
    declaredCulture
      ? `Fictional cultural context explicitly provided for this model: ${declaredCulture}. Respect that context without adding stereotypes.`
      : 'No individual cultural affiliation is specified; use locally plausible everyday details without assigning an ethnicity from appearance.',
    declaredReligion
      ? `Only use the explicitly supplied fictional religious context, ${declaredReligion}, when it is relevant to the scene; do not add observances or beliefs beyond it.`
      : 'Religion is not specified. Do not infer or depict a personal religion from the model name, country or appearance; omit religious garments (including faith-signalling veils or headscarves), symbols, scriptures and rituals. If the depicted public setting has a historically documented school or workplace uniform, reflect that neutral setting convention without implying personal belief.',
  ].join(' ');
  const relationshipType =
    seed % 4 === 0 ? 'Married' : seed % 4 === 1 ? 'In a relationship' : 'Single';
  const isMarried = relationshipType === 'Married';
  const hasFormerSpouse = age >= 30 && seed % 5 === 0;
  const hasChild = isMarried && age >= 29 && seed % 2 === 0;
  const partnerGender = seed % 2 === 0 ? 'masculine' : 'feminine';
  const partnerName = relatedName(country, partnerGender, seed, 4);
  const childGender = (seed + 5) % 2 === 0 ? 'feminine' : 'masculine';
  const childName = relatedName(country, childGender, seed, 5, familySurname);
  const parents = [
    {
      name: relatedName(country, 'feminine', seed, 12, familySurname),
      relationship: 'Mother',
      note: 'A fictional parent character created for this alternate-universe biography.',
    },
    {
      name: relatedName(country, 'masculine', seed, 18, familySurname),
      relationship: 'Father',
      note: 'A fictional parent character created for this alternate-universe biography.',
    },
  ];
  const siblings = Array.from({ length: 1 + (seed % 3) }, (_, index) => {
    const gender = (seed + index) % 2 === 0 ? 'feminine' : 'masculine';
    const ageOffset = ((seed + index * 3) % 9) - 4;
    return {
      name: relatedName(country, gender, seed, 31 + index, familySurname),
      relationship: gender === 'feminine' ? 'Sister' : 'Brother',
      age: String(Math.max(1, age + ageOffset)),
      note: 'A fictional sibling character created for this alternate-universe biography.',
    };
  });
  const formerSpouses = hasFormerSpouse
    ? [
        {
          name: relatedName(
            country,
            partnerGender === 'feminine' ? 'masculine' : 'feminine',
            seed,
            23,
          ),
          married: monthYear(birthYear + 22, seed, 10),
          separated: monthYear(birthYear + 25, seed, 14),
          note: 'A fictional former spouse; the relationship and dates are invented for this story.',
        },
      ]
    : [];
  const undergradStart = birthYear + 18;
  const bachelorDuration = Math.min(4, Math.max(3, age - 18));
  const bachelorEnd = undergradStart + bachelorDuration;
  const masters = age >= 27;
  const mastersStart = bachelorEnd;
  const graduationYear = masters ? mastersStart + 2 : bachelorEnd;
  const currentRoleStart = Math.min(
    currentYear,
    Math.max(birthYear + 20, graduationYear + (masters ? 1 : 0)),
  );
  const marriageYear = Math.max(birthYear + 21, currentYear - 2);
  const marriageMonth = monthYear(marriageYear, seed, 6);
  const collegeName = `${pick(['Aurora', 'Common Ground', 'New Meridian', 'Crescent', 'Open Frame'], seed, 1)} College of Creative Studies`;
  const universityName = `${pick(['NeverBeen', 'Atlas', 'Brightwater', 'North Star', 'Fieldnote'], seed, 2)} University`;
  const organizations = track.employers;
  const hometown = `${area}, ${city}, ${country}`;
  const fictionalIntro = `${model.name} is a fictional NeverBeen digital model and imagined creative professional in an alternate universe. In this version of her story, the city she calls home is ${city}, ${country}; the neighbourhood and every biographical detail below are invented for this fictional character.`;

  // List completed higher-education qualifications only; never pad this timeline with school
  // years or disclaimers about degrees the fictional character has not earned.
  const education = [
    {
      period: period(undergradStart, bachelorEnd, seed, 7),
      qualification: track.degree,
      completed: true,
      institution: `${collegeName} · ${universityName} (fictional institutions)`,
      location: `${city}, ${country}`,
      description: `Completed a fictional undergraduate degree in ${track.field}, with a final project on visual identity, place and the way people read an image.`,
    },
  ];

  if (masters) {
    education.push({
      period: period(mastersStart, mastersStart + 2, seed, 9),
      qualification: track.postgraduate,
      completed: true,
      institution: `${universityName} (fictional institution)`,
      location: `${city}, ${country}`,
      description: `Completed this fictional postgraduate degree, deepening her research in ${track.field} and connecting creative practice with responsible collaboration.`,
    });
  }

  const earlyWorkStart = Math.max(birthYear + 19, undergradStart + 2);
  const earlyWorkEnd = Math.min(currentYear - 1, earlyWorkStart + 2);
  const secondWorkStart = Math.min(currentYear - 1, earlyWorkEnd + 1);
  const secondWorkEnd = Math.min(currentYear - 1, secondWorkStart + 2);
  const modelStart = Math.min(currentYear, Math.max(secondWorkEnd + 1, currentRoleStart));
  const career = [
    {
      period: period(earlyWorkStart, earlyWorkEnd, seed, 2),
      role: track.juniorRole,
      organization: `${organizations[0]} (fictional studio)`,
      location: `${city}, ${country}`,
      employmentType: 'Part-time · while studying',
      description: `Supported small creative briefs and learned the foundations of ${track.strengths[0]}, ${track.strengths[1]} and feedback-led production.`,
    },
    {
      period: period(secondWorkStart, secondWorkEnd, seed, 5),
      role: track.seniorRole,
      organization: `${organizations[1]} (fictional collective)`,
      location: `${city}, ${country}`,
      employmentType: 'Full-time · fictional role',
      description: `Coordinated a compact team across ${track.strengths[1]} and ${track.strengths[2]}, building a calm, practical approach to ambitious work.`,
    },
    {
      period: period(modelStart, currentYear, seed, 8, true, {
        year: currentYear,
        monthIndex: new Date().getUTCMonth(),
      }),
      role: 'Independent model & creative collaborator',
      organization: 'NeverBeen Multiverse',
      location: `${city}, ${country} · remote and on location`,
      employmentType: 'Independent · current in this fictional timeline',
      description: `Brought her education and earlier creative experience into editorial, fashion and travel-led stories, working with fictional teams and setting clear boundaries around each brief.`,
    },
  ];

  let personalLife;
  if (isMarried) {
    personalLife = {
      relationshipStatus: 'Married',
      relationshipType:
        seed % 8 === 0
          ? 'Arranged marriage (fictional storyline)'
          : 'Love marriage (fictional storyline)',
      narrative:
        seed % 8 === 0
          ? `In this invented story, ${firstName} met ${partnerName} through a family introduction. They chose to take their time, became close over shared walks and long conversations, and married in ${marriageMonth}. The arrangement was an introduction, not a substitute for either person’s choice.`
          : `In this invented story, ${firstName} met ${partnerName} at a small design exhibition in ${city}. A conversation about a photograph turned into friendship, then a relationship, and eventually a wedding in ${marriageMonth}.`,
      partner: {
        name: partnerName,
        note: 'A fictional character created for this alternate-universe biography.',
        met:
          seed % 8 === 0
            ? 'Introduced by family, then got to know one another by choice.'
            : `Met at a creative exhibition in ${city}.`,
        married: marriageMonth,
      },
      children: hasChild
        ? [
            {
              name: childName,
              age: Math.max(1, Math.min(6, age - 27)),
              note: 'A fictional child character; no real child or family is represented.',
            },
          ]
        : [],
      privacyNote:
        'All partner, wedding and family details in this section are invented; they are not claims about a real person.',
    };
  } else if (relationshipType === 'In a relationship') {
    personalLife = {
      relationshipStatus: 'In a relationship',
      relationshipType: 'Private, by choice (fictional storyline)',
      narrative: `In this fictional timeline, ${firstName} is in a steady relationship with ${partnerName}. They met through mutual friends at a community art night in ${city}; a shared love of music and long evening walks turned a first conversation into affection. They keep the relationship private by choice, and no marriage or children are part of this version of her biography.`,
      partner: {
        name: partnerName,
        note: 'A fictional character created for this alternate-universe biography.',
        met: `Met through mutual friends at a community art night in ${city}; their connection grew over music and walks.`,
        married: '',
      },
      children: [],
      privacyNote:
        'The relationship and meeting story are fictional; no real partner is being identified.',
    };
  } else {
    personalLife = {
      relationshipStatus: 'Single',
      relationshipType: 'Single (fictional storyline)',
      narrative: hasFormerSpouse
        ? `In this fictional version, ${firstName} is single and content to build a life that feels like her own. An earlier marriage to ${formerSpouses[0].name} ended in ${formerSpouses[0].separated}; no real person or relationship is represented.`
        : `In this fictional version, ${firstName} is single and content to build a life that feels like her own. She shares her time with family and friends, and no current spouse, partner or children are included in this chapter.`,
      partner: null,
      children: [],
      privacyNote:
        'All names and relationship details in this fictional family roster are invented and are not claims about any real individual.',
    };
  }

  personalLife.parents = parents;
  personalLife.siblings = siblings;
  personalLife.formerSpouses = formerSpouses;

  const partnerLabel = personalLife.relationshipStatus === 'Married' ? 'spouse' : 'partner';
  const childhoodHomeScene = `a warm, ordinary morning at home in the imagined neighbourhood of ${area}, ${city}, showing ${model.name} as a {age}-year-old child beside her fictional mother ${parents[0].name} and father ${parents[1].name}; their faces are invented and non-identifiable, modest lived-in room, candid family snapshot`;
  const neighbourhoodScene = `an {age}-year-old child exploring a leafy residential street in the imagined neighbourhood of ${area}, ${city}, after light rain, with her fictional mother ${parents[0].name} nearby; no identifiable addresses or landmarks`;
  const relativesAtTable = [
    ...parents.map((parent) => `${parent.relationship.toLowerCase()} ${parent.name}`),
    ...siblings.map((sibling) => `${sibling.relationship.toLowerCase()} ${sibling.name}`),
    ...(personalLife.partner ? [`${partnerLabel} ${personalLife.partner.name}`] : []),
    ...personalLife.children.map((child) => `child ${child.name}`),
  ].join(', ');
  const familyScene = `a warm, modest family meal with ${model.name} and her fictional relatives: ${relativesAtTable}; all people are non-identifiable invented characters, affectionate and candid, everyday locally appropriate clothing, fully clothed, no readable signs or name labels`;

  const ambitions = [
    `Build a thoughtful creative label that gives emerging artists their first serious commission.`,
    `Make fashion and image-making more responsible without losing the sense of play.`,
    `Keep learning, keep travelling, and leave every collaboration more generous than she found it.`,
  ];

  // A rich opening paragraph that summarises the model's fictional profile at a glance, assembled
  // from the same data used to build the rest of the biography. Newly generated pages will have a
  // useful General Summary straight out of the script without needing extra API calls.
  const careerSummary = [
    `After earning a fictional ${track.degree}${masters ? ` and going on to complete a fictional ${track.postgraduate}` : ''}, she spent her early career in ${track.field} with ${organizations[0]} and later ${organizations[1]}, building experience in ${track.strengths.join(', ')}.`,
    `Today she works as an independent model and creative collaborator in the NeverBeen Multiverse, bringing her creative training into editorial, fashion and travel-led stories.`,
    `${firstName}'s passions in this fictional timeline include ${passions.slice(0, 2).join(' and ')}${passions.length > 2 ? ', among other personal causes' : ''}, and she enjoys ${hobbies.join(', ')} in her time away from sets and studios.`,
    `Her ambitions in this imagined storyline are to build a thoughtful creative label for emerging artists, to help make fashion and image-making more responsible without losing a sense of play, and to leave every collaboration more generous than she found it.`,
    `The relationship status recorded for her in this chapter is "${personalLife.relationshipStatus.toLowerCase()}"; the people, places and milestones below are entirely invented and exist only in the NeverBeen Multiverse.`,
  ].join(' ');

  const achievements = [
    `Completed a fictional ${track.degree} with a final project rooted in ${track.field}.`,
    `Led a small, cross-disciplinary brief at ${organizations[1]}, bringing ${track.strengths[0]} and ${track.strengths[2]} into one visual story.`,
    `Built an independent portfolio that connects her creative training with her work as a model in the NeverBeen Multiverse.`,
    `Made space for slower, lower-waste production choices on fictional campaign sets.`,
  ];

  const finalNotes = [
    `${firstName} does not treat a single label as a life sentence: designer, collaborator, model and curious traveller can all be true in the same frame.`,
    `Her version of fearlessness is not having no doubts; it is moving forward without letting doubt write the whole story.`,
    `Every school, employer, qualification, relationship, quote, memory and biographical detail on this page is fictional and exists only in the NeverBeen Multiverse.`,
  ];

  const photoPrompts = memories.map((memory) => {
    const capture = memoryCaptures.get(memory.id) ?? {};
    const captureYear = capture.year;
    const timestampNote = capture.timestamp
      ? `Fictional capture date and local time: ${capture.timestamp}. This time and date are invented, not archive metadata.`
      : 'The fictional capture date is unspecified.';
    const cameraNote = captureYear
      ? `Era-matched equipment: ${memoryCamera(captureYear)}.`
      : 'Use only ordinary consumer-camera details appropriate to the scene.';
    const captureFlaws = captureYear
      ? memoryPhotoFlaws(captureYear)
      : 'slight focus softness, natural grain, uneven exposure and a gently tilted horizon';
    const stampNote = capture.cameraStamp
      ? `If a date imprint suits this camera generation, burn a tiny, slightly faded orange seven-segment camera timestamp into the lower-right corner reading exactly “${capture.cameraStamp}”; this is the only text permitted in the picture.`
      : 'Do not add a modern date graphic, phone UI, watermark, or fabricated text overlay.';
    const sceneTemplate =
      memory.id === 'family-now'
        ? familyScene
        : memory.id === 'childhood-home'
          ? childhoodHomeScene
          : memory.id === 'neighbourhood'
            ? neighbourhoodScene
            : memory.scene;
    const scene = sceneTemplate
      .replaceAll('{age}', String(capture.age ?? ''))
      .replaceAll('{year}', String(captureYear ?? ''));
    const ageNote =
      capture.age < 18
        ? `The model is a child or teenager aged ${capture.age} here: preserve her family resemblance, but use age-appropriate facial features, body proportions, hairstyle and ordinary clothing; no adult makeup, adult styling or sexualization.`
        : `The model is an adult aged ${capture.age}; keep her face and natural figure consistent with the supplied portrait, while showing period-appropriate hair and grooming.`;
    const alt = captureYear
      ? `Fictional archival-style ${captureYear} consumer-camera photo of ${model.name}, age ${capture.age}; captured ${capture.timestamp}.`
      : memory.alt;
    return {
      id: memory.id,
      filename: memory.file,
      caption: memory.caption,
      period: memoryPeriod(memory, birthYear, age),
      timestamp: capture.timestamp,
      cameraStamp: capture.cameraStamp,
      alt,
      identityReference: model.identityReference,
      prompt: `Create one single photorealistic candid snapshot for a fictional biography of ${model.name}, captured in ${captureYear ?? 'the present day'}. It should feel like an ordinary real consumer-camera photo from that exact year—not an illustration, CGI render, fashion campaign or polished AI portrait. ${timestampNote} ${cameraNote} ${stampNote} Scene: ${scene}. Age and identity continuity: ${ageNote} For adult scenes, use the supplied NeverBeen portrait as an identity reference; for childhood scenes, make a plausible younger version of this fictional adult model, never depict a real or identifiable child. ${wardrobeContext} Place and props should fit ${hometown} and the period, with no identifiable real address or landmark. Use naturally imperfect photographic flaws appropriate to that era: ${captureFlaws}. Keep the subject readable and anatomically natural; avoid waxy skin, extreme symmetry, beauty retouching, hyper-sharp detail, fake bokeh, cinematic color grading or contemporary computational-camera polish. Candid, fully clothed, family-safe. The people, names, date, place and family story are fictional and the site labels the image as AI-generated; do not add captions, logos, signs or any other text.`,
    };
  });

  return {
    version: 1,
    fictional: true,
    generatedAt: new Date().toISOString(),
    title: biographyTitle,
    name: model.name,
    signature: model.name,
    signatureStyle: `Handwritten-style blue ballpoint signature for ${model.name} on white paper; a fictional facsimile.`,
    birthDetails,
    generalInformation: {
      fullName: model.name,
      profession: 'Fictional digital model and creative collaborator',
      born: birthDetails.date,
      birthTime: `${birthDetails.time} (${birthTimeZone})`,
      birthplace: `${birthFacility} (fictional), ${area}, ${city}, ${country}`,
      age: `${age} · fictional character detail`,
      education: education.map((entry) => entry.qualification).join('; '),
      relationshipStatus: personalLife.relationshipStatus,
      universe: 'NeverBeen Multiverse',
    },
    summary: `${fictionalIntro} ${careerSummary}`,
    earlyLife: [
      `In this alternate-universe story, ${model.name} was born on ${birthDetails.date} at ${birthDetails.time} ${birthTimeZone} at the fictional ${birthFacility} in ${area}, ${city}, ${country}. The venue, date, time and every childhood episode are invented; no real address or medical record is represented.`,
      `At age four, around ${birthYear + 4}, a slow family breakfast and the familiar rooms of home became the first small landmarks in her imagined life. The accompanying mobile-camera scene is a fictional memory, not an archival photograph.`,
      `By age eight, around ${birthYear + 8}, she had begun exploring the nearby streets with her fictional mother ${parents[0].name}, noticing rain-dark pavement, shop shutters and changing light. That curiosity gradually became a habit of observation.`,
      `In secondary school, around age sixteen in ${birthYear + 16}, she found confidence in friends and hands-on class projects. These school scenes are fictional snapshots from the character’s timeline, not records of a real school or child.`,
    ],
    educationalBackground: education,
    career,
    achievements,
    personalLife,
    hobbies,
    interests: [
      ...new Set([
        ...hobbies,
        'independent magazines',
        'architecture and street details',
        'slow travel',
      ]),
    ],
    passions,
    ambitions,
    finalNotes,
    quotes: [
      {
        text: 'I can be soft with people and still be absolutely clear about what I want.',
        by: model.name,
      },
      { text: 'The best frame is the one where I recognise myself first.', by: model.name },
      {
        text: 'A life can be beautifully unfinished and still be going somewhere.',
        by: 'A fictional mentor in the NeverBeen Multiverse',
      },
    ],
    memories: memories.map((memory) => {
      const capture = memoryCaptures.get(memory.id) ?? {};
      return {
        id: memory.id,
        file: memory.file,
        period: memoryPeriod(memory, birthYear, age),
        timestamp: capture.timestamp ?? '',
        cameraStamp: capture.cameraStamp ?? '',
        caption: memory.caption,
        alt: memory.alt,
        fictional: true,
      };
    }),
    photoPrompts,
    fictionalNotice:
      'This biography, the model’s exact fictional birth details, every relative name and relationship, all schools, employers, qualifications, quotations, dates and image prompts are invented for the NeverBeen Multiverse. The images are AI-generated archival-style fiction, not documentary photographs or evidence about a real person.',
  };
}

function parseArguments(argv) {
  const options = { model: '', dryRun: false, force: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--model' || argument === '-m') options.model = argv[++index] ?? '';
    else if (argument === '--dry-run') options.dryRun = true;
    else if (argument === '--force') options.force = true;
    else if (argument === '--help' || argument === '-h') options.help = true;
    else if (!argument.startsWith('-') && !options.model) options.model = argument;
    else throw new Error(`Unknown option: ${argument}`);
  }
  return options;
}

function printHelp() {
  console.log(
    `BiographyScript.mjs — fictional NeverBeen model biographies\n\nUsage:\n  node BiographyScript.mjs --model "Model Name" [--dry-run] [--force]\n  npm run biography -- --model "Model Name"\n\nCreates Biography/biography.json and Biography/photo-prompts.json. Save the ten generated\nimages using the filenames in the prompt queue, then run npm run generate:ai-models.\nExisting biographies are protected; pass --force only when you want to replace one.`,
  );
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) return printHelp();
  if (!options.model.trim()) throw new Error('A model name is required. Try --model "Model Name".');

  const model = findModel(options.model.trim());
  const biography = makeBiography(model);
  const biographyDir = join(model.albumDir, 'Biography');
  const biographyFile = join(biographyDir, 'biography.json');
  const promptsFile = join(biographyDir, 'photo-prompts.json');

  if (existsSync(biographyFile) && !options.force && !options.dryRun) {
    throw new Error(
      `${biographyFile} already exists. Use --force to replace the current fictional biography.`,
    );
  }

  if (options.dryRun) {
    console.log(`[biography] Dry run for ${model.name} (${model.folder})`);
    console.log(`[biography] Would write ${biographyFile}`);
    console.log(
      `[biography] Would write ${promptsFile} with ${biography.photoPrompts.length} mobile-photo prompts`,
    );
    console.log(
      `[biography] Fictional birth details: ${biography.birthDetails.date} at ${biography.birthDetails.time} ${biography.birthDetails.timeZone}, ${biography.birthDetails.facility}, ${biography.birthDetails.neighborhood}, ${biography.birthDetails.city}, ${biography.birthDetails.country}.`,
    );
    return;
  }

  mkdirSync(biographyDir, { recursive: true });
  writeFileSync(biographyFile, `${JSON.stringify(biography, null, 2)}\n`, 'utf8');
  writeFileSync(
    promptsFile,
    `${JSON.stringify(
      {
        model: model.name,
        fictional: true,
        identityReference: model.identityReference,
        note: 'Generate each prompt as one standalone photorealistic archival-style image. Save each JPG in this Biography folder with its exact filename. The people, scenes and camera timestamps are fictional; these AI-generated images are not documentary photographs.',
        images: biography.photoPrompts,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  // The shared metadata knows the cover for most models; the portfolio's generated manifest is
  // refreshed below so this biography is available immediately on the biography route.
  console.log(`[biography] Created a fictional biography for ${model.name}.`);
  console.log(`[biography] Wrote ${biographyFile}`);
  console.log(
    `[biography] Wrote ${promptsFile} with ${biography.photoPrompts.length} image prompts.`,
  );
  console.log(
    '[biography] Generate the ten prompt-queue images and save them in this Biography folder to complete the visual memories.',
  );
  execFileSync(process.execPath, ['scripts/generate-ai-models.mjs'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
}

try {
  main();
} catch (error) {
  console.error(`[biography] ${error.message}`);
  process.exitCode = 1;
}
