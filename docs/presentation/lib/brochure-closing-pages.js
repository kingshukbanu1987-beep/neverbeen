/* Two full-bleed dream statements appended after the original 51 slides. */
const { PAGE, MARGIN, WHITE } = require('./brochure-kit');

function dreamStatement(imageKey, headline, section) {
  return (k, ctx) => {
    // Match slide 4's uninterrupted image-and-logo layout (no chrome bands).
    k.startPage({ chrome: false, section });
    k.photoBackground(ctx.IMG[imageKey], 0.8);

    // The website logo is navy. A softly feathered light area behind it keeps
    // the original, unmodified logo legible without obscuring the subject above.
    const d = k.doc;
    const glow = d.linearGradient(0, 205, 0, 450);
    glow.stop(0, WHITE, 0).stop(0.35, WHITE, 0.88)
      .stop(0.7, WHITE, 0.88).stop(1, WHITE, 0);
    d.save();
    d.rect(0, 205, PAGE.W, 245).fill(glow);
    d.restore();

    // Use the same centered 760 × 420 logo box as slide 4.
    const logo = k.openImage(ctx.LOGO);
    const scale = Math.min(760 / logo.width, 420 / logo.height);
    const lw = logo.width * scale;
    const lh = logo.height * scale;
    d.image(logo, (PAGE.W - lw) / 2, (PAGE.H - lh) / 2, {
      width: lw,
      height: lh,
    });

    k.fit(headline, MARGIN, 462, PAGE.W - MARGIN * 2, 110, {
      font: 'DisplayBold',
      size: 29,
      minSize: 26,
      color: WHITE,
      align: 'center',
      lineGap: 3,
    });
  };
}

module.exports = [
  dreamStatement(
    'closingEmiratesA380',
    'Not everyone can fly. But everyone deserves to see the world through their dreams.',
    'Dreams · Flight',
  ),
  dreamStatement(
    'closingAntarcticaShip',
    'Not everyone can Sail. But everyone deserves to see the world through their dreams.',
    'Dreams · Antarctica',
  ),
];
