/*
 * NeverBeen visitor brochure — pages 14 to 25.
 */
const { GRADIENTS, ACCENTS, INK, INK_SOFT, WHITE, MARGIN } = require('./brochure-kit');

const W = 842;
const H = 595;

module.exports = [
  // ------------------------------------------------------------------ 14 atlas: alps, fjords & fire
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'Atlas · Alps & Nordics' });
    k.background(GRADIENTS.teal, 'dots', '#FFFFFF');
    k.heading(MARGIN, 66, 560, {
      eyebrow: 'Atlas II \u00B7 Alps, fjords & fire',
      title: 'Snow, steam and turquoise water',
      intro:
        'Switzerland, Iceland, Norway and the Alps \u2014 the coldest places look warmest in a portrait.',
      accent: '#FFD166',
    });

    const shots = [
      [ctx.C('Above the cloud line'), 'Jungfrau'],
      [ctx.C('Meadow trail, Lauterbrunnen'), 'Lauterbrunnen'],
      [ctx.C('First snow at the Matterhorn'), 'Zermatt'],
      [ctx.C('Sharing the hot chocolate'), 'M\u00FCrren'],
      [ctx.C('Soaked at Skogafoss'), 'Iceland'],
      [ctx.C('Above the fjord'), 'Norway'],
    ];
    shots.forEach((shot, index) => {
      k.photo(shot[0], MARGIN + index * 122, 164, 118, 236, {
        caption: shot[1],
        captionHeight: 26,
        frame: 5,
        radius: 12,
        imageFit: 'contain',
        shadow: false,
      });
    });

    k.chipRow(
      ['Interlaken', 'Zermatt', 'Lauterbrunnen', 'Jungfraujoch', 'Reykjavik', 'Oslo', 'Bergen'].map(
        (name, index) => ({
          text: name,
          dot: ACCENTS[index % ACCENTS.length],
        }),
      ),
      MARGIN,
      420,
      730,
      { height: 20, size: 8.2, gap: 6 },
    );
  },

  // ------------------------------------------------------------------ 15 atlas: asia, india & the gulf
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'Atlas · Asia & the Gulf' });
    k.background(GRADIENTS.flame, 'ribbon', '#FFD166');
    k.heading(MARGIN, 64, 620, {
      eyebrow: 'Atlas III \u00B7 Asia, India & the Gulf',
      title: 'Neon cities, desert dunes and mountains at dawn',
      intro:
        'From the Petronas Towers to Everest base camp \u2014 the busiest and the quietest places we compose.',
      accent: '#FFD166',
    });

    const shots = [
      [ctx.C('Front row, Dubai Fountain'), 'Dubai, United Arab Emirates'],
      [ctx.C('Matcha under the blossoms'), 'Tokyo, Japan'],
      [ctx.C('Marina Bay lights'), 'Singapore'],
      [ctx.C('Under the Petronas Towers'), 'Kuala Lumpur, Malaysia'],
      [ctx.C('Twirl at Hawa Mahal'), 'Jaipur, India'],
      [ctx.C('Base camp - 5364 m'), 'Everest Base Camp'],
      [ctx.C('Dune bashing grins'), 'Dubai desert'],
      [ctx.C('One umbrella - all the neon'), 'Tokyo after rain'],
    ];
    shots.forEach((shot, index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      k.photo(shot[0], MARGIN + column * 186, 190 + row * 176, 172, 168, {
        caption: shot[1],
        captionHeight: 26,
        frame: 4,
        radius: 13,
        imageFit: 'contain',
      });
    });

    k.chipRow(
      [
        'Tokyo',
        'Singapore',
        'Kuala Lumpur',
        'Dubai',
        'Jaipur',
        'Everest',
        'Bali',
        'Maldives',
        'Seoul',
      ].map((name, index) => ({ text: name, fill: WHITE, dot: ACCENTS[index % ACCENTS.length] })),
      MARGIN,
      164,
      730,
      { height: 20, size: 8.2, gap: 6 },
    );
  },

  // ------------------------------------------------------------------ 16 atlas: americas & beyond
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'Atlas · Americas & beyond' });
    k.background(GRADIENTS.dawn, 'sunburst', '#FF3D6E');
    k.heading(MARGIN, 66, 560, {
      eyebrow: 'Atlas IV \u00B7 Americas & beyond',
      title: 'And anywhere else you can name',
      intro:
        'The 33 guides are the beginning. If you can name the place, the studio can compose you inside it.',
      accent: '#7A1F00',
    });

    k.photo(ctx.C('Turquoise at Lake Louise'), MARGIN, 232, 236, 240, {
      caption: 'Banff, Canada',
      captionHeight: 26,
      frame: 5,
      radius: 14,
    });
    k.photo(ctx.C('CN Tower glitter'), MARGIN + 250, 232, 236, 240, {
      caption: 'Toronto, Canada',
      captionHeight: 26,
      frame: 5,
      radius: 14,
    });
    k.photo(ctx.AUD.dream, MARGIN + 500, 232, 230, 240, {
      caption: 'The places still on your list',
      captionHeight: 26,
      frame: 5,
      radius: 14,
    });

    k.glass(MARGIN, 484, 730, 66, { radius: 16, opacity: 0.95 });
    k.label('Composed on request', MARGIN + 20, 498, { color: '#C2185B', size: 7.8 });
    k.chipRow(
      [
        'Machu Picchu',
        'Serengeti',
        'Marrakech',
        'Cape Town',
        'Cairo',
        'Maldives',
        'Bangkok',
        'Sydney',
        'Auckland',
        'Antarctica',
        'New York',
        'Rio de Janeiro',
      ].map((name, index) => ({
        text: name,
        fill: '#FFF1E6',
        dot: ACCENTS[index % ACCENTS.length],
      })),
      MARGIN + 20,
      516,
      690,
      { height: 20, size: 8, gap: 6, lineGap: 5 },
    );
  },

  // ------------------------------------------------------------------ 17 packages & prices
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'Packages & prices' });
    k.background(GRADIENTS.berry, 'circles', '#FFFFFF');
    k.heading(MARGIN, 66, 620, {
      eyebrow: 'Packages & prices',
      title: 'Four ways to be somewhere else',
      intro:
        'Every plan includes personal-use rights, natural colour grading and delivery only when you are happy with the result.',
      accent: '#FFD166',
    });

    const plans = [
      [
        'Starter',
        '\u20B9499',
        'one collection',
        ['3 destination looks', 'Print-ready 4K files', '48-hour delivery'],
        '#0B49C9',
        false,
      ],
      [
        'Economy Class',
        '\u20B9999',
        'per trip',
        [
          '12 destination looks',
          'Portrait & landscape crops',
          'Priority 24-hour delivery',
          'One revision pass',
        ],
        '#00A86B',
        true,
      ],
      [
        'Business Class',
        '\u20B91999',
        'season',
        [
          '40 destination looks',
          'Private gallery sharing',
          'Dedicated editor',
          'Commercial licence',
        ],
        '#8A2BE2',
        false,
      ],
      [
        'First Class',
        '\u20B94999',
        'season',
        [
          '100 destination looks',
          'Creative direction',
          'Priority editorial delivery',
          'Commercial licence',
        ],
        '#FF3D6E',
        false,
      ],
    ];
    plans.forEach((plan, index) => {
      const x = MARGIN + index * 186;
      const y = 252;
      k.glass(x, y, 172, 250, { radius: 18, opacity: 0.97 });
      k.roundRect(x, y, 172, 6, 3, plan[4]);
      if (plan[5]) {
        k.roundRect(x + 34, y - 12, 104, 22, 11, '#FFD166', 1);
        k.text('MOST CHOSEN', x + 34, y - 5.5, {
          font: 'BodyBlack',
          size: 7.4,
          color: INK,
          width: 104,
          align: 'center',
          characterSpacing: 0.6,
          lineGap: 0,
        });
      }
      k.text(plan[0], x + 16, y + 22, {
        font: 'BodyBold',
        size: 11.4,
        color: INK,
        width: 140,
        lineGap: 0,
      });
      k.text(plan[1], x + 16, y + 42, {
        font: 'BodyBlack',
        size: 24,
        color: plan[4],
        width: 150,
        lineGap: 0,
      });
      k.text(plan[2], x + 16, y + 76, {
        font: 'BodySemi',
        size: 8.4,
        color: INK_SOFT,
        width: 140,
        lineGap: 0,
      });
      k.line(x + 16, y + 94, x + 156, y + 94, '#DDD3EE', 1);
      k.checklist(plan[3], x + 16, y + 106, 148, { size: 8.4, bubble: plan[4], gap: 6 });
    });

    k.roundRect(MARGIN, 516, 730, 30, 12, '#2B1055', 0.9);
    k.text(
      'Prices are in Indian rupees and apply to one person per collection. Higher tiers can be upgraded mid-season.',
      MARGIN + 20,
      523,
      {
        font: 'BodySemi',
        size: 8.8,
        color: WHITE,
        width: 690,
        lineGap: 0,
      },
    );
  },

  // ------------------------------------------------------------------ 18 choosing, paying, refunds
  (k, ctx) => {
    k.startPage({ accent: '#7A1F00', section: 'Payment & refunds' });
    k.background(GRADIENTS.gold, 'blobs', '#FF3D6E');
    k.heading(MARGIN, 64, 620, {
      eyebrow: 'Choosing & paying',
      title: 'You pay when you like what you see',
      accent: '#7A1F00',
    });

    const rows = [
      ['Destination looks', '3', '12', '40', '100'],
      ['Portrait & landscape crops', 'Landscape', 'Both', 'Both', 'Both'],
      ['Delivery window', '48 hours', '24 hours', '24 hours', 'Priority queue'],
      ['Revision pass', '\u2014', 'One', 'Two', 'Unlimited in season'],
      ['Private gallery link', '\u2014', 'Yes', 'Yes', 'Yes'],
      ['Commercial licence', '\u2014', '\u2014', 'Yes', 'Yes'],
    ];
    const tableX = MARGIN;
    const tableY = 178;
    const colW = [250, 120, 120, 120, 120];
    k.glass(tableX, tableY, 730, 238, { radius: 18, opacity: 0.96 });
    k.text('Compare the plans', tableX + 22, tableY + 18, {
      font: 'BodyBlack',
      size: 12,
      color: INK,
      width: 300,
      lineGap: 0,
    });
    ['Starter', 'Economy', 'Business', 'First Class'].forEach((name, index) => {
      const x = tableX + colW[0] + index * 120;
      k.text(name, x, tableY + 18, {
        font: 'BodyBold',
        size: 9,
        color: ['#0B49C9', '#00A86B', '#8A2BE2', '#FF3D6E'][index],
        width: 116,
        align: 'center',
        lineGap: 0,
      });
    });
    rows.forEach((row, index) => {
      const y = tableY + 48 + index * 30;
      if (index % 2 === 0) k.roundRect(tableX + 14, y - 8, 702, 26, 8, '#F6F2FF', 1);
      k.text(row[0], tableX + 22, y, {
        font: 'BodySemi',
        size: 8.8,
        color: INK,
        width: 240,
        lineGap: 0,
      });
      row.slice(1).forEach((value, column) => {
        k.text(value, tableX + colW[0] + column * 120, y, {
          font: 'Body',
          size: 8.2,
          color: value === '\u2014' ? '#B9AECB' : INK_SOFT,
          width: 116,
          align: 'center',
          lineGap: 0,
        });
      });
    });

    const panels = [
      [
        'wallet',
        'Pay at delivery',
        'Nothing is charged up front. You pay when your collection is delivered and approved.',
        '#00A86B',
      ],
      [
        'heart',
        '100% refund promise',
        'If you do not like the delivery, you do not pay. The collection is simply withdrawn.',
        '#FF3D6E',
      ],
      [
        'chat',
        'Talk before you commit',
        'Write to ' +
          ctx.CONTACT.email +
          ' or message ' +
          ctx.CONTACT.whatsapp +
          ' with any question.',
        '#0B49C9',
      ],
    ];
    panels.forEach((panel, index) => {
      const x = MARGIN + index * 250;
      k.glass(x, 436, 236, 108, { radius: 16, opacity: 0.96 });
      k.circle(x + 32, 474, 16, panel[3], 1);
      k.icon(panel[0], x + 32, 474, 9.6, WHITE);
      k.text(panel[1], x + 58, 456, {
        font: 'BodyBold',
        size: 10.8,
        color: INK,
        width: 166,
        lineGap: 0,
      });
      k.fit(panel[2], x + 58, 474, 166, 60, {
        font: 'Body',
        size: 8.2,
        minSize: 7.2,
        color: INK_SOFT,
        lineGap: 2.2,
      });
    });
  },

  // ------------------------------------------------------------------ 19 using the website
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'Using the website' });
    k.background(GRADIENTS.grape, 'dots', '#FFFFFF');
    k.heading(MARGIN, 64, 620, {
      eyebrow: 'Using the website',
      title: 'Twelve pages, one journey',
      intro: 'Everything you need is in the top navigation. Here is what each page is for.',
      accent: '#FFD166',
    });

    const pages = [
      ['Home', 'The promise, the request form, and the way in.'],
      ['How It Works', 'The four steps and what arrives at the end.'],
      ['Popular Destinations', 'Destination guides: weather, food, sights.'],
      ['Gallery', 'Twenty collection stills, reshuffled every visit.'],
      ['Pricing', 'Four packages, features and the plan you pick.'],
      ['FAQ', 'Timing, outfits, privacy and refund answers.'],
      ['The Collection', 'All 61 studio compositions in one wall.'],
      ['Audience', 'Who NeverBeen is for \u2014 couples, families, dreamers.'],
      ['Travel Feeds', 'Live inspiration from destinations worldwide.'],
      ['Founder', 'Who builds the studio and why.'],
      ['Help Centre', 'Guides, search and a direct line to support.'],
      ['Feedback', 'Tell us what to improve \u2014 read by humans.'],
    ];
    pages.forEach((page, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = MARGIN + column * 250;
      const y = 208 + row * 98;
      k.glass(x, y, 236, 88, { radius: 14, opacity: 0.95 });
      k.roundRect(x, y, 5, 88, 3, ACCENTS[index % ACCENTS.length]);
      k.text(page[0], x + 18, y + 16, {
        font: 'BodyBold',
        size: 10.8,
        color: INK,
        width: 200,
        lineGap: 0,
      });
      k.fit(page[1], x + 18, y + 36, 202, 44, {
        font: 'Body',
        size: 8.4,
        minSize: 7.4,
        color: INK_SOFT,
        lineGap: 2.2,
      });
    });

    k.roundRect(MARGIN, 508, 730, 30, 12, '#2B1055', 0.9);
    k.text(
      'New here? Read How It Works, pick a package, then send the request. The whole journey takes about ten minutes.',
      MARGIN + 20,
      515,
      {
        font: 'BodySemi',
        size: 8.8,
        color: WHITE,
        width: 690,
        lineGap: 0,
      },
    );
  },

  // ------------------------------------------------------------------ 20 destination guides
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'Destination guides' });
    k.background(GRADIENTS.ocean, 'rings', '#FFD166');
    k.heading(MARGIN, 64, 470, {
      eyebrow: 'Destination guides',
      title: 'Every destination, researched before you decide',
      intro:
        'Each of the 33 guides is written like a short magazine feature \u2014 and updated with live information.',
      accent: '#FFD166',
    });

    const features = [
      ['clock', 'Live weather', 'Current conditions and the season to compose for.'],
      [
        'globe',
        'Local time',
        'Know the hour before you say \u201Cgood morning\u201D in the frame.',
      ],
      ['wallet', 'Local currency', 'What things cost, with everyday context.'],
      [
        'pin',
        'Overview & at a glance',
        'The short version: why this place, and what it feels like.',
      ],
      ['star', 'Where to eat & what to see', 'Tables worth booking and sights worth the walk.'],
      ['spark', 'History & geography', 'How the place came to be \u2014 useful for the caption.'],
    ];
    features.forEach((feature, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = MARGIN + column * 238;
      const y = 244 + row * 96;
      k.glass(x, y, 226, 86, { radius: 14, opacity: 0.95 });
      k.circle(x + 30, y + 30, 14, ACCENTS[(index + 3) % ACCENTS.length], 1);
      k.icon(feature[0], x + 30, y + 30, 8.4, WHITE);
      k.text(feature[1], x + 52, y + 16, {
        font: 'BodyBold',
        size: 10,
        color: INK,
        width: 160,
        lineGap: 0,
      });
      k.fit(feature[2], x + 52, y + 32, 160, 44, {
        font: 'Body',
        size: 7.8,
        minSize: 6.8,
        color: INK_SOFT,
        lineGap: 2,
      });
    });

    k.photo(ctx.IMG.norway, 536, 198, 294, 185, {
      caption: 'A destination guide on a laptop',
      captionHeight: 26,
      frame: 5,
      radius: 14,
      imageFit: 'contain',
    });
    k.photo(ctx.IMG.help, 536, 393, 294, 160, {
      caption: 'Help Centre: search, categories and a human reply',
      captionHeight: 24,
      frame: 5,
      radius: 14,
      imageFit: 'contain',
    });
  },

  // ------------------------------------------------------------------ 21 gallery & collection
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'Gallery & collection' });
    k.background(GRADIENTS.coral, 'blobs', '#FFFFFF');
    k.heading(MARGIN, 64, 470, {
      eyebrow: 'Proof, before you ask',
      title: 'Look at what we have already composed',
      intro:
        'Two places on the website exist purely so you can judge the work before sending a photograph of yourself.',
      accent: '#FFD166',
    });

    k.glass(MARGIN, 246, 424, 132, { radius: 18, opacity: 0.95 });
    k.label('The Collection', MARGIN + 20, 262, { color: '#C2185B', size: 8 });
    k.fit('61 studio compositions, one scrollable wall', MARGIN + 20, 276, 380, 30, {
      font: 'BodyBold',
      size: 13,
      minSize: 10.6,
      color: INK,
      lineGap: 0.6,
    });
    k.fit(
      'Honeymoons, reunions, birthdays and horizons \u2014 the full album on the /collection page. Tap any photograph to enlarge it.',
      MARGIN + 20,
      310,
      380,
      60,
      {
        font: 'Body',
        size: 9,
        minSize: 8,
        color: INK_SOFT,
        lineGap: 2.6,
      },
    );

    k.glass(MARGIN, 388, 424, 132, { radius: 18, opacity: 0.95 });
    k.label('The Gallery on the home page', MARGIN + 20, 404, { color: '#C2185B', size: 8 });
    k.fit('Twenty photographs, different every visit', MARGIN + 20, 418, 380, 30, {
      font: 'BodyBold',
      size: 13,
      minSize: 10.6,
      color: INK,
      lineGap: 0.6,
    });
    k.fit(
      'The Gallery draws twenty stills at random from the collection each time the page loads, so the proof never goes stale.',
      MARGIN + 20,
      452,
      380,
      60,
      {
        font: 'Body',
        size: 9,
        minSize: 8,
        color: INK_SOFT,
        lineGap: 2.6,
      },
    );

    const shots = [
      [ctx.C('Feet over the canal'), 'Amsterdam'],
      [ctx.C('Snowball ambush'), 'Swiss Alps'],
      [ctx.C('Peace signs'), 'Street art'],
      [ctx.C('Mind the gap'), 'London'],
      [ctx.C('Hot chocolate at Cafe Alpina'), 'M\u00FCrren'],
      [ctx.C('Sunscreen duties'), 'Beach'],
    ];
    shots.forEach((shot, index) => {
      const layout =
        index < 3
          ? { x: 512 + index * 104, y: 198, w: 98, h: 164 }
          : index === 3
            ? { x: 512, y: 372, w: 154, h: 164 }
            : { x: index === 4 ? 674 : 754, y: 372, w: 72, h: 164 };
      k.photo(shot[0], layout.x, layout.y, layout.w, layout.h, {
        frame: 4,
        radius: 12,
        caption: shot[1],
        captionHeight: 22,
        imageFit: 'contain',
      });
    });
    k.chip('61 photographs  ·  new frames weekly', MARGIN, 530, {
      fill: WHITE,
      color: INK,
      dot: '#FF3D6E',
      height: 24,
      size: 8.6,
    });
    k.chip('20 reshuffled every visit', MARGIN + 240, 530, {
      fill: WHITE,
      color: INK,
      dot: '#8A2BE2',
      height: 24,
      size: 8.6,
    });
  },

  // ------------------------------------------------------------------ 22 community
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'Community' });
    k.background(GRADIENTS.jade, 'circles', '#FFFFFF');
    k.heading(MARGIN, 64, 560, {
      eyebrow: 'If you like company',
      title: 'A travel circle, when you want one',
      intro:
        'The community is optional. The request is the heart of NeverBeen \u2014 the community is where the stories go afterwards.',
      accent: '#FFD166',
    });

    const cards = [
      ['chat', 'Journeys', 'Publish a trip as a story with photographs, mood and place.'],
      [
        'camera',
        'Galleries with audiences',
        'Albums can be public, shared with companions, or visible only to you.',
      ],
      ['star', 'The Message Book', 'A shared wall of travel notes, replies and encouragement.'],
      [
        'shield',
        'Privacy first',
        'Profiles can be locked, and every post chooses its own audience.',
      ],
    ];
    cards.forEach((card, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = MARGIN + column * 374;
      const y = 166 + row * 76;
      k.glass(x, y, 356, 68, { radius: 16, opacity: 0.96 });
      k.circle(x + 28, y + 24, 14, ['#0B49C9', '#E8116B', '#FF8A00', '#00A86B'][index], 1);
      k.icon(card[0], x + 28, y + 24, 8.5, WHITE);
      k.fit(card[1], x + 52, y + 7, 288, 19, {
        font: 'BodyBold',
        size: 10.2,
        minSize: 8.8,
        color: INK,
        lineGap: 0.5,
      });
      k.fit(card[2], x + 52, y + 29, 288, 31, {
        font: 'Body',
        size: 8,
        minSize: 7,
        color: INK_SOFT,
        lineGap: 1.5,
      });
    });

    k.photo(ctx.C('Light festival with the kids'), MARGIN, 336, 236, 202, {
      frame: 4,
      radius: 12,
      caption: 'Amsterdam, Netherlands',
      captionHeight: 22,
      imageFit: 'contain',
    });
    k.photo(ctx.C('Mulled wine crew'), MARGIN + 250, 336, 236, 202, {
      frame: 4,
      radius: 12,
      caption: 'Christmas market, London',
      captionHeight: 22,
      imageFit: 'contain',
    });
    k.glass(MARGIN + 500, 336, 230, 202, { radius: 14, opacity: 0.96 });
    k.label('Reminder', MARGIN + 520, 354, { color: '#0B6B4F', size: 7.6 });
    k.fit(
      'You never need an account to place a Neverbeen Request \u2014 the form on the home page is open to everyone.',
      MARGIN + 520,
      374,
      190,
      148,
      {
        font: 'Body',
        size: 8.4,
        minSize: 7.4,
        color: INK_SOFT,
        lineGap: 2.2,
      },
    );
  },

  // ------------------------------------------------------------------ 23 questions answered
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'Questions, answered' });
    k.background(GRADIENTS.sunset, 'ribbon', '#FFD166');
    k.heading(MARGIN, 62, 620, {
      eyebrow: 'Questions, answered',
      title: 'Before you ask \u2014 the twelve questions we hear most',
      accent: '#7A1F00',
    });

    const faq = [
      [
        'Do I need to have visited the place?',
        'No. NeverBeen is built for places you have never stood in. That is the entire point.',
      ],
      [
        'What kind of photograph should I send?',
        'A well-lit, front-facing portrait against a simple background. No heavy filters or sunglasses.',
      ],
      [
        'Will the photographs look real?',
        'Yes \u2014 soft film colour, natural skin and destination light, not a generic AI collage.',
      ],
      [
        'Can I print and share them?',
        'Personal sharing and printing are included on every plan. Business and First Class add a commercial licence.',
      ],
      [
        'How long does a collection take?',
        'Most collections arrive within 48 hours; Economy Class and above move faster.',
      ],
      [
        'How do I send my photographs?',
        'Our team contacts you and you send them by email or WhatsApp \u2014 whichever is easier.',
      ],
      [
        'How many photographs should I send?',
        'One passport-style portrait and one full-length photograph are enough to begin.',
      ],
      [
        'Can I choose my outfits?',
        'Yes. Higher packages allow more customisation of outfits, accessories and moments.',
      ],
      [
        'Can I appear with a celebrity?',
        'No. Creating photographs with celebrities is against our policy.',
      ],
      [
        'Do I have to sign anything?',
        'Yes \u2014 a short document confirming your approval for AI content generation.',
      ],
      [
        'What about romantic scenes?',
        'Tasteful moments are possible; vulgarity, sexuality and nudity are not.',
      ],
      [
        'May I wear something revealing?',
        'It depends on the outfit and the scene. Ask us before you plan the look.',
      ],
    ];
    faq.forEach((item, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = MARGIN + column * 372;
      const y = 190 + row * 54;
      k.circle(x + 9, y + 8, 9, index % 2 === 0 ? '#7A1F00' : '#C2185B', 1);
      k.text(String(index + 1), x, y + 3, {
        font: 'BodyBlack',
        size: 8.4,
        color: WHITE,
        width: 18,
        align: 'center',
        lineGap: 0,
      });
      k.fit(item[0], x + 26, y, 320, 26, {
        font: 'BodyBold',
        size: 9.6,
        minSize: 8.4,
        color: INK,
        lineGap: 0.6,
      });
      k.fit(item[1], x + 26, y + 24, 320, 34, {
        font: 'Body',
        size: 8.2,
        minSize: 7.2,
        color: INK_SOFT,
        lineGap: 2,
      });
    });

    k.glass(MARGIN, 508, 730, 46, { radius: 14, opacity: 0.95 });
    k.icon('mail', MARGIN + 26, 531, 10, '#C2185B');
    k.text(
      'Something else? The Help Centre answers more, and ' +
        ctx.CONTACT.email +
        ' reaches a human.',
      MARGIN + 46,
      522,
      {
        font: 'BodySemi',
        size: 9.4,
        color: INK,
        width: 660,
        lineGap: 1.4,
      },
    );
  },

  // ------------------------------------------------------------------ 24 privacy, safety & policies
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'Privacy, safety & policies' });
    k.background(GRADIENTS.night, 'rings', '#FFD166');
    k.heading(MARGIN, 64, 620, {
      eyebrow: 'Privacy, safety & policies',
      title: 'The rules we hold ourselves to',
      intro: 'Short version: your face, your permission, your money back if you are not happy.',
      accent: '#FFD166',
    });

    const policies = [
      [
        'shield',
        'Identity is verified',
        'Government ID, a video call, or both \u2014 so nobody can use your face without you.',
      ],
      [
        'lock',
        'Consent comes first',
        'A signed approval before any AI composition begins. No exceptions.',
      ],
      [
        'spark',
        'We delete on request',
        'When the contract ends your photographs are deleted; nothing is kept for training.',
      ],
      [
        'tick',
        'You own your collection',
        'Personal use is yours on every plan; commercial rights on Business and First Class.',
      ],
      [
        'cross',
        'No celebrities',
        'We never place you beside public figures \u2014 it is against our policy.',
      ],
      [
        'heart',
        'Refunds are simple',
        'Not happy with the delivery? You do not pay, and the collection is withdrawn.',
      ],
    ];
    policies.forEach((policy, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = MARGIN + column * 250;
      const y = 228 + row * 146;
      k.glass(x, y, 236, 138, { radius: 18, opacity: 0.95 });
      k.circle(x + 32, y + 32, 16, ACCENTS[(index + 1) % ACCENTS.length], 1);
      k.icon(policy[0], x + 32, y + 32, 9.4, WHITE);
      k.fit(policy[1], x + 16, y + 58, 204, 28, {
        font: 'BodyBold',
        size: 10.8,
        minSize: 9.2,
        color: INK,
        lineGap: 0.8,
      });
      k.fit(policy[2], x + 16, y + 86, 204, 46, {
        font: 'Body',
        size: 8.4,
        minSize: 7.2,
        color: INK_SOFT,
        lineGap: 2.2,
      });
    });

    k.roundRect(MARGIN, 520, 730, 30, 12, '#FF3D6E', 0.92);
    k.text(
      'Full Privacy Policy and Terms & Condition live on the website footer \u2014 written in the same plain language as this page.',
      MARGIN + 20,
      527,
      {
        font: 'BodySemi',
        size: 8.8,
        color: WHITE,
        width: 690,
        lineGap: 0,
      },
    );
  },

  // ------------------------------------------------------------------ 25 back cover
  (k, ctx) => {
    k.startPage({ chrome: 'dark', accent: '#FFD166', section: 'Place your request' });
    const d = k.doc;
    try {
      const image = k.openImage(ctx.C('Whole crew on the Seine'));
      const scale = Math.max(W / image.width, H / image.height);
      const iw = image.width * scale;
      const ih = image.height * scale;
      d.save();
      d.rect(0, 0, W, H).clip();
      d.image(image, (W - iw) / 2, (H - ih) / 2, { width: iw, height: ih });
      d.restore();
    } catch (error) {
      k.rect(0, 0, W, H, '#2B1055');
    }
    const scrim = d.linearGradient(0, 0, W * 0.9, H);
    scrim
      .stop(0, '#120B2E', 0.96)
      .stop(0.45, '#2B1055', 0.9)
      .stop(0.8, '#7B2FF7', 0.55)
      .stop(1, '#B621FE', 0.28);
    d.save();
    d.rect(0, 0, W, H).fill(scrim);
    d.restore();

    k.label('Your turn', MARGIN, 92, { color: '#FFD166', size: 9 });
    k.fit('Your first look is one request away.', MARGIN, 112, 520, 120, {
      font: 'Display',
      size: 42,
      minSize: 28,
      color: WHITE,
      lineGap: 1,
    });
    k.fit(
      'Choose a package, send the form with the place you have never been, and our studio replies with your first look. No payment until you love it.',
      MARGIN,
      236,
      430,
      60,
      { font: 'Body', size: 11, minSize: 9.4, color: WHITE, opacity: 0.95, lineGap: 3 },
    );

    const recap = [
      'Pick a package',
      'Send the request form',
      'Send photos & ID',
      'Approve, pay, download',
    ];
    recap.forEach((line, index) => {
      const x = MARGIN + index * 172;
      k.roundRect(x, 314, 158, 34, 12, WHITE, 0.16);
      k.badge(String(index + 1), x + 22, 331, 11, { fill: '#FFD166', color: INK, size: 10 });
      k.text(line, x + 40, 326, {
        font: 'BodySemi',
        size: 8.6,
        color: WHITE,
        width: 112,
        lineGap: 0,
      });
    });

    k.glass(MARGIN, 372, 430, 148, { radius: 18, opacity: 0.95 });
    k.label('Talk to the studio', MARGIN + 22, 390, { color: '#C2185B', size: 8 });
    k.roundRect(MARGIN + 22, 412, 386, 36, 12, '#00A86B', 1);
    k.text('Submit a Neverbeen Request', MARGIN + 22, 424, {
      font: 'BodyBold',
      size: 10.4,
      color: WHITE,
      width: 386,
      align: 'center',
      lineGap: 0,
    });
    k.fit(
      'Help Centre, FAQ, Community, Privacy Policy and Terms & Condition',
      MARGIN + 22,
      474,
      380,
      34,
      {
        font: 'Body',
        size: 8.4,
        minSize: 7.4,
        color: INK_SOFT,
        lineGap: 2.2,
      },
    );

    k.roundRect(516, 372, 266, 148, 18, WHITE, 0.96);
    try {
      const logo = k.openImage(ctx.LOGO);
      const box = { w: 220, h: 46 };
      const scale = Math.min(box.w / logo.width, box.h / logo.height);
      d.image(logo, 516 + (266 - logo.width * scale) / 2, 396, {
        width: logo.width * scale,
        height: logo.height * scale,
      });
    } catch (error) {
      k.text('NEVERBEEN', 540, 400, {
        font: 'BodyBlack',
        size: 20,
        color: INK,
        width: 220,
        lineGap: 0,
      });
    }
    k.text('Your dream vacation, without taking the flight.', 540, 452, {
      font: 'DisplayItalic',
      size: 11.4,
      color: INK,
      width: 220,
      align: 'center',
      lineGap: 1,
    });
    k.text('Unlimited destination guides · 4 packages', 540, 488, {
      font: 'Body',
      size: 7.6,
      color: INK_SOFT,
      width: 220,
      align: 'center',
      lineGap: 0,
    });

    k.text(
      'Prices in Indian rupees. Studio compositions are subject to our Terms & Condition.',
      MARGIN,
      536,
      {
        font: 'Body',
        size: 7.6,
        color: WHITE,
        opacity: 0.85,
        width: 730,
        lineGap: 0,
      },
    );
  },
];
