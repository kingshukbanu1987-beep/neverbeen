/*
 * NeverBeen mobile documentation generator
 *
 * Produces a portrait, phone-first companion PDF. Run with:
 *   NODE_PATH=/tmp/neverbeen-pdf-tools/node_modules node docs/presentation/generate-neverbeen-documentation-mobile.js
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'public', 'documentation', 'NeverBeen_Documentation_Mobile.pdf');
const W = 540;
const H = 960;
const M = 30;

const C = {
  ink: '#17241f',
  soft: '#5d675f',
  forest: '#1b3026',
  forest2: '#284738',
  paper: '#faf7f1',
  cream: '#fffdf9',
  sand: '#efe6d8',
  line: '#dacdbb',
  gold: '#cda465',
  bronze: '#9a6538',
  blue: '#3f6f87',
  green: '#6d9477',
  rose: '#bd7160',
  lavender: '#766b9a',
  white: '#ffffff',
  night: '#213342',
};

const A = (relative) => path.join(ROOT, relative);
const I = {
  logo: A('public/neverbeen-logo-report.png'),
  dream: A('public/audience/dream-destinations.jpg'),
  couples: A('public/audience/couples.jpg'),
  families: A('public/audience/families.jpg'),
  social: A('public/audience/social.jpg'),
  privacy: A('public/audience/privacy.jpg'),
  norway: A('public/images/norway-laptop.jpg'),
  help: A('public/images/help-hero.jpg'),
  privacyHero: A('public/images/privacy-hero.jpg'),
  terms: A('public/images/terms-hero.jpg'),
  register: A('public/images/register-mobile.jpg'),
  founder: A('public/author.jpeg'),
};

const collectionSource = fs.readFileSync(A('src/app/pages/collection/collection-photos.ts'), 'utf8');
const collection = [...collectionSource.matchAll(/src:\s*'([^']+)'/g)].map((m) => A(`public${m[1]}`));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const doc = new PDFDocument({
  autoFirstPage: false,
  size: [W, H],
  margin: 0,
  info: {
    Title: 'NeverBeen — Mobile Product Documentation',
    Author: 'NeverBeen',
    Subject: 'Portrait product, Community and Admin Console documentation',
    Keywords: 'NeverBeen, mobile documentation, community, admin console',
    CreationDate: new Date('2026-09-30T00:00:00Z'),
  },
});
doc.pipe(fs.createWriteStream(OUT));
doc.registerFont('Sans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');
doc.registerFont('SansBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf');
doc.registerFont('Serif', '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf');
doc.registerFont('SerifBold', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf');

let pageNo = 0;

function rect(x, y, w, h, fill, opacity = 1) {
  doc.save(); doc.fillColor(fill).opacity(opacity).rect(x, y, w, h).fill(); doc.restore();
}
function line(x1, y1, x2, y2, color = C.line, width = 1) {
  doc.save(); doc.strokeColor(color).lineWidth(width).moveTo(x1, y1).lineTo(x2, y2).stroke(); doc.restore();
}
function disk(x, y, r, fill, stroke = null) {
  doc.save(); doc.fillColor(fill); if (stroke) doc.strokeColor(stroke); doc.circle(x, y, r)[stroke ? 'fillAndStroke' : 'fill'](); doc.restore();
}
function panel(x, y, w, h, options = {}) {
  const { fill = C.cream, stroke = C.line, radius = 18, opacity = 1 } = options;
  doc.save(); doc.fillColor(fill).opacity(opacity).strokeColor(stroke).lineWidth(0.7).roundedRect(x, y, w, h, radius).fillAndStroke(); doc.restore();
}
function cover(file, x, y, w, h, options = {}) {
  const { radius = 0, align = 'center', valign = 'center', overlay = null } = options;
  try {
    const img = doc.openImage(file);
    const scale = Math.max(w / img.width, h / img.height);
    const iw = img.width * scale; const ih = img.height * scale;
    const px = align === 'left' ? x : align === 'right' ? x + w - iw : x + (w - iw) / 2;
    const py = valign === 'top' ? y : valign === 'bottom' ? y + h - ih : y + (h - ih) / 2;
    doc.save();
    if (radius) doc.roundedRect(x, y, w, h, radius).clip(); else doc.rect(x, y, w, h).clip();
    doc.image(img, px, py, { width: iw, height: ih });
    if (overlay) rect(x, y, w, h, overlay.color, overlay.opacity);
    doc.restore();
  } catch {
    panel(x, y, w, h, { fill: C.sand });
  }
}
function contain(file, x, y, w, h, options = {}) {
  const { radius = 18, bg = C.cream } = options;
  panel(x, y, w, h, { fill: bg, stroke: C.line, radius });
  try {
    const img = doc.openImage(file);
    const scale = Math.min((w - 16) / img.width, (h - 16) / img.height);
    const iw = img.width * scale; const ih = img.height * scale;
    doc.save(); doc.roundedRect(x, y, w, h, radius).clip(); doc.image(img, x + (w - iw) / 2, y + (h - ih) / 2, { width: iw, height: ih }); doc.restore();
  } catch { /* non-critical presentation image */ }
}
function caps(value, x, y, options = {}) {
  const { color = C.bronze, size = 7.5, width = 400, align = 'left' } = options;
  doc.font('SansBold').fontSize(size).fillColor(color).text(String(value).toUpperCase(), x, y, { width, align, characterSpacing: 1.15, lineGap: 0 });
}
function h1(value, x, y, options = {}) {
  const { color = C.ink, size = 29, width = W - M * 2, font = 'SerifBold', align = 'left' } = options;
  doc.font(font).fontSize(size).fillColor(color).text(value, x, y, { width, align, lineGap: 1 });
}
function txt(value, x, y, options = {}) {
  const { color = C.soft, size = 10, width = W - M * 2, font = 'Sans', align = 'left', lineGap = 3, height } = options;
  doc.font(font).fontSize(size).fillColor(color).text(value, x, y, { width, align, lineGap, ...(height ? { height } : {}) });
}
function textHeight(value, options = {}) {
  const { size = 10, width = W - M * 2, font = 'Sans', lineGap = 3 } = options;
  doc.font(font).fontSize(size); return doc.heightOfString(value, { width, lineGap });
}
function pill(label, x, y, options = {}) {
  const { fill = C.forest, color = C.paper, size = 7.1, height = 22, pad = 9 } = options;
  // Extra room keeps compact labels on one intentional line with embedded fonts.
  doc.font('SansBold').fontSize(size); const w = doc.widthOfString(label) + pad * 2 + 6;
  panel(x, y, w, height, { fill, stroke: fill, radius: height / 2 });
  doc.font('SansBold').fontSize(size).fillColor(color).text(label, x + pad, y + 6.7, {
    width: w - pad * 2,
    align: 'center',
    lineBreak: false,
  });
  return w;
}
function bullet(value, x, y, w, options = {}) {
  const { color = C.soft, size = 9.2, dot = C.gold, lineGap = 2.1 } = options;
  disk(x + 4, y + 7, 3.2, dot);
  txt(value, x + 17, y, { color, size, width: w - 17, lineGap });
  return textHeight(value, { size, width: w - 17, lineGap }) + 8;
}
function card(label, title, copy, x, y, w, h, options = {}) {
  const { accent = C.gold, fill = C.cream } = options;
  panel(x, y, w, h, { fill, stroke: C.line, radius: 17 });
  rect(x, y, w, 5, accent);
  caps(label, x + 17, y + 18, { color: accent === C.forest ? C.green : C.bronze, size: 6.6, width: w - 34 });
  const titleSize = title.length > 37 ? 10.3 : 12.1;
  const titleY = y + 34;
  const titleH = textHeight(title, { size: titleSize, width: w - 34, font: 'SansBold', lineGap: 1 });
  doc.font('SansBold').fontSize(titleSize).fillColor(C.ink).text(title, x + 17, titleY, { width: w - 34, lineGap: 1 });
  txt(copy, x + 17, titleY + titleH + 7, { color: C.soft, size: h < 100 ? 7.65 : 8.6, width: w - 34, lineGap: 1.9 });
}
function section(kicker, title, copy, options = {}) {
  const { bg = C.paper, dark = false } = options;
  const textColor = dark ? C.paper : C.ink;
  const copyColor = dark ? C.sand : C.soft;
  caps(kicker, M, 53, { color: dark ? C.gold : C.bronze, size: 7.8, width: W - M * 2 });
  const effective = title.length > 44 ? 23 : title.length > 32 ? 26 : 31;
  const titleY = 72;
  const titleH = textHeight(title, { size: effective, width: W - M * 2, font: 'SerifBold', lineGap: 1 });
  h1(title, M, titleY, { color: textColor, size: effective, width: W - M * 2 });
  txt(copy, M, titleY + titleH + 8, { color: copyColor, size: 10, width: W - M * 2, lineGap: 2.7 });
}
function newPage(options = {}) {
  pageNo += 1;
  const { bg = C.paper, accent = C.gold, section = '', footer = true } = options;
  doc.addPage({ size: [W, H], margin: 0 });
  rect(0, 0, W, H, bg); rect(0, 0, 8, H, accent);
  if (footer) {
    const color = bg === C.forest || bg === C.night ? C.sand : C.soft;
    line(M, H - 33, W - M, H - 33, bg === C.forest || bg === C.night ? '#4d6455' : C.line, 0.6);
    doc.font('Sans').fontSize(6.2).fillColor(color).text(`NEVERBEEN  /  ${section.toUpperCase()}`, M, H - 22, { width: 320, characterSpacing: .55 });
    doc.font('SansBold').fontSize(6.7).fillColor(color).text(String(pageNo).padStart(2, '0'), W - 58, H - 22, { width: 28, align: 'right' });
  }
}
function miniBrowser(x, y, w, h, label) {
  panel(x, y, w, h, { fill: C.cream, stroke: C.line, radius: 17 });
  rect(x, y, w, 29, C.paper); disk(x + 16, y + 14, 3.3, C.rose); disk(x + 28, y + 14, 3.3, C.gold); disk(x + 40, y + 14, 3.3, C.green);
  panel(x + 54, y + 8, Math.min(w - 68, 190), 12, { fill: C.cream, stroke: C.line, radius: 6 });
  doc.font('Sans').fontSize(4.8).fillColor(C.soft).text(label, x + 63, y + 11, { width: Math.min(w - 85, 174) });
}
function route(label, description, x, y, w) {
  panel(x, y, w, 43, { fill: C.cream, stroke: C.line, radius: 12 });
  doc.font('SansBold').fontSize(7.2).fillColor(C.forest).text(label, x + 12, y + 9, { width: w - 24 });
  doc.font('Sans').fontSize(6.8).fillColor(C.soft).text(description, x + 12, y + 23, { width: w - 24 });
}

// 01 — Cover
newPage({ bg: C.forest, accent: C.gold, section: 'Mobile documentation', footer: false });
cover(I.dream, 0, 0, W, H, { overlay: { color: C.forest, opacity: .75 } });
rect(0, 0, W, H, C.forest, .55);
contain(I.logo, 30, 45, 220, 74, { bg: C.cream, radius: 13 });
caps('MOBILE / PORTRAIT EDITION', M, 175, { color: C.gold, size: 8.3, width: 350 });
h1('The NeverBeen\nexperience,\nfrom your phone.', M, 204, { color: C.paper, size: 42, width: 420 });
txt('A screen-first product guide to the travel-photo studio, all Community features and the protected Admin Console operations suite.', M, 388, { color: C.sand, size: 12, width: 390, lineGap: 4 });
pill('COMMUNITY', M, 500, { fill: C.gold, color: C.forest, size: 7.4, height: 24 });
pill('ADMIN CONSOLE', 142, 500, { fill: '#506d5e', color: C.paper, size: 7.4, height: 24 });
pill('PUBLIC PAGES', 289, 500, { fill: '#506d5e', color: C.paper, size: 7.4, height: 24 });
cover(I.couples, 277, 618, 233, 266, { radius: 20, valign: 'center' });
caps('REVIEWED 30 SEP 2026', M, 901, { color: C.sand, size: 6.8, width: 220 });

// 02 — What this document covers
newPage({ section: 'Orientation' });
section('01 / Start here', 'A travel studio that grows into a social platform', 'NeverBeen begins with imagined travel photography and expands into destination guides, community participation, direct support, legal controls and guarded operations. This portrait edition preserves the full overview in phone-friendly reading blocks.');
card('STUDIO', 'Inspire, choose, request', 'The Home page, audience stories, packages, gallery proof and contact brief lead a visitor toward a custom vacation-photo collection.', M, 218, 480, 125, { accent: C.gold });
card('GUIDES', 'Turn a dream into local context', '33 reusable destination guides combine editorial recommendations, maps, seasonality and live context.', M, 360, 480, 125, { accent: C.green });
card('COMMUNITY', 'Connect around travel stories', 'OAuth, registration, profile tools, galleries, relationships, conversations, settings and support create an ongoing member experience.', M, 502, 480, 125, { accent: C.blue });
card('OPERATIONS', 'Run the experience safely', 'A protected Admin Console brings together moderation, identity checks, communications, user management, data governance, website management and health.', M, 644, 480, 125, { accent: C.rose });

// 03 — Home
newPage({ section: 'Public Studio' });
section('02 / Home page', 'One scroll from imagination to a studio brief', 'The public Home page uses a rotating destination visual, an editorial promise and seven primary actions. The new Documentation action follows Explore Gallery and shares its ghost-button treatment.');
miniBrowser(M, 210, 480, 360, 'youneverbeen.kingshukbanu1987.workers.dev/');
cover(I.dream, M + 2, 241, 476, 327, { overlay: { color: C.forest, opacity: .28 } });
caps('TRAVEL PHOTOGRAPHY, IMAGINED', 54, 276, { color: C.gold, size: 6.8, width: 260 });
h1('Go Anywhere.\nEven Where You\'ve\nNever Been.', 54, 292, { color: C.paper, size: 29, width: 303 });
txt('Create AI vacation photographs in the world\'s most beautiful destinations.', 54, 399, { color: C.paper, size: 8.1, width: 250, lineGap: 1.5 });
pill('CREATE MY VACATION', 54, 445, { fill: C.gold, color: C.forest, size: 6.4, height: 19 });
const homeItems = ['Hero & rotating destination', 'How It Works', '33 destination cards', 'Gallery & 4 package tiers', 'FAQ, founder & contact form', 'Explore Gallery', 'Documentation Centre'];
let homeY = 605;
homeItems.forEach((item, index) => { disk(43, homeY + 7, 4.5, [C.gold, C.green, C.blue, C.rose, C.lavender][index % 5]); txt(item, 56, homeY, { color: C.ink, font: 'SansBold', size: 9, width: 430, lineGap: 1 }); homeY += 29; });

// 04 — Studio workflow & pricing
newPage({ section: 'Public Studio' });
section('03 / Studio request', 'Four stages, four packages, one tailored brief', 'The studio flow makes the commission understandable before any customer submits a portrait. Selectable pricing flows into the Home contact form so the team receives both the desired destination and creative notes.');
const steps = [
  ['01', 'Request', 'Choose a destination and package, then describe the intended moment.'],
  ['02', 'Verify', 'Share photos and identification so the team can confirm the request.'],
  ['03', 'Compose', 'AI places the traveller in the selected light / wardrobe / atmosphere; an editor refines the image.'],
  ['04', 'Deliver', 'Receive print-ready files for sharing, albums and framing.'],
];
steps.forEach((s, i) => { const y = 220 + i * 100; panel(M, y, 480, 80, { fill: C.cream, stroke: C.line, radius: 15 }); disk(57, y + 25, 15, [C.gold, C.rose, C.green, C.blue][i]); doc.font('SansBold').fontSize(7.5).fillColor(C.forest).text(s[0], 48, y + 20, { width: 18, align: 'center' }); doc.font('SansBold').fontSize(11).fillColor(C.ink).text(s[1], 84, y + 15, { width: 150 }); txt(s[2], 84, y + 35, { size: 8.3, width: 365, lineGap: 1.7 }); });
card('PACKAGE LADDER', 'Starter ₹499 · Economy ₹999 · Business ₹1999 · First ₹4999', 'Package tiers range from 3 looks to 100 looks, increasing the editorial speed, sharing, wardrobe, creative-direction and commercial-license options. The request form collects name, contact, package, destination and a creative note.', M, 645, 480, 137, { accent: C.gold });

// 05 — Guide library
newPage({ section: 'Destination Guides', accent: C.green });
section('04 / Destination guides', '33 reusable long-form guide pages', 'Destination cards open a deeper route rather than a static tile. The guide template creates a planning-layer around each backdrop: current conditions, place knowledge, map context, seasonal advice and a return route to the studio.');
cover(I.norway, M, 222, 480, 224, { radius: 19, overlay: { color: C.forest, opacity: .12 } });
const guideBlocks = [
  ['Live cards', 'Weather, local clock, currency and cross-rates with loading / fallback states.'],
  ['Place story', 'Overview, food, attractions, history, geography and culture.'],
  ['Planning', 'Best time, seasons, transport, practical facts and “Did you know?” notes.'],
  ['Explore', 'Map, coordinates, Google outbound actions, photographs, related places and request CTA.'],
];
guideBlocks.forEach((block, i) => { const x = M + (i % 2) * 245; const y = 470 + Math.floor(i / 2) * 124; card(`0${i + 1}`, block[0], block[1], x, y, 235, 105, { accent: [C.gold, C.green, C.blue, C.rose][i] }); });
txt('Data sources named on the guide include Open-Meteo (weather), Frankfurter / ECB reference rates, Wikipedia extracts and Google Maps / image search links.', M, 736, { size: 8.7, width: 480, lineGap: 2 });

// 06 — Audience, collection & founder
newPage({ section: 'Public Pages' });
section('05 / Stories, proof & author', 'Audience, Collection and Founder pages make the brand human', 'These public routes connect the service promise to a concrete audience, visual proof and a named creator. Every founder portrait in this document is fitted in full — never cropped.');
cover(I.couples, M, 212, 224, 286, { radius: 19 });
cover(I.families, 276, 212, 234, 136, { radius: 17 });
contain(I.founder, 276, 364, 234, 234, { radius: 17, bg: C.paper });
card('AUDIENCE', 'Seven moments + six promises', 'Couples, families, birthday gifts, social sharing, dream trips, content creators and older travellers sit alongside written permission / privacy commitments.', M, 618, 480, 93, { accent: C.gold });
card('COLLECTION + FOUNDER', '61 photos + Kingshuk’s profile', 'The Collection opens a labelled lightbox gallery. The Founder page names Kingshuk, a Senior Software Engineer, and details biography plus nine technical-expertise domains.', M, 728, 480, 101, { accent: C.green });

// 07 — Support / legal / live feeds
newPage({ section: 'Public Pages' });
section('06 / Support, legal & live discovery', 'Pages that keep users informed after the first visit', 'NeverBeen provides direct feedback, self-service help, privacy and terms content, plus a travel-feeds interface designed to discover destination context beyond the studio catalogue.');
card('TRAVEL FEEDS', 'Search, source status, trends and trip modals', 'Destination search can show article categories, Commons imagery, weather / trend context, source reporting and a 30-second rotating board. Flight and hotel interfaces demonstrate a Skyscanner-style search flow.', M, 215, 480, 129, { accent: C.blue });
card('FEEDBACK', 'A direct studio WhatsApp hand-off', 'Required name, email, type and notes create a prefilled WhatsApp message. The page offers popup fallback, character-count feedback and alternate support links.', M, 362, 480, 109, { accent: C.rose });
card('HELP CENTRE', '14 searchable answers across six topics', 'Getting started; account & sign-in; community; memoirs & galleries; privacy & safety; and language / translation each have filterable accordion articles.', M, 489, 480, 109, { accent: C.gold });
card('PRIVACY + TERMS', 'Human-readable rights and responsibilities', 'Privacy covers collection, use, photos, cookies, sharing, member rights, security and contact. Terms cover acceptance, account, conduct, content, billing, rights, termination, disclaimers and law.', M, 616, 480, 129, { accent: C.green });

// 08 — Community entry
newPage({ bg: C.night, section: 'Community', accent: C.blue });
section('07 / Community entry', 'Connect, browse as a guest, then become a member', 'The Community root is a compact entry page. It introduces OAuth-style connection, language choices, screen-aware community navigation and a guest route for people who want to look around first.', { dark: true });
panel(M, 230, 480, 310, { fill: C.paper, stroke: '#546d7e', radius: 22 });
caps('NEVERBEEN COMMUNITY', 60, 257, { color: C.blue, size: 7.4, width: 260 });
h1('Connect with\ntravellers', 60, 280, { color: C.ink, size: 31, width: 310 });
txt('A provider-based connection can route a complete member to Profile or a new member to Registration.', 60, 365, { color: C.soft, size: 9, width: 345, lineGap: 2 });
panel(60, 430, 420, 45, { fill: C.white, stroke: C.line, radius: 12 });
txt('Continue with Google', 85, 445, { color: C.ink, font: 'SansBold', size: 10, width: 260, lineGap: 0 });
pill('GUEST EXPLORER', 60, 492, { fill: C.forest, color: C.paper, size: 7, height: 21 });
card('ENTRY FEATURES', 'Language, security and cross-links', 'The card can present a multilingual selection, provider loading / help states, a secure-authentication note, guest exploration and direct Privacy, Terms, Help and Home links.', M, 579, 480, 120, { accent: C.blue });
card('OAUTH CALLBACK', 'A purposeful transitional screen', 'The callback validates the provider response, exchanges credentials with the application and redirects to Profile or Registration; an error state returns the user to Connect.', M, 716, 480, 101, { accent: C.gold });

// 09 — Registration
newPage({ section: 'Community', accent: C.blue });
section('08 / Community registration', 'Required identity and location details in one responsive card', 'The registration route uses device-specific travel-scene art and clear inline validation. It turns an account connection into a complete traveller profile.');
cover(I.register, M, 214, 480, 275, { radius: 20, overlay: { color: C.forest, opacity: .16 } });
panel(58, 250, 424, 191, { fill: C.paper, stroke: C.line, radius: 17 });
caps('NEW MEMBER REGISTRATION', 80, 273, { color: C.bronze, size: 6.6, width: 230 });
h1('Create\nNeverBeen Account', 80, 289, { color: C.ink, size: 26, width: 250 });
pill('CREATE ACCOUNT  →', 80, 386, { fill: C.forest, color: C.paper, size: 6.7, height: 20 });
card('FORM CONTENT', 'Photo, name, email, location, identity', 'A profile portrait is required (JPEG / PNG / JPG with a presented 200 KB limit). The form requests name, surname, email, country → state → city, gender and date of birth.', M, 523, 480, 119, { accent: C.rose });
card('FORM BEHAVIOUR', 'Cascades, validation and private-first handling', 'Dependent geography dropdowns guide the visitor in order. Invalid fields display specific messages; submission exposes a creating state. The page labels the community as free, verified and photo-private until approval.', M, 660, 480, 120, { accent: C.green });

// 10 — Community dashboard
newPage({ section: 'Community', accent: C.blue });
section('09 / Community profile shell', 'A responsive member command centre', 'The profile pairs a left identity / navigation system with a broad work area. On phones the same navigation becomes a drawer so the current section stays usable in a vertical layout.');
miniBrowser(M, 209, 480, 343, '/community/profile');
rect(M + 2, 239, 145, 310, '#e7f0ec');
contain(I.founder, 53, 259, 94, 100, { radius: 47, bg: C.paper });
caps('MEMBER PROFILE', 51, 374, { color: C.forest, size: 5.9, width: 100, align: 'center' });
['About Me', 'Journey', 'Gallery', 'Games', 'Message Book', 'Companions', 'Circles', 'Messenger', 'Notifications', 'Settings'].forEach((item, index) => txt(item, 50, 398 + index * 13, { color: index === 1 ? C.forest : C.soft, font: index === 1 ? 'SansBold' : 'Sans', size: 6.1, width: 94, lineGap: 0 }));
caps('JOURNEY', 177, 265, { color: C.bronze, size: 7, width: 120 });
rect(177, 291, 245, 7, C.sand); rect(177, 307, 190, 6, C.sand); rect(177, 330, 264, 95, '#e6eee9'); rect(177, 438, 235, 6, C.sand);
card('IDENTITY + NAVIGATION', 'Avatar, cover, status and social shortcuts', 'The side panel supports avatar / cover changes, active presence, companions, circles, Journey posts, followers / following counts, profile lock status and an explicit visitor preview.', M, 580, 480, 114, { accent: C.gold });
card('SEARCH + RESPONSIVENESS', 'Find travellers, companions and Circles', 'Search can return people and groups. The desktop surface retains a top search and wide panel; phone layouts move the nav into a mobile drawer while preserving a branded top bar and avatar action.', M, 711, 480, 114, { accent: C.blue });

// 11 — Community publishing
newPage({ section: 'Community', accent: C.blue });
section('10 / Journey, profile and gallery', 'Build a travel identity rather than a static account', 'Core content tools let a member tell stories, organise imagery and shape the amount of detail shown to other people.');
card('JOURNEY', 'Compose a post with media, hashtags and audience', 'The Journey composer supports text, #hashtags, images, videos, reactions, replies, edit / share actions and audience controls. Clicking a hashtag opens the visible related-post feed.', M, 216, 480, 122, { accent: C.blue });
card('ABOUT ME', 'Eight detailed profile sub-sections', 'Intro & Travel Story; Personal Details; Work Experience; Education; Hobbies; Interests; Contact Info; and About the Person create a deeply editable member portrait.', M, 356, 480, 105, { accent: C.gold });
card('VACATION GALLERY', 'Albums with explicit visibility', 'Members can create and enter albums, upload / arrange photos, add captions and choose Public, Companions or Only me. The gallery is also represented in visitor profile views when permitted.', M, 479, 480, 106, { accent: C.green });
cover(I.social, M, 614, 480, 188, { radius: 20, overlay: { color: C.forest, opacity: .14 } });
caps('POST → PROFILE → GALLERY', 54, 641, { color: C.paper, size: 7.3, width: 260 });
h1('Travel stories\nwith context.', 54, 662, { color: C.paper, size: 27, width: 255 });

// 12 — Community conversations
newPage({ section: 'Community', accent: C.blue });
section('11 / Community conversations', 'Shared conversation, private chat and group belonging', 'NeverBeen layers community interactions so discovery can start in a public stream and continue among trusted companions and Circles.');
card('MESSAGE BOOK', 'A shared guestbook for travel discussion', 'Guests can read the global stream. Authenticated users can submit a 2,000-character post, reply in a nested thread, like / dislike and manage their own eligible entries.', M, 215, 480, 126, { accent: C.blue });
card('COMPANIONS', 'Requests, pending states, suggestions and mutuals', 'The Companions area groups incoming / sent requests, established companions and suggestions. Cards expose verification, profile preview, location / profession context and relationship actions.', M, 359, 480, 126, { accent: C.rose });
card('CIRCLES', 'Small travel communities with management actions', 'Create a Circle, add people, manage membership and settings, open Circle chat or save a chat as a Circle. A compact Circle panel lives under the profile navigation.', M, 503, 480, 108, { accent: C.green });
card('MESSENGER', 'Pending, online and offline companion threads', 'Messenger separates conversation states, exposes presence and supports personal / group communication. Header icons surface unread notification and chat cues.', M, 629, 480, 108, { accent: C.gold });

// 13 — Community play & controls
newPage({ section: 'Community', accent: C.blue });
section('12 / Community play, presence & controls', 'Stay social, stay in control', 'Beyond travel content, the dashboard combines light play, presence, reminders and self-service controls so members can make the space their own.');
const personalFeatures = [
  ['Games', 'NeverBeen Play includes photo-puzzle selections, Ludo with 2–4 players / AI difficulty, and local browser Stockfish chess with side, strength, hints, undo and restart.'],
  ['Birthdays', 'Upcoming celebration view plus a separate belated-birthdays period helps companions keep in touch.'],
  ['Notifications', 'Dedicated notifications surface activity and announcement notices; badge counts also travel to the community header.'],
  ['Settings', 'Device list, privacy / profile lock, travel styles & matchmaking, notification channels and blocked users are all visible as settings cards.'],
  ['Storage', 'A percentage view and micro inspector identify gallery photos / albums that consume storage and offer cleanup actions.'],
  ['Themes & language', 'Community themes and a remembered language selection personalise the experience; translation falls back safely when a service is unavailable.'],
];
personalFeatures.forEach((feature, index) => { const y = 207 + index * 94; panel(M, y, 480, 77, { fill: C.cream, stroke: C.line, radius: 15 }); disk(54, y + 20, 7.4, [C.lavender, C.rose, C.blue, C.gold, C.green, C.bronze][index]); doc.font('SansBold').fontSize(9.7).fillColor(C.ink).text(feature[0], 71, y + 13, { width: 400 }); txt(feature[1], 47, y + 33, { size: 7.85, width: 445, lineGap: 1.55 }); });

// 14 — Community safety
newPage({ section: 'Community', accent: C.blue });
section('13 / Community safety & visitor views', 'Privacy decisions are reflected in the interface', 'The Community feature set does not assume every profile is public. It visibly supports profile locks, audience selection, reports, blocks, visitor previews and data controls.');
card('PROFILE GATES', 'Public, locked and companions-only contexts', 'Profile state can visibly signal a locked account. Visitor screens preserve identity, About information, Gallery and Journey structure only when the viewer has the required relationship.', M, 214, 480, 125, { accent: C.rose });
card('REPORTING + MODERATION', 'Report abuse from people and content', 'Community and Message Book interactions include report pathways; the accompanying Help Centre explains reporting and the Admin Console supplies the triage destination.', M, 357, 480, 106, { accent: C.gold });
card('DATA AWARENESS', 'Privacy Policy and account control support', 'Public privacy content explains export, correction, erasure and deactivation. Member Settings / Storage offer in-product routes to manage the information and media behind a profile.', M, 481, 480, 106, { accent: C.green });
cover(I.privacy, M, 615, 480, 183, { radius: 20, overlay: { color: C.forest, opacity: .2 } });
caps('YOUR CONTENT · YOUR CHOICE', 54, 642, { color: C.gold, size: 7.2, width: 250 });
h1('Travel together,\nwith boundaries.', 54, 662, { color: C.paper, size: 27, width: 310 });

// 15 — Admin sign-in
newPage({ bg: C.night, section: 'Admin Console', accent: C.rose });
section('14 / Admin entry', 'Protected access before operations', 'The `/login` route is an Admin Console sign-in screen rather than a consumer account page. Admin-only routes are guarded and redirect unauthenticated navigation to this entry point.', { dark: true });
panel(M, 228, 480, 337, { fill: C.paper, stroke: '#526b7d', radius: 22 });
disk(270, 270, 25, C.forest);
caps('NEVERBEEN ADMINISTRATION', 75, 315, { color: C.bronze, size: 7.2, width: 390, align: 'center' });
h1('Admin Console', 80, 338, { color: C.ink, size: 33, width: 380, align: 'center' });
txt('Restricted access for members, galleries, website content and community operations.', 100, 385, { color: C.soft, size: 9, width: 340, align: 'center', lineGap: 2 });
panel(78, 437, 384, 37, { fill: C.white, stroke: C.line, radius: 10 });
txt('Admin Username', 94, 450, { size: 8.1, width: 160, lineGap: 0 });
panel(78, 485, 384, 37, { fill: C.white, stroke: C.line, radius: 10 });
txt('Password', 94, 498, { size: 8.1, width: 160, lineGap: 0 });
pill('SIGN IN TO ADMIN CONSOLE', 163, 536, { fill: C.forest, color: C.paper, size: 6.6, height: 20 });
card('VOLUNTEER ADMIN', 'A separate application journey', 'The alternate entry requires full name, email, strong password and resume attachment. A success state confirms review rather than granting instant operational access.', M, 603, 480, 114, { accent: C.rose });

// 16 — Admin overview
newPage({ section: 'Admin Console', accent: C.rose });
section('15 / Admin command centre', 'Live operations, safety queues and shared context', 'After authentication, a fixed side panel and routed work area bring the current operational state into one desktop-oriented console.');
const adminStart = [
  ['Dashboard', 'Member stats, 7-day activity, highlighted Journey posts and reports awaiting review.'],
  ['Members', 'All, verified and online drill-downs; safety-oriented actions from membership contexts.'],
  ['Abuse reports', 'Triage / decision space for reports against content or members.'],
  ['Identity checks', 'Verification queue and a secure full-page document viewer.'],
  ['Live presence', 'Visible online members, signed-in administrators, status pills and direct admin-mail actions.'],
];
adminStart.forEach((feature, index) => { const y = 211 + index * 103; panel(M, y, 480, 86, { fill: C.cream, stroke: C.line, radius: 16 }); disk(55, y + 22, 8, [C.rose, C.gold, C.green, C.blue, C.lavender][index]); doc.font('SansBold').fontSize(10.2).fillColor(C.ink).text(feature[0], 73, y + 14, { width: 370 }); txt(feature[1], 47, y + 37, { size: 8.4, width: 440, lineGap: 1.7 }); });

// 17 — Admin communications
newPage({ section: 'Admin Console', accent: C.rose });
section('16 / Admin communication & publishing', 'Coordinate the team and keep the site current', 'The Admin Console contains private staff communication, audience-facing publishing and a content-management layer for the visitor website.');
card('ADMIN MAIL', 'Inbox, sent and compose', 'Administrators communicate inside a private Mail workspace. The side panel exposes unread counts, unsent-draft state and an admin directory for recipients.', M, 216, 480, 109, { accent: C.blue });
card('ANNOUNCEMENTS', 'Target and measure a notice', 'Administrators create announcements, inspect history and see recipient / delivered / opened / clicked metrics along with reach by region, country, gender and age.', M, 343, 480, 109, { accent: C.rose });
card('WHATSAPP', 'Docked WhatsApp Web workspace', 'The console opens WhatsApp Web after QR sign-in and includes guidance for starting a chat plus privacy / security handling.', M, 470, 480, 92, { accent: C.green });
card('WEBSITE MANAGEMENT', 'Draft, preview, publish and roll back', 'A small CMS edits Home, Community and global components. Drafts can be previewed in a frame, published with a note, reverted by revision, imported / exported, reset and monitored through pending-change counters.', M, 580, 480, 137, { accent: C.gold });

// 18 — Admin user / data governance
newPage({ section: 'Admin Console', accent: C.rose });
section('17 / Admin user & data governance', 'Manage accounts and steward information responsibly', 'Dedicated tabs turn member safety, operational data and legal requests into visible work instead of passive records.');
card('USER MANAGEMENT', 'Directory, roles, sessions and audit', 'Tabs cover Directory, Roles & permissions, Sessions & security and Audit log. Summary statistics expose total users, new registrations, active users, verification, 2FA and restricted / disabled state.', M, 215, 480, 126, { accent: C.rose });
card('DATA MANAGEMENT', 'Seven stewardship surfaces', 'Catalog, Explorer, Privacy requests, Retention, Data quality, Backup & restore and Access log are supported by data summaries for datasets, records, storage, open requests, health score and last backup.', M, 359, 480, 126, { accent: C.gold });
card('PRIVACY, RETENTION & BACKUP', 'A practical line from policy to operations', 'Privacy request queues, retention workflow, data-quality checks and backup / restore controls help the team act on the promises the public Privacy Policy makes.', M, 503, 480, 107, { accent: C.green });
card('ACCESS LOG', 'Operational accountability', 'The Access log is a dedicated data-management area for reviewing information access and related activity in the governance suite.', M, 628, 480, 91, { accent: C.blue });

// 19 — Admin reliability
newPage({ section: 'Admin Console', accent: C.rose });
section('18 / Admin health, maintenance & reports', 'See system conditions, plan downtime and report back', 'The final operations group helps staff protect performance and make a controlled change visible before it affects visitors.');
card('WEBSITE HEALTH', 'Traffic, engagement, storage and performance', 'Charts cover traffic, visitor timing / origin / countries, Community activity, engagement funnel, retention cohorts, storage over time, storage by dataset, page-load time, slow pages, JavaScript errors and resource mix.', M, 215, 480, 139, { accent: C.green });
card('SITE DOWNTIME', 'Window → visitor message → preview → apply', 'Maintenance setup includes a downtime window, visitor-facing message, live preview, site-wide apply action, notify-me sign-ups and an operations log. Shell status signals live, scheduled or down state.', M, 372, 480, 126, { accent: C.rose });
card('HEALTH REPORT + REPOSITORIES', 'Printable evidence and future integration', 'A guarded Health Report opens as a print-ready document. Repositories is present as a connected-repository / integration surface and is currently marked under development.', M, 516, 480, 108, { accent: C.blue });
card('RETURN BOUNDARY', 'Clear separation from the public site', 'The console carries the administrator identity, log-out action and Back to Website route — operational work is purposefully distinct from public browsing.', M, 642, 480, 91, { accent: C.gold });

// 20 — Public route index
newPage({ section: 'Appendix' });
section('19 / Page inventory', 'Core public routes', 'A compact map of the public destination, request, support and community routes covered in this mobile document.');
const publicRoutes = [
  ['/', 'Home — studio sections and request path'],
  ['/audience', 'Audience use cases and written promises'],
  ['/collection', '61-photo lightbox collection'],
  ['/founder', 'Founder biography and expertise'],
  ['/destinations/:slug', '33 individual guide pages'],
  ['/travel-feeds', 'Search, trends and trip forms'],
  ['/feedback', 'WhatsApp-prepared support form'],
  ['/help', 'Searchable Help Centre'],
  ['/privacy', 'Privacy Policy and rights'],
  ['/terms', 'Terms & Condition'],
  ['/documentation', 'Responsive PDF Documentation Centre'],
];
publicRoutes.forEach((entry, index) => route(entry[0], entry[1], M, 205 + index * 49, 480));

// 21 — Community / protected route index
newPage({ section: 'Appendix' });
section('20 / Community & operations routes', 'Member transitions and protected administration', 'Community pages are available as direct routes; the Admin Console is protected by an authentication guard and sends anonymous visitors to the Admin entry screen.');
const memberRoutes = [
  ['/community', 'Community Connect'],
  ['/community/register', 'Required new-member registration'],
  ['/community/profile', 'Member social dashboard'],
  ['/profile', 'Direct profile alias'],
  ['/community/message-book', 'Shared discussion stream'],
  ['/community/messages', 'Redirects to Message Book'],
  ['/community/callback', 'OAuth exchange / redirect state'],
  ['/login', 'Admin entry + volunteer application'],
  ['/admin', 'Protected Admin Console'],
  ['/admin/health-report', 'Protected print-ready health report'],
];
memberRoutes.forEach((entry, index) => route(entry[0], entry[1], M, 205 + index * 49, 480));
card('AUTHENTICATION BOUNDARY', 'Protected routes stay protected', 'The route guard checks administrative authentication before loading `/admin` and its child modules. This documentation describes capabilities but never accesses member records or credentials.', M, 710, 480, 104, { accent: C.rose });

// 22 — Destination inventory, Europe + Africa
newPage({ section: 'Appendix', accent: C.green });
section('21 / Guide inventory', 'Europe, Africa & Middle East', 'Every supported destination has the reusable long-form guide described earlier. These 17 routes are the first half of the full catalogue.');
const eu = ['Paris', 'Switzerland', 'Norway', 'Santorini', 'Rome', 'London', 'Reykjavik', 'Istanbul', 'Netherlands', 'Austria', 'Denmark', 'Finland'];
const af = ['Marrakech', 'Cape Town', 'Egypt', 'Serengeti', 'Dubai'];
card('EUROPE · 12', eu.join('  ·  '), 'Routes use the corresponding lowercase slug under `/destinations/`.', M, 215, 480, 222, { accent: C.green });
card('AFRICA + MIDDLE EAST · 5', af.join('  ·  '), 'These guide entries carry their own region, time, currency and planning context.', M, 455, 480, 152, { accent: C.rose });
cover(I.norway, M, 638, 480, 158, { radius: 20 });

// 23 — Destination inventory, Asia / Pacific / Americas
newPage({ section: 'Appendix', accent: C.green });
section('22 / Guide inventory', 'Asia Pacific & Americas', 'The remaining 16 routes complete the 33-destination catalogue. City, country and regional concepts all use the same planning / live-information template.');
const apac = ['Tokyo', 'Seoul', 'New Zealand', 'Machu Picchu', 'Antarctica', 'Canada', 'United States', 'Maldives', 'Thailand', 'Malaysia', 'Singapore', 'Indonesia', 'Australia', 'Japan', 'Korea', 'Brazil'];
apac.forEach((name, index) => { const x = M + (index % 2) * 245; const y = 222 + Math.floor(index / 2) * 55; panel(x, y, 235, 41, { fill: C.cream, stroke: C.line, radius: 12 }); disk(x + 17, y + 20, 4.3, [C.blue, C.gold, C.green, C.rose][index % 4]); doc.font('SansBold').fontSize(8.7).fillColor(C.ink).text(name, x + 29, y + 14, { width: 170 }); });
card('CATALOGUE NOTE', '33 routes connect back to the studio', 'Guide pages always close the loop with related places and a direct request CTA: the destination can be researched deeply, then turned into a NeverBeen collection brief.', M, 692, 480, 108, { accent: C.green });

// 24 — Closing
newPage({ bg: C.forest, section: 'Closing', accent: C.gold, footer: false });
cover(I.help, 0, 0, W, H, { overlay: { color: C.forest, opacity: .79 } });
rect(0, 0, W, H, C.forest, .54);
contain(I.logo, M, 50, 220, 74, { bg: C.cream, radius: 13 });
caps('MOBILE DOCUMENTATION', M, 177, { color: C.gold, size: 8.2, width: 300 });
h1('Dream destinations.\nReal community.\nClear operations.', M, 207, { color: C.paper, size: 38, width: 425 });
txt('This portrait guide documents the end-to-end NeverBeen experience: public inspiration, destination knowledge, member participation, privacy-minded controls and a protected operations suite.', M, 398, { color: C.sand, size: 11.8, width: 420, lineGap: 3.7 });
pill('24 PORTRAIT PAGES', M, 550, { fill: C.gold, color: C.forest, size: 7.3, height: 23 });
pill('COMMUNITY + ADMIN DEEP DIVE', 174, 550, { fill: '#506d5e', color: C.paper, size: 7.3, height: 23 });
cover(I.couples, 270, 656, 240, 221, { radius: 20 });
caps('NEVERBEEN  /  REVIEWED 30 SEP 2026', M, 903, { color: C.sand, size: 6.8, width: 290 });

doc.end();
console.log(`Created ${OUT}`);
