#!/usr/bin/env node
/*
 * Builds the NeverBeen visitor brochure — the single wide landscape PDF that
 * the Documentation page offers to Open or Download.
 *
 * Audience: people who are thinking about submitting a Neverbeen Request.
 * It is deliberately about the visitor journey: the idea, the packages, how to
 * order, how to use the website, what arrives, and the destination atlas.
 * Nothing about the Admin Console, deployment or code lives in here.
 *
 * Run with:
 *   npm run generate:brochure
 *
 * Output: public/assets/documentation/NeverBeen_Brochure.pdf
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { BrochureKit, PAGE, MARGIN, GRADIENTS, ACCENTS } = require('./lib/brochure-kit');

const ROOT = path.resolve(__dirname, '..', '..');
const FONT_DIR = path.join(__dirname, 'fonts');
const OUT = path.join(ROOT, 'public', 'assets', 'documentation', 'NeverBeen_Brochure.pdf');
const COLLECTION_MANIFEST = path.join(
  ROOT,
  'src',
  'app',
  'pages',
  'collection',
  'collection-photos.ts',
);

const YEAR = new Date().getFullYear();

/**
 * Studio contact details printed on every page footer and on the back cover.
 * These are placeholders — replace them with the live studio addresses.
 */
const CONTACT = {
  email: 'hello@neverbeen.com',
  whatsapp: '+91 90000 00000',
  site: 'www.neverbeen.com',
};
const CONTACT_LINE = `${CONTACT.email}   ·   ${CONTACT.whatsapp}   ·   ${CONTACT.site}`;

const FONTS = {
  Body: 'Poppins_400Regular.ttf',
  BodySemi: 'Poppins_600SemiBold.ttf',
  BodyBold: 'Poppins_800ExtraBold.ttf',
  BodyBlack: 'Poppins_900Black.ttf',
  Display: 'PlayfairDisplay_900Black.ttf',
  DisplayBold: 'PlayfairDisplay_700Bold.ttf',
  DisplayItalic: 'PlayfairDisplay_700Bold_Italic.ttf',
};

/** Reads the generated collection manifest so the brochure uses the real stills. */
function readCollection() {
  const source = fs.readFileSync(COLLECTION_MANIFEST, 'utf8');
  const entries = source.match(/\{[\s\S]*?\},/g) || [];
  return entries
    .map((entry) => {
      const pick = (key) => {
        const match = entry.match(new RegExp(`${key}: '([^']*)'`));
        return match ? match[1] : '';
      };
      const src = pick('src');
      return {
        src,
        title: pick('title'),
        caption: pick('caption'),
        alt: pick('alt'),
        album: pick('album'),
        file: path.join(ROOT, 'public', src.replace(/^\//, '')),
      };
    })
    .filter((photo) => photo.src && fs.existsSync(photo.file));
}

const collection = readCollection();
const byTitle = new Map(collection.map((photo) => [photo.title, photo]));

function collectionPhoto(title) {
  const photo = byTitle.get(title);
  if (!photo) {
    throw new Error(
      `Brochure references a collection photograph that no longer exists: "${title}"\n` +
        'Run `npm run generate:collection` and update docs/presentation/lib/brochure-pages-*.js.',
    );
  }
  return photo.file;
}

const AUD = {
  birthday: path.join(ROOT, 'public/audience/birthday.jpg'),
  couples: path.join(ROOT, 'public/audience/couples.jpg'),
  creators: path.join(ROOT, 'public/audience/creators.jpg'),
  dream: path.join(ROOT, 'public/audience/dream-destinations.jpg'),
  families: path.join(ROOT, 'public/audience/families.jpg'),
  elders: path.join(ROOT, 'public/audience/golden-years.jpg'),
  privacy: path.join(ROOT, 'public/audience/privacy.jpg'),
  social: path.join(ROOT, 'public/audience/social.jpg'),
  register: path.join(ROOT, 'public/images/register-laptop.jpg'),
};

const IMG = {
  norway: path.join(ROOT, 'public/images/norway-laptop.jpg'),
  help: path.join(ROOT, 'public/images/help-hero.jpg'),
  logo: path.join(ROOT, 'public/neverbeen-logo.png'),
};

const context = {
  AUD,
  IMG,
  LOGO: IMG.logo,
  CONTACT,
  CONTACT_LINE,
  C: collectionPhoto,
};

const doc = new PDFDocument({
  autoFirstPage: false,
  size: [PAGE.W, PAGE.H],
  margin: 0,
  compress: true,
  info: {
    Title: 'NeverBeen — Visitor Brochure',
    Author: 'NeverBeen',
    Subject:
      'How NeverBeen works, how to place a Neverbeen Request, packages, and the destination atlas',
    Keywords:
      'NeverBeen, brochure, AI vacation portraits, destinations, packages, Neverbeen Request',
    Creator: 'NeverBeen studio',
  },
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
doc.pipe(fs.createWriteStream(OUT));

const fonts = Object.fromEntries(
  Object.entries(FONTS).map(([name, file]) => [name, path.join(FONT_DIR, file)]),
);
for (const [name, file] of Object.entries(fonts)) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing brochure font ${name}: ${file}`);
  }
}

const kit = new BrochureKit(doc, fonts);
kit.registerFonts();
kit.setChrome({ year: YEAR, contactLine: CONTACT_LINE });

const pages = [...require('./lib/brochure-pages-1'), ...require('./lib/brochure-pages-2')];

kit.totalPages = pages.length;
pages.forEach((draw) => draw(kit, context));
kit.finishPage();

doc.end();

doc.on('end', () => {
  const { size } = fs.statSync(OUT);
  console.log(
    `[brochure] Wrote ${path.relative(ROOT, OUT)} — ${pages.length} pages, ` +
      `${collection.length} collection stills available, ${(size / 1024 / 1024).toFixed(1)} MB.`,
  );
});
