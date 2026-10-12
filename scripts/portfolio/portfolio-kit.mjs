#!/usr/bin/env node
/**
 * NeverBeen model portfolio design kit — A4 portrait (595 × 842 pt).
 *
 * The drawing primitives shared by every style of the 24-page model portfolio:
 * the brochure chrome (white logo masthead + dark copyright footer), vibrant
 * gradients, glass panels, face-safe photo frames, auto-fitting type and the
 * decorative motifs the styles compose.
 *
 * Two rules are structural, not aspirational:
 *  1. Text and photographs never overlap — every page builder reserves explicit
 *     rectangles for type and for frames, and `fitText` shrinks copy until it
 *     lives inside its own box.
 *  2. Faces are never cropped away — framed photographs are placed with
 *     `contain` (the whole frame is visible over a blurred echo of itself), and
 *     the only crops that happen are top-anchored background bleeds where the
 *     head always stays inside the frame.
 */

export const PAGE = { W: 595.28, H: 841.89 };
export const HEADER_H = 52;
export const FOOTER_H = 40;
export const MARGIN = 40;
export const CONTENT_TOP = HEADER_H + 24;
export const CONTENT_BOTTOM = PAGE.H - FOOTER_H - 18;
export const CONTENT_W = PAGE.W - MARGIN * 2;

export const INK = '#0B0710';
export const INK_SOFT = '#8D86A3';
export const WHITE = '#FFFFFF';
export const PAPER = '#F6F2EC';

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function hexToRgb(hex) {
  const clean = String(hex).replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

export function readableInk(hex) {
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? INK : WHITE;
}

/** `#FF3D6E` at 40% -> `rgba()` string, used for soft washes. */
export function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * pdfkit only understands `#hex` and colour names, so `rgba()` strings are split
 * here into a hex colour plus the opacity they carry. Every drawing primitive
 * runs its colours through this, which keeps call sites readable.
 */
export function parseColor(color, opacity = 1) {
  const match = /^rgba?\(([^)]+)\)$/i.exec(String(color).trim());
  if (!match) return { color, opacity };
  const parts = match[1].split(',').map((part) => Number.parseFloat(part));
  const hex = `#${parts
    .slice(0, 3)
    .map((part) => Math.round(part).toString(16).padStart(2, '0'))
    .join('')}`;
  return { color: hex, opacity: opacity * (parts.length > 3 ? parts[3] : 1) };
}

export class PortfolioKit {
  constructor(doc, fonts, chrome = {}) {
    this.doc = doc;
    this.fonts = fonts;
    this.chrome = chrome;
    this.page = 0;
    this.totalPages = 0;
    this.meta = [];
    this.imageCache = new Map();
  }

  registerFonts() {
    for (const [name, file] of Object.entries(this.fonts)) {
      this.doc.registerFont(name, file);
    }
  }

  get W() {
    return PAGE.W;
  }

  get H() {
    return PAGE.H;
  }

  // ------------------------------------------------------------------ document

  startPage(meta = {}) {
    this.finishPage();
    this.doc.addPage({ size: [PAGE.W, PAGE.H], margin: 0 });
    this.page += 1;
    this.meta.push({ ...meta, number: this.page });
    // Black finish: every page starts as a solid near-black canvas.
    this.rect(0, 0, PAGE.W, PAGE.H, INK, 1);
  }

  finishPage() {
    const meta = this.meta[this.meta.length - 1];
    if (!meta || meta.chrome === false) return;
    const accent = meta.accent || this.chrome.accent || '#FF3D6E';
    const accent2 = meta.accent2 || this.chrome.accent2 || accent;
    const section = meta.section || '';

    // Masthead — the NeverBeen website logo on a paper-white band, copied from
    // the visitor brochure's header (band + accent rule + section label).
    this.rect(0, 0, PAGE.W, HEADER_H, PAPER, 1);
    this.gradientRect(0, HEADER_H - 3, PAGE.W, 3, accent, accent2);
    if (this.chrome.logo) {
      const logoHeight = 34;
      const logoWidth = logoHeight * (this.chrome.logoAspect || 1408 / 768);
      this.doc.image(this.chrome.logo, MARGIN - 8, (HEADER_H - logoHeight) / 2 - 1, {
        width: logoWidth,
        height: logoHeight,
      });
    }
    if (section) {
      this.label(section, PAGE.W - MARGIN - 250, HEADER_H / 2 - 4, {
        color: accent,
        size: 7.6,
        width: 250,
        align: 'right',
      });
    }

    // Footer — the brochure's dark copyright band: © line, document label, page number.
    const footerY = PAGE.H - FOOTER_H;
    this.rect(0, footerY, PAGE.W, FOOTER_H, '#070409', 0.94);
    this.gradientRect(0, footerY, PAGE.W, 2.5, accent, accent2);
    this.text(
      `© ${this.chrome.year || new Date().getFullYear()} NeverBeen. All rights reserved.`,
      MARGIN,
      footerY + 15,
      {
        font: 'Body',
        size: 7.4,
        color: WHITE,
        opacity: 0.82,
        lineGap: 0,
        width: 250,
      },
    );
    if (this.chrome.documentLabel) {
      this.text(this.chrome.documentLabel, PAGE.W / 2 - 90, footerY + 15, {
        font: 'Body',
        size: 7.4,
        color: WHITE,
        opacity: 0.6,
        lineGap: 0,
        width: 180,
        align: 'center',
      });
    }
    this.text(
      `${String(this.page).padStart(2, '0')} / ${String(this.totalPages).padStart(2, '0')}`,
      PAGE.W - MARGIN - 70,
      footerY + 13,
      {
        font: 'BodyBlack',
        size: 9.4,
        color: accent,
        width: 70,
        align: 'right',
        lineGap: 0,
      },
    );
  }

  // ------------------------------------------------------------------ primitives

  save() {
    this.doc.save();
  }

  restore() {
    this.doc.restore();
  }

  rect(x, y, w, h, fill, opacity = 1) {
    const d = this.doc;
    const parsed = parseColor(fill, opacity);
    d.save();
    d.opacity(parsed.opacity).fillColor(parsed.color).rect(x, y, w, h).fill();
    d.restore();
  }

  roundRect(x, y, w, h, r, fill, opacity = 1) {
    const d = this.doc;
    const parsed = parseColor(fill, opacity);
    d.save();
    d.opacity(parsed.opacity).fillColor(parsed.color).roundedRect(x, y, w, h, r).fill();
    d.restore();
  }

  outline(x, y, w, h, r, stroke, lineWidth = 1, fill = null, fillOpacity = 1) {
    const d = this.doc;
    const parsed = parseColor(stroke);
    d.save();
    d.lineWidth(lineWidth).strokeColor(parsed.color).opacity(parsed.opacity);
    if (fill) {
      d.opacity(fillOpacity).fillColor(fill).roundedRect(x, y, w, h, r).fillAndStroke();
    } else {
      d.roundedRect(x, y, w, h, r).stroke();
    }
    d.restore();
  }

  circle(cx, cy, r, fill, opacity = 1) {
    const d = this.doc;
    const parsed = parseColor(fill, opacity);
    d.save();
    d.opacity(parsed.opacity).fillColor(parsed.color).circle(cx, cy, r).fill();
    d.restore();
  }

  ring(cx, cy, r, stroke, lineWidth = 1, opacity = 1) {
    const d = this.doc;
    const parsed = parseColor(stroke, opacity);
    d.save();
    d.opacity(parsed.opacity)
      .lineWidth(lineWidth)
      .strokeColor(parsed.color)
      .circle(cx, cy, r)
      .stroke();
    d.restore();
  }

  line(x1, y1, x2, y2, color, width = 1, opacity = 1) {
    const d = this.doc;
    const parsed = parseColor(color, opacity);
    d.save();
    d.opacity(parsed.opacity)
      .strokeColor(parsed.color)
      .lineWidth(width)
      .moveTo(x1, y1)
      .lineTo(x2, y2)
      .stroke();
    d.restore();
  }

  /** A two-stop linear gradient fill, optionally with a third midpoint stop. */
  gradientRect(x, y, w, h, from, to, options = {}) {
    const d = this.doc;
    const { angle = 'horizontal', mid = null, opacity = 1 } = options;
    const [x0, y0, x1, y1] =
      angle === 'vertical'
        ? [x, y, x, y + h]
        : angle === 'diagonal'
          ? [x, y, x + w, y + h]
          : [x, y, x + w, y];
    const gradient = d.linearGradient(x0, y0, x1, y1).stop(0, from);
    if (mid) gradient.stop(0.5, mid);
    gradient.stop(1, to);
    d.save();
    d.opacity(opacity).rect(x, y, w, h).fill(gradient);
    d.restore();
  }

  /** Radial glow used behind headlines and photo frames. */
  glow(cx, cy, r, color, opacity = 0.5) {
    const d = this.doc;
    const gradient = d
      .radialGradient(cx, cy, 0, cx, cy, r)
      .stop(0, color, opacity)
      .stop(1, color, 0);
    d.save();
    d.rect(cx - r, cy - r, r * 2, r * 2).fill(gradient);
    d.restore();
  }

  // ------------------------------------------------------------------ type

  /**
   * Single block of type. `width` is required for wrapping; `height` caps the
   * block and — with `fit: true` — shrinks the size until the copy fits, so a
   * headline can never spill into the next region (or onto a photograph).
   */
  text(value, x, y, options = {}) {
    const {
      font = 'Body',
      size = 10,
      color = WHITE,
      align = 'left',
      width = CONTENT_W,
      height = null,
      lineGap = 2,
      opacity = 1,
      characterSpacing = 0,
      fit = false,
      minSize = 6,
      ellipsis = false,
    } = options;
    const d = this.doc;
    const parsed = parseColor(color, opacity);
    d.save();
    d.opacity(parsed.opacity)
      .fillColor(parsed.color)
      .font(this.fonts[font] ? font : 'Body');
    let current = size;
    let copy = String(value ?? '');
    const textOptions = () => ({
      align,
      width,
      lineGap,
      characterSpacing,
      ellipsis,
      height: height ?? undefined,
    });
    if (fit && height) {
      while (current > minSize) {
        d.fontSize(current);
        const needed = d.heightOfString(copy, textOptions());
        if (needed <= height) break;
        current -= 0.5;
      }
      d.fontSize(current);
      let needed = d.heightOfString(copy, textOptions());
      while (needed > height && current > minSize) {
        // Still too tall (a single long word): trim with an ellipsis.
        copy = `${copy.replace(/\s*\S*$/, '')}…`.replace(/…+$/, '…');
        needed = d.heightOfString(copy, textOptions());
      }
    } else {
      d.fontSize(current);
    }
    d.text(copy, x, y, textOptions());
    d.restore();
    return d.y;
  }

  /** Uppercase letterspaced kicker/label. */
  label(value, x, y, options = {}) {
    return this.text(String(value ?? '').toLocaleUpperCase(), x, y, {
      font: 'BodySemi',
      size: 7.6,
      characterSpacing: 1.6,
      lineGap: 1.5,
      ...options,
    });
  }

  /**
   * A display headline inside its own box. Returns the y position after the
   * block so callers can stack copy without ever guessing heights.
   */
  headline(value, x, y, w, h, options = {}) {
    const { gradient = null, ...rest } = options;
    const d = this.doc;
    const opts = {
      font: 'Display',
      size: 30,
      color: WHITE,
      lineGap: 1,
      fit: true,
      ...rest,
      width: w,
      height: h,
    };
    if (gradient) {
      const stop = this.text(value, x, y, { ...opts, color: gradient[0] });
      // Overlay the same block in the second hue for a duotone shimmer.
      this.save();
      d.opacity(0.55);
      this.text(value, x + 0.6, y + 0.6, { ...opts, color: gradient[1] });
      this.restore();
      return stop;
    }
    return this.text(value, x, y, opts);
  }

  // ------------------------------------------------------------------ photography

  dimensions(prepared) {
    if (!this.imageCache.has(prepared.file)) {
      this.imageCache.set(prepared.file, this.doc.openImage(prepared.file));
    }
    const image = this.imageCache.get(prepared.file);
    return { width: image.width, height: image.height };
  }

  /**
   * Places a prepared photograph.
   *  - `contain` (default for framed cards): the whole photograph is visible —
   *    no crop at all — over a blurred, darkened echo of itself that fills the
   *    frame, so a portrait never loses its face and the card never shows a
   *    hard letterbox.
   *  - `bleed`: a top-anchored cover crop for full-page backgrounds; the head
   *    stays inside the frame because the crop only ever eats the bottom.
   */
  photo(frame, prepared, options = {}) {
    const { fit = 'contain', opacity = 1, radius = 10, backdrop = true, scrim = null } = options;
    const d = this.doc;
    if (!prepared?.file) return;

    if (fit === 'bleed') {
      d.save();
      d.opacity(opacity);
      d.image(prepared.file, frame.x, frame.y, { width: frame.w, height: frame.h });
      d.restore();
      if (scrim)
        this.gradientRect(frame.x, frame.y, frame.w, frame.h, scrim[0], scrim[1], {
          angle: 'vertical',
          opacity: scrim[2] ?? 0.75,
        });
      return;
    }

    const { width, height } = this.dimensions(prepared);
    if (backdrop && prepared.backdrop) {
      d.save();
      if (radius > 0) {
        d.roundedRect(frame.x, frame.y, frame.w, frame.h, radius).clip();
      }
      d.opacity(0.9).image(prepared.backdrop, frame.x, frame.y, {
        width: frame.w,
        height: frame.h,
      });
      this.rect(frame.x, frame.y, frame.w, frame.h, INK, 0.52);
      d.restore();
    } else if (backdrop) {
      this.roundRect(frame.x, frame.y, frame.w, frame.h, radius, '#14101C', 1);
    }

    const scale = Math.min(frame.w / width, frame.h / height);
    const w = width * scale;
    const h = height * scale;
    const x = frame.x + (frame.w - w) / 2;
    const y = frame.y + (frame.h - h) / 2;
    d.save();
    d.opacity(opacity);
    d.image(prepared.file, x, y, { width: w, height: h });
    d.restore();
    if (radius > 0) {
      this.outline(frame.x, frame.y, frame.w, frame.h, radius, rgba(WHITE, 0.2), 0.9);
    }
  }

  // ------------------------------------------------------------------ motifs

  dotGrid(x, y, cols, rows, step, color, opacity = 0.5, r = 1.1) {
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        this.circle(x + col * step, y + row * step, r, color, opacity);
      }
    }
  }

  /** Thin diagonal slash band — a signature of the ultra-modern styles. */
  slashBand(x, y, w, h, color, count = 7, opacity = 0.55, thickness = 2) {
    const d = this.doc;
    d.save();
    d.opacity(opacity).strokeColor(color).lineWidth(thickness);
    const step = w / count;
    for (let index = 0; index < count; index += 1) {
      const left = x + index * step;
      d.moveTo(left, y + h)
        .lineTo(left + step * 0.62, y)
        .stroke();
    }
    d.restore();
  }

  arc(cx, cy, r, start, end, color, width = 1.4, opacity = 0.8) {
    const d = this.doc;
    d.save();
    d.opacity(opacity).lineWidth(width).strokeColor(color);
    d.moveTo(cx + r * Math.cos(start), cy + r * Math.sin(start));
    d.arc(cx, cy, r, start, end);
    d.stroke();
    d.restore();
  }

  /** Big ghosted index numeral, clipped to its own column so it never touches copy. */
  numeral(value, x, y, size, color, opacity = 0.16) {
    this.text(String(value).padStart(2, '0'), x, y, {
      font: 'Display',
      size,
      color,
      opacity,
      lineGap: 0,
      width: size * 1.4,
    });
  }

  /** A stat chip: value in display type over a letterspaced label. */
  stat(x, y, w, h, value, labelText, options = {}) {
    const {
      accent = '#FF3D6E',
      panel = rgba(WHITE, 0.06),
      valueColor = WHITE,
      labelColor = INK_SOFT,
      radius = 12,
      valueSize = 26,
    } = options;
    this.roundRect(x, y, w, h, radius, '#120D1A', 1);
    this.roundRect(x, y, w, h, radius, panel, 1);
    this.roundRect(x, y, 3.5, h, 2, accent, 0.95);
    this.text(value, x + 14, y + h / 2 - valueSize * 0.72, {
      font: 'Display',
      size: valueSize,
      color: valueColor,
      lineGap: 0,
      width: w - 24,
      height: valueSize * 1.2,
      fit: true,
    });
    this.label(labelText, x + 14, y + h / 2 + valueSize * 0.42, {
      color: labelColor,
      size: 7,
      width: w - 24,
    });
  }

  /** Radial measurement dial — the illustrative treatment of the body stats. */
  dial(cx, cy, r, value, labelText, options = {}) {
    const {
      accent = '#FF3D6E',
      accent2 = '#8A2BE2',
      track = rgba(WHITE, 0.12),
      sweep = 0.78,
    } = options;
    this.ring(cx, cy, r, track, 3.4, 1);
    const start = Math.PI * 0.75;
    const end = start + Math.PI * 1.5 * sweep;
    this.arc(cx, cy, r, start, end, accent, 3.4, 0.95);
    this.circle(cx + r * Math.cos(end), cy + r * Math.sin(end), 3, accent2, 1);
    this.text(value, cx - r, cy - 9, {
      font: 'Display',
      size: 17,
      color: WHITE,
      align: 'center',
      width: r * 2,
      lineGap: 0,
      fit: true,
      height: 22,
    });
    this.label(labelText, cx - r, cy + 10, {
      color: INK_SOFT,
      size: 6.6,
      align: 'center',
      width: r * 2,
    });
  }
}
