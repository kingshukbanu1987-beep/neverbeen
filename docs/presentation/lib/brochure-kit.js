/*
 * NeverBeen brochure design kit.
 *
 * Small set of drawing primitives shared by the brochure generator:
 * vibrant gradients, glass panels, photo cards, chips, badges and type helpers.
 * Everything is drawn on an A4 landscape canvas (842 × 595 pt).
 */
const fs = require('fs');
const path = require('path');

const PAGE = { W: 842, H: 595 };
const HEADER_H = 46;
const FOOTER_H = 38;
const MARGIN = 56;
const CONTENT_TOP = HEADER_H + 26;
const CONTENT_BOTTOM = PAGE.H - FOOTER_H - 18;

const INK = '#1B1033';
const INK_SOFT = '#4B4463';
const CREAM = '#FFF8EE';
const WHITE = '#FFFFFF';

/** Vibrant, sunset-through-neon gradients — one look per page. */
const GRADIENTS = {
  sunset: ['#FF9A2E', '#FF3D6E'],
  coral: ['#FF6A88', '#C4218E'],
  berry: ['#E73895', '#6C1BC0'],
  violet: ['#8A2BE2', '#FF2D95'],
  night: ['#2B1055', '#7597DE'],
  midnight: ['#120B2E', '#4B1E8C'],
  ocean: ['#00C2FF', '#0B49C9'],
  teal: ['#00D2A8', '#0077B6'],
  lime: ['#B4F461', '#00A86B'],
  mint: ['#7BE495', '#0E9F8A'],
  gold: ['#FFE066', '#FF8A00'],
  mango: ['#FFC93C', '#FF6B00'],
  flame: ['#FF8A00', '#D80073'],
  sky: ['#7FD8FF', '#2B6CFF'],
  grape: ['#B621FE', '#1FD1F9'],
  rose: ['#FF9BC4', '#E8116B'],
  jade: ['#3EE6A0', '#0B7A75'],
  dawn: ['#FFB86B', '#E5397F'],
};
/** Accent colours used for chips, ticks, rules and page numbers. */
const ACCENTS = ['#FF3D6E', '#8A2BE2', '#00A86B', '#FF8A00', '#0B49C9', '#E8116B', '#0E9F8A'];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

/** Picks the most readable ink for a background colour. */
function readableInk(hex) {
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? INK : WHITE;
}

class BrochureKit {
  constructor(doc, fonts) {
    this.doc = doc;
    this.fonts = fonts;
    this.imageCache = new Map();
    this.page = 0;
    this.totalPages = 0;
    this.meta = [];
    this.chromeOptions = {};
  }

  // ------------------------------------------------------------------ document

  registerFonts() {
    const d = this.doc;
    for (const [name, file] of Object.entries(this.fonts)) {
      d.registerFont(name, file);
    }
  }

  get W() {
    return PAGE.W;
  }

  get H() {
    return PAGE.H;
  }

  /** Year printed in the footer of every page. */
  setChrome(options) {
    this.chromeOptions = { ...this.chromeOptions, ...options };
  }

  openImage(file) {
    if (!this.imageCache.has(file)) {
      this.imageCache.set(file, this.doc.openImage(file));
    }
    return this.imageCache.get(file);
  }

  // ------------------------------------------------------------------ helpers

  save() {
    this.doc.save();
  }

  restore() {
    this.doc.restore();
  }

  rect(x, y, w, h, fill, opacity = 1) {
    const d = this.doc;
    d.save();
    d.opacity(opacity).fillColor(fill).rect(x, y, w, h).fill();
    d.restore();
  }

  roundRect(x, y, w, h, r, fill, opacity = 1) {
    const d = this.doc;
    d.save();
    d.opacity(opacity).fillColor(fill).roundedRect(x, y, w, h, r).fill();
    d.restore();
  }

  outline(x, y, w, h, r, stroke, lineWidth = 1, fill = null, fillOpacity = 1) {
    const d = this.doc;
    d.save();
    d.lineWidth(lineWidth).strokeColor(stroke);
    if (fill) {
      d.opacity(fillOpacity).fillColor(fill).roundedRect(x, y, w, h, r).fillAndStroke();
    } else {
      d.roundedRect(x, y, w, h, r).stroke();
    }
    d.restore();
  }

  circle(cx, cy, r, fill, opacity = 1) {
    const d = this.doc;
    d.save();
    d.opacity(opacity).fillColor(fill).circle(cx, cy, r).fill();
    d.restore();
  }

  ring(cx, cy, r, stroke, lineWidth = 1, opacity = 1) {
    const d = this.doc;
    d.save();
    d.opacity(opacity).lineWidth(lineWidth).strokeColor(stroke).circle(cx, cy, r).stroke();
    d.restore();
  }

  line(x1, y1, x2, y2, color, width = 1, opacity = 1) {
    const d = this.doc;
    d.save();
    d.opacity(opacity).strokeColor(color).lineWidth(width).moveTo(x1, y1).lineTo(x2, y2).stroke();
    d.restore();
  }

  /** Soft shadow used under photo cards and panels. */
  shadow(x, y, w, h, r, opacity = 0.18) {
    this.roundRect(x + 3, y + 5, w, h, r, '#1B1033', opacity);
  }

  // ------------------------------------------------------------------ type

  text(value, x, y, opts = {}) {
    const {
      font = 'Body',
      size = 10,
      color = INK,
      width = PAGE.W - MARGIN * 2,
      align = 'left',
      lineGap = 2,
      characterSpacing = 0,
      opacity = 1,
      height,
    } = opts;
    const d = this.doc;
    // A bounded height keeps PDFKit from paginating when a block of copy
    // reaches the bottom of the sheet: the brochure draws its own pages.
    const boxHeight = height || Math.max(12, PAGE.H - y - 2);
    d.save();
    d.opacity(opacity).font(font).fontSize(size).fillColor(color).text(String(value), x, y, {
      width,
      align,
      lineGap,
      characterSpacing,
      height: boxHeight,
    });
    d.restore();
    return d.y;
  }

  /** Exact rendered width of a single line, including letter spacing. */
  textWidth(value, opts = {}) {
    const { font = 'Body', size = 10, characterSpacing = 0 } = opts;
    const d = this.doc;
    d.font(font).fontSize(size);
    return d.widthOfString(String(value)) + characterSpacing * String(value).length;
  }

  height(value, opts = {}) {
    const { font = 'Body', size = 10, width = 400, lineGap = 2, characterSpacing = 0 } = opts;
    const d = this.doc;
    d.font(font).fontSize(size);
    return d.heightOfString(String(value), { width, lineGap, characterSpacing });
  }

  /**
   * Draws text inside a fixed box, shrinking the font until it fits.
   * Returns the y position after the text.
   */
  fit(value, x, y, w, h, opts = {}) {
    const {
      font = 'Body',
      size = 10,
      minSize = 6.4,
      color = INK,
      lineGap = 2,
      align = 'left',
      characterSpacing = 0,
      opacity = 1,
    } = opts;

    let chosen = size;
    while (chosen > minSize) {
      const needed = this.height(value, {
        font,
        size: chosen,
        width: w,
        lineGap,
        characterSpacing,
      });
      if (needed <= h) break;
      chosen -= 0.4;
    }

    return this.text(value, x, y, {
      font,
      size: chosen,
      color,
      width: w,
      height: h,
      align,
      lineGap,
      characterSpacing,
      opacity,
    });
  }

  display(value, x, y, opts = {}) {
    return this.text(value, x, y, { font: 'Display', size: 30, lineGap: 1, ...opts });
  }

  label(value, x, y, opts = {}) {
    return this.text(String(value).toUpperCase(), x, y, {
      font: 'BodyBold',
      size: 8,
      characterSpacing: 1.6,
      lineGap: 0,
      ...opts,
    });
  }

  body(value, x, y, opts = {}) {
    return this.text(value, x, y, { font: 'Body', size: 10, color: INK_SOFT, ...opts });
  }

  // ------------------------------------------------------------------ layout blocks

  /** Full-bleed vibrant gradient page background. */
  background(stops, decor = 'circles', accent = ACCENTS[0]) {
    const d = this.doc;
    const grad = d.linearGradient(0, 0, PAGE.W, PAGE.H);
    grad.stop(0, stops[0]).stop(0.55, stops[1]).stop(1, stops[0]);
    d.save();
    d.rect(0, 0, PAGE.W, PAGE.H).fill(grad);
    d.restore();
    this.decorate(decor, accent);
  }

  decorate(style, accent) {
    const { W, H } = PAGE;
    switch (style) {
      case 'circles':
        this.circle(W - 90, 120, 150, WHITE, 0.08);
        this.circle(70, H - 80, 110, WHITE, 0.06);
        this.circle(W - 260, H - 40, 70, WHITE, 0.05);
        break;
      case 'rings':
        this.ring(W - 120, 140, 130, WHITE, 22, 0.1);
        this.ring(W - 120, 140, 90, WHITE, 14, 0.08);
        this.ring(60, H - 90, 80, WHITE, 16, 0.07);
        break;
      case 'dots': {
        for (let row = 0; row < 6; row += 1) {
          for (let col = 0; col < 14; col += 1) {
            this.circle(40 + col * 58, 96 + row * 74, 3.2, WHITE, 0.16);
          }
        }
        break;
      }
      case 'blobs': {
        const d = this.doc;
        d.save();
        d.opacity(0.12).fillColor(WHITE);
        d.moveTo(W - 260, 0);
        d.bezierCurveTo(W - 40, 90, W - 150, 230, W + 40, 300);
        d.lineTo(W, 0);
        d.fill();
        d.restore();
        this.circle(60, H - 70, 96, WHITE, 0.08);
        break;
      }
      case 'ribbon': {
        const d = this.doc;
        d.save();
        d.opacity(0.14).fillColor(accent);
        d.moveTo(0, 150);
        d.lineTo(W, 96);
        d.lineTo(W, 132);
        d.lineTo(0, 186);
        d.fill();
        d.restore();
        this.circle(W - 70, H - 90, 120, WHITE, 0.07);
        break;
      }
      case 'sunburst': {
        const d = this.doc;
        for (let i = 0; i < 14; i += 1) {
          d.save();
          d.opacity(0.07).fillColor(WHITE);
          d.rotate(-18 + i * 3.4, { origin: [PAGE.W - 20, 40] });
          d.moveTo(PAGE.W - 20, 40)
            .lineTo(PAGE.W + 420, -10)
            .lineTo(PAGE.W + 420, 40)
            .fill();
          d.restore();
        }
        this.circle(40, H - 60, 70, WHITE, 0.08);
        break;
      }
      default:
        break;
    }
  }

  /** White glass panel used to hold readable text on a vibrant background. */
  glass(x, y, w, h, opts = {}) {
    const { radius = 18, opacity = 0.93, fill = WHITE, shadow = true, stroke = null } = opts;
    if (shadow) this.shadow(x, y, w, h, radius, 0.16);
    this.roundRect(x, y, w, h, radius, fill, opacity);
    if (stroke) this.outline(x, y, w, h, radius, stroke, 0.8);
  }

  /** Coloured card (opaque) with an optional accent bar along the top. */
  card(x, y, w, h, opts = {}) {
    const {
      fill = CREAM,
      radius = 16,
      accent = null,
      accentHeight = 5,
      shadow = true,
      opacity = 1,
    } = opts;
    if (shadow) this.shadow(x, y, w, h, radius, 0.14);
    this.roundRect(x, y, w, h, radius, fill, opacity);
    if (accent) {
      this.doc.save();
      this.doc.roundedRect(x, y, w, h, radius).clip();
      this.roundRect(x, y, w, accentHeight, radius, accent, 1);
      this.doc.restore();
    }
  }

  /** Photo with a white frame, soft shadow and optional caption bar. */
  photo(file, x, y, w, h, opts = {}) {
    const {
      radius = 14,
      frame = 5,
      caption = null,
      captionColor = INK,
      captionBg = WHITE,
      captionOpacity = 0.94,
      badge = null,
      badgeColor = null,
      captionHeight = null,
      shadow = true,
    } = opts;

    const frameW = w;
    const frameH = h;
    if (shadow) this.shadow(x, y, frameW, frameH, radius, 0.2);
    this.roundRect(x, y, frameW, frameH, radius, frame, 1);

    const innerX = x + frame;
    const innerY = y + frame;
    const innerW = frameW - frame * 2;
    const innerH = frameH - frame * 2 - (caption ? captionHeight || 34 : 0);

    try {
      const image = this.openImage(file);
      const scale = Math.max(innerW / image.width, innerH / image.height);
      const iw = image.width * scale;
      const ih = image.height * scale;
      const d = this.doc;
      d.save();
      d.roundedRect(innerX, innerY, innerW, innerH, radius - 4).clip();
      d.image(
        image,
        innerX + (innerW - iw) / 2,
        innerY + (innerH - ih) / 2 - (ih - innerH) * 0.15,
        { width: iw, height: ih },
      );
      d.restore();
    } catch (error) {
      this.roundRect(innerX, innerY, innerW, innerH, radius - 4, '#E6E1F2', 1);
      this.label('photo', innerX + 10, innerY + 10, { color: INK_SOFT, size: 7 });
    }

    if (badge) {
      const color = badgeColor || ACCENTS[2];
      this.roundRect(innerX + 8, innerY + 8, Math.min(innerW - 16, 96), 18, 9, color, 0.96);
      this.label(badge, innerX + 16, innerY + 13, { color: WHITE, size: 7, characterSpacing: 1.1 });
    }

    if (caption) {
      const capH = captionHeight || 34;
      this.roundRect(
        x + frame,
        y + frameH - capH - frame,
        innerW,
        capH,
        radius - 4,
        captionBg,
        captionOpacity,
      );
      this.text(caption, x + frame + 10, y + frameH - capH - frame + 9, {
        font: 'BodySemi',
        size: 8.4,
        color: captionColor,
        width: innerW - 20,
        lineGap: 0.5,
      });
    }
    return { x, y, w: frameW, h: frameH };
  }

  /** Round sticker with a big number or short glyph. */
  badge(text, cx, cy, r, opts = {}) {
    const { fill = ACCENTS[0], color = WHITE, size = null, ring: ringColor = null } = opts;
    if (ringColor) this.circle(cx, cy, r + 3, ringColor, 0.35);
    this.circle(cx, cy, r, fill, 1);
    this.text(text, cx - r, cy - (size || r * 0.62) * 0.62, {
      font: 'BodyBlack',
      size: size || r * 0.92,
      color,
      width: r * 2,
      align: 'center',
      lineGap: 0,
    });
  }

  /** Pill with optional leading dot; returns the pill width. */
  chip(text, x, y, opts = {}) {
    const {
      fill = WHITE,
      color = INK,
      size = 8.6,
      height = 22,
      opacity = 1,
      font = 'BodySemi',
      padding = 12,
      dot = null,
      stroke = null,
    } = opts;
    const width = this.textWidth(text, { font, size }) + padding * 2 + (dot ? 12 : 0);
    this.roundRect(x, y, width, height, height / 2, fill, opacity);
    if (stroke) this.outline(x, y, width, height, height / 2, stroke, 0.8);
    const textX = dot ? x + padding + 12 : x + padding;
    if (dot) this.circle(x + padding + 3.5, y + height / 2, 3.4, dot, 1);
    this.text(text, textX, y + height / 2 - size * 0.62, {
      font,
      size,
      color,
      width: 900,
      lineGap: 0,
    });
    return width;
  }

  /** Flowing row of chips that wraps inside maxWidth; returns the y below the row. */
  chipRow(items, x, y, maxWidth, opts = {}) {
    const { gap = 7, lineGap = 7, height = 22 } = opts;
    let cursorX = x;
    let cursorY = y;
    for (const item of items) {
      const spec = typeof item === 'string' ? { text: item } : item;
      const width =
        this.textWidth(spec.text, {
          font: spec.font || opts.font || 'BodySemi',
          size: spec.size || opts.size || 8.6,
        }) +
        (spec.padding || opts.padding || 12) * 2 +
        (spec.dot ? 12 : 0);
      if (cursorX + width > x + maxWidth && cursorX > x) {
        cursorX = x;
        cursorY += height + lineGap;
      }
      this.chip(spec.text, cursorX, cursorY, { ...opts, ...spec, height: spec.height || height });
      cursorX += width + gap;
    }
    return cursorY + height;
  }

  /** Drawn tick mark (fonts have no check glyph). */
  tick(cx, cy, size, color = WHITE, width = 2) {
    const d = this.doc;
    d.save();
    d.strokeColor(color).lineWidth(width).lineCap('round');
    d.moveTo(cx - size * 0.5, cy + size * 0.02)
      .lineTo(cx - size * 0.12, cy + size * 0.42)
      .lineTo(cx + size * 0.55, cy - size * 0.45)
      .stroke();
    d.restore();
  }

  cross(cx, cy, size, color = WHITE, width = 2) {
    const d = this.doc;
    d.save();
    d.strokeColor(color).lineWidth(width).lineCap('round');
    d.moveTo(cx - size * 0.4, cy - size * 0.4).lineTo(cx + size * 0.4, cy + size * 0.4);
    d.moveTo(cx + size * 0.4, cy - size * 0.4).lineTo(cx - size * 0.4, cy + size * 0.4);
    d.stroke();
    d.restore();
  }

  /** Bulleted list with a hanging indent; returns bottom y. */
  bullets(items, x, y, w, opts = {}) {
    const {
      size = 9.4,
      color = INK_SOFT,
      dot = ACCENTS[0],
      gap = 5,
      font = 'Body',
      lineGap = 2.4,
    } = opts;
    let cursor = y;
    for (const item of items) {
      this.circle(x + 3.4, cursor + size * 0.52, 2.6, dot, 1);
      const next = this.text(item, x + 14, cursor, {
        font,
        size,
        color,
        width: w - 14,
        lineGap,
      });
      cursor = next + gap;
    }
    return cursor;
  }

  /** Tick-list used by checklists; returns bottom y. */
  checklist(items, x, y, w, opts = {}) {
    const { size = 9.4, color = INK_SOFT, bubble = ACCENTS[2], gap = 6, lineGap = 2.4 } = opts;
    let cursor = y;
    for (const item of items) {
      this.circle(x + 6, cursor + size * 0.55, 6, bubble, 1);
      this.tick(x + 6, cursor + size * 0.55, 6.4, WHITE, 1.4);
      const next = this.text(item, x + 19, cursor, {
        font: 'Body',
        size,
        color,
        width: w - 19,
        lineGap,
      });
      cursor = next + gap;
    }
    return cursor;
  }

  /** Numbered step block with a connector line; returns bottom y. */
  step(number, title, copy, x, y, w, opts = {}) {
    const { accent = ACCENTS[0], size = 9.4, titleSize = 11 } = opts;
    this.badge(number, x + 15, y + 15, 15, { fill: accent, size: 13 });
    this.text(title, x + 40, y + 6, {
      font: 'BodyBold',
      size: titleSize,
      color: INK,
      width: w - 40,
    });
    const bottom = this.fit(copy, x + 40, y + 22, w - 40, 60, {
      size,
      minSize: 7,
      color: INK_SOFT,
      lineGap: 2.2,
    });
    return Math.max(bottom, y + 40);
  }

  /** Icon drawn from primitives (the fonts carry no icon glyphs). */
  icon(name, cx, cy, r, color) {
    const d = this.doc;
    d.save();
    d.fillColor(color)
      .strokeColor(color)
      .lineWidth(Math.max(1, r * 0.16))
      .lineCap('round');
    switch (name) {
      case 'globe':
        d.circle(cx, cy, r).stroke();
        d.ellipse(cx, cy, r * 0.45, r).stroke();
        d.moveTo(cx - r, cy)
          .lineTo(cx + r, cy)
          .stroke();
        break;
      case 'camera':
        d.roundedRect(cx - r, cy - r * 0.68, r * 2, r * 1.36, r * 0.22).stroke();
        d.circle(cx, cy + r * 0.04, r * 0.42).stroke();
        d.roundedRect(cx - r * 0.36, cy - r * 1.02, r * 0.72, r * 0.34, r * 0.1).fill();
        break;
      case 'plane':
        d.moveTo(cx - r, cy + r * 0.5)
          .lineTo(cx + r, cy - r * 0.55)
          .lineTo(cx + r * 0.1, cy + r * 0.15)
          .lineTo(cx + r * 0.2, cy + r * 0.75)
          .lineTo(cx - r * 0.05, cy + r * 0.3)
          .fill();
        break;
      case 'clock':
        d.circle(cx, cy, r).stroke();
        d.moveTo(cx, cy)
          .lineTo(cx, cy - r * 0.6)
          .stroke();
        d.moveTo(cx, cy)
          .lineTo(cx + r * 0.45, cy + r * 0.2)
          .stroke();
        break;
      case 'shield':
        d.moveTo(cx, cy - r);
        d.lineTo(cx + r * 0.82, cy - r * 0.5);
        d.lineTo(cx + r * 0.6, cy + r * 0.66);
        d.lineTo(cx, cy + r);
        d.lineTo(cx - r * 0.6, cy + r * 0.66);
        d.lineTo(cx - r * 0.82, cy - r * 0.5);
        d.closePath().fill();
        break;
      case 'star': {
        const points = [];
        for (let i = 0; i < 10; i += 1) {
          const radius = i % 2 === 0 ? r : r * 0.44;
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
        }
        d.moveTo(points[0][0], points[0][1]);
        points.slice(1).forEach(([px, py]) => d.lineTo(px, py));
        d.closePath().fill();
        break;
      }
      case 'heart':
        d.moveTo(cx, cy + r * 0.72);
        d.bezierCurveTo(
          cx - r * 1.5,
          cy - r * 0.32,
          cx - r * 0.42,
          cy - r * 1.24,
          cx,
          cy - r * 0.3,
        );
        d.bezierCurveTo(
          cx + r * 0.42,
          cy - r * 1.24,
          cx + r * 1.5,
          cy - r * 0.32,
          cx,
          cy + r * 0.72,
        );
        d.fill();
        break;
      case 'chat':
        d.roundedRect(cx - r, cy - r * 0.8, r * 2, r * 1.3, r * 0.3).stroke();
        d.moveTo(cx - r * 0.2, cy + r * 0.5)
          .lineTo(cx - r * 0.5, cy + r)
          .lineTo(cx + r * 0.2, cy + r * 0.45)
          .fill();
        break;
      case 'lock':
        d.roundedRect(cx - r * 0.78, cy - r * 0.16, r * 1.56, r * 1.16, r * 0.22).fill();
        d.moveTo(cx - r * 0.44, cy - r * 0.18).lineTo(cx - r * 0.44, cy - r * 0.62);
        d.bezierCurveTo(
          cx - r * 0.44,
          cy - r * 1.18,
          cx + r * 0.44,
          cy - r * 1.18,
          cx + r * 0.44,
          cy - r * 0.62,
        );
        d.lineTo(cx + r * 0.44, cy - r * 0.18).stroke();
        break;
      case 'spark':
        d.moveTo(cx, cy - r).lineTo(cx + r * 0.26, cy - r * 0.26);
        d.lineTo(cx + r, cy).lineTo(cx + r * 0.26, cy + r * 0.26);
        d.lineTo(cx, cy + r).lineTo(cx - r * 0.26, cy + r * 0.26);
        d.lineTo(cx - r, cy).lineTo(cx - r * 0.26, cy - r * 0.26);
        d.closePath().fill();
        break;
      case 'pin':
        d.circle(cx, cy - r * 0.3, r * 0.5).stroke();
        d.moveTo(cx - r * 0.36, cy + r * 0.02)
          .lineTo(cx, cy + r)
          .lineTo(cx + r * 0.36, cy + r * 0.02)
          .fill();
        break;
      case 'wallet':
        d.roundedRect(cx - r, cy - r * 0.72, r * 2, r * 1.44, r * 0.24).fill();
        d.circle(cx + r * 0.44, cy, r * 0.2)
          .fillColor(WHITE)
          .fill();
        break;
      case 'mail':
        d.roundedRect(cx - r, cy - r * 0.68, r * 2, r * 1.36, r * 0.18).stroke();
        d.moveTo(cx - r * 0.9, cy - r * 0.5)
          .lineTo(cx, cy + r * 0.16)
          .lineTo(cx + r * 0.9, cy - r * 0.5)
          .stroke();
        break;
      case 'tick':
        this.tick(cx, cy, r * 1.6, color, Math.max(1.6, r * 0.34));
        break;
      default:
        d.circle(cx, cy, r * 0.5).fill();
        break;
    }
    d.restore();
  }

  // ------------------------------------------------------------------ chrome

  /** Remembers what the header/footer of the current page should say. */
  startPage(meta) {
    this.finishPage();
    this.doc.addPage({ size: [PAGE.W, PAGE.H], margin: 0 });
    this.page += 1;
    this.meta.push({ ...meta, number: this.page });
  }

  /** Header band (logo + section) and footer (copyright + page). */
  finishPage(options = {}) {
    const meta = this.meta[this.meta.length - 1];
    if (!meta || meta.chrome === false) return;
    const opts = { ...this.chromeOptions, ...options };
    if (meta.chrome === 'dark') return this.finishDarkPage(opts);
    const { accent = ACCENTS[0], section = '' } = meta;

    // header
    this.roundRect(0, 0, PAGE.W, HEADER_H, 0, WHITE, 0.97);
    this.roundRect(0, HEADER_H - 3, PAGE.W, 3, 0, accent, 1);
    this.icon('plane', 38, HEADER_H / 2, 9, accent);
    this.text('NEVERBEEN', 54, HEADER_H / 2 - 7.6, {
      font: 'BodyBlack',
      size: 13.4,
      color: INK,
      characterSpacing: 0.6,
      lineGap: 0,
      width: 200,
    });
    if (section) {
      this.label(section, PAGE.W - MARGIN - 260, HEADER_H / 2 - 3.6, {
        color: accent,
        size: 8,
        width: 260,
        align: 'right',
      });
    }

    // footer
    const footerY = PAGE.H - FOOTER_H;
    this.roundRect(0, footerY, PAGE.W, FOOTER_H, 0, WHITE, 0.97);
    this.roundRect(0, footerY, PAGE.W, 2.5, 0, accent, 1);
    this.text(
      `© ${opts.year || new Date().getFullYear()} NeverBeen. All rights reserved.`,
      MARGIN,
      footerY + 15,
      {
        font: 'Body',
        size: 7.4,
        color: INK_SOFT,
        lineGap: 0,
        width: 300,
      },
    );
    this.text(
      `${String(this.page).padStart(2, '0')} / ${String(this.totalPages).padStart(2, '0')}`,
      PAGE.W - MARGIN - 90,
      footerY + 13,
      {
        font: 'BodyBlack',
        size: 9.4,
        color: accent,
        width: 90,
        align: 'right',
        lineGap: 0,
      },
    );
  }

  /** Dark translucent footer used on the cover and back cover. */
  finishDarkPage(options = {}) {
    const meta = this.meta[this.meta.length - 1];
    if (!meta) return;
    const opts = { ...this.chromeOptions, ...options };
    const { accent = ACCENTS[0] } = meta;
    const footerY = PAGE.H - FOOTER_H;
    this.roundRect(0, 0, PAGE.W, HEADER_H, 0, '#1B1033', 0.55);
    this.icon('plane', 38, HEADER_H / 2, 9, WHITE);
    this.text('NEVERBEEN', 54, HEADER_H / 2 - 7.6, {
      font: 'BodyBlack',
      size: 13.4,
      color: WHITE,
      characterSpacing: 0.6,
      lineGap: 0,
      width: 200,
    });
    if (meta.section) {
      this.label(meta.section, PAGE.W - MARGIN - 260, HEADER_H / 2 - 3.6, {
        color: WHITE,
        size: 8,
        width: 260,
        align: 'right',
      });
    }
    this.roundRect(0, footerY, PAGE.W, FOOTER_H, 0, '#1B1033', 0.72);
    this.roundRect(0, footerY, PAGE.W, 2.5, 0, accent, 1);
    this.text(
      `© ${opts.year || new Date().getFullYear()} NeverBeen. All rights reserved.`,
      MARGIN,
      footerY + 15,
      {
        font: 'Body',
        size: 7.4,
        color: WHITE,
        opacity: 0.88,
        lineGap: 0,
        width: 300,
      },
    );
    this.text(
      `${String(this.page).padStart(2, '0')} / ${String(this.totalPages).padStart(2, '0')}`,
      PAGE.W - MARGIN - 90,
      footerY + 13,
      {
        font: 'BodyBlack',
        size: 9.4,
        color: WHITE,
        width: 90,
        align: 'right',
        lineGap: 0,
      },
    );
  }

  /** Standard inner-page heading: eyebrow, big title, optional intro. */
  heading(x, y, w, opts = {}) {
    const {
      eyebrow,
      title,
      intro,
      accent = ACCENTS[0],
      titleSize = 27,
      color = WHITE,
      introColor = WHITE,
      introOpacity = 0.92,
    } = opts;
    let cursor = y;
    if (eyebrow) {
      this.label(eyebrow, x, cursor, { color: accent === WHITE ? WHITE : accent, size: 8.2 });
      cursor += 14;
    }
    cursor = this.fit(title, x, cursor, w, 78, {
      font: 'Display',
      size: titleSize,
      minSize: 18,
      color,
      lineGap: 0.5,
    });
    if (intro) {
      cursor = this.fit(intro, x, cursor + 6, w, 46, {
        font: 'Body',
        size: 9.8,
        minSize: 8,
        color: introColor,
        opacity: introOpacity,
        lineGap: 2.6,
      });
    }
    return cursor;
  }

  /** Panel with a heading and a list of short feature lines. */
  featurePanel(x, y, w, h, opts = {}) {
    const {
      accent = ACCENTS[0],
      icon = 'star',
      title,
      items = [],
      fill = WHITE,
      opacity = 0.95,
      copy = null,
    } = opts;
    this.glass(x, y, w, h, { fill, opacity, radius: 16 });
    this.roundRect(x, y, w, 5, 3, accent, 1);
    this.circle(x + 30, y + 34, 15, accent, 1);
    this.icon(icon, x + 30, y + 34, 9, WHITE);
    this.fit(title, x + 54, y + 22, w - 70, 30, {
      font: 'BodyBold',
      size: 11.6,
      minSize: 9,
      color: INK,
      lineGap: 1,
    });
    let cursor = y + 56;
    if (copy) {
      cursor =
        this.fit(copy, x + 20, cursor, w - 40, 60, {
          size: 9,
          minSize: 7.4,
          color: INK_SOFT,
          lineGap: 2.4,
        }) + 4;
    }
    if (items.length) {
      cursor = this.bullets(items, x + 20, cursor, w - 40, { size: 8.8, dot: accent, gap: 4 });
    }
    return cursor;
  }
}

module.exports = {
  BrochureKit,
  PAGE,
  HEADER_H,
  FOOTER_H,
  MARGIN,
  CONTENT_TOP,
  CONTENT_BOTTOM,
  INK,
  INK_SOFT,
  CREAM,
  WHITE,
  GRADIENTS,
  ACCENTS,
  readableInk,
  clamp,
  hexToRgb,
};
