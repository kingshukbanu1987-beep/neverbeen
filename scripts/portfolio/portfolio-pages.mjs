#!/usr/bin/env node
/**
 * The 24 pages of a NeverBeen model portfolio.
 *
 * Every builder receives the kit plus the model's content (personal details,
 * biography, prepared photographs and the seeded design) and draws exactly one
 * page. Type lives in reserved boxes and photographs live in their own frames,
 * so nothing ever overlaps; framed photographs are placed whole, so a face is
 * never cropped out of its frame.
 */
import {
  CONTENT_BOTTOM,
  CONTENT_TOP,
  CONTENT_W,
  FOOTER_H,
  INK,
  INK_SOFT,
  MARGIN,
  PAGE,
  WHITE,
  rgba,
} from './portfolio-kit.mjs';

const PAGE_COUNT = 24;
const PANEL = '#0B0710';

/** The sections listed on the contents page, with their page numbers. */
const SECTIONS = [
  ['The Face', 3],
  ['Personal Details', 4],
  ['The Measure of Her', 5],
  ['Editorial Frames', 6],
  ['Her Story', 8],
  ['Education & Career', 9],
  ['Voice & Interests', 14],
  ['Bookings & Rates', 21],
];

function chrome(design, section, index) {
  return {
    section: `${section}  ·  ${String(index).padStart(2, '0')}`,
    accent: design.accent,
    accent2: design.accent2,
  };
}

/** Full-page model photography with restrained scrims for readable type. */
function backgroundBleed(kit, ctx, index, options = {}) {
  const { scrimTop = 0.12, scrimBottom = 0.54 } = options;
  const shot = ctx.shoot(index, { mode: 'bleed' });
  kit.photo({ x: 0, y: 0, w: PAGE.W, h: PAGE.H }, shot, {
    fit: 'bleed',
    opacity: 0.95,
    radius: 0,
    anchor: 'top',
  });
  // The photo remains nearly full-strength; localized dark fields hold contrast.
  kit.rect(0, 0, PAGE.W, 150, '#050608', scrimTop);
  kit.rect(0, PAGE.H - 330, PAGE.W, 330, '#050608', scrimBottom);
}

/** A translucent panel that guarantees copy stays readable over a photograph. */
function textPanel(kit, x, y, w, h, opacity = 0.76) {
  kit.roundRect(x, y, w, h, 16, PANEL, opacity);
}

function heading(kit, design, value, x, y, w, h, options = {}) {
  const font = options.font ?? design.style.displayFont;
  const text =
    design.style.displayCase === 'upper' ? String(value).toLocaleUpperCase() : String(value);
  return kit.headline(text, x, y, w, h, {
    font,
    characterSpacing: design.style.displaySpacing,
    gradient: options.gradient ?? null,
    size: options.size ?? 34,
    color: options.color ?? WHITE,
    align: options.align,
  });
}

function copyBlock(kit, value, x, y, w, h, options = {}) {
  return kit.text(value, x, y, {
    font: 'Body',
    size: 10.2,
    color: rgba(WHITE, 0.92),
    lineGap: 3.8,
    fit: true,
    width: w,
    height: h,
    ...options,
  });
}

function caption(kit, value, x, y, w, options = {}) {
  return kit.label(value, x, y, { color: options.color ?? INK_SOFT, size: 7.2, width: w });
}

/** A crisp, full-frame photograph with optional high-contrast overprint. */
function photoCard(kit, ctx, index, frame, options = {}) {
  const shot = ctx.shoot(index, {
    mode: 'card',
    w: frame.w,
    h: frame.h,
  });
  kit.photo(frame, shot, {
    fit: options.fit ?? 'cover',
    radius: options.radius ?? 8,
    opacity: options.opacity ?? 1,
    backdrop: false,
    anchor: options.anchor ?? 'top',
  });
  if (options.overlayTitle || options.overlayKicker) {
    const bandH = Math.min(76, Math.max(56, frame.h * 0.24));
    kit.rect(frame.x, frame.y + frame.h - bandH, frame.w, bandH, '#050608', 0.62);
    if (options.overlayKicker) {
      kit.label(options.overlayKicker, frame.x + 12, frame.y + frame.h - bandH + 10, {
        color: options.overlayColor ?? WHITE,
        size: 6.8,
        width: frame.w - 24,
      });
    }
    if (options.overlayTitle) {
      kit.text(options.overlayTitle, frame.x + 12, frame.y + frame.h - 36, {
        font: 'BodyBlack',
        size: 12,
        color: WHITE,
        width: frame.w - 24,
        height: 20,
        fit: true,
        lineGap: 0,
      });
    }
  }
  if (options.caption) {
    caption(kit, options.caption, frame.x, frame.y + frame.h + 7, frame.w, {
      color: options.captionColor,
    });
  }
}

// --------------------------------------------------------------------- 01 cover

function pageCover(kit, ctx) {
  const { design, model } = ctx;
  kit.startPage(chrome(design, 'Portfolio', 1));
  backgroundBleed(kit, ctx, 0, { scrimBottom: 0.64, scrimTop: 0.12 });

  const [g1, g2] = design.style.gradient;
  if (design.style.motif === 'arcs') {
    kit.arc(
      PAGE.W - 60,
      CONTENT_TOP + 60,
      90,
      Math.PI * 0.7,
      Math.PI * 1.6,
      design.accent,
      1.6,
      0.8,
    );
    kit.arc(
      PAGE.W - 60,
      CONTENT_TOP + 60,
      70,
      Math.PI * 0.7,
      Math.PI * 1.5,
      design.accent2,
      1.2,
      0.6,
    );
  } else if (design.style.motif === 'dots') {
    kit.dotGrid(PAGE.W - MARGIN - 96, CONTENT_TOP + 14, 8, 5, 12, design.accent, 0.55);
  } else if (design.style.motif === 'rings') {
    kit.ring(PAGE.W - MARGIN - 46, CONTENT_TOP + 66, 42, design.accent, 1.4, 0.7);
    kit.ring(PAGE.W - MARGIN - 46, CONTENT_TOP + 66, 26, design.accent2, 1.2, 0.6);
  } else {
    kit.slashBand(PAGE.W - MARGIN - 120, CONTENT_TOP + 12, 120, 44, design.accent, 8, 0.65);
  }

  kit.label(model.name, MARGIN, CONTENT_TOP + 6, { color: design.accent, size: 9.4, width: 320 });
  kit.label(
    `${model.handle}  ·  ${model.city || model.location || 'NeverBeen Studio'}`,
    MARGIN,
    CONTENT_TOP + 24,
    {
      color: rgba(WHITE, 0.85),
      size: 7.4,
      width: 340,
    },
  );

  // Headline lives in its own box at the foot of the page, above the footer.
  const headY = PAGE.H - FOOTER_H - 268;
  heading(kit, design, design.coverHeadline, MARGIN, headY, CONTENT_W * 0.84, 176, {
    size: 52,
    gradient: [WHITE, design.accent],
  });
  kit.gradientRect(MARGIN, PAGE.H - FOOTER_H - 80, 130, 4, g1, g2);
  copyBlock(kit, model.bio, MARGIN, PAGE.H - FOOTER_H - 66, CONTENT_W * 0.62, 40, {
    size: 9.6,
    color: rgba(WHITE, 0.94),
  });

  // Replace production specs with three details drawn from her biography.
  const chipY = PAGE.H - FOOTER_H - 30;
  const chips = ctx.highlights.length
    ? ctx.highlights
    : [model.city, model.location].filter(Boolean);
  let chipX = PAGE.W - MARGIN;
  for (const chip of [...chips].reverse()) {
    const width = Math.min(chip.length * 5.7 + 24, 186);
    chipX -= width;
    kit.roundRect(chipX, chipY, width, 19, 9.5, '#111419', 0.92);
    kit.outline(chipX, chipY, width, 19, 9.5, rgba(design.accent, 0.74), 0.9);
    kit.label(chip, chipX + 11, chipY + 6, {
      color: WHITE,
      size: 6.6,
      width: width - 18,
    });
    chipX -= 8;
  }
  kit.label('THE NEVERBEEN STUDIO', MARGIN, chipY + 6, {
    color: rgba(WHITE, 0.76),
    size: 6.8,
    width: 220,
  });
}

// ------------------------------------------------------------------ 02 contents

function pageContents(kit, ctx) {
  const { design, model } = ctx;
  kit.startPage(chrome(design, 'Contents', 2));
  kit.glow(MARGIN + 90, CONTENT_TOP + 120, 150, design.accent, 0.16);
  kit.label('Inside this portfolio', MARGIN, CONTENT_TOP, { color: design.accent, width: 300 });
  heading(kit, design, 'Contents', MARGIN, CONTENT_TOP + 16, 300, 60, { size: 40 });

  let y = CONTENT_TOP + 96;
  for (const [title, page] of SECTIONS) {
    kit.text(title, MARGIN, y, {
      font: 'BodySemi',
      size: 11.4,
      color: WHITE,
      width: 210,
      lineGap: 0,
    });
    kit.label(String(page).padStart(2, '0'), MARGIN + 250, y + 1.4, {
      color: design.accent,
      size: 10,
      width: 30,
      align: 'right',
    });
    kit.line(MARGIN + 216, y + 8, MARGIN + 244, y + 8, rgba(WHITE, 0.3), 0.9);
    y += 36;
  }
  kit.gradientRect(MARGIN, y + 4, 90, 3, design.style.gradient[0], design.style.gradient[1]);
  copyBlock(kit, model.bio, MARGIN, y + 18, 280, 84, {
    size: 9.2,
    color: rgba(WHITE, 0.88),
  });

  // A compact set of biography-led details replaces technical document specs.
  const chips = (ctx.highlights.length ? ctx.highlights : [model.city, model.country])
    .filter(Boolean)
    .map((value) => value.toLocaleUpperCase());
  let chipY = y + 112;
  let chipX = MARGIN;
  for (const chip of chips) {
    const width = Math.min(chip.length * 5.7 + 24, 280);
    if (chipX + width > MARGIN + 288) {
      chipX = MARGIN;
      chipY += 26;
    }
    kit.roundRect(chipX, chipY, width, 20, 10, '#150F20', 1);
    kit.outline(chipX, chipY, width, 20, 10, rgba(design.accent2, 0.5), 0.9);
    kit.label(chip, chipX + 11, chipY + 6.4, {
      color: rgba(WHITE, 0.85),
      size: 6.6,
      width: width - 18,
    });
    chipX += width + 8;
  }

  const frame = { x: PAGE.W - MARGIN - 196, y: CONTENT_TOP + 8, w: 196, h: 288 };
  photoCard(kit, ctx, 1, frame, {
    overlayKicker: model.location,
    overlayTitle: model.name,
  });
  const frame2 = { x: PAGE.W - MARGIN - 196, y: CONTENT_TOP + 322, w: 196, h: 288 };
  photoCard(kit, ctx, 2, frame2, {
    overlayKicker: 'CREATIVE FOCUS',
    overlayTitle: ctx.highlights[0] || model.bodyShape || 'Editorial work',
  });
}

// --------------------------------------------------------------------- 03 intro

function pageIntro(kit, ctx) {
  const { design, model } = ctx;
  kit.startPage(chrome(design, 'The Face', 3));
  backgroundBleed(kit, ctx, 3, { scrimTop: 0.18, scrimBottom: 0.42 });

  const leftFirst = design.variant(11) % 2 === 0;
  const textX = leftFirst ? MARGIN : PAGE.W - MARGIN - 292;
  const photoX = leftFirst ? PAGE.W - MARGIN - 220 : MARGIN;

  // The copy column sits on its own panel so it never fights the photograph.
  textPanel(kit, textX - 14, CONTENT_TOP - 8, 306, 500, 0.78);
  kit.label('The face', textX, CONTENT_TOP, { color: design.accent, width: 260 });
  heading(kit, design, design.introLine, textX, CONTENT_TOP + 18, 284, 148, { size: 26 });
  copyBlock(
    kit,
    model.bio ||
      `${model.name} is a model and creative collaborator with a distinctive editorial point of view.`,
    textX,
    CONTENT_TOP + 176,
    284,
    128,
    { size: 9.2 },
  );

  const facts = [
    ['Based in', model.location || 'To be announced'],
    ['Availability', model.availability || 'On request'],
    ['Signature look', model.tags[0] || design.style.mood],
  ];
  let fy = CONTENT_TOP + 320;
  for (const [label, value] of facts) {
    kit.label(label, textX, fy, { color: INK_SOFT, size: 6.8, width: 110 });
    kit.text(value, textX + 104, fy - 2, {
      font: 'BodySemi',
      size: 9,
      color: WHITE,
      width: 180,
      lineGap: 1,
      fit: true,
      height: 26,
    });
    kit.line(textX, fy + 24, textX + 284, fy + 24, rgba(WHITE, 0.16), 0.8);
    fy += 34;
  }
  kit.label(model.handle, textX, fy + 6, { color: design.accent2, size: 8.4, width: 260 });
  kit.numeral(3, textX + 196, fy + 26, 54, design.accent, 0.2);

  photoCard(
    kit,
    ctx,
    3,
    { x: photoX, y: CONTENT_TOP + 40, w: 220, h: 304 },
    {
      overlayKicker: model.city || model.location,
      overlayTitle: model.name,
    },
  );
}

// --------------------------------------------------------------------- 04 stats

function pageStats(kit, ctx) {
  const { design, model } = ctx;
  kit.startPage(chrome(design, 'Personal Details', 4));
  kit.label('Model profile', MARGIN, CONTENT_TOP, { color: design.accent, width: 300 });
  heading(kit, design, 'Personal details', MARGIN, CONTENT_TOP + 16, 286, 54, { size: 30 });
  copyBlock(
    kit,
    'A concise profile for editorial, fashion and campaign briefs.',
    MARGIN,
    CONTENT_TOP + 76,
    270,
    30,
    { size: 9, color: rgba(WHITE, 0.74) },
  );

  const gridW = 270;
  const stats = [
    ['Age', model.age || '—'],
    ['Height', model.height || '—'],
    ['Weight', model.weight || '—'],
    ['Bust', model.bust || '—'],
    ['Waist', model.waist || '—'],
    ['Hip', model.hip || '—'],
  ];
  const top = CONTENT_TOP + 112;
  if (design.style.statsLayout === 'dials') {
    stats.forEach(([label, value], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const cx = MARGIN + 48 + col * 126;
      const cy = top + 48 + row * 112;
      kit.dial(cx, cy, 37, value, label, { accent: design.accent, accent2: design.accent2 });
    });
  } else if (design.style.statsLayout === 'cards') {
    stats.forEach(([label, value], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      kit.stat(MARGIN + col * 138, top + row * 91, 130, 80, value, label, {
        accent: index % 2 === 0 ? design.accent : design.accent2,
        valueSize: 22,
        radius: 10,
      });
    });
  } else {
    stats.forEach(([label, value], index) => {
      const y = top + index * 51;
      kit.label(label, MARGIN, y + 8, { color: INK_SOFT, size: 7.6, width: 84 });
      kit.text(value, MARGIN + 92, y, {
        font: design.style.displayFont,
        size: 19,
        color: WHITE,
        width: 134,
        lineGap: 0,
        fit: true,
        height: 27,
      });
      kit.gradientRect(MARGIN + 210, y + 9, 54, 2.5, design.accent, design.accent2);
      kit.line(MARGIN, y + 39, MARGIN + gridW, y + 39, rgba(WHITE, 0.12), 0.8);
    });
  }

  const portrait = { x: PAGE.W - MARGIN - 230, y: CONTENT_TOP + 100, w: 230, h: 380 };
  photoCard(kit, ctx, 4, portrait, {
    overlayKicker: model.location,
    overlayTitle: model.name,
  });

  const footY = PAGE.H - FOOTER_H - 128;
  kit.roundRect(MARGIN, footY, gridW, 58, 12, '#111419', 1);
  kit.roundRect(MARGIN, footY, gridW, 58, 12, rgba(design.accent, 0.1), 1);
  kit.label('Profile', MARGIN + 16, footY + 10, { color: INK_SOFT, size: 7, width: 74 });
  kit.text(model.bodyShape || 'Editorial', MARGIN + 16, footY + 22, {
    font: 'Display',
    size: 15,
    color: design.accent,
    width: 112,
    lineGap: 0,
    fit: true,
    height: 24,
  });
  kit.line(MARGIN + 145, footY + 10, MARGIN + 145, footY + 48, rgba(WHITE, 0.16), 1);
  kit.label('Based in', MARGIN + 160, footY + 10, { color: INK_SOFT, size: 7, width: 118 });
  kit.text(model.location || 'Available on request', MARGIN + 160, footY + 22, {
    font: 'BodySemi',
    size: 9.6,
    color: WHITE,
    width: gridW - 176,
    lineGap: 0,
    fit: true,
    height: 24,
  });
  kit.label('THE NEVERBEEN STUDIO', MARGIN, footY + 70, {
    color: rgba(WHITE, 0.7),
    size: 6.8,
    width: gridW,
  });
}

// -------------------------------------------------------------- 05 measurements

function pageMeasure(kit, ctx) {
  const { design, model } = ctx;
  kit.startPage(chrome(design, 'The Measure', 5));
  kit.label('Profile reference', MARGIN, CONTENT_TOP, { color: design.accent, width: 300 });
  heading(kit, design, 'The measure of her', MARGIN, CONTENT_TOP + 16, 420, 54, { size: 32 });

  // Fashion line-art silhouette drawn with vectors — no photograph is cropped here.
  const cx = MARGIN + 110;
  const top = CONTENT_TOP + 108;
  const s = 1.28;
  const d = kit.doc;
  d.save();
  d.lineWidth(1.7).strokeColor(design.accent).opacity(0.92);
  d.circle(cx, top, 17 * s).stroke();
  // neck
  d.moveTo(cx - 6, top + 16 * s)
    .lineTo(cx - 8, top + 30 * s)
    .stroke();
  d.moveTo(cx + 6, top + 16 * s)
    .lineTo(cx + 8, top + 30 * s)
    .stroke();
  d.moveTo(cx - 26 * s, top + 32 * s)
    .bezierCurveTo(cx - 30 * s, top + 78 * s, cx - 14 * s, top + 96 * s, cx - 16 * s, top + 132 * s)
    .bezierCurveTo(
      cx - 18 * s,
      top + 176 * s,
      cx - 30 * s,
      top + 210 * s,
      cx - 26 * s,
      top + 268 * s,
    )
    .stroke();
  d.moveTo(cx + 26 * s, top + 32 * s)
    .bezierCurveTo(cx + 30 * s, top + 78 * s, cx + 14 * s, top + 96 * s, cx + 16 * s, top + 132 * s)
    .bezierCurveTo(
      cx + 18 * s,
      top + 176 * s,
      cx + 30 * s,
      top + 210 * s,
      cx + 26 * s,
      top + 268 * s,
    )
    .stroke();
  d.moveTo(cx - 26 * s, top + 32 * s)
    .lineTo(cx + 26 * s, top + 32 * s)
    .stroke();
  d.restore();

  const callouts = [
    ['Bust', model.bust, top + 62 * s],
    ['Waist', model.waist, top + 128 * s],
    ['Hip', model.hip, top + 196 * s],
  ];
  for (const [label, value, y] of callouts) {
    kit.line(cx + 34 * s, y, cx + 88, y, rgba(design.accent, 0.85), 1);
    kit.circle(cx + 34 * s, y, 2.4, design.accent, 1);
    kit.label(label, cx + 96, y - 9, { color: INK_SOFT, size: 7, width: 58 });
    kit.text(value || 'To be added', cx + 96, y + 1, {
      font: 'Display',
      size: 15,
      color: WHITE,
      width: 62,
      lineGap: 0,
      fit: true,
      height: 20,
    });
  }

  // Height ruler on the left margin of the sheet.
  const rulerX = MARGIN + 6;
  const rulerTop = top - 10;
  const rulerH = 268 * s + 20;
  kit.line(rulerX, rulerTop, rulerX, rulerTop + rulerH, rgba(WHITE, 0.32), 1);
  for (let index = 0; index <= 8; index += 1) {
    const y = rulerTop + (index * rulerH) / 8;
    kit.line(rulerX, y, rulerX + (index % 4 === 0 ? 12 : 7), y, rgba(WHITE, 0.42), 1);
  }
  kit.text(model.height || '—', rulerX - 2, rulerTop + rulerH + 8, {
    font: 'BodyBlack',
    size: 10,
    color: design.accent,
    width: 70,
    lineGap: 0,
  });

  // Right column: the illustrative card set.
  const rx = MARGIN + 268;
  const cards = [
    ['Body shape', model.bodyShape || 'To be added'],
    ['Weight', model.weight || 'To be added'],
    ['Age', model.age || 'To be added'],
    ['Location', model.location || 'To be announced'],
  ];
  let cy = CONTENT_TOP + 100;
  cards.forEach(([label, value], index) => {
    kit.roundRect(rx, cy, CONTENT_W - 268, 60, 12, '#130D1C', 1);
    kit.roundRect(rx, cy, 4, 60, 2, index % 2 === 0 ? design.accent : design.accent2, 1);
    kit.label(label, rx + 16, cy + 10, { color: INK_SOFT, size: 7, width: 200 });
    kit.text(value, rx + 16, cy + 22, {
      font: index === 3 ? 'BodySemi' : 'Display',
      size: index === 3 ? 12 : 18,
      color: WHITE,
      width: CONTENT_W - 300,
      lineGap: 0,
      fit: true,
      height: 30,
    });
    cy += 70;
  });

  photoCard(
    kit,
    ctx,
    5,
    { x: PAGE.W - MARGIN - 194, y: PAGE.H - FOOTER_H - 252, w: 194, h: 220 },
    {
      overlayKicker: model.city || model.location,
      overlayTitle: 'On camera',
    },
  );
  copyBlock(kit, ctx.editorialNote(5), MARGIN, PAGE.H - FOOTER_H - 190, 232, 120, {
    size: 8.8,
    color: rgba(WHITE, 0.7),
  });
  kit.label(model.handle, MARGIN, PAGE.H - FOOTER_H - 60, {
    color: design.accent2,
    size: 7.4,
    width: 220,
  });
}

// ------------------------------------------------------------ editorial recipes

function editorialFullBleed(kit, ctx, index, photoIndex) {
  const { design, model } = ctx;
  kit.startPage(chrome(design, 'Editorial', index));
  backgroundBleed(kit, ctx, photoIndex, { scrimBottom: 0.62, scrimTop: 0.08 });
  const title = design.editorialHeadlines[photoIndex % design.editorialHeadlines.length];
  kit.numeral(index, PAGE.W - MARGIN - 90, CONTENT_TOP - 4, 62, design.accent, 0.5);
  const y = PAGE.H - FOOTER_H - 190;
  heading(kit, design, title, MARGIN, y, CONTENT_W * 0.8, 120, {
    size: 36,
    gradient: [WHITE, design.accent],
  });
  kit.gradientRect(MARGIN, y + 128, 110, 3.4, design.style.gradient[0], design.style.gradient[1]);
  kit.label(`${model.name}  ·  frame ${String(photoIndex + 1).padStart(2, '0')}`, MARGIN, y + 140, {
    color: rgba(WHITE, 0.78),
    size: 7.2,
    width: 320,
  });
}

function editorialDiptych(kit, ctx, index, photoIndex) {
  const { design, model } = ctx;
  kit.startPage(chrome(design, 'Editorial', index));
  const title = design.editorialHeadlines[(photoIndex + 1) % design.editorialHeadlines.length];
  heading(kit, design, title, MARGIN, CONTENT_TOP, CONTENT_W, 74, { size: 30 });
  kit.label(design.style.mood, MARGIN, CONTENT_TOP + 82, {
    color: design.accent,
    size: 7.4,
    width: 400,
  });
  const frameW = (CONTENT_W - 18) / 2;
  photoCard(
    kit,
    ctx,
    photoIndex,
    { x: MARGIN, y: CONTENT_TOP + 112, w: frameW, h: 420 },
    {
      caption: `${model.name} — study one`,
    },
  );
  photoCard(
    kit,
    ctx,
    photoIndex + 1,
    { x: MARGIN + frameW + 18, y: CONTENT_TOP + 112, w: frameW, h: 420 },
    {
      caption: `${model.name} — study two`,
      treatment: ctx.treatmentFor(photoIndex + 1),
    },
  );
  copyBlock(kit, ctx.editorialNote(photoIndex), MARGIN, CONTENT_TOP + 560, CONTENT_W, 84, {
    size: 9.2,
  });
}

function editorialTriptych(kit, ctx, index, photoIndex) {
  const { design, model } = ctx;
  kit.startPage(chrome(design, 'Editorial', index));
  kit.label('Three frames, one mood', MARGIN, CONTENT_TOP, { color: design.accent, width: 400 });
  heading(
    kit,
    design,
    design.editorialHeadlines[(photoIndex + 2) % design.editorialHeadlines.length],
    MARGIN,
    CONTENT_TOP + 16,
    CONTENT_W,
    64,
    { size: 28 },
  );

  const y = CONTENT_TOP + 100;
  const heroW = 328;
  const sideX = MARGIN + heroW + 12;
  const sideW = CONTENT_W - heroW - 12;
  photoCard(
    kit,
    ctx,
    photoIndex,
    { x: MARGIN, y, w: heroW, h: 414 },
    { overlayKicker: model.location, overlayTitle: model.name },
  );
  photoCard(
    kit,
    ctx,
    photoIndex + 1,
    { x: sideX, y, w: sideW, h: 198 },
    { overlayKicker: 'EDITORIAL', overlayTitle: 'Light & form' },
  );
  photoCard(
    kit,
    ctx,
    photoIndex + 2,
    { x: sideX, y: y + 214, w: sideW, h: 198 },
    { overlayKicker: 'CAMPAIGN', overlayTitle: 'A clear point of view' },
  );
  kit.roundRect(MARGIN, y + 432, CONTENT_W, 86, 12, '#111419', 0.96);
  copyBlock(kit, ctx.editorialNote(photoIndex + 1), MARGIN + 16, y + 448, CONTENT_W - 32, 54, {
    size: 9.2,
  });
  kit.label(model.handle, MARGIN + 16, y + 504, {
    color: design.accent2,
    size: 7.2,
    width: 300,
  });
}

function editorialSplit(kit, ctx, index, photoIndex) {
  const { design, model } = ctx;
  kit.startPage(chrome(design, 'Editorial', index));
  const photoLeft = design.variant(index) % 2 === 0;
  const photoW = 268;
  const px = photoLeft ? 0 : PAGE.W - photoW;
  const photoTop = CONTENT_TOP - 10;
  const photoH = PAGE.H - FOOTER_H - photoTop;
  const shot = ctx.shoot(photoIndex, { mode: 'bleed' });
  kit.photo({ x: px, y: photoTop, w: photoW, h: photoH }, shot, {
    fit: 'bleed',
    opacity: 0.95,
    radius: 0,
    anchor: 'top',
  });
  kit.gradientRect(px, photoTop, photoW, 90, '#050308', '#050308', {
    angle: 'vertical',
    opacity: 0.5,
  });
  kit.rect(px, PAGE.H - FOOTER_H - 42, photoW, 42, '#050308', 0.62);

  const tx = photoLeft ? photoW + 34 : MARGIN;
  const tw = PAGE.W - photoW - 34 - MARGIN;
  kit.label('EDITORIAL STUDY', tx, CONTENT_TOP, { color: design.accent, width: tw });
  heading(
    kit,
    design,
    design.editorialHeadlines[(photoIndex + 3) % design.editorialHeadlines.length],
    tx,
    CONTENT_TOP + 18,
    tw,
    130,
    {
      size: 27,
    },
  );
  copyBlock(kit, ctx.editorialNote(photoIndex + 2), tx, CONTENT_TOP + 168, tw, 150, { size: 9.4 });
  kit.stat(tx, CONTENT_TOP + 340, tw, 64, model.height || '—', 'Height on set', {
    accent: design.accent,
    valueSize: 22,
  });
  kit.stat(
    tx,
    CONTENT_TOP + 416,
    tw,
    64,
    model.tags[0] || design.style.name,
    'Signature register',
    {
      accent: design.accent2,
      valueSize: 16,
    },
  );
  copyBlock(kit, ctx.editorialNote(photoIndex + 5), tx, CONTENT_TOP + 500, tw, 90, {
    size: 8.6,
    color: rgba(WHITE, 0.7),
  });
  caption(
    kit,
    `${model.name} — ${model.city || 'studio session'}`,
    px + 14,
    PAGE.H - FOOTER_H - 28,
    photoW - 28,
    {
      color: rgba(WHITE, 0.85),
    },
  );
}

function editorialDuotone(kit, ctx, index, photoIndex) {
  const { design, model } = ctx;
  kit.startPage(chrome(design, 'Editorial', index));
  const shot = ctx.shoot(photoIndex, { mode: 'bleed' });
  kit.photo({ x: 0, y: 0, w: PAGE.W, h: PAGE.H }, shot, {
    fit: 'bleed',
    opacity: 0.95,
    radius: 0,
    anchor: 'top',
  });
  kit.rect(0, 0, PAGE.W, PAGE.H, INK, 0.12);
  const bandY = PAGE.H / 2 - 110;
  kit.rect(0, bandY, PAGE.W, 220, '#050608', 0.68);
  kit.gradientRect(0, bandY, PAGE.W, 2, design.style.gradient[0], design.style.gradient[1]);
  kit.gradientRect(0, bandY + 218, PAGE.W, 2, design.style.gradient[1], design.style.gradient[0]);
  heading(kit, design, `“${design.quote}”`, MARGIN + 12, bandY + 40, CONTENT_W - 24, 110, {
    size: 26,
    gradient: [WHITE, design.accent],
  });
  kit.label(`${model.name}  ·  ${design.style.name}`, MARGIN + 12, bandY + 168, {
    color: design.accent,
    size: 7.6,
    width: 400,
  });
}

function editorialPolaroids(kit, ctx, index, photoIndex) {
  const { design, model } = ctx;
  kit.startPage(chrome(design, 'Editorial', index));
  kit.label('Selected frames', MARGIN, CONTENT_TOP, { color: design.accent, width: 400 });
  heading(
    kit,
    design,
    design.editorialHeadlines[(photoIndex + 4) % design.editorialHeadlines.length],
    MARGIN,
    CONTENT_TOP + 16,
    CONTENT_W,
    60,
    { size: 28 },
  );

  const gap = 14;
  const frameW = (CONTENT_W - gap) / 2;
  const frameH = 258;
  const top = CONTENT_TOP + 98;
  const moments = [
    ['CLOSE-UP', 'A confident gaze'],
    ['EDITORIAL', 'Quiet precision'],
    ['CAMPAIGN', 'Colour in motion'],
    ['STYLE', 'A signature presence'],
  ];
  moments.forEach(([kicker, title], slot) => {
    const col = slot % 2;
    const row = Math.floor(slot / 2);
    photoCard(
      kit,
      ctx,
      photoIndex + slot,
      { x: MARGIN + col * (frameW + gap), y: top + row * (frameH + 14), w: frameW, h: frameH },
      { overlayKicker: kicker, overlayTitle: title },
    );
  });
  kit.label(`${model.name}  ·  ${model.city || model.location}`, MARGIN, top + frameH * 2 + 34, {
    color: rgba(WHITE, 0.78),
    size: 7.6,
    width: CONTENT_W,
  });
}

function editorialMosaic(kit, ctx, index, photoIndex) {
  const { design, model } = ctx;
  kit.startPage(chrome(design, 'Editorial', index));
  heading(
    kit,
    design,
    design.editorialHeadlines[(photoIndex + 5) % design.editorialHeadlines.length],
    MARGIN,
    CONTENT_TOP,
    CONTENT_W * 0.76,
    70,
    { size: 30 },
  );
  kit.numeral(index, PAGE.W - MARGIN - 84, CONTENT_TOP - 6, 58, design.accent, 0.4);

  const top = CONTENT_TOP + 92;
  const heroW = 292;
  const sideX = MARGIN + heroW + 14;
  const sideW = CONTENT_W - heroW - 14;
  photoCard(
    kit,
    ctx,
    photoIndex,
    { x: MARGIN, y: top, w: heroW, h: 468 },
    {
      overlayKicker: model.location,
      overlayTitle: model.name,
    },
  );
  photoCard(
    kit,
    ctx,
    photoIndex + 1,
    { x: sideX, y: top, w: sideW, h: 226 },
    {
      overlayKicker: 'EDITORIAL',
      overlayTitle: 'Ease and focus',
    },
  );
  photoCard(
    kit,
    ctx,
    photoIndex + 2,
    { x: sideX, y: top + 242, w: sideW, h: 226 },
    {
      overlayKicker: 'CAMPAIGN',
      overlayTitle: 'In her element',
    },
  );
  copyBlock(kit, ctx.editorialNote(photoIndex + 3), MARGIN, top + 486, CONTENT_W, 68, {
    size: 9.4,
  });
}

function editorialTallRibbon(kit, ctx, index, photoIndex) {
  const { design, model } = ctx;
  kit.startPage(chrome(design, 'Editorial', index));
  const frame = { x: MARGIN + 60, y: CONTENT_TOP + 6, w: CONTENT_W - 120, h: 396 };
  photoCard(kit, ctx, photoIndex, frame, {});
  kit.label('The tall frame', MARGIN, CONTENT_TOP + 418, { color: design.accent, width: 300 });
  heading(
    kit,
    design,
    design.editorialHeadlines[(photoIndex + 6) % design.editorialHeadlines.length],
    MARGIN,
    CONTENT_TOP + 434,
    CONTENT_W,
    60,
    {
      size: 26,
    },
  );
  const ribbonY = CONTENT_TOP + 508;
  const cells = [
    [model.age || '—', 'Age'],
    [model.height || '—', 'Height'],
    [model.bodyShape || '—', 'Shape'],
    [model.city || '—', 'City'],
  ];
  const cellW = (CONTENT_W - 30) / 4;
  cells.forEach(([value, label], slot) => {
    kit.stat(MARGIN + slot * (cellW + 10), ribbonY, cellW, 66, value, label, {
      accent: slot % 2 === 0 ? design.accent : design.accent2,
      valueSize: 17,
    });
  });
  copyBlock(kit, ctx.editorialNote(photoIndex + 4), MARGIN, ribbonY + 82, CONTENT_W, 56, {
    size: 9,
  });
}

function editorialDuo(kit, ctx, index, photoIndex) {
  const { design, model } = ctx;
  kit.startPage(chrome(design, 'Editorial', index));
  const half = (PAGE.W - 14) / 2;
  const photoH = PAGE.H - FOOTER_H - CONTENT_TOP - 60;
  const shotA = ctx.shoot(photoIndex, { mode: 'bleed' });
  const shotB = ctx.shoot(photoIndex + 1, { mode: 'bleed' });
  kit.photo({ x: 0, y: CONTENT_TOP - 12, w: half, h: photoH }, shotA, {
    fit: 'bleed',
    opacity: 0.95,
    radius: 0,
    anchor: 'top',
  });
  kit.photo({ x: half + 14, y: CONTENT_TOP - 12, w: half, h: photoH }, shotB, {
    fit: 'bleed',
    opacity: 0.95,
    radius: 0,
    anchor: 'top',
  });
  const bandY = PAGE.H - FOOTER_H - 148;
  kit.rect(0, bandY, PAGE.W, 96, '#050308', 0.88);
  heading(
    kit,
    design,
    design.editorialHeadlines[(photoIndex + 7) % design.editorialHeadlines.length],
    MARGIN,
    bandY + 16,
    CONTENT_W,
    52,
    {
      size: 24,
    },
  );
  kit.label(`${model.name}  ·  two registers, one face`, MARGIN, bandY + 74, {
    color: design.accent,
    size: 7.4,
    width: 400,
  });
}

// ------------------------------------------------------------------ 08 her story

function pageStory(kit, ctx) {
  const { design, model, story } = ctx;
  kit.startPage(chrome(design, 'Her Story', 8));
  backgroundBleed(kit, ctx, 8, { scrimBottom: 0.48, scrimTop: 0.16 });
  kit.label('Her story', MARGIN, CONTENT_TOP, { color: design.accent, width: 300 });
  heading(kit, design, 'A life in motion', MARGIN, CONTENT_TOP + 16, CONTENT_W * 0.78, 64, {
    size: 30,
  });

  const textW = 292;
  textPanel(kit, MARGIN - 12, CONTENT_TOP + 82, textW + 24, 502, 0.86);
  copyBlock(kit, model.bio, MARGIN, CONTENT_TOP + 100, textW, 138, {
    size: 10,
    color: rgba(WHITE, 0.95),
  });

  const ambition = story?.ambitions?.[0];
  if (ambition) {
    kit.label('Creative ambition', MARGIN, CONTENT_TOP + 258, {
      color: design.accent2,
      size: 7.4,
      width: 220,
    });
    copyBlock(kit, ambition, MARGIN, CONTENT_TOP + 276, textW, 92, {
      size: 9.6,
      color: rgba(WHITE, 0.88),
    });
  }

  const interests = (story?.interests ?? []).slice(0, 4);
  if (interests.length) {
    kit.label('Personal interests', MARGIN, CONTENT_TOP + 392, {
      color: design.accent2,
      size: 7.4,
      width: 220,
    });
    let x = MARGIN;
    let y = CONTENT_TOP + 412;
    for (const interest of interests) {
      const width = Math.min(interest.length * 5.5 + 22, textW);
      if (x + width > MARGIN + textW) {
        x = MARGIN;
        y += 27;
      }
      kit.roundRect(x, y, width, 20, 10, '#111419', 0.94);
      kit.outline(x, y, width, 20, 10, rgba(design.accent, 0.52), 0.8);
      kit.text(interest, x + 10, y + 5.5, {
        font: 'BodySemi',
        size: 7.2,
        color: WHITE,
        width: width - 18,
        lineGap: 0,
      });
      x += width + 7;
    }
  }

  const photoX = PAGE.W - MARGIN - 194;
  photoCard(
    kit,
    ctx,
    8,
    { x: photoX, y: CONTENT_TOP + 86, w: 194, h: 242 },
    {
      overlayKicker: 'CREATIVE FOCUS',
      overlayTitle: ctx.highlights[0] || model.name,
    },
  );
  photoCard(
    kit,
    ctx,
    9,
    { x: photoX, y: CONTENT_TOP + 350, w: 194, h: 228 },
    {
      overlayKicker: 'OFF THE SET',
      overlayTitle: interests[0] || model.city || model.name,
    },
  );
  kit.label('THE NEVERBEEN STUDIO', MARGIN, PAGE.H - FOOTER_H - 56, {
    color: rgba(WHITE, 0.78),
    size: 7.2,
    width: 240,
  });
}

// ---------------------------------------------------------------- 09 education

function pageEducation(kit, ctx) {
  const { design, story, model } = ctx;
  kit.startPage(chrome(design, 'Education', 9));
  kit.label('Studies', MARGIN, CONTENT_TOP, { color: design.accent, width: 300 });
  heading(kit, design, 'Education', MARGIN, CONTENT_TOP + 16, 380, 54, { size: 34 });
  const degrees = story?.educationalBackground ?? [];
  if (degrees.length === 0) {
    copyBlock(
      kit,
      `${model.name}'s creative practice is shaped by hands-on work, curiosity and a strong visual point of view.`,
      MARGIN,
      CONTENT_TOP + 96,
      CONTENT_W * 0.62,
      80,
      { size: 10 },
    );
    photoCard(
      kit,
      ctx,
      9,
      { x: PAGE.W - MARGIN - 220, y: CONTENT_TOP + 90, w: 220, h: 290 },
      {
        overlayKicker: model.location,
        overlayTitle: model.name,
      },
    );
    return;
  }
  let y = CONTENT_TOP + 96;
  degrees.slice(0, 3).forEach((degree, index) => {
    const cardH = 112;
    kit.roundRect(MARGIN, y, CONTENT_W, cardH, 14, '#130D1C', 1);
    kit.roundRect(MARGIN, y, 4, cardH, 2, index % 2 === 0 ? design.accent : design.accent2, 1);
    kit.label(degree.period || '—', MARGIN + 18, y + 12, {
      color: design.accent,
      size: 7.2,
      width: 240,
    });
    kit.text(degree.qualification || degree.institution || 'Qualification', MARGIN + 18, y + 28, {
      font: 'Display',
      size: 17,
      color: WHITE,
      width: CONTENT_W - 250,
      lineGap: 1,
      fit: true,
      height: 44,
    });
    kit.text(
      [degree.institution, degree.location].filter(Boolean).join(' · ') || '',
      MARGIN + 18,
      y + 78,
      {
        font: 'BodySemi',
        size: 8.6,
        color: rgba(WHITE, 0.74),
        width: CONTENT_W - 250,
        lineGap: 1,
        fit: true,
        height: 26,
      },
    );
    kit.numeral(index + 1, PAGE.W - MARGIN - 62, y + 26, 42, design.accent2, 0.42);
    y += cardH + 16;
  });
  photoCard(
    kit,
    ctx,
    9,
    { x: PAGE.W - MARGIN - 210, y: y + 8, w: 210, h: 210 },
    {
      overlayKicker: 'FIELD OF STUDY',
      overlayTitle: degrees[0]?.qualification || model.name,
    },
  );
  const study = degrees[0]?.qualification || 'Creative practice';
  copyBlock(
    kit,
    `Her studies in ${study} bring together visual identity, strategy and storytelling.`,
    MARGIN,
    y + 16,
    CONTENT_W - 240,
    70,
    { size: 9.2, color: rgba(WHITE, 0.82) },
  );
}

// ------------------------------------------------------------------- 10 career

function pageCareer(kit, ctx) {
  const { design, story, model } = ctx;
  kit.startPage(chrome(design, 'Career', 10));
  kit.label('The working years', MARGIN, CONTENT_TOP, { color: design.accent, width: 300 });
  heading(kit, design, 'Career', MARGIN, CONTENT_TOP + 16, 380, 54, { size: 34 });
  const career = story?.career ?? [];
  if (career.length === 0) {
    copyBlock(
      kit,
      `${model.name}'s work is shaped by collaboration, editorial storytelling and a thoughtful eye for detail.`,
      MARGIN,
      CONTENT_TOP + 96,
      CONTENT_W * 0.62,
      80,
      { size: 10 },
    );
    photoCard(kit, ctx, 10, { x: PAGE.W - MARGIN - 220, y: CONTENT_TOP + 90, w: 220, h: 290 }, {});
    return;
  }
  const entries = career.slice(0, 5);
  const spineTop = CONTENT_TOP + 100;
  const spineBottom = PAGE.H - FOOTER_H - (entries.length <= 3 ? 250 : 60);
  kit.line(MARGIN + 6, spineTop, MARGIN + 6, spineBottom, rgba(design.accent, 0.55), 1.6);
  const step = Math.min(132, (spineBottom - spineTop - 40) / entries.length);
  let y = spineTop + 4;
  entries.forEach((entry, index) => {
    kit.circle(MARGIN + 6, y + 6, 4.2, index % 2 === 0 ? design.accent : design.accent2, 1);
    kit.label(entry.period || '—', MARGIN + 26, y - 2, {
      color: design.accent2,
      size: 7.2,
      width: 240,
    });
    kit.text(entry.role || 'Role', MARGIN + 26, y + 10, {
      font: 'BodyBlack',
      size: 12.6,
      color: WHITE,
      width: CONTENT_W - 260,
      lineGap: 1,
      fit: true,
      height: 34,
    });
    kit.text(
      [entry.organization, entry.location].filter(Boolean).join(' · '),
      MARGIN + 26,
      y + 32,
      {
        font: 'BodySemi',
        size: 8.6,
        color: rgba(WHITE, 0.76),
        width: CONTENT_W - 260,
        lineGap: 1,
        fit: true,
        height: 24,
      },
    );
    if (entry.description) {
      copyBlock(kit, entry.description, MARGIN + 26, y + 52, CONTENT_W - 300, 52, {
        size: 8.2,
        color: rgba(WHITE, 0.64),
      });
    }
    y += step;
  });
  if (entries.length <= 3) {
    photoCard(
      kit,
      ctx,
      10,
      { x: PAGE.W - MARGIN - 200, y: PAGE.H - FOOTER_H - 236, w: 200, h: 200 },
      {
        caption: `${model.name} — on set`,
      },
    );
  }
}

// -------------------------------------------------------------- 11 achievements

function pageAchievements(kit, ctx) {
  const { design, story, model } = ctx;
  kit.startPage(chrome(design, 'Achievements', 11));
  backgroundBleed(kit, ctx, 11, { scrimBottom: 0.48, scrimTop: 0.12 });
  kit.label('Marks she leaves', MARGIN, CONTENT_TOP, { color: design.accent, width: 300 });
  heading(kit, design, 'Achievements', MARGIN, CONTENT_TOP + 16, 400, 54, { size: 34 });
  const achievements = story?.achievements ?? [];
  const list = achievements.length
    ? achievements.slice(0, 6)
    : [
        `Published in the NeverBeen studio directory as ${model.name}.`,
        `A complete editorial album shot for the ${design.style.name} portfolio series.`,
        'Available for campaign, editorial and lookbook bookings through NeverBeen.',
      ];
  let y = CONTENT_TOP + 96;
  list.forEach((item, index) => {
    kit.roundRect(MARGIN, y, CONTENT_W, 62, 12, '#120C1A', 1);
    kit.text(String(index + 1).padStart(2, '0'), MARGIN + 14, y + 18, {
      font: 'Display',
      size: 18,
      color: design.accent,
      width: 40,
      lineGap: 0,
    });
    kit.text(item, MARGIN + 62, y + 11, {
      font: 'BodySemi',
      size: 9.2,
      color: rgba(WHITE, 0.94),
      width: CONTENT_W - 84,
      lineGap: 2,
      fit: true,
      height: 42,
    });
    y += 72;
  });
}

// --------------------------------------------------------------- 14 interests

function pageInterests(kit, ctx) {
  const { design, story, model } = ctx;
  kit.startPage(chrome(design, 'Voice & Interests', 14));
  kit.glow(PAGE.W - 140, CONTENT_TOP + 60, 140, design.accent, 0.15);
  kit.label('Beyond the lens', MARGIN, CONTENT_TOP, { color: design.accent, width: 300 });
  heading(kit, design, 'Interests & ambitions', MARGIN, CONTENT_TOP + 16, CONTENT_W, 54, {
    size: 30,
  });

  const groups = [
    ['Interests', story?.interests ?? []],
    ['Passions', story?.passions ?? []],
    ['Hobbies', story?.hobbies ?? []],
    ['Ambitions', story?.ambitions ?? []],
  ].filter(([, values]) => values.length > 0);

  if (groups.length === 0) {
    copyBlock(
      kit,
      `${model.name} brings a thoughtful eye to her work, guided by curiosity, culture and a love of visual storytelling.`,
      MARGIN,
      CONTENT_TOP + 96,
      CONTENT_W * 0.72,
      90,
      { size: 10 },
    );
    photoCard(kit, ctx, 14, { x: PAGE.W - MARGIN - 210, y: CONTENT_TOP + 90, w: 210, h: 280 }, {});
    return;
  }
  let y = CONTENT_TOP + 92;
  for (const [title, values] of groups) {
    kit.label(title, MARGIN, y, { color: design.accent2, size: 7.4, width: 200 });
    y += 16;
    let x = MARGIN;
    for (const value of values.slice(0, 6)) {
      const width = Math.min(value.length * 5.7 + 24, CONTENT_W - (x - MARGIN));
      if (x + width > PAGE.W - MARGIN - 190) {
        x = MARGIN;
        y += 26;
      }
      kit.roundRect(x, y, width, 20, 10, '#150F20', 1);
      kit.outline(x, y, width, 20, 10, rgba(design.accent, 0.5), 0.9);
      kit.text(value, x + 12, y + 5.6, {
        font: 'BodySemi',
        size: 7.6,
        color: rgba(WHITE, 0.9),
        width: width - 20,
        lineGap: 0,
      });
      x += width + 8;
    }
    y += 36;
  }
  photoCard(
    kit,
    ctx,
    14,
    { x: PAGE.W - MARGIN - 176, y: PAGE.H - FOOTER_H - 246, w: 176, h: 210 },
    {},
  );
  copyBlock(
    kit,
    ctx.editorialNote(14),
    MARGIN,
    Math.max(y + 8, PAGE.H - FOOTER_H - 210),
    CONTENT_W - 200,
    100,
    {
      size: 9,
      color: rgba(WHITE, 0.72),
    },
  );
}

// -------------------------------------------------------------------- 17 quote

function pageQuote(kit, ctx) {
  const { design, model, story } = ctx;
  kit.startPage(chrome(design, 'Voice', 17));
  backgroundBleed(kit, ctx, 17, { scrimTop: 0.18, scrimBottom: 0.44 });
  const quote = story?.quotes?.[0]?.text ?? design.quote;
  const by = story?.quotes?.[0]?.by || model.name;
  kit.text('“', MARGIN - 6, CONTENT_TOP - 18, {
    font: 'Display',
    size: 150,
    color: design.accent,
    opacity: 0.5,
    width: 120,
    lineGap: 0,
  });
  heading(kit, design, quote, MARGIN + 20, CONTENT_TOP + 120, CONTENT_W - 40, 200, {
    size: 30,
    gradient: [WHITE, design.accent],
  });
  kit.gradientRect(
    MARGIN + 20,
    CONTENT_TOP + 348,
    120,
    3.4,
    design.style.gradient[0],
    design.style.gradient[1],
  );
  kit.label(by, MARGIN + 20, CONTENT_TOP + 364, { color: design.accent, size: 9, width: 300 });
  kit.label(`${model.handle}  ·  ${design.style.name}`, MARGIN + 20, CONTENT_TOP + 382, {
    color: rgba(WHITE, 0.66),
    size: 7.4,
    width: 340,
  });
  const shot = ctx.shoot(17, { mode: 'card', w: 150, h: 150 });
  kit.circle(PAGE.W - MARGIN - 74, CONTENT_TOP + 420, 74, '#0B0710', 0.9);
  kit.photo({ x: PAGE.W - MARGIN - 140, y: CONTENT_TOP + 354, w: 132, h: 132 }, shot, {
    radius: 66,
    backdrop: false,
  });
  kit.ring(PAGE.W - MARGIN - 74, CONTENT_TOP + 420, 70, design.accent, 1.4, 0.85);
}

// -------------------------------------------------------------------- 21 rates

function pageRates(kit, ctx) {
  const { design, model } = ctx;
  kit.startPage(chrome(design, 'Bookings & Rates', 21));
  kit.label('Bookings', MARGIN, CONTENT_TOP, { color: design.accent, width: 300 });
  heading(kit, design, 'Rates & packages', MARGIN, CONTENT_TOP + 16, 420, 54, { size: 32 });
  copyBlock(
    kit,
    model.photoNote ||
      'Rates are in INR per photograph. Ten photographs is the minimum order; travel, styling and usage buyout are quoted separately.',
    MARGIN,
    CONTENT_TOP + 76,
    CONTENT_W,
    40,
    { size: 8.6, color: rgba(WHITE, 0.66) },
  );

  const rate = model.photoRate || 0;
  const packages = [10, 25, 50, 100];
  const cellW = (CONTENT_W - 30) / 4;
  packages.forEach((size, index) => {
    const x = MARGIN + index * (cellW + 10);
    const y = CONTENT_TOP + 130;
    kit.roundRect(x, y, cellW, 132, 14, '#130D1C', 1);
    kit.gradientRect(x, y, cellW, 4, design.style.gradient[0], design.style.gradient[1]);
    kit.text(`${size}`, x + 12, y + 20, {
      font: 'Display',
      size: 30,
      color: WHITE,
      width: cellW - 24,
      lineGap: 0,
    });
    kit.label(size === 10 ? 'photographs · minimum' : 'photographs', x + 12, y + 58, {
      color: INK_SOFT,
      size: 6.6,
      width: cellW - 20,
    });
    kit.text(rate > 0 ? `₹${(rate * size).toLocaleString('en-IN')}` : 'On quote', x + 12, y + 84, {
      font: 'BodyBlack',
      size: 13,
      color: design.accent,
      width: cellW - 24,
      lineGap: 0,
    });
  });

  kit.roundRect(MARGIN, CONTENT_TOP + 286, CONTENT_W, 84, 14, '#130D1C', 1);
  kit.label('Rate per photograph', MARGIN + 18, CONTENT_TOP + 300, {
    color: INK_SOFT,
    size: 7.2,
    width: 200,
  });
  kit.text(
    rate > 0 ? `₹${rate.toLocaleString('en-IN')}` : 'Being finalised',
    MARGIN + 18,
    CONTENT_TOP + 314,
    {
      font: 'Display',
      size: 26,
      color: WHITE,
      width: 200,
      lineGap: 0,
    },
  );
  kit.line(MARGIN + 250, CONTENT_TOP + 300, MARGIN + 250, CONTENT_TOP + 356, rgba(WHITE, 0.16), 1);
  kit.label('Availability', MARGIN + 272, CONTENT_TOP + 300, {
    color: INK_SOFT,
    size: 7.2,
    width: 220,
  });
  kit.text(model.availability || 'On request', MARGIN + 272, CONTENT_TOP + 314, {
    font: 'BodySemi',
    size: 12,
    color: design.accent2,
    width: CONTENT_W - 292,
    lineGap: 1,
    fit: true,
    height: 40,
  });

  photoCard(
    kit,
    ctx,
    21,
    { x: MARGIN, y: CONTENT_TOP + 392, w: 236, h: 224 },
    {
      caption: `${model.name} — campaign frame`,
    },
  );
  copyBlock(
    kit,
    `Bookings open through the portfolio page: choose ${model.name}, pick a delivery date and a package, and the studio answers on WhatsApp with a confirmed quote.`,
    MARGIN + 258,
    CONTENT_TOP + 400,
    CONTENT_W - 258,
    120,
    { size: 9.2 },
  );
}

// ------------------------------------------------------------------ 22 contact

function pageContact(kit, ctx) {
  const { design, model } = ctx;
  kit.startPage(chrome(design, 'Bookings & Rates', 22));
  backgroundBleed(kit, ctx, 22, { scrimBottom: 0.48, scrimTop: 0.14 });
  kit.label('Work with her', MARGIN, CONTENT_TOP, { color: design.accent, width: 300 });
  heading(
    kit,
    design,
    `Book ${model.name.split(' ')[0] || model.name}`,
    MARGIN,
    CONTENT_TOP + 16,
    CONTENT_W * 0.8,
    64,
    {
      size: 36,
      gradient: [WHITE, design.accent],
    },
  );

  const rows = [
    ['Representation', 'THE NEVERBEEN STUDIO'],
    ['Handle', model.handle],
    ['Based in', model.location || 'Available on request'],
    [
      'Rate',
      model.photoRate > 0 ? `₹${model.photoRate.toLocaleString('en-IN')} / image` : 'On request',
    ],
  ];
  let y = CONTENT_TOP + 108;
  for (const [label, value] of rows) {
    kit.label(label, MARGIN, y, { color: INK_SOFT, size: 7.2, width: 110 });
    kit.text(value, MARGIN + 116, y - 3, {
      font: 'BodySemi',
      size: 10.4,
      color: WHITE,
      width: 240,
      lineGap: 1,
      fit: true,
      height: 26,
    });
    kit.line(MARGIN, y + 24, MARGIN + 356, y + 24, rgba(WHITE, 0.16), 0.8);
    y += 34;
  }

  kit.roundRect(MARGIN, y + 16, 356, 92, 16, '#150F20', 0.97);
  kit.gradientRect(MARGIN, y + 16, 356, 3, design.style.gradient[0], design.style.gradient[1]);
  kit.label('How a booking runs', MARGIN + 16, y + 30, {
    color: design.accent,
    size: 7.2,
    width: 300,
  });
  copyBlock(
    kit,
    'For campaign and editorial enquiries, share your brief, preferred dates and usage requirements with the studio.',
    MARGIN + 16,
    y + 44,
    324,
    52,
    { size: 8.4, color: rgba(WHITE, 0.82) },
  );

  if (model.tags.length) {
    let x = MARGIN;
    let tagY = y + 128;
    for (const tag of model.tags.slice(0, 6)) {
      const width = Math.min(tag.length * 5.9 + 24, CONTENT_W);
      if (x + width > PAGE.W - MARGIN - 170) {
        x = MARGIN;
        tagY += 26;
      }
      kit.roundRect(x, tagY, width, 20, 10, rgba(design.accent2, 0.18), 1);
      kit.outline(x, tagY, width, 20, 10, rgba(design.accent2, 0.6), 0.9);
      kit.label(tag, x + 12, tagY + 6.2, { color: WHITE, size: 6.8, width: width - 20 });
      x += width + 8;
    }
  }

  photoCard(
    kit,
    ctx,
    22,
    { x: PAGE.W - MARGIN - 168, y: CONTENT_TOP + 120, w: 168, h: 230 },
    {
      overlayKicker: model.location,
      overlayTitle: model.name,
    },
  );
}

// ----------------------------------------------------------------- 23 closing

function pageClosing(kit, ctx) {
  const { design, model } = ctx;
  kit.startPage(chrome(design, 'Editorial', 23));
  backgroundBleed(kit, ctx, 23, { scrimBottom: 0.64, scrimTop: 0.1 });
  const y = PAGE.H - FOOTER_H - 210;
  heading(kit, design, design.closingLine, MARGIN, y, CONTENT_W * 0.85, 130, {
    size: 40,
    gradient: [WHITE, design.accent],
  });
  kit.gradientRect(MARGIN, y + 140, 150, 4, design.style.gradient[0], design.style.gradient[1]);
  kit.label(`${model.name}  ·  ${model.handle}`, MARGIN, y + 156, {
    color: rgba(WHITE, 0.85),
    size: 8,
    width: 400,
  });
  kit.label('THE NEVERBEEN STUDIO', MARGIN, y + 172, {
    color: design.accent,
    size: 7.4,
    width: 400,
  });
}

// --------------------------------------------------------------- 24 back cover

function pageBackCover(kit, ctx) {
  const { design, model, meta } = ctx;
  kit.startPage(chrome(design, 'Final Frame', 24));
  backgroundBleed(kit, ctx, 24, { scrimTop: 0.26, scrimBottom: 0.64 });

  if (meta.logo) {
    const logoWidth = 280;
    const logoHeight = logoWidth / (meta.logoAspect || 3.1);
    kit.doc.image(meta.logo, PAGE.W / 2 - logoWidth / 2, CONTENT_TOP + 24, {
      width: logoWidth,
      height: logoHeight,
    });
  }

  heading(kit, design, model.name, MARGIN, CONTENT_TOP + 164, CONTENT_W, 62, {
    size: 38,
    align: 'center',
  });
  kit.label('MODEL  ·  CREATIVE COLLABORATOR', MARGIN, CONTENT_TOP + 234, {
    color: design.accent,
    size: 7.4,
    align: 'center',
    width: CONTENT_W,
  });
  kit.label(
    [model.location, model.handle].filter(Boolean).join('  ·  '),
    MARGIN,
    CONTENT_TOP + 254,
    {
      color: rgba(WHITE, 0.88),
      size: 7.2,
      align: 'center',
      width: CONTENT_W,
    },
  );
  copyBlock(kit, model.bio, MARGIN + 56, CONTENT_TOP + 296, CONTENT_W - 112, 94, {
    size: 10,
    align: 'center',
    color: rgba(WHITE, 0.96),
  });

  const highlights = ctx.highlights.slice(0, 3);
  const gap = 10;
  const widths = highlights.map((value) => Math.min(value.length * 5.8 + 28, 175));
  const totalWidth =
    widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, widths.length - 1);
  let x = (PAGE.W - totalWidth) / 2;
  highlights.forEach((value, index) => {
    const width = widths[index];
    kit.roundRect(x, CONTENT_TOP + 414, width, 24, 12, '#101319', 0.9);
    kit.outline(x, CONTENT_TOP + 414, width, 24, 12, rgba(design.accent, 0.72), 0.9);
    kit.label(value, x + 12, CONTENT_TOP + 422, {
      color: WHITE,
      size: 6.8,
      width: width - 20,
      align: 'center',
    });
    x += width + gap;
  });

  kit.gradientRect(PAGE.W / 2 - 64, CONTENT_TOP + 478, 128, 2.5, design.accent, design.accent2);
  kit.label('THE NEVERBEEN STUDIO', MARGIN, CONTENT_TOP + 498, {
    color: WHITE,
    size: 8,
    align: 'center',
    width: CONTENT_W,
  });
}

/**
 * The running order of the 24 pages. The photo-led slots rotate through the
 * editorial recipes with the model's seed, so the same builder list produces a
 * different document for every model.
 */
export function buildPages(kit, ctx) {
  const { design } = ctx;
  const recipes = [
    editorialFullBleed,
    editorialDiptych,
    editorialTriptych,
    editorialSplit,
    editorialDuotone,
    editorialPolaroids,
    editorialMosaic,
    editorialTallRibbon,
    editorialDuo,
  ];
  const start = design.variant(21) % recipes.length;
  const recipeAt = (slot) => recipes[(start + slot) % recipes.length];
  let photoCursor = 0;
  const nextPhoto = (step = 1) => {
    const value = photoCursor;
    photoCursor += step;
    return value;
  };

  const pages = [
    (k, c) => pageCover(k, c),
    (k, c) => pageContents(k, c),
    (k, c) => pageIntro(k, c),
    (k, c) => pageStats(k, c),
    (k, c) => pageMeasure(k, c),
    (k, c) => recipeAt(0)(k, c, 6, nextPhoto(2)),
    (k, c) => recipeAt(1)(k, c, 7, nextPhoto(2)),
    (k, c) => pageStory(k, c),
    (k, c) => pageEducation(k, c),
    (k, c) => pageCareer(k, c),
    (k, c) => pageAchievements(k, c),
    (k, c) => recipeAt(2)(k, c, 12, nextPhoto(3)),
    (k, c) => recipeAt(3)(k, c, 13, nextPhoto(1)),
    (k, c) => pageInterests(k, c),
    (k, c) => recipeAt(4)(k, c, 15, nextPhoto(5)),
    (k, c) => recipeAt(5)(k, c, 16, nextPhoto(1)),
    (k, c) => pageQuote(k, c),
    (k, c) => recipeAt(6)(k, c, 18, nextPhoto(4)),
    (k, c) => recipeAt(7)(k, c, 19, nextPhoto(1)),
    (k, c) => recipeAt(8)(k, c, 20, nextPhoto(2)),
    (k, c) => pageRates(k, c),
    (k, c) => pageContact(k, c),
    (k, c) => pageClosing(k, c),
    (k, c) => pageBackCover(k, c),
  ];

  for (const [index, builder] of pages.entries()) {
    ctx.pageIndex = index + 1;
    builder(kit, ctx);
  }
  kit.finishPage();
}

export { PAGE_COUNT };
