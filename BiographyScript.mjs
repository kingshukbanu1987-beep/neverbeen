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
const biographyTitle = 'In the Multiverse of NeverBeen, imagine if I am really there';
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

const firstNames = ['Ari', 'Lina', 'Mira', 'Niko', 'Sami', 'Rumi', 'Theo', 'Yara', 'Noor', 'Eli'];
const partnerFirstNames = [
  'Elias',
  'Samira',
  'Milan',
  'Nadia',
  'Rami',
  'Ayla',
  'Dara',
  'Kian',
  'Leila',
  'Tomas',
];
const partnerLastNames = [
  'Vale',
  'Rahman',
  'Sen',
  'Marlow',
  'Qadir',
  'Bennett',
  'Navarro',
  'Haddad',
  'Farzan',
  'Reed',
];
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
    caption: 'A slow morning at home',
    alt: 'A fictional, family-friendly childhood memory at home with generic parent figures',
    scene:
      'a warm, ordinary morning at home with her as a young child beside two generic, non-identifiable parent figures; modest lived-in room, candid family snapshot',
  },
  {
    id: 'neighbourhood',
    file: '02-neighbourhood.jpg',
    period: 'Growing up',
    caption: 'The neighbourhood after the rain',
    alt: 'A fictional childhood memory outdoors in the model’s imagined home neighbourhood',
    scene:
      'a young child exploring a leafy street in the imagined neighbourhood after a light rain, with a parent nearby and no identifiable addresses or landmarks',
  },
  {
    id: 'school-days',
    file: '03-school-days.jpg',
    period: 'School years',
    caption: 'The last bell of the day',
    alt: 'A fictional, fully clothed school-age memory with anonymous classmates',
    scene:
      'a school-age girl in a modest, age-appropriate school outfit leaving a fictional school courtyard with a small group of anonymous friends; joyful, natural, fully clothed',
  },
  {
    id: 'school-project',
    file: '04-school-project.jpg',
    period: 'School years',
    caption: 'A project built after class',
    alt: 'A fictional school project memory around a table with friends',
    scene:
      'a school-age girl and anonymous classmates making a colourful class project around a kitchen table, paper scraps and pencils, adults supervising in the background',
  },
  {
    id: 'college',
    file: '05-college-studio.jpg',
    period: 'College',
    caption: 'A studio night before the deadline',
    alt: 'A fictional college memory in a design studio with anonymous classmates',
    scene:
      'the same person as a young adult college student in a late-night creative studio with anonymous classmates, sketchbooks and fabric or design samples, candid and relaxed',
  },
  {
    id: 'first-workplace',
    file: '06-first-workplace.jpg',
    period: 'First role',
    caption: 'The first day that felt like hers',
    alt: 'A fictional early-career memory at a creative workplace',
    scene:
      'the same adult woman at her first fictional creative-workplace desk, with anonymous colleagues, coffee cups and an in-progress mood board; everyday smartphone snapshot',
  },
  {
    id: 'first-editorial',
    file: '07-first-editorial.jpg',
    period: 'Creative career',
    caption: 'A small crew, a big idea',
    alt: 'A fictional behind-the-scenes editorial memory with a small creative team',
    scene:
      'the same adult woman between takes on a small independent editorial set, fully clothed in contemporary fashion, laughing with an anonymous photographer and stylist, no branded equipment',
  },
  {
    id: 'friends',
    file: '08-close-friends.jpg',
    period: 'Off duty',
    caption: 'The people who know every version of her',
    alt: 'A fictional casual memory with adult friends',
    scene:
      'the same adult woman sharing an unposed outdoor café moment with a few anonymous adult friends in her city, natural expressions, no legible signage',
  },
  {
    id: 'family-now',
    file: '09-family-table.jpg',
    period: 'Family',
    caption: 'Everyone talking at once',
    alt: 'A fictional family gathering with generic, non-identifiable family members',
    scene:
      'a warm, modest family meal with the adult woman and generic, non-identifiable family members; if the story includes a partner or child, include them as fictional characters; wholesome, candid, fully clothed',
  },
  {
    id: 'present-day',
    file: '10-present-day.jpg',
    period: 'Today',
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

function monthYear(year, seed, offset = 0) {
  return `${monthNames[(seed + offset) % monthNames.length]} ${year}`;
}

function period(startYear, endYear, seed, offset = 0, ongoing = false) {
  const start = monthYear(startYear, seed, offset);
  return ongoing ? `${start} – Present` : `${start} – ${monthYear(endYear, seed, offset + 3)}`;
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
  const track = pick(studyTracks, seed, 2);
  const hobbies = pick(hobbyPool, seed, 1);
  const passions = pick(passionPool, seed, 3);
  const firstName = model.name.split(/\s+/)[0] || model.name;
  const relationshipType =
    seed % 4 === 0 ? 'Married' : seed % 4 === 1 ? 'In a relationship' : 'Single';
  const isMarried = relationshipType === 'Married';
  const hasChild = isMarried && age >= 29 && seed % 2 === 0;
  const partnerName = `${pick(partnerFirstNames, seed, 4)} ${pick(partnerLastNames, seed, 7)}`;
  const childName = pick(firstNames, seed, 5);
  const graduationYear = birthYear + (age >= 27 ? 24 : 22);
  const undergradStart = birthYear + 18;
  const masters = age >= 27;
  const mastersStart = birthYear + 22;
  const currentRoleStart = Math.min(
    currentYear,
    Math.max(birthYear + 20, graduationYear + (masters ? 1 : 0)),
  );
  const marriageYear = Math.max(birthYear + 21, currentYear - 2);
  const marriageMonth = monthYear(marriageYear, seed, 6);
  const schoolName = `${pick(['Aster Lane', 'Cedar House', 'Riverlight', 'Juniper Hill', 'Northstar'], seed, 5)} Community School`;
  const seniorSchoolName = `${pick(['Meridian', 'Willow', 'Silverleaf', 'Harbourlight', 'Open Sky'], seed, 8)} Senior School`;
  const collegeName = `${pick(['Aurora', 'Common Ground', 'New Meridian', 'Crescent', 'Open Frame'], seed, 1)} College of Creative Studies`;
  const universityName = `${pick(['NeverBeen', 'Atlas', 'Brightwater', 'North Star', 'Fieldnote'], seed, 2)} University`;
  const organizations = track.employers;
  const hometown = `${area}, ${city}, ${country}`;
  const fictionalIntro = `${model.name} is a fictional NeverBeen digital model and imagined creative professional in an alternate universe. In this version of her story, the city she calls home is ${city}, ${country}; the neighbourhood and every biographical detail below are invented for this fictional character.`;

  const education = [
    {
      period: period(birthYear + 6, birthYear + 12, seed, 1),
      qualification: 'Primary schooling',
      institution: `${schoolName} (fictional)`,
      location: `${city}, ${country}`,
      description: `An imaginative early education in this fictional timeline. Her first creative habit was keeping a small notebook of observations from the walk home.`,
    },
    {
      period: period(birthYear + 12, birthYear + 18, seed, 4),
      qualification: 'Secondary schooling',
      institution: `${seniorSchoolName} (fictional)`,
      location: `${city}, ${country}`,
      description: `She gravitated toward art, language and collaborative projects, learning to shape an idea and present it clearly.`,
    },
    {
      period: period(undergradStart, undergradStart + 4, seed, 7),
      qualification: track.degree,
      institution: `${collegeName} · ${universityName} (fictional institutions)`,
      location: `${city}, ${country}`,
      description: `Her undergraduate work explored ${track.field}, with a final project on visual identity, place and the way people read an image.`,
    },
  ];

  if (masters) {
    education.push({
      period: period(mastersStart, mastersStart + 2, seed, 9),
      qualification: track.postgraduate,
      institution: `${universityName} (fictional institution)`,
      location: `${city}, ${country}`,
      description: `A postgraduate programme that deepened her research in ${track.field} and connected creative practice with responsible collaboration.`,
    });
  }

  education.push({
    period: 'Not part of this fictional profile',
    qualification: 'Doctoral / postdoctoral study',
    institution: 'No PhD or postdoctoral appointment is included in this character biography.',
    location: '—',
    description:
      'This is an invented profile, not an academic record; no doctorate or postdoctoral role is being claimed.',
  });

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
      period: period(modelStart, currentYear, seed, 8, true),
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
      narrative: `In this fictional version, ${firstName} is single and content to build a life that feels like her own. She shares her time with family and friends, but no spouse, partner or children are invented for this chapter.`,
      partner: null,
      children: [],
      privacyNote:
        'This status is invented for the character and is not a statement about any real individual.',
    };
  }

  const partnerLabel = personalLife.relationshipStatus === 'Married' ? 'spouse' : 'partner';
  const familyScene = personalLife.partner
    ? `a warm, modest family meal with the adult woman, her fictional ${partnerLabel} ${personalLife.partner.name}${hasChild ? ` and their fictional child ${childName}` : ''}, and a few generic non-identifiable family members; affectionate, wholesome and fully clothed`
    : 'a warm, modest family meal with the adult woman and generic, non-identifiable parents and relatives; no spouse or child is part of this fictional story, wholesome and fully clothed';

  const ambitions = [
    `Build a thoughtful creative label that gives emerging artists their first serious commission.`,
    `Make fashion and image-making more responsible without losing the sense of play.`,
    `Keep learning, keep travelling, and leave every collaboration more generous than she found it.`,
  ];

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

  const photoPrompts = memories.map((memory) => ({
    id: memory.id,
    filename: memory.file,
    caption: memory.caption,
    period: memory.period,
    alt: memory.alt,
    identityReference: model.identityReference,
    prompt: `Create one single, standalone, photorealistic but clearly fictional mobile-phone memory image of ${model.name}. Scene: ${memory.id === 'family-now' ? familyScene : memory.scene}. Identity continuity: use the model’s supplied NeverBeen portrait as a loose reference for the adult character only; childhood scenes should depict a plausible fictional younger version, not a real or identifiable child. Set it in the imagined neighbourhood of ${hometown}; all people other than the model are generic, synthetic and non-identifiable. Natural candid phone-camera framing, believable ambient light, slight handheld imperfection, gentle sensor grain, sincere expressions, unretouched everyday realism. Family-safe, fully clothed, non-sexual. No real-world claims, no logos, no readable text, no collage, no watermark. The picture is an AI-generated illustration for an alternate-universe fictional biography, not documentary evidence.`,
  }));

  return {
    version: 1,
    fictional: true,
    generatedAt: new Date().toISOString(),
    title: biographyTitle,
    name: model.name,
    signature: model.name,
    generalInformation: {
      fullName: model.name,
      profession: 'Fictional digital model and creative collaborator',
      born: `${hometown} (imagined for this story)`,
      age: `${age} · fictional character detail`,
      education: track.degree,
      relationshipStatus: personalLife.relationshipStatus,
      universe: 'NeverBeen Multiverse',
    },
    summary: fictionalIntro,
    earlyLife: [
      `In this alternate-universe story, ${model.name} was born in ${city}, ${country}, and grew up around ${area}. The district, family home and childhood episodes are invented, not personal records.`,
      `The neighbourhood gave her a first education in noticing: shop shutters opening, light shifting across old walls, and the small rituals that turn a city into a home. She began carrying a notebook before she knew it could become part of her creative work.`,
      `Her fictional family encouraged curiosity, humour and independence. The childhood photographs in this gallery are generated illustrations of imagined memories, not archival photographs.`,
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
    memories: memories.map(({ id, file, period: memoryPeriod, caption, alt }) => ({
      id,
      file,
      period: memoryPeriod,
      caption,
      alt,
      fictional: true,
    })),
    photoPrompts,
    fictionalNotice:
      'This biography and every image prompt are fictional creations from the NeverBeen Multiverse. They are not biographical claims or documentary photographs.',
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
      `[biography] Birthplace is explicitly fictional: ${biography.generalInformation.born}`,
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
        note: 'Generate each prompt as one standalone image. Save each JPG in this Biography folder with its exact filename. These are fictional, AI-generated illustrations, not documentary photos.',
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
