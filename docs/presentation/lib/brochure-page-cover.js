/*
 * NeverBeen visitor brochure — front cover.
 *
 * A single unnumbered cover sheet that sits before page 01. It is nothing
 * but a full-bleed Lofoten selfie photograph — a young European couple in
 * front of the dark blue lake, red rorbuer houses and white mountains —
 * laid at 70% opacity over a deep Lofoten-blue base, with one big white
 * headline centred on the page. No logo, chips or chrome on purpose.
 */
const { WHITE } = require('./brochure-kit');

const W = 842;
const H = 595;

const HEADLINE = 'Neverbeen -\nWhere Imagination\nBecomes a Memory';

module.exports = [
  // ------------------------------------------------------------------ 00 front cover
  (k, ctx) => {
    k.startPage({ chrome: false, numbered: false });
    const d = k.doc;

    // Deep Lofoten-blue base: at 70% opacity the photograph keeps its depth
    // and the white headline stays readable on top of it.
    k.rect(0, 0, W, H, '#081C2E', 1);

    try {
      const image = k.openImage(ctx.IMG.coverLofoten);
      const scale = Math.max(W / image.width, H / image.height);
      const iw = image.width * scale;
      const ih = image.height * scale;
      d.save();
      d.rect(0, 0, W, H).clip();
      d.opacity(0.7);
      d.image(image, (W - iw) / 2, (H - ih) / 2, { width: iw, height: ih });
      d.restore();
    } catch (error) {
      // Fall back to the plain navy base if the artwork is ever missing.
    }

    // One big white headline, centred horizontally and vertically.
    const boxW = 700;
    const lineGap = 3;
    let size = 60;
    const minSize = 32;
    while (
      size > minSize &&
      k.height(HEADLINE, { font: 'Display', size, width: boxW, lineGap }) > 250
    ) {
      size -= 0.5;
    }
    const blockH = k.height(HEADLINE, { font: 'Display', size, width: boxW, lineGap });
    const x = (W - boxW) / 2;
    const y = (H - blockH) / 2;

    // A soft shadow pass keeps the white type legible over the snow.
    k.text(HEADLINE, x + 1.6, y + 2.4, {
      font: 'Display',
      size,
      color: '#081C2E',
      opacity: 0.5,
      width: boxW,
      align: 'center',
      lineGap,
      height: blockH + 6,
    });
    k.text(HEADLINE, x, y, {
      font: 'Display',
      size,
      color: WHITE,
      width: boxW,
      align: 'center',
      lineGap,
      height: blockH + 6,
    });
  },
];
