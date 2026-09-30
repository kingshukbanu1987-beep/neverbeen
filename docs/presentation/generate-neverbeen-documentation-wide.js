/*
 * NeverBeen website presentation generator
 *
 * Produces a visual, 16:9 wide-screen PDF from the current application routes,
 * copy and visual assets. Run with:
 *   NODE_PATH=/tmp/neverbeen-pdf-tools/node_modules node docs/presentation/generate-neverbeen-documentation-wide.js
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'public', 'documentation', 'NeverBeen_Documentation_Wide.pdf');
const W = 960;
const H = 540;

const C = {
  ink: '#1d1914',
  inkSoft: '#5c5348',
  forest: '#24352c',
  forestDeep: '#18241e',
  bronze: '#8c5a32',
  gold: '#c4a06a',
  sand: '#f3ece2',
  sandDeep: '#e7dccb',
  paper: '#faf6f0',
  cream: '#fffdf9',
  white: '#ffffff',
  line: '#d8cbb9',
  green: '#6a856d',
  blue: '#315b70',
  rose: '#b86c59',
  lavender: '#6d668f',
  cloud: '#e8f0ec',
  slate: '#243040',
  mist: '#dfe7e4',
  danger: '#a65148',
};

const A = (relative) => path.join(ROOT, relative);
const images = {
  logo: A('public/neverbeen-logo-report.png'),
  dream: A('public/audience/dream-destinations.jpg'),
  couples: A('public/audience/couples.jpg'),
  families: A('public/audience/families.jpg'),
  birthday: A('public/audience/birthday.jpg'),
  social: A('public/audience/social.jpg'),
  creators: A('public/audience/creators.jpg'),
  elders: A('public/audience/golden-years.jpg'),
  privacy: A('public/audience/privacy.jpg'),
  norway: A('public/images/norway-laptop.jpg'),
  help: A('public/images/help-hero.jpg'),
  privacyHero: A('public/images/privacy-hero.jpg'),
  terms: A('public/images/terms-hero.jpg'),
  register: A('public/images/register-laptop.jpg'),
  founder: A('public/author.jpeg'),
};

const collectionSource = fs.readFileSync(A('src/app/pages/collection/collection-photos.ts'), 'utf8');
const collectionAssets = [...collectionSource.matchAll(/src:\s*'([^']+)'/g)].map((m) => A(`public${m[1]}`));

const doc = new PDFDocument({
  autoFirstPage: false,
  size: [W, H],
  margin: 0,
  info: {
    Title: 'NeverBeen — Wide Screen Product Documentation',
    Author: 'NeverBeen',
    Subject: 'Product, Community and Admin Console documentation for wide screens',
    Keywords: 'NeverBeen, documentation, travel, community, admin console',
    CreationDate: new Date('2026-09-30T00:00:00Z'),
  },
});

doc.registerFont('Sans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');
doc.registerFont('SansBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf');
doc.registerFont('Serif', '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf');
doc.registerFont('SerifBold', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
doc.pipe(fs.createWriteStream(OUT));

let slide = 0;

function rgba(hex, opacity) {
  // PDFKit supports opacity separately; this helper remains here for semantic readability.
  return { hex, opacity };
}

function rect(x, y, w, h, fill) {
  doc.save();
  doc.fillColor(fill).rect(x, y, w, h).fill();
  doc.restore();
}

function rule(x1, y1, x2, y2, color = C.line, width = 1) {
  doc.save();
  doc.strokeColor(color).lineWidth(width).moveTo(x1, y1).lineTo(x2, y2).stroke();
  doc.restore();
}

function circle(x, y, r, fill, stroke = null, lineWidth = 1) {
  doc.save();
  doc.fillColor(fill);
  if (stroke) doc.strokeColor(stroke).lineWidth(lineWidth);
  doc.circle(x, y, r)[stroke ? 'fillAndStroke' : 'fill']();
  doc.restore();
}

function panel(x, y, w, h, options = {}) {
  const {
    fill = C.cream,
    stroke = C.line,
    radius = 16,
    lineWidth = 0.7,
    opacity = 1,
  } = options;
  doc.save();
  doc.opacity(opacity).fillColor(fill).strokeColor(stroke).lineWidth(lineWidth);
  doc.roundedRect(x, y, w, h, radius).fillAndStroke();
  doc.restore();
}

function imageCover(file, x, y, w, h, options = {}) {
  const { align = 'center', valign = 'center', radius = 0, overlay = null } = options;
  try {
    const image = doc.openImage(file);
    const scale = Math.max(w / image.width, h / image.height);
    const iw = image.width * scale;
    const ih = image.height * scale;
    const hx = align === 'left' ? x : align === 'right' ? x + w - iw : x + (w - iw) / 2;
    const hy = valign === 'top' ? y : valign === 'bottom' ? y + h - ih : y + (h - ih) / 2;
    doc.save();
    if (radius > 0) doc.roundedRect(x, y, w, h, radius).clip();
    else doc.rect(x, y, w, h).clip();
    doc.image(image, hx, hy, { width: iw, height: ih });
    if (overlay) {
      doc.fillColor(overlay.color).opacity(overlay.opacity).rect(x, y, w, h).fill();
    }
    doc.restore();
  } catch (error) {
    panel(x, y, w, h, { fill: C.sandDeep, stroke: C.line, radius });
    smallCaps('VISUAL ASSET', x + 16, y + h / 2 - 8, { color: C.inkSoft, size: 8 });
  }
}

function imageContain(file, x, y, w, h, options = {}) {
  const { bg = C.cream, radius = 14 } = options;
  panel(x, y, w, h, { fill: bg, stroke: C.line, radius });
  try {
    const image = doc.openImage(file);
    const scale = Math.min((w - 16) / image.width, (h - 16) / image.height);
    const iw = image.width * scale;
    const ih = image.height * scale;
    doc.save();
    doc.roundedRect(x, y, w, h, radius).clip();
    doc.image(image, x + (w - iw) / 2, y + (h - ih) / 2, { width: iw, height: ih });
    doc.restore();
  } catch (error) {
    smallCaps('IMAGE', x + 16, y + 16, { color: C.inkSoft, size: 8 });
  }
}

function smallCaps(text, x, y, options = {}) {
  const { color = C.bronze, size = 8.6, width = 300, align = 'left' } = options;
  doc.font('SansBold').fontSize(size).fillColor(color).text(String(text).toUpperCase(), x, y, {
    width,
    align,
    characterSpacing: 1.3,
    lineGap: 0,
  });
}

function title(text, x, y, options = {}) {
  const { color = C.ink, size = 30, width = 700, align = 'left', font = 'SerifBold', lineGap = 1 } = options;
  doc.font(font).fontSize(size).fillColor(color).text(text, x, y, {
    width,
    align,
    lineGap,
  });
}

function body(text, x, y, options = {}) {
  const { color = C.inkSoft, size = 10.5, width = 430, align = 'left', font = 'Sans', lineGap = 3, height } = options;
  doc.font(font).fontSize(size).fillColor(color).text(text, x, y, {
    width,
    align,
    lineGap,
    ...(height ? { height } : {}),
  });
}

function textHeight(text, options = {}) {
  const { size = 10.5, width = 430, font = 'Sans', lineGap = 3 } = options;
  doc.font(font).fontSize(size);
  return doc.heightOfString(text, { width, lineGap });
}

function bulletList(items, x, y, w, options = {}) {
  const {
    color = C.inkSoft,
    size = 10,
    gap = 8,
    bulletColor = C.gold,
    font = 'Sans',
    lineGap = 2.5,
    indent = 17,
  } = options;
  let yy = y;
  for (const item of items) {
    const h = textHeight(item, { size, width: w - indent, font, lineGap });
    circle(x + 4.5, yy + 7, 3.1, bulletColor);
    body(item, x + indent, yy, { color, size, width: w - indent, font, lineGap });
    yy += h + gap;
  }
  return yy;
}

function numberedList(items, x, y, w, options = {}) {
  const { color = C.inkSoft, size = 10, numberColor = C.forest, gap = 9, lineGap = 2.5 } = options;
  let yy = y;
  items.forEach((item, index) => {
    circle(x + 10, yy + 10, 10, numberColor);
    doc.font('SansBold').fontSize(8.2).fillColor(C.white).text(String(index + 1), x + 4.7, yy + 5.5, { width: 11, align: 'center' });
    const h = textHeight(item, { size, width: w - 31, font: 'Sans', lineGap });
    body(item, x + 28, yy, { color, size, width: w - 28, lineGap });
    yy += Math.max(h, 20) + gap;
  });
  return yy;
}

function pill(label, x, y, options = {}) {
  const { fill = C.cloud, textColor = C.forest, size = 8.2, padX = 10, height = 21, stroke = fill } = options;
  doc.font('SansBold').fontSize(size);
  // A small breathing allowance avoids an accidental second line with embedded fonts.
  const width = doc.widthOfString(label) + padX * 2 + 8;
  panel(x, y, width, height, { fill, stroke, radius: height / 2, lineWidth: 0.4 });
  doc.font('SansBold').fontSize(size).fillColor(textColor).text(label, x + padX, y + 6, {
    width: width - padX * 2,
    align: 'center',
    lineBreak: false,
  });
  return width;
}

function statCard(value, label, x, y, w, options = {}) {
  const { fill = C.cream, accent = C.gold, valueColor = C.forest, labelColor = C.inkSoft } = options;
  panel(x, y, w, 79, { fill, stroke: fill, radius: 14 });
  rect(x, y, 5, 79, accent);
  doc.font('SerifBold').fontSize(25).fillColor(valueColor).text(value, x + 20, y + 13, { width: w - 30 });
  smallCaps(label, x + 20, y + 48, { color: labelColor, size: 7.4, width: w - 30 });
}

function quoteCard(quote, attribution, x, y, w, h, options = {}) {
  const { fill = C.forest, quoteColor = C.paper, accent = C.gold } = options;
  const compact = h < 80;
  const quoteSize = h < 55 ? 7.8 : compact ? 8.9 : h < 105 ? 10.3 : 13.2;
  const quoteY = y + (h < 55 ? 14 : compact ? 22 : 42);
  const quoteHeight = Math.max(10, y + h - 20 - quoteY);
  panel(x, y, w, h, { fill, stroke: fill, radius: 18 });
  doc.font('SerifBold').fontSize(compact ? 21 : 36).fillColor(accent).text('“', x + 20, y + (compact ? 4 : 14));
  body(quote, x + 32, quoteY, { color: quoteColor, size: quoteSize, width: w - 56, font: 'Serif', lineGap: compact ? 1.1 : 2.3, height: quoteHeight });
  smallCaps(attribution, x + 32, y + h - 15, { color: accent, size: 6.4, width: w - 58 });
}

function browserFrame(x, y, w, h, label, options = {}) {
  const { fill = C.cream, content = C.white, accent = C.forest, lines = [] } = options;
  panel(x, y, w, h, { fill, stroke: C.line, radius: 16 });
  rect(x, y, w, 31, fill);
  circle(x + 17, y + 15, 3.7, C.rose);
  circle(x + 30, y + 15, 3.7, C.gold);
  circle(x + 43, y + 15, 3.7, C.green);
  panel(x + 63, y + 8, Math.min(235, w - 80), 14, { fill: C.paper, stroke: C.line, radius: 7, lineWidth: 0.4 });
  doc.font('Sans').fontSize(5.5).fillColor(C.inkSoft).text(label, x + 72, y + 11.4, { width: Math.min(210, w - 100) });
  rect(x + 1, y + 32, w - 2, h - 33, content);
  if (lines.length) {
    let yy = y + 48;
    for (const line of lines) {
      const lineW = Math.min(w - 34, line.width || w - 34);
      rect(x + 17, yy, lineW, line.height || 8, line.color || C.sandDeep);
      yy += (line.height || 8) + (line.gap || 8);
    }
  }
  if (accent) rect(x + 1, y + 32, 4, h - 33, accent);
}

function stepCard(n, heading, copy, x, y, w, h, options = {}) {
  const { fill = C.cream, accent = C.gold } = options;
  panel(x, y, w, h, { fill, stroke: C.line, radius: 14 });
  circle(x + 24, y + 25, 15, accent);
  doc.font('SansBold').fontSize(8).fillColor(C.forestDeep).text(n, x + 15, y + 20.6, { width: 18, align: 'center' });
  doc.font('SansBold').fontSize(11.5).fillColor(C.ink).text(heading, x + 47, y + 15, { width: w - 62, lineGap: 1 });
  body(copy, x + 18, y + 55, { size: 8.8, width: w - 36, lineGap: 2 });
}

function sectionTitle(kicker, heading, summary, options = {}) {
  const { x = 58, y = 56, width = 800, color = C.ink, kickerColor = C.bronze, titleSize = 29 } = options;
  // Long headings need to remain in the upper title band. Scale them down instead of
  // allowing a multi-line heading to collide with the explanatory copy or page content.
  const effectiveTitleSize = heading.length > 42 ? Math.min(titleSize, 23) : heading.length > 36 ? Math.min(titleSize, 26) : titleSize;
  const headingY = y + 18;
  const headingHeight = textHeight(heading, { size: effectiveTitleSize, width, font: 'SerifBold', lineGap: 1 });
  smallCaps(kicker, x, y, { color: kickerColor, size: 8.4, width });
  title(heading, x, headingY, { color, size: effectiveTitleSize, width });
  if (summary) {
    body(summary, x, headingY + headingHeight + 4, {
      color: color === C.paper ? C.sandDeep : C.inkSoft,
      size: 10.2,
      width: Math.min(width, 715),
      lineGap: 2.5,
    });
  }
}

function newSlide(options = {}) {
  slide += 1;
  const { bg = C.paper, section = '', sectionColor = C.bronze, footer = true } = options;
  doc.addPage({ size: [W, H], margin: 0 });
  rect(0, 0, W, H, bg);
  // Consistent modern trim at left.
  rect(0, 0, 11, H, sectionColor);
  if (footer) {
    const color = bg === C.forest || bg === C.forestDeep || bg === C.slate ? C.sandDeep : C.inkSoft;
    rule(58, H - 34, W - 58, H - 34, bg === C.forest || bg === C.forestDeep || bg === C.slate ? '#496055' : C.line, 0.6);
    doc.font('Sans').fontSize(6.8).fillColor(color).text(
      section ? `NEVERBEEN  /  ${section.toUpperCase()}` : 'NEVERBEEN  /  WEBSITE PRESENTATION',
      58,
      H - 23,
      { width: 600, characterSpacing: 0.65 },
    );
    doc.font('SansBold').fontSize(7.2).fillColor(color).text(String(slide).padStart(2, '0'), W - 87, H - 23, { width: 29, align: 'right' });
  }
}

function routePill(route, label, x, y, w, options = {}) {
  const { color = C.forest, fill = C.cream } = options;
  panel(x, y, w, 35, { fill, stroke: C.line, radius: 11 });
  doc.font('SansBold').fontSize(7.6).fillColor(color).text(route, x + 11, y + 7, { width: w - 22, characterSpacing: 0.3 });
  doc.font('Sans').fontSize(7.1).fillColor(C.inkSoft).text(label, x + 11, y + 20, { width: w - 22 });
}

function catalogChip(name, x, y, w, color) {
  panel(x, y, w, 24, { fill: C.cream, stroke: C.line, radius: 12, lineWidth: 0.55 });
  circle(x + 10, y + 12, 3, color);
  doc.font('SansBold').fontSize(7.4).fillColor(C.ink).text(name, x + 18, y + 8, { width: w - 27 });
}

function infoCard(label, heading, copy, x, y, w, h, options = {}) {
  const { accent = C.gold, fill = C.cream, titleColor = C.ink } = options;
  const titleWidth = w - 36;
  const titleSize = heading.length > 42 ? 9.2 : heading.length > 32 ? 10.2 : 12;
  const headingY = y + 36;
  const headingHeight = textHeight(heading, { size: titleSize, width: titleWidth, font: 'SansBold', lineGap: 1 });
  panel(x, y, w, h, { fill, stroke: C.line, radius: 15 });
  rect(x, y, w, 5, accent);
  smallCaps(label, x + 18, y + 18, { color: accent === C.forest ? C.green : C.bronze, size: 7.5, width: titleWidth });
  doc.font('SansBold').fontSize(titleSize).fillColor(titleColor).text(heading, x + 18, headingY, { width: titleWidth, lineGap: 1 });
  body(copy, x + 18, headingY + headingHeight + 7, { size: h < 90 ? 7.9 : 8.7, width: titleWidth, lineGap: 2.2 });
}

function checkMark(x, y, color = C.green) {
  doc.save();
  doc.strokeColor(color).lineWidth(2).lineCap('round').moveTo(x, y + 5).lineTo(x + 4, y + 9).lineTo(x + 11, y).stroke();
  doc.restore();
}

function checkRow(text, x, y, w, options = {}) {
  const { color = C.inkSoft, size = 9, mark = C.green } = options;
  checkMark(x, y + 1, mark);
  body(text, x + 18, y, { color, size, width: w - 18, lineGap: 2 });
}

// 01 — Cover
newSlide({ bg: C.forestDeep, section: 'Wide Screen Documentation', sectionColor: C.gold, footer: false });
imageCover(images.dream, 0, 0, W, H, { align: 'center', valign: 'center', overlay: { color: C.forestDeep, opacity: 0.66 } });
rect(0, 0, W, H, C.forestDeep);
doc.save();
doc.opacity(0.54).fillColor(C.forestDeep).rect(0, 0, W, H).fill();
doc.restore();
imageCover(images.couples, 683, 50, 215, 300, { radius: 18, align: 'center', valign: 'center' });
doc.save(); doc.opacity(0.12).fillColor(C.gold).roundedRect(683, 50, 215, 300, 18).fill(); doc.restore();
imageContain(images.logo, 57, 48, 251, 90, { bg: C.cream, radius: 14 });
smallCaps('WIDE SCREEN / LANDSCAPE DOCUMENTATION', 59, 189, { color: C.gold, size: 9.1, width: 455 });
title('Go Anywhere.\nEven Where You\'ve Never Been.', 57, 214, { color: C.paper, size: 38, width: 555, font: 'SerifBold', lineGap: 2 });
body('A complete, page-by-page tour of the NeverBeen experience — its AI vacation-photo studio, destination guide library, social community, service tools, and access-controlled operations.', 59, 360, { color: C.sandDeep, size: 12, width: 520, lineGap: 4 });
pill('REVIEWED 30 SEP 2026', 58, 445, { fill: C.gold, textColor: C.forestDeep, size: 8.2, height: 23 });
pill('43 LANDSCAPE PAGES', 227, 445, { fill: '#496055', textColor: C.paper, size: 8.2, height: 23, stroke: '#496055' });
smallCaps('YOU NEVER BEEN  /  KINGS HUK BANU 1987 WORKERS', 59, 492, { color: C.sandDeep, size: 7.2, width: 420 });

// 02 — Executive overview / scope
newSlide({ section: 'Orientation', sectionColor: C.gold });
sectionTitle('01 / The product in one view', 'A two-part destination platform', 'NeverBeen blends a premium AI vacation-photo request studio with a traveller community. The public site leads from inspiration to a request; the community adds profiles, discussions, support, legal controls, and private operational tools.');
statCard('33', 'destination guide pages', 58, 157, 184, { accent: C.gold });
statCard('61', 'collection photographs', 258, 157, 184, { accent: C.rose });
statCard('4', 'studio price tiers', 458, 157, 184, { accent: C.green });
statCard('14', 'help articles / 6 topics', 658, 157, 184, { accent: C.blue });
infoCard('STUDIO', 'Plan a vacation image collection', 'Hero storytelling, destination discovery, packages, FAQ, the request form, collection gallery, audience page and founder profile provide the acquisition journey.', 58, 273, 250, 151, { accent: C.gold });
infoCard('GUIDES', 'Explore destination context', 'Every supported destination uses one rich guide template: live weather, time, currency, cultural context, practical notes, maps, photographs, related places and a request CTA.', 326, 273, 250, 151, { accent: C.green });
infoCard('COMMUNITY', 'Connect with fellow travellers', 'OAuth entry, member registration, profile areas, message book, help, privacy and terms establish a social-network experience around travel memoirs and galleries.', 594, 273, 250, 151, { accent: C.blue });
smallCaps('SCOPE NOTE', 58, 450, { color: C.bronze, size: 7.4 });
body('This presentation uses the reviewed website, its current client routes, page copy and bundled image assets. Live values and sign-in outcomes can vary at run time; protected administration remains described at a functional level.', 58, 465, { color: C.inkSoft, size: 8.7, width: 788, lineGap: 2 });

// 03 — Architecture
newSlide({ bg: C.forest, section: 'Orientation', sectionColor: C.gold });
sectionTitle('02 / Information architecture', 'One brand, four linked experiences', 'Primary routes form an inspiration-to-action system, then extend to guides, community participation and staff-only operations.', { color: C.paper, kickerColor: C.gold, width: 810 });
const arch = [
  { label: 'PUBLIC STUDIO', color: C.gold, routes: ['Home & sections', 'Audience', 'Collection', 'Founder', 'Feedback'] },
  { label: 'DESTINATION LIBRARY', color: '#85a691', routes: ['33 guide URLs', 'Live context', 'Maps & practicals', 'Photo galleries', 'Request CTAs'] },
  { label: 'COMMUNITY & CARE', color: '#9fb6c1', routes: ['Community entry', 'Register / Profile', 'Message Book', 'Help / Legal', 'Travel feeds'] },
  { label: 'PRIVATE OPS', color: '#d49b8b', routes: ['Admin sign-in', 'Guarded console', 'Members / data', 'Announcements', 'Health / maintenance'] },
];
arch.forEach((item, i) => {
  const x = 58 + i * 211;
  panel(x, 187, 187, 242, { fill: '#2e4236', stroke: '#567061', radius: 16 });
  rect(x, 187, 187, 6, item.color);
  smallCaps(item.label, x + 17, 211, { color: item.color, size: 7.3, width: 153 });
  item.routes.forEach((route, r) => {
    circle(x + 22, 252 + r * 31, 4, item.color);
    body(route, x + 34, 246 + r * 31, { color: C.sandDeep, size: 8.9, width: 132, lineGap: 1 });
  });
});
rule(58, 459, 844, 459, '#567061', 0.8);
body('Wayfinding is intentionally cross-linked: the public navigation and footer lead into support, community and collection pages; guides return users to the studio request; legal and Help Centre routes surround account interactions.', 58, 476, { color: C.sandDeep, size: 9.3, width: 786, lineGap: 2.6 });

// 04 — Home hero and nav
newSlide({ section: 'Public Studio', sectionColor: C.gold });
sectionTitle('03 / Home page — the entry experience', 'Hero, navigation and first decision', 'The landing page announces the central promise — “Go Anywhere. Even Where You\'ve Never Been.” — and immediately offers a community entry, founder profile, contact jump, destination catalogue, collection and gallery paths.');
browserFrame(58, 155, 514, 282, 'youneverbeen.kingshukbanu1987.workers.dev/', { fill: C.cream, content: C.paper, accent: C.forest });
imageCover(images.dream, 63, 187, 509, 250, { radius: 0, overlay: { color: C.forestDeep, opacity: 0.27 } });
smallCaps('TRAVEL PHOTOGRAPHY, IMAGINED', 88, 218, { color: C.gold, size: 7.5, width: 220 });
title('Go Anywhere.\nEven Where You\'ve Never Been.', 87, 238, { color: C.white, size: 16, width: 360, lineGap: 0 });
body('Create AI vacation photographs of yourself in the world\'s most beautiful destinations.', 87, 284, { color: C.paper, size: 8.4, width: 244, lineGap: 1.8 });
pill('CREATE MY VACATION', 87, 326, { fill: C.gold, textColor: C.forestDeep, size: 6.9, height: 19, padX: 9 });
smallCaps('HOME SECTIONS', 622, 165, { color: C.bronze, size: 8.2, width: 240 });
const homeSections = [
  ['Hero', 'Rotating destination image, positioning and direct CTAs.'],
  ['How it works', 'The four-stage request-and-delivery narrative.'],
  ['Destinations', '33 catalogue cards, each opening an individual guide.'],
  ['Gallery & documentation', 'Example imagery, selectable plans and paired Explore Gallery / Documentation actions.'],
  ['FAQ, founder & form', 'Trust questions, founding story and lead capture.'],
];
let heroY = 191;
homeSections.forEach((item, i) => {
  circle(631, heroY + 7, 8, i === 0 ? C.gold : C.sandDeep, i === 0 ? C.gold : C.line, 0.6);
  doc.font('SansBold').fontSize(6.7).fillColor(i === 0 ? C.forestDeep : C.inkSoft).text(String(i + 1), 627, heroY + 3.3, { width: 8, align: 'center' });
  doc.font('SansBold').fontSize(9.3).fillColor(C.ink).text(item[0], 650, heroY, { width: 170 });
  body(item[1], 650, heroY + 15, { size: 8.1, width: 174, lineGap: 1.5 });
  heroY += 47;
});

// 05 — Home how it works
newSlide({ section: 'Public Studio', sectionColor: C.gold });
sectionTitle('04 / Home page — “How It Works”', 'A four-step studio process', 'The section translates the service from a lead form into a human-managed production flow. It also positions verification, editorial refinement and print-ready delivery as parts of the experience.');
stepCard('01', 'Submit request', 'Complete the request form with your details, destination preferences and the selected package.', 58, 166, 196, 159, { accent: C.gold });
stepCard('02', 'Share photos & ID', 'Supply a clear photo and valid identification for verification and preparation.', 269, 166, 196, 159, { accent: C.rose });
stepCard('03', 'AI creates the vacation', 'The studio model places the customer in the requested light, wardrobe and atmosphere; an editor refines the still.', 480, 166, 196, 159, { accent: C.green });
stepCard('04', 'Download & share', 'Receive print-ready photographs for albums, framing and the trip that never happened in person.', 691, 166, 196, 159, { accent: C.blue });
quoteCard('“Our studio model places you in destination light, wardrobe, and atmosphere—then an editor refines the still.”', 'HOME / HOW IT WORKS', 58, 359, 385, 111);
infoCard('TRUST SIGNALS', 'The request experience is deliberately framed as a studio service', 'Site copy links photo ownership, identity verification, signed permission and the option to choose light, wardrobe and season. The FAQ expands those safeguards.', 467, 359, 420, 111, { accent: C.gold });

// 06 — Home destination catalogue
newSlide({ section: 'Public Studio', sectionColor: C.gold });
sectionTitle('05 / Home page — popular destinations', '33 cards become a structured guide library', 'The “Popular Destinations” grid is not a dead-end gallery: every card routes to a dedicated `/destinations/:slug` guide. The catalogue intentionally mixes cities, countries and broad regions.');
const catalogNames = ['Paris', 'Antarctica', 'Switzerland', 'New Zealand', 'Norway', 'Santorini', 'Rome', 'London', 'Dubai', 'Reykjavik', 'Marrakech', 'Cape Town', 'Tokyo', 'Seoul', 'Egypt', 'Machu Picchu', 'Serengeti', 'Istanbul', 'Netherlands', 'Austria', 'Canada', 'United States', 'Maldives', 'Thailand', 'Malaysia', 'Singapore', 'Indonesia', 'Australia', 'Denmark', 'Finland', 'Japan', 'Korea', 'Brazil'];
const chipColors = [C.gold, C.green, C.blue, C.rose, C.lavender];
let cx = 58; let cy = 170;
catalogNames.forEach((name, i) => {
  const ww = name.length > 12 ? 130 : name.length > 9 ? 112 : 93;
  if (cx + ww > 604) { cx = 58; cy += 33; }
  catalogChip(name, cx, cy, ww, chipColors[i % chipColors.length]);
  cx += ww + 7;
});
imageCover(images.norway, 648, 163, 239, 257, { radius: 18, align: 'center', valign: 'center' });
panel(640, 390, 247, 77, { fill: C.forest, stroke: C.forest, radius: 16 });
smallCaps('CARD BEHAVIOUR', 658, 407, { color: C.gold, size: 7.3, width: 190 });
body('Each image card presents country, place and a short travel caption, with an “Explore the guide” link that expands the visitor\'s planning context.', 658, 424, { color: C.paper, size: 8.2, width: 204, lineGap: 2 });
smallCaps('CATALOGUE COUNT', 58, 446, { color: C.bronze, size: 7.2, width: 160 });
body('33 destination routes are enumerated in the appendix, grouped by guide data set.', 58, 461, { color: C.inkSoft, size: 8.6, width: 524, lineGap: 2 });

// 07 — Home commerce and request
newSlide({ section: 'Public Studio', sectionColor: C.gold });
sectionTitle('06 / Home page — packages to request', 'Four price tiers, then a tailored brief', 'Pricing is selectable on the home page and the selected package is carried into the request form. The contact area collects identity and delivery information plus destination and creative notes.');
const plans = [
  ['Starter', '₹499', 'one collection', '3 destination looks · 4K files · 48-hour delivery'],
  ['Economy Class', '₹999', 'per trip', '12 looks · portrait & landscape · 24-hour priority'],
  ['Business Class', '₹1999', 'season', '40 looks · private gallery · dedicated editor'],
  ['First Class', '₹4999', 'season', '100 looks · creative direction · commercial license'],
];
plans.forEach((plan, i) => {
  const x = 58 + i * 211;
  const featured = i === 1;
  panel(x, 165, 194, 178, { fill: featured ? C.forest : C.cream, stroke: featured ? C.forest : C.line, radius: 15 });
  if (featured) pill('MOST CHOSEN', x + 49, 151, { fill: C.gold, textColor: C.forestDeep, size: 6.6, height: 18, padX: 8 });
  smallCaps(plan[0], x + 17, 185, { color: featured ? C.gold : C.bronze, size: 7.3, width: 160 });
  doc.font('SerifBold').fontSize(24).fillColor(featured ? C.paper : C.forest).text(plan[1], x + 17, 208, { width: 160 });
  body(plan[2], x + 17, 237, { color: featured ? C.sandDeep : C.inkSoft, size: 8.2, width: 160 });
  rule(x + 17, 260, x + 177, 260, featured ? '#52675b' : C.line, 0.6);
  body(plan[3], x + 17, 272, { color: featured ? C.paper : C.inkSoft, size: 7.7, width: 155, lineGap: 1.8 });
});
infoCard('REQUEST FORM', 'Information captured before the studio responds', 'Name, email, date of birth, gender, country, package, international phone number, destination and a free-text note for creative direction (for example: light, wardrobe or season).', 58, 374, 392, 97, { accent: C.gold });
infoCard('HAND-OFF', 'A short path from inspiration to a collection brief', 'Pricing plan → Home contact form → team follow-up → photo and ID verification → production. A successful submission confirms that the first look will be sent back.', 470, 374, 417, 97, { accent: C.green });

// 08 — Home proof / FAQ / founder / footer
newSlide({ section: 'Public Studio', sectionColor: C.gold });
sectionTitle('07 / Home page — proof, questions and closure', 'Trust-building sections complete the landing page', 'The lower page supplies an example gallery, an accordion FAQ, a founder teaser, the request form and a footer that exposes service, visit and support navigation.');
const galleryImgs = [collectionAssets[0], collectionAssets[8], collectionAssets[15], collectionAssets[23], collectionAssets[31], collectionAssets[45]];
galleryImgs.forEach((img, i) => {
  const x = 58 + (i % 3) * 115;
  const y = 165 + Math.floor(i / 3) * 87;
  imageCover(img, x, y, 104, 76, { radius: 9 });
});
smallCaps('GALLERY', 58, 347, { color: C.bronze, size: 7.4, width: 130 });
body('A 14-item editorial travel mosaic on the page acts as aesthetic proof of the requested style.', 58, 362, { size: 8.6, width: 330, lineGap: 2 });
infoCard('FAQ', '16 practical answers', 'Topics cover suitable uploads, realism, sharing and printing, timing, submission process, outfit limits, celebrity policy, consent, ID verification, payment, refunds and deletion after the contract.', 423, 165, 221, 160, { accent: C.rose });
infoCard('FOUNDER TEASER', 'Kingshuk', 'The home page introduces the founder with a short statement and links onward to the full profile and expertise page.', 665, 165, 222, 160, { accent: C.green });
imageContain(images.founder, 686, 242, 180, 147, { radius: 12, bg: C.paper });
infoCard('FOOTER', 'Service + support cross-links', 'Studio: How It Works, Destinations, Audience, Collection, Pricing. Visit: Gallery, Contact, Admin. Support: Help, Privacy, Terms and Community.', 423, 349, 464, 121, { accent: C.blue });

// 09 — Destination guide template
newSlide({ bg: C.forest, section: 'Destination Guides', sectionColor: C.gold });
sectionTitle('08 / Destination guide system', 'One deep template, 33 localized pages', 'Every guide uses the same reusable component. A landmark-style hero supplies the place, region, time zone, currency and best-time information before the visitor enters live and editorial sections.', { color: C.paper, kickerColor: C.gold, width: 810 });
const guideSections = [
  ['LIVE', 'Weather · local clock · currency rate'],
  ['OVERVIEW', 'Summary · Wikipedia context · facts'],
  ['DISCOVER', 'Where to eat · sights · history · geography'],
  ['MAP', 'Coordinates · Google Maps · photo search'],
  ['PLAN', 'Culture · seasons · transport · practical notes'],
  ['VISUALS', 'Photographs · related places · service CTA'],
];
guideSections.forEach((it, i) => {
  const x = 58 + (i % 3) * 271;
  const y = 178 + Math.floor(i / 3) * 115;
  panel(x, y, 245, 91, { fill: '#2f4438', stroke: '#587060', radius: 15 });
  circle(x + 22, y + 23, 9, [C.gold, '#85a691', '#9fb6c1', '#d49b8b', '#c6b2de', '#b8d4c2'][i]);
  smallCaps(it[0], x + 40, y + 16, { color: C.gold, size: 7.4, width: 170 });
  body(it[1], x + 18, y + 44, { color: C.sandDeep, size: 9.1, width: 205, lineGap: 2 });
});
quoteCard('Never been to [destination]? Send us a portrait you already own.', 'GUIDE CTA BAND', 58, 420, 512, 70, { fill: '#304438', quoteColor: C.paper, accent: C.gold });
body('Guide navigation uses anchor links so a reader can jump through the long-form page. Invalid slugs receive a friendly “Off the map” state with the full available guide list.', 597, 428, { color: C.sandDeep, size: 9.1, width: 290, lineGap: 2.5 });

// 10 — Guide live & planning details
newSlide({ section: 'Destination Guides', sectionColor: C.green });
sectionTitle('09 / Destination guide — real-time and practical layers', 'The guide pairs inspirational content with travel-planning context', 'Live cards are designed to be useful even when a source cannot return data: the interface shows loading/unavailable states and leaves seasonal and practical guidance visible.');
imageCover(images.norway, 58, 159, 300, 292, { radius: 18, align: 'center' });
panel(383, 159, 226, 123, { fill: C.cream, stroke: C.line, radius: 15 });
smallCaps('RIGHT NOW', 403, 180, { color: C.bronze, size: 7.4, width: 160 });
doc.font('SansBold').fontSize(13).fillColor(C.ink).text('Live from a destination', 403, 199, { width: 165 });
checkRow('Current weather and multi-day forecast', 403, 227, 176, { size: 8.2 });
checkRow('Local clock, date and relative offset', 403, 247, 176, { size: 8.2 });
checkRow('Currency and reference cross-rates', 403, 267, 176, { size: 8.2 });
panel(631, 159, 256, 123, { fill: C.cream, stroke: C.line, radius: 15 });
smallCaps('LOCAL CONTEXT', 651, 180, { color: C.bronze, size: 7.4, width: 180 });
doc.font('SansBold').fontSize(13).fillColor(C.ink).text('At-a-glance planning data', 651, 199, { width: 190 });
checkRow('Country, region, time zone and coordinates', 651, 227, 205, { size: 8.2 });
checkRow('Best time, currency and custom practical facts', 651, 247, 205, { size: 8.2 });
checkRow('Map + Google links for discovery', 651, 267, 205, { size: 8.2 });
infoCard('EDITORIAL DEPTH', 'Culture and place knowledge', 'Overview, food recommendations, landmark lists, history, geography and culture establish why a destination matters rather than only presenting backdrop imagery.', 383, 307, 238, 144, { accent: C.gold });
infoCard('VISIT PLANNING', 'Actionable seasonal guidance', 'Season cards, getting-around text, travel facts and “Did you know?” prompts support a more complete planning mindset before returning to a NeverBeen request.', 647, 307, 240, 144, { accent: C.green });
body('Live sources named in the guide: Open-Meteo for weather, Frankfurter / ECB reference rates for currency, Wikipedia for supplemental extracts, and an embedded map with outbound Google Maps / image-search links.', 58, 471, { color: C.inkSoft, size: 8.5, width: 828, lineGap: 2 });

// 11 — Europe destinations
newSlide({ section: 'Destination Guides', sectionColor: C.green });
sectionTitle('10 / Guide coverage — Europe', '12 guide routes in the Europe data set', 'Each destination appears as a unique URL but shares the complete guide structure shown in the prior slides. Route slugs make this coverage indexable and easy to link from the catalogue.');
const europe = [
  ['Paris', '/destinations/paris'], ['Switzerland', '/destinations/switzerland'], ['Norway', '/destinations/norway'], ['Santorini', '/destinations/santorini'],
  ['Rome', '/destinations/rome'], ['London', '/destinations/london'], ['Reykjavik', '/destinations/reykjavik'], ['Istanbul', '/destinations/istanbul'],
  ['Netherlands', '/destinations/netherlands'], ['Austria', '/destinations/austria'], ['Denmark', '/destinations/denmark'], ['Finland', '/destinations/finland'],
];
europe.forEach((it, i) => {
  const x = 58 + (i % 3) * 260;
  const y = 163 + Math.floor(i / 3) * 63;
  panel(x, y, 238, 48, { fill: C.cream, stroke: C.line, radius: 12 });
  circle(x + 18, y + 24, 7, [C.gold, C.green, C.blue, C.rose][i % 4]);
  doc.font('SansBold').fontSize(9.2).fillColor(C.ink).text(it[0], x + 33, y + 11, { width: 180 });
  doc.font('Sans').fontSize(6.7).fillColor(C.inkSoft).text(it[1], x + 33, y + 27, { width: 185 });
});
imageCover(images.couples, 702, 423, 185, 58, { radius: 12, align: 'center', valign: 'top' });
smallCaps('EUROPE COVERAGE', 58, 440, { color: C.bronze, size: 7.3, width: 180 });
body('From Paris and Rome to the Nordic guides, the index balances individual cities, countries and thematic destinations. Guide pages surface their own photos and rotate recommendations for further exploration.', 58, 455, { size: 8.6, width: 585, lineGap: 2 });

// 12 — Africa / Middle East
newSlide({ section: 'Destination Guides', sectionColor: C.green });
sectionTitle('11 / Guide coverage — Africa & Middle East', 'Five guide routes in the Africa / Middle East data set', 'These routes retain the same long-form planning and live-data experience while allowing country- and region-specific content, currency and time-zone context.');
const afme = [
  ['Marrakech', '/destinations/marrakech', 'Morocco'],
  ['Cape Town', '/destinations/cape-town', 'South Africa'],
  ['Egypt', '/destinations/egypt', 'Egypt'],
  ['Serengeti', '/destinations/serengeti', 'Tanzania'],
  ['Dubai', '/destinations/dubai', 'United Arab Emirates'],
];
afme.forEach((it, i) => {
  const x = 58 + (i % 2) * 285;
  const y = 168 + Math.floor(i / 2) * 83;
  panel(x, y, 258, 63, { fill: C.cream, stroke: C.line, radius: 13 });
  circle(x + 20, y + 31, 8, [C.rose, C.gold, C.green, C.blue, C.lavender][i]);
  doc.font('SansBold').fontSize(10).fillColor(C.ink).text(it[0], x + 38, y + 14, { width: 190 });
  doc.font('Sans').fontSize(7.1).fillColor(C.inkSoft).text(`${it[2]}  ·  ${it[1]}`, x + 38, y + 32, { width: 199 });
});
imageCover(images.help, 650, 164, 237, 255, { radius: 18, align: 'center', valign: 'center' });
infoCard('REGIONAL CONTEXT', 'Curated templates scale without flattening place', 'The structured content fields let each guide carry its own restaurants, sights, historical framing, seasonal notes, practical data and “Did you know?” facts while preserving consistent wayfinding.', 58, 426, 530, 71, { accent: C.rose });
body('Africa & Middle East guide coverage: Marrakech, Cape Town, Egypt, Serengeti and Dubai.', 650, 443, { color: C.inkSoft, size: 8.4, width: 229, lineGap: 2 });

// 13 — Asia Pacific & Americas
newSlide({ section: 'Destination Guides', sectionColor: C.green });
sectionTitle('12 / Guide coverage — Asia Pacific & Americas', '16 guide routes in the Asia Pacific / Americas data set', 'Together with Europe and Africa / Middle East, this set completes the 33-supported-destination inventory. Individual guide pages can have dynamic values but share the same core editorial sections.');
const apac = [
  'Tokyo', 'Seoul', 'New Zealand', 'Machu Picchu', 'Antarctica', 'Canada', 'United States', 'Maldives',
  'Thailand', 'Malaysia', 'Singapore', 'Indonesia', 'Australia', 'Japan', 'Korea', 'Brazil',
];
apac.forEach((name, i) => {
  const x = 58 + (i % 4) * 145;
  const y = 165 + Math.floor(i / 4) * 47;
  panel(x, y, 130, 34, { fill: C.cream, stroke: C.line, radius: 10 });
  circle(x + 15, y + 17, 4.2, [C.gold, C.green, C.blue, C.rose][i % 4]);
  doc.font('SansBold').fontSize(7.9).fillColor(C.ink).text(name, x + 26, y + 12, { width: 92 });
});
imageCover(images.dream, 680, 165, 207, 188, { radius: 17, align: 'center', valign: 'center' });
quoteCard('The guide library keeps the initial visual dream intact, then adds useful local details, planning guidance, maps and a route back to the request form.', 'DESTINATION EXPERIENCE', 58, 388, 392, 94);
infoCard('COVERAGE NOTE', 'Cards and guides are separately useful', 'The home catalogue is optimized for browsing. The guide page is optimized for deeper understanding and planning — a reusable content pattern rather than a static landing card.', 474, 388, 413, 94, { accent: C.green });

// 14 — Audience
newSlide({ section: 'Public Pages', sectionColor: C.gold });
sectionTitle('13 / Audience page', '“Made for moments that matter”', 'The `/audience` page explains whom NeverBeen serves, makes an inclusive age promise, identifies seven core use cases, lists popular places and turns privacy commitments into six written promises.');
imageCover(images.couples, 58, 163, 205, 274, { radius: 18, align: 'center', valign: 'center' });
imageCover(images.families, 279, 163, 205, 132, { radius: 16, align: 'center', valign: 'center' });
imageCover(images.elders, 279, 309, 205, 128, { radius: 16, align: 'center', valign: 'center' });
smallCaps('SEVEN REASONS PEOPLE COME', 526, 169, { color: C.bronze, size: 7.7, width: 300 });
const audiences = ['Couples', 'Families', 'Birthday gifts', 'Social media show-offs', 'Dream destinations', 'Content creators', 'Old folks'];
let ay = 195;
audiences.forEach((item, i) => {
  circle(535, ay + 5, 4.2, [C.rose, C.gold, C.green, C.blue, C.lavender][i % 5]);
  doc.font('SansBold').fontSize(9.1).fillColor(C.ink).text(item, 549, ay, { width: 165 });
  ay += 25;
});
infoCard('SIX WRITTEN PROMISES', 'Permission and handling are central, not decorative', 'The page names ownership / permission, no deceptive documents or impersonation, service-only processing, customer control, photo verification and a signed model-release agreement.', 526, 377, 361, 105, { accent: C.gold });
body('Closing CTA: “Where have you never been?” with routes back to the home request and pricing sections.', 58, 457, { color: C.inkSoft, size: 8.5, width: 427, lineGap: 2 });

// 15 — Collection
newSlide({ section: 'Public Pages', sectionColor: C.gold });
sectionTitle('14 / Collection page', 'A scrollable wall of 61 travel-photo moments', 'The `/collection` page positions the image library as a phone-like gallery of honeymoons, reunions, birthdays and horizons. Tiles open into a lightbox; the collection is grouped into albums when an album heading is present.');
const mosaic = collectionAssets.slice(0, 16);
mosaic.forEach((img, i) => {
  const col = i % 4;
  const row = Math.floor(i / 4);
  const x = 58 + col * 112;
  const y = 162 + row * 69;
  imageCover(img, x, y, 101, 60, { radius: 8, align: 'center', valign: 'center' });
});
smallCaps('GALLERY BEHAVIOUR', 542, 166, { color: C.bronze, size: 7.5, width: 260 });
checkRow('Photo tiles are labelled with title and accessible description.', 542, 190, 300, { size: 8.7 });
checkRow('Tap / click opens a modal dialog with caption and position.', 542, 217, 300, { size: 8.7 });
checkRow('Previous / next arrows browse without leaving the collection.', 542, 244, 300, { size: 8.7 });
checkRow('Tap outside or choose Close to return to the image wall.', 542, 271, 300, { size: 8.7 });
infoCard('CONTENT PIPELINE', 'Drop-in image collection', 'The project generates a photo manifest from `public/collection`; folder names can become album headings and a captions file can override image labels. The page never needs to be blank because it can fall back to audience imagery.', 542, 322, 345, 137, { accent: C.green });
smallCaps('CLOSING MESSAGE', 58, 452, { color: C.bronze, size: 7.2, width: 155 });
body('“Your photograph can belong in this collection.” The closing CTA routes to Create my vacation or the audience page.', 58, 467, { color: C.inkSoft, size: 8.7, width: 442, lineGap: 2 });

// 16 — Founder
newSlide({ section: 'Public Pages', sectionColor: C.gold });
sectionTitle('15 / Founder page', 'A profile of the platform creator', 'The `/founder` page gives the brand a named author: Kingshuk, presented as a Senior Software Engineer and founder of NeverBeen, followed by background facts and an extensive expertise inventory.');
imageContain(images.founder, 58, 157, 236, 301, { radius: 18, bg: C.paper });
smallCaps('FOUNDER DETAILS', 326, 163, { color: C.bronze, size: 7.6, width: 210 });
title('Kingshuk', 326, 183, { color: C.forest, size: 31, width: 300 });
body('Senior Software Engineer and founder of NeverBeen', 326, 225, { color: C.bronze, size: 10.2, width: 330, font: 'SansBold', lineGap: 2 });
body('The profile combines a creator statement with experience in software development, requirements and database modelling, application architecture, and customer-facing delivery.', 326, 261, { color: C.inkSoft, size: 9.2, width: 310, lineGap: 2.4 });
infoCard('BIOGRAPHICAL FACTS', 'Nationality, gender, date of birth and education', 'The page includes Indian nationality, male gender, date of birth, and a B.Tech in Computer Science and Engineering from Heritage Institute of Technology, Kolkata.', 326, 335, 268, 126, { accent: C.gold });
infoCard('EXPERTISE GRID', 'Nine engineering / technology domains', 'Architecture & development; frontend; database; integration & testing; cloud & version control; tools & IDE; services / APIs; performance tuning; and artificial intelligence.', 620, 163, 267, 198, { accent: C.green });
quoteCard('“I believe in Creativity, Future Proof Design and Strong Foundation in Programming.”', 'FOUNDER PROFILE', 620, 385, 267, 76, { fill: C.forest, quoteColor: C.paper, accent: C.gold });

// 17 — Travel feeds
newSlide({ section: 'Public Pages', sectionColor: C.blue });
sectionTitle('16 / Travel Feeds page', 'A searchable “Trending Destinations News” board', 'The `/travel-feeds` page gives users a live-feed-shaped destination search. It combines destination context, source-status reporting, category-labelled articles, open-licensed photography, a rotating trends board, and compact flight / hotel search modals.');
browserFrame(58, 162, 440, 276, '/travel-feeds', { accent: C.blue, content: C.paper });
smallCaps('LIVE PUBLIC TRAVEL FEEDS', 83, 207, { color: C.blue, size: 6.7, width: 184 });
title('Trending Destinations News', 83, 221, { color: C.ink, size: 20, width: 270 });
panel(83, 264, 284, 28, { fill: C.white, stroke: C.line, radius: 10 });
body('Search a destination — try Kyoto or Iceland', 96, 274, { color: C.inkSoft, size: 7.1, width: 218, lineGap: 0 });
pill('SUBMIT', 375, 268, { fill: C.blue, textColor: C.white, size: 6.7, height: 20, padX: 8, stroke: C.blue });
['Kyoto', 'Iceland', 'Maldives', 'Hanoi'].forEach((p, i) => pill(p, 83 + i * 60, 310, { fill: C.cloud, textColor: C.forest, size: 5.7, height: 16, padX: 7 }));
infoCard('SEARCH RESULT', 'A destination profile plus sources', 'A searched place can show a summary, weather, public-feed articles grouped as Travel, Weather, News, Sports, Culture or Local, Commons photography and a source-status list.', 532, 163, 355, 118, { accent: C.blue });
infoCard('TRENDS BOARD', 'Auto-refresh UI every 30 seconds', 'The idle state ranks destinations, displays reads and weather when available, and lets a visitor use a trend card as a search shortcut. The board paginates 12 seeded entries in groups of three.', 532, 302, 355, 118, { accent: C.green });
body('The page also provides “Plan your trip” cards. Flight and hotel forms use a Skyscanner-style interface and generate sample options within the page rather than completing a booking transaction.', 58, 464, { color: C.inkSoft, size: 8.6, width: 829, lineGap: 2.2 });

// 18 — Feedback
newSlide({ section: 'Public Pages', sectionColor: C.rose });
sectionTitle('17 / Feedback page', 'A direct studio-feedback channel', 'The `/feedback` page asks for appreciation, testimonials, improvement ideas, queries, grievances and reviews. It uses a validated form and prepares a prefilled WhatsApp message instead of publishing feedback publicly.');
infoCard('INTAKE', 'What the visitor can submit', 'Name, email, a required feedback type, and required notes. The notes field presents a visible character counter and limit state; the page asks for request reference, order date, destination/package and helpful screenshots.', 58, 165, 264, 175, { accent: C.rose });
infoCard('ROUTING', 'What happens on submit', 'When the form is valid, a new WhatsApp tab is opened with the message ready to send. A success state recaps the sender, email and feedback type and offers a direct link if a browser blocked the popup.', 349, 165, 264, 175, { accent: C.green });
infoCard('SERVICE STANDARD', 'How response is framed', 'The page says urgent queries and grievances are prioritized, usually within a working day. It also links to the home contact form, FAQ and founder profile for alternate paths.', 640, 165, 247, 175, { accent: C.gold });
quoteCard('“Nothing is posted publicly, and no account is created.”', 'FEEDBACK / SUBMIT NOTE', 58, 373, 367, 86, { fill: C.forest, quoteColor: C.paper, accent: C.gold });
imageCover(images.help, 451, 373, 436, 86, { radius: 16, align: 'center', valign: 'center', overlay: { color: C.forest, opacity: 0.18 } });
smallCaps('DIRECT, HUMAN-READ SUPPORT', 474, 401, { color: C.paper, size: 8.5, width: 300 });

// 19 — Help Centre
newSlide({ section: 'Support & Legal', sectionColor: C.blue });
sectionTitle('18 / Help Centre', 'Searchable answers across six community topics', 'The `/help` page is a knowledge base with a photographic hero, free-text search, popular-query shortcuts, category filters, accordion results, context links and a route back to the community sign-in.');
imageCover(images.help, 58, 161, 350, 298, { radius: 18, align: 'center', valign: 'center', overlay: { color: C.forestDeep, opacity: 0.16 } });
smallCaps('HOW CAN WE HELP YOU TODAY?', 82, 187, { color: C.paper, size: 7.2, width: 230 });
panel(82, 214, 278, 29, { fill: C.white, stroke: C.white, radius: 10 });
body('Search help — “sign in”, “delete account”…', 94, 224, { color: C.inkSoft, size: 7.2, width: 234, lineGap: 0 });
const helpCategories = ['Getting started', 'Account & sign-in', 'Community & discussions', 'Memoirs & galleries', 'Privacy & safety', 'Language & translation'];
helpCategories.forEach((item, i) => {
  const x = 449 + (i % 2) * 217;
  const y = 165 + Math.floor(i / 2) * 64;
  panel(x, y, 197, 48, { fill: C.cream, stroke: C.line, radius: 12 });
  circle(x + 18, y + 24, 6, [C.gold, C.green, C.blue, C.rose, C.lavender, C.bronze][i]);
  doc.font('SansBold').fontSize(8.2).fillColor(C.ink).text(item, x + 32, y + 13, { width: 151 });
  body(['Join / profile', 'OAuth / sessions', 'Message Book / reporting', 'Stories / albums', 'Data / account closure', 'Site translation'][i], x + 32, y + 28, { size: 6.7, width: 150, lineGap: 0 });
});
infoCard('ARTICLE LIBRARY', '14 entries with filter and accordion behavior', 'Answers cover joining, profile basics, Google/Facebook sign-in, session expiry, Message Book, reporting, memoirs, galleries, privacy, account deletion, language switching, translation fallbacks, browser support and human contact.', 449, 375, 438, 84, { accent: C.blue });
smallCaps('SIDEBAR PATHS', 58, 475, { color: C.bronze, size: 7.2, width: 140 });
body('Contact support · FAQ · Privacy Policy · Terms & Condition · Community sign-in · Founder.', 58, 490, { color: C.inkSoft, size: 8.3, width: 780, lineGap: 1.5 });

// 20 — Privacy
newSlide({ section: 'Support & Legal', sectionColor: C.blue });
sectionTitle('19 / Privacy Policy', '“Your memories stay yours”', 'The `/privacy` page treats privacy as part of the community product. A hero, three high-level promises and a sticky on-page table of contents lead to eight plain-language sections.');
imageCover(images.privacyHero, 58, 161, 302, 297, { radius: 18, align: 'center', valign: 'center', overlay: { color: C.forestDeep, opacity: 0.22 } });
smallCaps('PRIVACY POLICY', 82, 191, { color: C.gold, size: 8, width: 160 });
title('Your memories\nstay yours', 82, 210, { color: C.white, size: 28, width: 210 });
const privacyTopics = [
  'Information collected', 'How information is used', 'Photographs & memoirs', 'Cookies & tokens',
  'When data is shared', 'Member rights', 'Security', 'Contact / requests',
];
privacyTopics.forEach((topic, i) => {
  const x = 401 + (i % 2) * 234;
  const y = 164 + Math.floor(i / 2) * 49;
  panel(x, y, 215, 35, { fill: C.cream, stroke: C.line, radius: 11 });
  doc.font('SansBold').fontSize(7.5).fillColor(C.bronze).text(String(i + 1).padStart(2, '0'), x + 12, y + 12, { width: 16 });
  doc.font('SansBold').fontSize(8.1).fillColor(C.ink).text(topic, x + 35, y + 12, { width: 164 });
});
infoCard('STATED CONTROLS', 'No sale of personal information; user controls', 'Highlights name encrypted authentication, no broker / data sale, and account-level abilities to download or delete a profile, memoirs and galleries. The page says image deletion ends the hosting licence and rolling backups expire within 30 days.', 401, 381, 486, 77, { accent: C.green });
smallCaps('LEGAL PRESENTATION', 58, 475, { color: C.bronze, size: 7.2, width: 150 });
body('Hero chips describe a plain-language summary and GDPR / CCPA friendly positioning. The page routes to Help Centre or Feedback for specific requests.', 58, 490, { color: C.inkSoft, size: 8.3, width: 800, lineGap: 1.5 });

// 21 — Terms
newSlide({ section: 'Support & Legal', sectionColor: C.blue });
sectionTitle('20 / Terms & Condition', '“The rules of the trail”', 'The `/terms` page is a human-readable community agreement. A trail-themed hero, three short agreements and a table of contents introduce nine legal and behavioural sections.');
imageCover(images.terms, 58, 160, 304, 298, { radius: 18, align: 'center', valign: 'center', overlay: { color: C.forestDeep, opacity: 0.26 } });
smallCaps('TERMS & CONDITION', 81, 190, { color: C.gold, size: 7.8, width: 180 });
title('The rules\nof the trail', 81, 210, { color: C.white, size: 29, width: 210 });
const termCards = [
  ['Be genuine', 'One honest member; no fake engagement or bots.'],
  ['Share your own', 'Post content you have the right to share.'],
  ['Keep it hospitable', 'No harassment, spam or hostile behaviour.'],
];
termCards.forEach((item, i) => infoCard('SHORT VERSION', item[0], item[1], 402 + (i % 2) * 242, 162 + Math.floor(i / 2) * 103, i === 2 ? 485 : 222, 82, { accent: [C.green, C.gold, C.rose][i] }));
const termTopics = ['Acceptance', 'Account', 'Acceptable use', 'Your content', 'Plans & billing', 'NeverBeen rights', 'Termination', 'Disclaimers', 'Governing law / contact'];
body(termTopics.map((t, i) => `${i + 1}. ${t}`).join('   •   '), 402, 412, { color: C.inkSoft, size: 7.5, width: 485, lineGap: 2 });
smallCaps('KEY MODEL', 402, 455, { color: C.bronze, size: 7.2, width: 100 });
body('Core community features are described as free; optional paid studio plans are governed by the displayed checkout terms. The page defines account conduct, content ownership/licence, moderation, account closure and legal contact routes.', 402, 470, { color: C.inkSoft, size: 8.3, width: 485, lineGap: 2 });

// 22 — Community Connect
newSlide({ bg: C.slate, section: 'Community', sectionColor: C.blue });
sectionTitle('21 / Community entry', 'Connect account', 'The `/community` root is a community-specific shell whose default page is a compact sign-in / connection card. It deliberately replaces the main marketing header with social shortcuts and a theme-picker slot.', { color: C.paper, kickerColor: '#9fb6c1', width: 810 });
panel(252, 145, 456, 302, { fill: C.paper, stroke: '#496579', radius: 20 });
smallCaps('NEVERBEEN COMMUNITY', 279, 173, { color: C.blue, size: 8.4, width: 230 });
title('Connect with travellers', 279, 194, { color: C.ink, size: 26, width: 302 });
body('Choose a secure identity-provider path, explore as a guest, or use the visible new/existing-member simulation selector when enabled.', 279, 237, { color: C.inkSoft, size: 9.4, width: 320, lineGap: 2.3 });
panel(279, 283, 347, 41, { fill: C.white, stroke: C.line, radius: 11 });
doc.font('SansBold').fontSize(10).fillColor(C.ink).text('G   Continue with Google', 301, 298, { width: 240 });
rule(279, 343, 626, 343, C.line, 0.6);
body('Guest option: browse community content without an account. Footer: Privacy · Terms & Condition · Help · Return to NeverBeen Home.', 279, 359, { color: C.inkSoft, size: 8.1, width: 335, lineGap: 2 });
smallCaps('ENTRY PAGE FEATURES', 58, 171, { color: '#9fb6c1', size: 7.7, width: 155 });
bulletList([
  'Language selector designed to translate the full site, with the setting remembered for future visits.',
  'Provider buttons are content-managed and can show loading and manual-provider help states.',
  'Security footnote states that authentication is encrypted and secure.',
], 58, 199, 163, { color: C.sandDeep, size: 8.2, bulletColor: C.gold, gap: 12, lineGap: 2 });
smallCaps('COMMUNITY HEADER', 734, 171, { color: '#9fb6c1', size: 7.7, width: 160 });
bulletList([
  'Back-to-site brand link.',
  'Traveller / circle search on wide screens.',
  'Journey, notifications and messenger shortcuts.',
  'Theme picker at upper right.',
], 734, 199, 153, { color: C.sandDeep, size: 8.2, bulletColor: C.green, gap: 10, lineGap: 2 });

// 23 — Registration
newSlide({ section: 'Community', sectionColor: C.blue });
sectionTitle('22 / Community registration', 'A verified member profile starts with a required form', 'The `/community/register` route uses a responsive travel-scene background. The registration card asks for a small portrait and mandatory identity / geography fields before creating a NeverBeen account.');
imageCover(images.register, 58, 159, 390, 302, { radius: 18, align: 'center', valign: 'center', overlay: { color: C.forestDeep, opacity: 0.18 } });
panel(95, 187, 316, 235, { fill: C.paper, stroke: C.line, radius: 16 });
smallCaps('NEW MEMBER REGISTRATION', 118, 209, { color: C.bronze, size: 7.2, width: 180 });
title('Create NeverBeen Account', 118, 225, { color: C.ink, size: 19, width: 230 });
body('Profile photo · name · surname · email · country → state → city · gender · date of birth', 118, 263, { color: C.inkSoft, size: 8.7, width: 250, lineGap: 2.1 });
panel(118, 343, 229, 28, { fill: C.forest, stroke: C.forest, radius: 10 });
doc.font('SansBold').fontSize(7.6).fillColor(C.paper).text('CREATE NEVERBEEN ACCOUNT  →', 133, 353, { width: 200, align: 'center' });
body('Free forever · Verified community · your photo stays private until approved', 118, 389, { color: C.inkSoft, size: 6.8, width: 252, lineGap: 1 });
infoCard('PHOTO RULE', 'Portrait upload is required', 'The screen accepts JPEG / PNG / JPG and explicitly presents a 200 KB maximum for the initial community profile photograph.', 488, 164, 186, 122, { accent: C.rose });
infoCard('CASCADE', 'Location selections are progressive', 'Country drives the state list; state drives the city list. The page shows supporting guidance before each dependent list is available.', 700, 164, 187, 122, { accent: C.blue });
infoCard('FORM BEHAVIOUR', 'Inline validation and submission state', 'All fields are required. Invalid fields display specific guidance; the primary button changes to “Creating Account…” while submission is active.', 488, 307, 399, 154, { accent: C.green });

// 24 — Profile dashboard
newSlide({ section: 'Community', sectionColor: C.blue });
sectionTitle('23 / Community profile', 'A multi-tool member dashboard', 'The community profile is the densest application screen. It combines a search surface, a personal side panel, a wide functional area, visitor-view modes and responsive mobile navigation.');
browserFrame(58, 157, 472, 295, '/community/profile', { fill: C.cream, content: C.paper, accent: C.blue });
rect(63, 190, 143, 257, '#e8f0ec');
imageContain(images.founder, 84, 205, 92, 100, { radius: 46, bg: C.paper });
smallCaps('KINGS HUK', 81, 319, { color: C.forest, size: 6.4, width: 104, align: 'center' });
['About me', 'Journey', 'Gallery', 'Games', 'Message Book', 'Companions', 'Circles', 'Followers', 'Messenger', 'Notifications', 'Settings'].forEach((label, i) => {
  const yy = 341 + i * 9;
  doc.font(i === 1 ? 'SansBold' : 'Sans').fontSize(5.7).fillColor(i === 1 ? C.forest : C.inkSoft).text(label, 82, yy, { width: 100 });
});
smallCaps('JOURNEY', 232, 210, { color: C.bronze, size: 7.5, width: 120 });
rect(232, 232, 260, 8, C.sandDeep); rect(232, 250, 194, 6, C.sandDeep); rect(232, 271, 238, 84, C.cloud); rect(232, 366, 240, 6, C.sandDeep); rect(232, 380, 201, 6, C.sandDeep);
infoCard('PERSONAL IDENTITY', 'Cover, avatar, profile state and quick stats', 'The sidebar supports cover / avatar changes, active-status selection, companion / circle / journey-post counts, follower counts, a public-or-locked profile pill and a visitor-preview action.', 570, 161, 317, 116, { accent: C.gold });
infoCard('SOCIAL NAVIGATION', 'Eleven application sections', 'About me, Journey, Gallery, Games, Message Book, Companions, Circles, Followers, Messenger, Notifications and Settings are presented as section controls in the profile interface.', 570, 299, 317, 116, { accent: C.blue });
body('Top-level profile search is designed for travellers, companions and circles. On mobile, navigation becomes a hamburger-triggered drawer; the interface preserves avatar access and the current profile section in the compact header.', 58, 473, { color: C.inkSoft, size: 8.5, width: 829, lineGap: 2 });

// 25 — Message Book
newSlide({ section: 'Community', sectionColor: C.blue });
sectionTitle('24 / Community Message Book', 'A shared discussion stream with replies and reactions', 'The `/community/message-book` route is the public community guestbook. Guests may read, while authenticated members can post, reply, react and delete their own contributions.');
const postX = 58;
panel(postX, 162, 512, 284, { fill: C.cream, stroke: C.line, radius: 18 });
smallCaps('NEVERBEEN COMMUNITY', postX + 22, 184, { color: C.bronze, size: 7.5, width: 170 });
title('Community Message Book', postX + 22, 201, { color: C.ink, size: 21, width: 290 });
panel(postX + 22, 242, 468, 63, { fill: C.white, stroke: C.line, radius: 12 });
body('Share your travel experiences, questions, or tips…', postX + 36, 257, { color: C.inkSoft, size: 8.2, width: 300, lineGap: 1 });
pill('POST TO MESSAGE BOOK', postX + 330, 272, { fill: C.forest, textColor: C.paper, size: 6.4, height: 20, padX: 8, stroke: C.forest });
panel(postX + 22, 321, 468, 97, { fill: C.paper, stroke: C.line, radius: 12 });
circle(postX + 46, 347, 12, C.blue);
doc.font('SansBold').fontSize(8.4).fillColor(C.ink).text('Verified Traveler', postX + 68, 337, { width: 170 });
body('A destination tip, experience or question appears here as a threaded discussion item.', postX + 68, 353, { color: C.inkSoft, size: 7.7, width: 303, lineGap: 1.5 });
body('Like   ·   Dislike   ·   Reply', postX + 68, 389, { color: C.bronze, size: 7.2, width: 190, lineGap: 0 });
infoCard('GUEST MODE', 'Readable without authentication', 'An unauthenticated composer becomes an invitation to connect. The page promises that visitors can read messages freely and need an account to post, comment, reply or react.', 608, 164, 279, 110, { accent: C.gold });
infoCard('POST MODEL', 'Threaded, attributed and controllable', 'Cards include author avatar, name, optional profession, time, post text, reaction counts, reply count and nested reply composer. A hover card can preview a member profile.', 608, 294, 279, 124, { accent: C.blue });
body('The composer enforces a 2,000-character limit. Post actions remain conditional on authentication and ownership.', 58, 468, { color: C.inkSoft, size: 8.4, width: 829, lineGap: 2 });

// 26 — Community callback & support
newSlide({ section: 'Community', sectionColor: C.blue });
sectionTitle('25 / Community hand-offs and personalisation', 'OAuth callback, themes, language and support routes', 'Not all community routes are content pages. Several protect the flow between identity-provider authentication, registration, profile completion, visual personalisation and self-service support.');
infoCard('OAUTH CALLBACK', '/community/callback', 'Shows a connecting / validating state; exchanges the provider code with the application; then redirects a complete profile to Community Profile or a new member to Registration. An error state returns to Connect.', 58, 165, 255, 147, { accent: C.blue });
infoCard('THEME SYSTEM', 'Community theme picker', 'The community header includes a theme-picker slot. The project ships a broad theme collection — travel classic, mountain escape, ocean breeze, city explorer and many playful themed scenes.', 335, 165, 255, 147, { accent: C.lavender });
infoCard('LANGUAGE', 'Site translation selector', 'The sign-in card can expose a multilingual dropdown. Help documentation says the selection translates navigation, pages and footer and preserves the choice; fallback English remains if the translation service is unavailable.', 612, 165, 275, 147, { accent: C.green });
infoCard('ALIAS ROUTES', 'Shortcuts and redirects', 'The app exposes `/profile` as a direct profile page, supports `/community/profile`, and redirects `/community/messages` to `/community/message-book` so conversations retain one canonical destination.', 58, 341, 373, 112, { accent: C.gold });
infoCard('SUPPORT NET', 'Legal and help surround participation', 'The community sign-in footer links Privacy, Terms & Condition and Help. Support pages cross-link back to community sign-in, Feedback and founder information instead of stranding the visitor.', 457, 341, 430, 112, { accent: C.rose });
smallCaps('FLOW PRINCIPLE', 58, 476, { color: C.bronze, size: 7.2, width: 130 });
body('Authentication is designed as an explicit stateful journey: entry → provider → callback → register or profile → discussions and personal spaces.', 58, 491, { color: C.inkSoft, size: 8.4, width: 780, lineGap: 1.8 });

// 27 — Admin entry
newSlide({ section: 'Private Operations', sectionColor: C.rose });
sectionTitle('26 / Admin entry', 'Restricted administration and volunteer intake', 'The `/login` route is not a public customer login. It is an Admin Console sign-in page with a separate “Join as a Volunteer Admin” application path. The admin route tree is guarded and redirects unauthenticated users here.');
panel(260, 145, 440, 301, { fill: C.paper, stroke: C.line, radius: 20 });
circle(480, 181, 22, C.forest);
smallCaps('NEVERBEEN ADMINISTRATION', 315, 219, { color: C.bronze, size: 7.5, width: 330, align: 'center' });
title('Admin Console', 316, 238, { color: C.ink, size: 29, width: 328, align: 'center' });
body('Restricted access for administrators — manage members, travel galleries, content and community operations.', 326, 281, { color: C.inkSoft, size: 8.6, width: 308, align: 'center', lineGap: 2 });
panel(311, 327, 338, 32, { fill: C.white, stroke: C.line, radius: 9 });
body('Admin Username', 326, 338, { color: C.inkSoft, size: 8.2, width: 130, lineGap: 0 });
panel(311, 369, 338, 32, { fill: C.white, stroke: C.line, radius: 9 });
body('Password', 326, 380, { color: C.inkSoft, size: 8.2, width: 130, lineGap: 0 });
pill('SIGN IN TO ADMIN CONSOLE', 381, 414, { fill: C.forest, textColor: C.paper, size: 6.7, height: 20, padX: 10, stroke: C.forest });
infoCard('VOLUNTEER PATH', 'Application instead of access', 'The alternate view requires full name, email, a strong password and a resume attachment (PDF, DOC or DOCX, with the page showing a 2 MB maximum). A confirmation view promises review in 5–7 business days.', 58, 170, 164, 226, { accent: C.rose });
infoCard('GUARD', 'Unauthenticated admin URLs do not expose tools', 'The admin route configuration checks an AdminAuthService state. If the visitor is not authenticated, navigation to `/admin` and its child routes resolves to `/login`.', 738, 170, 149, 226, { accent: C.gold });

// 28 — Admin modules
newSlide({ section: 'Private Operations', sectionColor: C.rose });
sectionTitle('27 / Admin Console coverage', 'A guarded operations suite behind `/admin`', 'The detailed internal interface is access-controlled, but its route map shows the operational scope of the application. This slide records the modules rather than presenting protected customer data.');
const adminGroups = [
  ['DASHBOARD & SAFETY', ['Dashboard', 'All / verified / online members', 'Abuse reports', 'Identity checks', 'Identity document viewer']],
  ['COMMUNICATIONS', ['Mail inbox / sent / compose', 'Announcements', 'Announcement composer', 'WhatsApp dock']],
  ['USER & DATA', ['Users', 'Data management', 'Backup / restore', 'Data explorer', 'Privacy requests']],
  ['SITE OPERATIONS', ['Website management', 'Maintenance', 'Health dashboard', 'Health report', 'Repositories placeholder']],
];
adminGroups.forEach((group, i) => {
  const x = 58 + (i % 2) * 418;
  const y = 162 + Math.floor(i / 2) * 157;
  panel(x, y, 390, 132, { fill: C.cream, stroke: C.line, radius: 16 });
  rect(x, y, 390, 5, [C.rose, C.gold, C.blue, C.green][i]);
  smallCaps(group[0], x + 19, y + 20, { color: C.bronze, size: 7.4, width: 325 });
  group[1].forEach((entry, r) => {
    circle(x + 23, y + 49 + r * 15, 3.1, [C.rose, C.gold, C.blue, C.green][i]);
    doc.font('Sans').fontSize(8.1).fillColor(C.inkSoft).text(entry, x + 34, y + 45 + r * 15, { width: 324 });
  });
});
body('Admin child routes also route to a full-page health report and a secure identity-document viewer. Unknown admin paths return to the dashboard. The route tree explicitly marks Repositories as not built yet.', 58, 480, { color: C.inkSoft, size: 8.5, width: 828, lineGap: 2 });

// 29 — Shared navigation / visuals
newSlide({ section: 'Cross-site System', sectionColor: C.green });
sectionTitle('28 / Shared navigation and visual system', 'A warm travel-editorial system with responsive behavior', 'The application centralises a distinctive palette — paper / sand, forest, bronze and gold — and uses serif display type, a clean sans-serif body font, rounded controls, photographs and content cards to carry the brand across very different pages.');
panel(58, 165, 313, 245, { fill: C.cream, stroke: C.line, radius: 17 });
smallCaps('MARKETING NAV', 79, 188, { color: C.bronze, size: 7.5, width: 160 });
['Brand logo → Home', 'Route / fragment links', 'Menu collapses on smaller screens', 'Active link styling', 'Footer mirrors service, visit, support'].forEach((item, i) => checkRow(item, 79, 213 + i * 30, 254, { size: 8.7 }));
panel(401, 165, 232, 245, { fill: C.forest, stroke: C.forest, radius: 17 });
smallCaps('CORE TOKENS', 423, 189, { color: C.gold, size: 7.5, width: 170 });
const swatches = [[C.sand, 'Sand'], [C.paper, 'Paper'], [C.forest, 'Forest'], [C.bronze, 'Bronze'], [C.gold, 'Gold']];
swatches.forEach((swatch, i) => {
  circle(430, 222 + i * 31, 9, swatch[0], i < 2 ? C.line : swatch[0], 0.5);
  doc.font('SansBold').fontSize(8.4).fillColor(C.paper).text(swatch[1], 448, 217 + i * 31, { width: 120 });
});
panel(663, 165, 224, 245, { fill: C.cream, stroke: C.line, radius: 17 });
smallCaps('COMMUNITY NAV', 684, 188, { color: C.bronze, size: 7.5, width: 160 });
['Distinct community header', 'Desktop community search', 'Journey / notifications / messenger', 'Theme picker', 'Mobile page-level navigation'].forEach((item, i) => checkRow(item, 684, 213 + i * 30, 178, { size: 8.5, mark: C.blue }));
infoCard('CONTENT CONFIGURATION', 'Home sections and some navigation / copy are CMS-aware', 'Home section ordering / visibility, hero buttons, footer columns, FAQ and pricing records are accessed through a site-configuration service. This provides editorial control without changing the page scaffolding.', 58, 436, 829, 58, { accent: C.green });

// 30 — User journeys
newSlide({ bg: C.forest, section: 'Cross-site System', sectionColor: C.green });
sectionTitle('29 / Three core journeys', 'How the pages work together', 'The strongest way to understand the website is as three linked journeys: commissioning a creative service, researching a dream location and joining a moderated travel community.', { color: C.paper, kickerColor: C.gold, width: 810 });
const journeys = [
  { name: 'STUDIO REQUEST', color: C.gold, steps: ['Hero / Audience', 'Destination / Gallery', 'Price selection', 'Contact brief', 'Verification & delivery'] },
  { name: 'DESTINATION DISCOVERY', color: '#85a691', steps: ['Destination grid', 'Individual guide', 'Live / local context', 'Plan a visit', 'Return to request'] },
  { name: 'COMMUNITY PARTICIPATION', color: '#9fb6c1', steps: ['Connect / guest', 'OAuth callback', 'Register or profile', 'Post / react / share', 'Help / legal controls'] },
];
journeys.forEach((journey, j) => {
  const y = 177 + j * 101;
  smallCaps(journey.name, 58, y, { color: journey.color, size: 7.8, width: 180 });
  journey.steps.forEach((step, i) => {
    const x = 58 + i * 160;
    panel(x, y + 25, 140, 41, { fill: '#304438', stroke: '#587060', radius: 12 });
    circle(x + 15, y + 45, 5.4, journey.color);
    doc.font('SansBold').fontSize(7.2).fillColor(C.paper).text(step, x + 27, y + 40, { width: 100 });
    if (i < journey.steps.length - 1) {
      doc.save(); doc.strokeColor('#70877a').lineWidth(1).moveTo(x + 142, y + 45).lineTo(x + 157, y + 45).stroke(); doc.restore();
    }
  });
});
quoteCard('“Where have you never been?” connects all three journeys.', 'CROSS-SITE CTA', 58, 451, 829, 44, { fill: '#304438', quoteColor: C.paper, accent: C.gold });

// 30 — Community feature map
newSlide({ bg: C.slate, section: 'Community Deep Dive', sectionColor: C.blue });
sectionTitle('30 / Community feature map', 'A complete social travel workspace, not a single feed', 'The Community profile is a multi-surface application. It centralises identity, publishing, private communication, social graphs, playful experiences, safety controls and storage hygiene behind one responsive member dashboard.', { color: C.paper, kickerColor: '#9fb6c1', width: 810 });
const communityAreas = [
  ['PROFILE', 'About Me', 'Eight detailed biographical sections, travel story, editable fields and visitor view.'],
  ['PUBLISH', 'Journey + Gallery', 'Posts, media, hashtags, audience selection, albums, captions and privacy.'],
  ['CONNECT', 'Companions + follows', 'Requests, suggestions, mutuals, followers, following and profile preview.'],
  ['CONVERSE', 'Message Book + Messenger', 'Shared discussions, replies, reactions, direct chats and circle chat.'],
  ['PLAY', 'Games + Birthdays', 'Travel-play hub, browser chess, Ludo, puzzles, celebrations and reminders.'],
  ['CONTROL', 'Notifications + Settings', 'Status, devices, profile lock, safety, preferences and storage reporting.'],
];
communityAreas.forEach((area, index) => {
  const x = 58 + (index % 3) * 271;
  const y = 174 + Math.floor(index / 3) * 124;
  panel(x, y, 245, 99, { fill: '#2f4050', stroke: '#556b7c', radius: 16 });
  circle(x + 22, y + 23, 9, [C.gold, '#77a8c3', '#88ab93', '#d49b8b', '#c6b2de', '#a4c6be'][index]);
  smallCaps(area[0], x + 40, y + 17, { color: C.gold, size: 7.1, width: 170 });
  doc.font('SansBold').fontSize(11).fillColor(C.paper).text(area[1], x + 18, y + 42, { width: 208 });
  body(area[2], x + 18, y + 62, { color: C.sandDeep, size: 7.9, width: 205, lineGap: 1.7 });
});
quoteCard('The profile is the member’s home base — designed to work as a wide dashboard or a compact mobile drawer.', 'COMMUNITY INFORMATION ARCHITECTURE', 58, 440, 829, 52, { fill: '#2f4050', quoteColor: C.paper, accent: C.gold });

// 31 — Community publishing & conversations
newSlide({ section: 'Community Deep Dive', sectionColor: C.blue });
sectionTitle('31 / Community publishing & conversations', 'Journey, albums and threaded discussion', 'The Community focuses on travel storytelling. Members can publish a Journey post, shape an audience, organise a gallery, and take part in both the shared Message Book and private conversations.');
infoCard('JOURNEY', 'A social travel feed with publishing controls', 'The composer supports text, hashtags, images, videos, post audiences, editable posts, share flows and reaction / reply interactions. Public posts can be filtered by hashtag and member visibility.', 58, 166, 250, 179, { accent: C.blue });
infoCard('VACATION GALLERY', 'Albums, captions and audience choices', 'Gallery users can create albums, open an album viewer, add / reorder photos, caption content and set an album to Public, Companions or Only me. Storage tooling can identify gallery content later.', 331, 166, 250, 179, { accent: C.gold });
infoCard('MESSAGE BOOK', 'A community guestbook with threads', 'Guests can read; signed-in members can post up to 2,000 characters, reply in a thread, like, dislike and manage eligible contributions. Member hover cards reveal a lightweight profile preview.', 604, 166, 283, 179, { accent: C.green });
panel(58, 376, 829, 87, { fill: C.cream, stroke: C.line, radius: 16 });
smallCaps('PRIVATE CONVERSATION LAYER', 81, 397, { color: C.bronze, size: 7.4, width: 230 });
doc.font('SansBold').fontSize(13).fillColor(C.ink).text('Messenger and Circle chat turn connections into ongoing travel conversations.', 81, 415, { width: 540 });
body('Messenger separates pending, online and offline companions; Circles provide named member groups, group membership, settings, add-people flows and a saved-chat path. The community header exposes a direct Messenger shortcut and unread badge.', 81, 437, { color: C.inkSoft, size: 8.7, width: 731, lineGap: 2 });

// 32 — Community relationships & play
newSlide({ section: 'Community Deep Dive', sectionColor: C.blue });
sectionTitle('32 / Community relationships, presence & play', 'The spaces around the feed', 'Member engagement is more than publishing. The dashboard exposes relationships, presence and travel-themed activities so community interaction can feel social before a message is written.');
const socialFeatures = [
  ['Companions', 'Send, accept or cancel requests; browse suggestions, pending requests, mutual companions and connected member cards.'],
  ['Followers / following', 'Open dedicated lists, see counts from the side panel and preview a relationship from a visitor profile.'],
  ['Circles', 'Create a circle, manage membership, open a circle chat, edit the circle and save a chat as a circle.'],
  ['Presence', 'Choose active status, show online state, view online companions and display notification / chat badges.'],
  ['Birthdays', 'Celebrate upcoming birthdays and review a dedicated belated-birthdays period.'],
  ['Games', 'A NeverBeen Play hub includes photo puzzle options, Ludo with AI opponents and difficulty settings, plus browser-local Stockfish chess.'],
];
socialFeatures.forEach((feature, index) => {
  const x = 58 + (index % 2) * 413;
  const y = 161 + Math.floor(index / 2) * 95;
  panel(x, y, 385, 76, { fill: C.cream, stroke: C.line, radius: 14 });
  circle(x + 21, y + 21, 8, [C.blue, C.gold, C.green, C.rose, C.lavender, C.bronze][index]);
  doc.font('SansBold').fontSize(10).fillColor(C.ink).text(feature[0], x + 37, y + 14, { width: 305 });
  body(feature[1], x + 18, y + 35, { color: C.inkSoft, size: 7.8, width: 347, lineGap: 1.5 });
});
body('Visitor profiles preserve the same content vocabulary — identity, About information, gallery and Journey posts — while respecting locked-profile and companions-only gates.', 58, 472, { color: C.inkSoft, size: 8.5, width: 829, lineGap: 2 });

// 33 — Community personal controls
newSlide({ section: 'Community Deep Dive', sectionColor: C.blue });
sectionTitle('33 / Community profile, privacy & personal controls', 'Detailed identity, safety and account hygiene', 'The member dashboard deliberately gives a traveller control over what they show, how they can be reached, which devices are active, how they are matched and how much local storage their content uses.');
infoCard('ABOUT ME', 'Eight editable personal sections', 'Intro & Travel Story; Personal Details; detailed Work Experience; Education; Hobbies; Interests; Contact Info; and About the Person. The same structure can be rendered to a visitor in a controlled view.', 58, 166, 262, 165, { accent: C.gold });
infoCard('PRIVACY & PROFILE LOCK', 'Choose the gate around personal content', 'Settings include a public-versus-locked profile state, companions-only access gates, contact and sharing controls, user blocking, and abuse-report workflows from content and profile contexts.', 349, 166, 262, 165, { accent: C.rose });
infoCard('SETTINGS & MATCHING', 'Status, devices, travel style and alerts', 'The settings panel presents devices used, travel styles and matchmaking, notification-channel choices, profile control and a blocked-users list. It is a practical operations panel for the member.', 640, 166, 247, 165, { accent: C.blue });
infoCard('STORAGE', 'A transparent content-footprint view', 'Storage reports usage as a ratio and reveals a micro inspector. Members can identify gallery photos and non-default albums that consume space, then remove them to reclaim storage.', 58, 359, 398, 105, { accent: C.green });
infoCard('ACCESSIBILITY & PERSONALISATION', 'Responsive navigation, themes and translation', 'Mobile turns the side navigation into a drawer; the profile supports an alternate visitor view; Community themes can change the visual setting; and translation controls let users choose a remembered display language.', 486, 359, 401, 105, { accent: C.lavender });

// 34 — Admin command centre
newSlide({ bg: C.slate, section: 'Admin Console Deep Dive', sectionColor: C.rose });
sectionTitle('34 / Admin command centre', 'A guarded suite for operational awareness and member safety', 'After protected sign-in, the Admin Console becomes a desktop-style operations environment: side navigation, live-status signals, member visibility, secure actions and a routed work area.', { color: C.paper, kickerColor: '#d49b8b', width: 810 });
const commandAreas = [
  ['DASHBOARD', 'Membership signals, 7-day activity, highlighted Journey posts and abuse reports awaiting review.'],
  ['MEMBERS', 'All, verified and online drill-down lists; user actions can be triggered from safety contexts.'],
  ['ABUSE REPORTS', 'Report triage and decisions to keep community conversations hospitable.'],
  ['IDENTITY CHECKS', 'Identity-verification queue plus guarded full-page document viewer.'],
  ['LIVE OPERATIONS', 'System online / scheduled / down state; visible member count, administrator presence and admin-to-admin mail links.'],
  ['AUDITABLE UI', 'Status pills, pending-change counters, scheduled-announcement cues and routed operation panels provide at-a-glance context.'],
];
commandAreas.forEach((area, index) => {
  const x = 58 + (index % 3) * 271;
  const y = 176 + Math.floor(index / 3) * 116;
  panel(x, y, 245, 91, { fill: '#2f4050', stroke: '#556b7c', radius: 15 });
  circle(x + 21, y + 22, 8, [C.rose, C.gold, '#9fb6c1', '#85a691', '#c6b2de', '#d49b8b'][index]);
  smallCaps(area[0], x + 39, y + 16, { color: C.gold, size: 7.2, width: 170 });
  body(area[1], x + 18, y + 41, { color: C.sandDeep, size: 8, width: 206, lineGap: 1.7 });
});
body('Security boundary: the `/admin` route tree applies an authentication guard, and anonymous navigation is returned to the dedicated Admin Console sign-in page.', 58, 454, { color: C.sandDeep, size: 8.7, width: 829, lineGap: 2 });

// 35 — Admin communications and website management
newSlide({ section: 'Admin Console Deep Dive', sectionColor: C.rose });
sectionTitle('35 / Admin communication & website management', 'Publish, coordinate and shape the visitor experience', 'Operations are not limited to user records. The console contains internal communication tools, announcement delivery tooling, a WhatsApp workspace and a Website Management area backed by a small content-configuration layer.');
infoCard('ADMIN MAIL', 'Inbox, sent mail and compose', 'Private messages between administrators use dedicated Inbox, Sent and Compose routes. The console shows unread counts, drafts and an admin directory to choose recipients.', 58, 165, 251, 154, { accent: C.blue });
infoCard('ANNOUNCEMENTS', 'Targeted publishing with delivery context', 'Administrators can compose notices, review message history and inspect recipient, delivered, opened and clicked counts. Audience views cover region, country, gender and age slices.', 332, 165, 251, 154, { accent: C.rose });
infoCard('WHATSAPP', 'A docked operational channel', 'WhatsApp Web can be opened in the Admin Console workspace after QR sign-in, with dedicated start-chat and privacy / security guidance in the page.', 606, 165, 281, 154, { accent: C.green });
infoCard('WEBSITE MANAGEMENT', 'Draft → preview → publish → revision history', 'Admin editors can manage Home, Community and site-wide components. The system supports a draft / published model, live iframe preview, field reset, publish notes, revisions, rollback, import/export and a visible pending-change count.', 58, 344, 532, 125, { accent: C.gold });
infoCard('CONFIGURABLE SURFACES', 'Editorial control without rewriting components', 'Examples include hero copy and buttons, home section order / visibility, FAQ and pricing data, navigation / footer items, Community connect text and profile feature visibility.', 620, 344, 267, 125, { accent: C.lavender });

// 36 — Admin user & data governance
newSlide({ section: 'Admin Console Deep Dive', sectionColor: C.rose });
sectionTitle('36 / Admin user & data governance', 'Member administration, privacy operations and data stewardship', 'The console makes operational responsibilities explicit: accounts, security, roles, datasets, privacy requests, retention and backup are all surfaced through purpose-built tabs rather than hidden in a generic dashboard.');
const governance = [
  ['USER MANAGEMENT', 'Directory, Roles & permissions, Sessions & security, and Audit log — with user statistics for registrations, active users, verified accounts, 2FA and restricted / disabled states.'],
  ['DATA MANAGEMENT', 'Catalog, Explorer, Privacy requests, Retention, Data quality, Backup & restore and Access log. Summary cards report datasets, record count, storage, request SLA, health score and last backup.'],
  ['PRIVACY REQUESTS', 'Dedicated request tracking aligns the Community privacy promise with administrative handling and an operational queue.'],
  ['DATA QUALITY', 'Health checks and quality indicators make storage / data conditions visible before a problem becomes a member-facing issue.'],
  ['BACKUP & RESTORE', 'Backup creation and restoration belong to the data-management workflow instead of an ad hoc operational process.'],
  ['ACCESS LOG', 'A dedicated audit-facing surface supports accountability around data access and operational changes.'],
];
governance.forEach((area, index) => {
  const x = 58 + (index % 2) * 414;
  const y = 163 + Math.floor(index / 2) * 99;
  panel(x, y, 386, 80, { fill: C.cream, stroke: C.line, radius: 14 });
  circle(x + 21, y + 20, 7.8, [C.rose, C.gold, C.green, C.blue, C.lavender, C.bronze][index]);
  smallCaps(area[0], x + 38, y + 13, { color: C.bronze, size: 7.1, width: 300 });
  body(area[1], x + 18, y + 33, { color: C.inkSoft, size: 7.8, width: 348, lineGap: 1.6 });
});
body('These modules are access-controlled; the documentation describes their designed purpose and navigation structure, never real member data or administrator credentials.', 58, 473, { color: C.inkSoft, size: 8.5, width: 829, lineGap: 2 });

// 37 — Admin reliability & maintenance
newSlide({ section: 'Admin Console Deep Dive', sectionColor: C.rose });
sectionTitle('37 / Admin reliability, health & controlled downtime', 'Protect the site while keeping visitors informed', 'The remaining operational modules turn status into action: health signals expose traffic, performance and storage; maintenance provides a planned downtime workflow; reports and logs support follow-through.');
infoCard('WEBSITE HEALTH', 'Traffic, engagement, storage and performance', 'Charts cover traffic over time, visitor arrival patterns, session origin, top countries, community activity, engagement funnel, retention cohorts, stored data, storage by dataset, page-load time, slow pages, JavaScript errors and resource mix.', 58, 165, 386, 184, { accent: C.green });
infoCard('SITE DOWNTIME', 'Window, visitor message, preview and notification', 'The downtime page sequences a maintenance window, what visitors see, a live preview, a site-wide apply action, notify-me sign-ups and an operations log. The shell exposes live / scheduled / down status.', 472, 165, 415, 184, { accent: C.rose });
infoCard('REPORTING', 'Print-ready Health Report', 'A guarded `/admin/health-report` viewer supports a printable report path in addition to dashboard analytics.', 58, 379, 262, 88, { accent: C.blue });
infoCard('REPOSITORIES', 'Reserved integration surface', 'The navigation includes Repositories for connected Git repositories and integrations; its route is currently represented as an under-development area.', 350, 379, 262, 88, { accent: C.gold });
infoCard('SIGN-OUT & RETURN', 'Clear operational boundaries', 'The admin shell includes administrator identity, a secure sign-out action and a direct Back to Website link, keeping the operational console separate from the public experience.', 642, 379, 245, 88, { accent: C.lavender });

// 38 — Route index primary
newSlide({ section: 'Appendix', sectionColor: C.bronze });
sectionTitle('38 / Page inventory — visitor-facing route index', 'Named pages and canonical locations', 'This index lists all main page routes included in the presentation. Child / alias / redirect routes and the destination-library variants are listed on the following slides.');
const publicRoutes = [
  ['/', 'Home — hero, process, destinations, gallery, pricing, FAQ, founder, contact'],
  ['/audience', 'Audience — use cases, age statement, places and permission promises'],
  ['/collection', 'Collection — 61-image tile gallery / modal viewer'],
  ['/founder', 'Founder — profile, biography and expertise'],
  ['/destinations/:slug', 'Destination guide template — 33 supported instances'],
  ['/travel-feeds', 'Destination news, source status, trends and trip-search modals'],
  ['/feedback', 'WhatsApp-prepared feedback and support form'],
  ['/help', 'Searchable Help Centre — 14 articles across six categories'],
  ['/privacy', 'Privacy Policy — eight sections and rights controls'],
  ['/terms', 'Terms & Condition — nine sections and conduct rules'],
  ['/documentation', 'Documentation Centre — screen-aware PDF viewer and download actions'],
];
publicRoutes.forEach((row, i) => routePill(row[0], row[1], 58 + (i % 2) * 416, 160 + Math.floor(i / 2) * 46, 388, { color: i === 4 ? C.green : C.forest }));
smallCaps('SCOPE', 58, 454, { color: C.bronze, size: 7.2, width: 100 });
body('The global marketing navbar and footer supply the primary cross-links across this group; route-specific back links keep deep pages connected to either Home or Community.', 58, 469, { color: C.inkSoft, size: 8.5, width: 828, lineGap: 2 });

// 39 — Route index community / private
newSlide({ section: 'Appendix', sectionColor: C.bronze });
sectionTitle('39 / Page inventory — community and protected routes', 'Entry states, child pages, aliases and operations', 'The application distinguishes visitor-facing community states from internal administration. The latter is covered for completeness but requires successful admin authentication.');
const communityRoutes = [
  ['/community', 'Community Connect — default community root page'],
  ['/community/register', 'New member registration'],
  ['/community/profile', 'Member dashboard / social profile'],
  ['/profile', 'Direct profile route / same profile feature'],
  ['/community/message-book', 'Community discussion stream'],
  ['/community/messages', 'Redirects to Message Book'],
  ['/community/callback', 'OAuth exchange / stateful redirect page'],
  ['/login', 'Admin Console sign-in + volunteer application'],
  ['/admin', 'Protected Admin Console — child modules'],
  ['/admin/health-report', 'Protected print-ready health report'],
];
communityRoutes.forEach((row, i) => routePill(row[0], row[1], 58 + (i % 2) * 416, 160 + Math.floor(i / 2) * 55, 388, { color: i >= 7 ? C.rose : C.blue }));
smallCaps('AUTHENTICATION BOUNDARY', 58, 454, { color: C.bronze, size: 7.2, width: 240 });
body('`/admin` and its children use an authentication guard. An unauthenticated request is redirected to `/login`; this presentation therefore records the visible purpose and route structure of protected tools rather than exposing data from them.', 58, 469, { color: C.inkSoft, size: 8.5, width: 828, lineGap: 2 });

// 40 — Full destination inventory
newSlide({ section: 'Appendix', sectionColor: C.bronze });
sectionTitle('40 / Destination library — full supported URL inventory', 'All 33 guide routes grouped by data source', 'The landing-page card catalogue and guide route data are aligned: every listed place has a corresponding guide slug. This is the complete content inventory at review time.');
const grouped = [
  ['EUROPE (12)', europe.map((x) => x[0])],
  ['AFRICA + MIDDLE EAST (5)', afme.map((x) => x[0])],
  ['ASIA PACIFIC + AMERICAS (16)', apac],
];
grouped.forEach((group, g) => {
  const x = 58 + g * 276;
  panel(x, 157, 250, 294, { fill: C.cream, stroke: C.line, radius: 16 });
  smallCaps(group[0], x + 18, 177, { color: [C.green, C.rose, C.blue][g], size: 7.2, width: 210 });
  group[1].forEach((name, i) => {
    const yy = 203 + i * (g === 2 ? 13 : 16);
    circle(x + 23, yy + 4, 2.7, [C.green, C.rose, C.blue][g]);
    doc.font('SansBold').fontSize(g === 2 ? 7.2 : 7.8).fillColor(C.ink).text(name, x + 33, yy, { width: 190 });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    doc.font('Sans').fontSize(g === 2 ? 5.7 : 6.0).fillColor(C.inkSoft).text(`/destinations/${slug}`, x + 122, yy + 0.5, { width: 110, align: 'right' });
  });
});
body('Note: the guide data set identifies “Switzerland” as the Interlaken, Switzerland destination card; Korea and Japan appear as distinct guide pages alongside Seoul and Tokyo. Destinations may surface as country, city or region concepts in the catalogue.', 58, 473, { color: C.inkSoft, size: 8.3, width: 828, lineGap: 2 });

// 41 — Coverage matrix
newSlide({ section: 'Appendix', sectionColor: C.bronze });
sectionTitle('41 / Section coverage checklist', 'What is included in this detailed presentation', 'Use this page as a quick audit trail: the deck documents every named visitor-facing page route, all repeating home sections, every destination route family, community states and the guarded operations map.');
const coverage = [
  ['Home sections', 'Hero · How it Works · Destinations · Gallery · Pricing · FAQ · Founder · Contact'],
  ['Content pages', 'Audience · Collection · Founder · Travel Feeds · Feedback'],
  ['Service pages', 'Help Centre · Privacy Policy · Terms & Condition'],
  ['Destination guides', 'Reusable template + live / planning layers + all 33 routes'],
  ['Community pages', 'Connect · Registration · Profile · Message Book · Callback'],
  ['Operations', 'Admin sign-in, volunteer application, guarded admin module map'],
  ['Shared system', 'Header / footer, routes, cross-links, design tokens and responsive behavior'],
];
coverage.forEach((row, i) => {
  const y = 155 + i * 43;
  panel(58, y, 829, 32, { fill: i % 2 === 0 ? C.cream : C.paper, stroke: C.line, radius: 10 });
  circle(78, y + 16, 7, C.green);
  checkMark(73, y + 11, C.white);
  doc.font('SansBold').fontSize(8.7).fillColor(C.ink).text(row[0], 96, y + 11, { width: 170 });
  body(row[1], 285, y + 10, { color: C.inkSoft, size: 8.2, width: 568, lineGap: 1 });
});
smallCaps('REVIEW LIMIT', 58, 472, { color: C.bronze, size: 7.2, width: 120 });
body('Live data, external sources and identity-provider interactions were documented from their intended interface / route design. The PDF does not attempt to authenticate, submit personal details, or access protected admin records.', 58, 487, { color: C.inkSoft, size: 8.3, width: 826, lineGap: 1.8 });

// 43 — Closing
newSlide({ bg: C.forestDeep, section: 'Closing', sectionColor: C.gold, footer: false });
imageCover(images.help, 0, 0, W, H, { align: 'center', valign: 'center', overlay: { color: C.forestDeep, opacity: 0.72 } });
rect(0, 0, W, H, C.forestDeep);
doc.save(); doc.opacity(0.67).fillColor(C.forestDeep).rect(0, 0, W, H).fill(); doc.restore();
imageContain(images.logo, 58, 50, 247, 89, { bg: C.cream, radius: 14 });
smallCaps('COMPLETE ROUTE + SECTION TOUR', 59, 190, { color: C.gold, size: 9.2, width: 430 });
title('A platform built around\ndream destinations,\nthen real community.', 58, 214, { color: C.paper, size: 37, width: 530, lineGap: 2 });
body('The experience starts with “where have you never been?” and expands into deeper destination knowledge, collection proof, direct support, member participation and safeguarded operations.', 59, 362, { color: C.sandDeep, size: 11.7, width: 510, lineGap: 3.5 });
pill('43 SLIDES', 58, 453, { fill: C.gold, textColor: C.forestDeep, size: 8.2, height: 23 });
pill('33 DESTINATION GUIDES', 155, 453, { fill: '#496055', textColor: C.paper, size: 8.2, height: 23, stroke: '#496055' });
pill('61 COLLECTION PHOTOS', 339, 453, { fill: '#496055', textColor: C.paper, size: 8.2, height: 23, stroke: '#496055' });
smallCaps('YOU NEVER BEEN  /  REVIEWED 30 SEP 2026', 59, 497, { color: C.sandDeep, size: 7.1, width: 300 });

doc.end();
console.log(`Created ${OUT}`);
