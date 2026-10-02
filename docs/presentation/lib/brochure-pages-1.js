/*
 * NeverBeen visitor brochure — pages 1 to 13.
 * Each page function draws one A4-landscape page; the runner handles chrome.
 */
const { GRADIENTS, ACCENTS, INK, INK_SOFT, WHITE, CREAM, MARGIN } = require('./brochure-kit');

const W = 842;
const H = 595;
const RIGHT = W - MARGIN;

module.exports = [
  // ------------------------------------------------------------------ 01 cover
  (k, ctx) => {
    k.startPage({ chrome: 'dark', accent: '#FFD166', section: 'Visitor brochure' });
    const d = k.doc;

    try {
      const image = k.openImage(ctx.AUD.dream);
      const scale = Math.max(W / image.width, H / image.height);
      const iw = image.width * scale;
      const ih = image.height * scale;
      d.save();
      d.rect(0, 0, W, H).clip();
      d.image(image, (W - iw) / 2, (H - ih) / 2 - ih * 0.04, { width: iw, height: ih });
      d.restore();
    } catch (error) {
      k.rect(0, 0, W, H, '#3A0CA3');
    }

    // Vibrant scrim: opaque on the left, transparent over the photograph.
    const scrim = d.linearGradient(0, 0, W * 0.95, H * 0.25);
    scrim
      .stop(0, '#4C0EA8', 1)
      .stop(0.34, '#7B2FF7', 0.96)
      .stop(0.58, '#B621FE', 0.42)
      .stop(0.78, '#B621FE', 0);
    d.save();
    d.rect(0, 0, W, H).fill(scrim);
    d.restore();

    const footScrim = d.linearGradient(0, H - 170, 0, H);
    footScrim.stop(0, '#1B1033', 0).stop(1, '#1B1033', 0.92);
    d.save();
    d.rect(0, H - 170, W, 170).fill(footScrim);
    d.restore();

    k.roundRect(MARGIN, 74, 214, 60, 14, WHITE, 0.96);
    try {
      const logo = k.openImage(ctx.LOGO);
      const box = { w: 190, h: 40 };
      const scale = Math.min(box.w / logo.width, box.h / logo.height);
      d.image(logo, MARGIN + (214 - logo.width * scale) / 2, 74 + (60 - logo.height * scale) / 2, {
        width: logo.width * scale,
        height: logo.height * scale,
      });
    } catch (error) {
      k.text('NEVERBEEN', MARGIN + 20, 92, { font: 'BodyBlack', size: 18, color: INK });
    }

    k.label('NeverBeen  ·  Visitor brochure', MARGIN, 158, { color: '#FFD166', size: 8.6 });
    k.fit('Go anywhere. Even where you\u2019ve never been.', MARGIN, 174, 470, 150, {
      font: 'Display',
      size: 46,
      minSize: 30,
      color: WHITE,
      lineGap: 1,
    });
    k.fit(
      'Realistic AI vacation portraits of you \u2014 standing in the destinations you have always dreamed about, composed by a studio, not a filter.',
      MARGIN,
      332,
      390,
      62,
      { font: 'Body', size: 11.4, minSize: 9.4, color: WHITE, opacity: 0.95, lineGap: 3.2 },
    );

    let chipX = MARGIN;
    [
      { text: '33 dream destinations', fill: '#FFD166', color: INK },
      { text: 'First look in 48 hours', fill: '#00D2A8', color: INK },
      { text: 'Pay only when you love it', fill: '#FF3D6E', color: WHITE },
    ].forEach((chip) => {
      const width = k.chip(chip.text, chipX, 412, {
        fill: chip.fill,
        color: chip.color,
        height: 26,
        size: 9,
      });
      chipX += width + 8;
    });

    k.text(
      'Inside: how a Neverbeen Request works, the photo kit, packages and the whole destination atlas.',
      MARGIN,
      462,
      420,
      { font: 'Body', size: 9.4, color: WHITE, opacity: 0.92, lineGap: 2.4 },
    );
    k.text('Santorini, Greece · composed by the NeverBeen studio', 452, 500, 340, {
      font: 'BodySemi',
      size: 8,
      color: WHITE,
      opacity: 0.85,
      width: 340,
      align: 'right',
    });
  },

  // ------------------------------------------------------------------ 02 welcome + contents
  (k, ctx) => {
    k.startPage({ accent: ACCENTS[3], section: 'Welcome' });
    k.background(GRADIENTS.gold, 'blobs', '#FF6B00');
    k.heading(MARGIN, 76, 300, { eyebrow: 'Welcome', title: '', accent: '#7A1F00', color: WHITE });

    k.glass(MARGIN, 100, 436, 396, { radius: 20, opacity: 0.95 });
    k.roundRect(MARGIN, 100, 436, 6, 3, '#FF6B00');
    k.label('A letter from the studio', MARGIN + 22, 122, { color: '#D2431F', size: 8 });
    k.fit('Your never-been list, finally photographed.', MARGIN + 22, 132, 392, 56, {
      font: 'Display',
      size: 23,
      minSize: 18,
      color: INK,
      lineGap: 0.5,
    });
    k.fit(
      'Some trips wait politely in a drawer: the honeymoon you postponed, the reunion that never found a date, the birthday spent planning instead of living. NeverBeen exists for exactly those trips.',
      MARGIN + 22,
      194,
      392,
      58,
      { font: 'Body', size: 9.4, minSize: 8.2, color: INK_SOFT, lineGap: 2.8 },
    );
    k.fit(
      'You send one clear portrait and one full-length photograph, name the place you have never stood in, and our studio composes you into that destination \u2014 its light, its weather, its unmistakable backdrop. An editor refines every frame until it reads like travel photography rather than a novelty.',
      MARGIN + 22,
      254,
      392,
      74,
      { font: 'Body', size: 9.4, minSize: 8.2, color: INK_SOFT, lineGap: 2.8 },
    );

    const contents = [
      ['The idea', '03'],
      ['Why NeverBeen exists', '04'],
      ['Seven kinds of stories', '05'],
      ['What you receive', '06'],
      ['How it works', '07'],
      ['Submit your request', '08'],
      ['Your photo kit', '09'],
      ['Verify & confirm', '10'],
      ['Inside the studio', '11'],
      ['The destination atlas', '12\u201316'],
      ['Packages & prices', '17'],
      ['Payment & refunds', '18'],
      ['Using the website', '19\u201322'],
      ['Questions & policies', '23\u201324'],
    ];
    k.label('What is inside', MARGIN + 22, 352, { color: '#D2431F', size: 8 });
    contents.forEach((row, index) => {
      const column = index >= 7 ? 1 : 0;
      const x = MARGIN + 22 + column * 196;
      const y = 370 + (index % 7) * 17.4;
      k.text(row[0], x, y, { font: 'BodySemi', size: 8.4, color: INK, width: 150, lineGap: 0 });
      k.text(row[1], x + 150, y, {
        font: 'BodyBold',
        size: 8.4,
        color: '#D2431F',
        width: 34,
        align: 'right',
        lineGap: 0,
      });
    });

    const collage = [
      [ctx.C('Whole crew on the Seine'), 'Paris'],
      [ctx.C('Blue domes behind us'), 'Santorini'],
      [ctx.C('Matcha under the blossoms'), 'Tokyo'],
      [ctx.C('Base camp - 5364 m'), 'Everest'],
    ];
    collage.forEach((item, index) => {
      const x = 516 + (index % 2) * 138;
      const y = 96 + Math.floor(index / 2) * 180;
      k.photo(item[0], x, y, 128, 166, { caption: item[1], captionHeight: 26, frame: 5 });
    });

    k.roundRect(516, 462, 266, 40, 12, '#7B2FF7', 0.96);
    k.icon('plane', 540, 482, 9, WHITE);
    k.text('Start with page 08 \u2014 placing your request', 558, 476, {
      font: 'BodySemi',
      size: 9.2,
      color: WHITE,
      width: 210,
      lineGap: 0,
    });
  },

  // ------------------------------------------------------------------ 03 the idea
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'The idea' });
    k.background(GRADIENTS.ocean, 'rings', '#FFFFFF');
    k.heading(MARGIN, 70, 400, {
      eyebrow: 'The idea',
      title: 'A photograph of the trip you never took',
      intro:
        'NeverBeen is a studio that composes realistic vacation photographs of real people in places they have never been.',
      accent: '#FFD166',
    });

    k.glass(MARGIN, 232, 350, 250, { radius: 18, opacity: 0.95 });
    k.fit(
      'A collection is built from two things: you, and a destination. Your portrait keeps your face, your proportions and your character. The destination supplies the light, the weather, the architecture and the hour of day.',
      MARGIN + 20,
      252,
      310,
      84,
      { font: 'Body', size: 9.8, minSize: 8.4, color: INK_SOFT, lineGap: 3 },
    );
    k.fit(
      'Our model composes the scene; a human editor then grades it to film-like travel photography \u2014 natural skin, believable shadows, no plastic glow. Nothing about the result announces itself as generated.',
      MARGIN + 20,
      344,
      310,
      84,
      { font: 'Body', size: 9.8, minSize: 8.4, color: INK_SOFT, lineGap: 3 },
    );
    k.roundRect(MARGIN + 20, 424, 310, 42, 12, '#EAF2FF', 1);
    k.icon('spark', MARGIN + 42, 445, 9, '#0B49C9');
    k.text(
      'Delivered print-ready \u2014 album, frame, wallpaper, or a story worth telling.',
      MARGIN + 58,
      436,
      {
        font: 'BodySemi',
        size: 9,
        color: '#0B49C9',
        width: 262,
        lineGap: 1.4,
      },
    );

    k.photo(ctx.C('Blue hour, Paris'), 470, 70, 172, 236, {
      caption: 'Paris, France',
      badge: 'Composed',
    });
    k.photo(ctx.C('Blue domes behind us'), 652, 70, 134, 236, { caption: 'Santorini, Greece' });

    k.roundRect(470, 326, 316, 176, 18, '#0B2A6B', 0.92);
    k.text('\u201C', 490, 336, {
      font: 'Display',
      size: 42,
      color: '#FFD166',
      width: 60,
      lineGap: 0,
    });
    k.fit(
      'You do not need a visa, a flight or a week off. You need one photograph of yourself and a place you cannot stop thinking about.',
      490,
      386,
      278,
      96,
      { font: 'DisplayItalic', size: 15, minSize: 11.6, color: WHITE, lineGap: 3 },
    );
  },

  // ------------------------------------------------------------------ 04 why we exist
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'Why NeverBeen exists' });
    k.background(GRADIENTS.berry, 'sunburst', '#FF3D6E');
    k.heading(MARGIN, 72, 600, {
      eyebrow: 'Why NeverBeen exists',
      title: 'The trips that never happened \u2014 until now',
      intro: 'Four reasons people send us a request instead of booking another flight.',
      accent: '#FFD166',
    });

    const reasons = [
      [
        'globe',
        'No flights, no visas',
        'Geography stops being a queue at an embassy. If you can name the place, we can compose you inside it.',
      ],
      [
        'clock',
        'No time off required',
        'A collection takes days, not annual leave. The trip happens around your life instead of replacing it.',
      ],
      [
        'wallet',
        'A fraction of the fare',
        'Collections start at \u20B9499 \u2014 less than one night in most of the cities in this brochure.',
      ],
      [
        'heart',
        'Any age, any horizon',
        'Nine or ninety. The passport here is imagination, and the journey takes minutes rather than airports.',
      ],
    ];
    reasons.forEach((reason, index) => {
      const x = MARGIN + index * 186;
      k.glass(x, 250, 172, 190, { radius: 18, opacity: 0.95 });
      k.circle(x + 34, 288, 18, ACCENTS[index], 1);
      k.icon(reason[0], x + 34, 288, 10.5, WHITE);
      k.fit(reason[1], x + 18, 316, 136, 34, {
        font: 'BodyBold',
        size: 11.6,
        minSize: 9.6,
        color: INK,
        lineGap: 1,
      });
      k.fit(reason[2], x + 18, 356, 136, 74, {
        font: 'Body',
        size: 8.6,
        minSize: 7.6,
        color: INK_SOFT,
        lineGap: 2.4,
      });
    });

    [
      [ctx.C('Turquoise at Lake Louise'), 'Banff, Canada'],
      [ctx.C('Above the fjord'), 'Norway'],
      [ctx.C('Lemon ice, Positano'), 'Amalfi Coast, Italy'],
      [ctx.C('Under the Petronas Towers'), 'Kuala Lumpur'],
    ].forEach((item, index) => {
      k.photo(item[0], MARGIN + index * 186, 456, 172, 96, {
        caption: item[1],
        captionHeight: 24,
        frame: 4,
        radius: 12,
      });
    });
  },

  // ------------------------------------------------------------------ 05 seven kinds of stories
  (k, ctx) => {
    k.startPage({ accent: '#FFF3B0', section: 'Seven kinds of stories' });
    k.background(GRADIENTS.teal, 'dots', '#FFFFFF');
    k.heading(MARGIN, 68, 640, {
      eyebrow: 'Whose story are we telling?',
      title: 'Seven kinds of stories we compose',
      intro:
        'Choose the moment that sounds like you \u2014 every collection is built the same way: your photographs, your permission, a destination around you.',
      accent: '#FFF3B0',
    });

    const stories = [
      [
        ctx.AUD.couples,
        'Honeymoons & couples',
        'The two of you, in the place you promised each other.',
      ],
      [ctx.AUD.families, 'Families', 'Everyone in one frame, in the same golden hour.'],
      [ctx.AUD.birthday, 'Birthdays', 'A year older, somewhere extraordinary.'],
      [ctx.AUD.social, 'Social show-offs', 'Feed-stopping frames that still look like you.'],
      [ctx.AUD.dream, 'Dream destinations', 'The place you have wanted to see since childhood.'],
      [ctx.AUD.creators, 'Content creators', 'Campaign-ready imagery without leaving the studio.'],
      [ctx.AUD.elders, 'Golden years', 'Homesick for a place you last saw decades ago.'],
    ];
    const cardW = 172;
    stories.forEach((story, index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const x = MARGIN + column * 186;
      const y = 214 + row * 178;
      k.glass(x, y, cardW, 160, { radius: 16, opacity: 0.96 });
      k.photo(story[0], x + 8, y + 8, cardW - 16, 82, { frame: 3, radius: 12, shadow: false });
      k.fit(story[1], x + 12, y + 98, cardW - 24, 26, {
        font: 'BodyBold',
        size: 10.4,
        minSize: 8.6,
        color: INK,
        lineGap: 0.8,
      });
      k.fit(story[2], x + 12, y + 124, cardW - 24, 30, {
        font: 'Body',
        size: 8.2,
        minSize: 7.2,
        color: INK_SOFT,
        lineGap: 2,
      });
    });
    k.roundRect(MARGIN + 3 * 186, 392, cardW, 160, 16, '#0B2A6B', 0.94);
    k.badge('+', MARGIN + 3 * 186 + 86, 434, 20, { fill: '#FFD166', color: INK, size: 20 });
    k.fit('Your story, not on this list?', MARGIN + 3 * 186 + 16, 466, cardW - 32, 40, {
      font: 'BodyBold',
      size: 11,
      minSize: 9,
      color: WHITE,
      align: 'center',
      lineGap: 1,
    });
    k.fit(
      'Tell us the moment in the note field of the request \u2014 we compose around people, not templates.',
      MARGIN + 3 * 186 + 16,
      498,
      cardW - 32,
      48,
      {
        font: 'Body',
        size: 8.2,
        minSize: 7.2,
        color: WHITE,
        opacity: 0.9,
        align: 'center',
        lineGap: 2,
      },
    );
  },

  // ------------------------------------------------------------------ 06 what you receive
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'What you receive' });
    k.background(GRADIENTS.violet, 'blobs', '#FFFFFF');
    k.heading(MARGIN, 70, 500, {
      eyebrow: 'What you receive',
      title: 'Your collection, finished like a magazine story',
      accent: '#FFD166',
    });

    const tiles = [
      [
        'camera',
        'Print-ready 4K files',
        'Sized for albums, frames and large prints \u2014 not phone screenshots.',
      ],
      [
        'spark',
        'Portrait & landscape crops',
        'Every look arrives in both orientations, ready for feed or wall.',
      ],
      [
        'star',
        'Film & daylight grades',
        'Soft film colour and destination light, chosen per scene.',
      ],
      [
        'lock',
        'A private gallery',
        'Your collection lives behind your own link; share it or keep it.',
      ],
      [
        'chat',
        'A revision pass',
        'On Economy Class and above, ask for the small changes that matter.',
      ],
      [
        'wallet',
        'Commercial licence',
        'Business Class and First Class include rights for campaigns and portfolios.',
      ],
    ];
    tiles.forEach((tile, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = MARGIN + column * 366;
      const y = 186 + row * 108;
      k.glass(x, y, 350, 94, { radius: 16, opacity: 0.95 });
      k.circle(x + 36, y + 47, 17, ACCENTS[(index + 2) % ACCENTS.length], 1);
      k.icon(tile[0], x + 36, y + 47, 10, WHITE);
      k.fit(tile[1], x + 64, y + 20, 272, 24, {
        font: 'BodyBold',
        size: 11.2,
        minSize: 9.4,
        color: INK,
        lineGap: 0.6,
      });
      k.fit(tile[2], x + 64, y + 44, 272, 40, {
        font: 'Body',
        size: 8.6,
        minSize: 7.6,
        color: INK_SOFT,
        lineGap: 2.2,
      });
    });

    k.photo(ctx.C('Terrace beers'), 794 - 172, 186, 172, 150, {
      caption: 'Amsterdam, Netherlands',
      captionHeight: 24,
    });
    k.photo(ctx.C('Coins in the Trevi'), 794 - 172, 346, 172, 150, {
      caption: 'Rome, Italy',
      captionHeight: 24,
    });
    k.roundRect(MARGIN, 508, 730, 40, 14, '#2B1055', 0.9);
    k.icon('mail', MARGIN + 26, 528, 9, '#FFD166');
    k.text(
      'Delivered by link, in both orientations, within the delivery window of your package \u2014 24 to 48 hours for most collections.',
      MARGIN + 46,
      521,
      {
        font: 'BodySemi',
        size: 9,
        color: WHITE,
        width: 660,
        lineGap: 1,
      },
    );
  },

  // ------------------------------------------------------------------ 07 how it works
  (k, ctx) => {
    k.startPage({ accent: '#1B1033', section: 'How it works' });
    k.background(GRADIENTS.mango, 'ribbon', '#FF3D6E');
    k.heading(MARGIN, 68, 620, {
      eyebrow: 'How it works',
      title: 'Four steps from portrait to passport-free travel',
      intro:
        'The same four steps for every package \u2014 only the number of looks and the delivery speed change.',
      accent: '#7A1F00',
      introColor: WHITE,
      introOpacity: 0.95,
    });

    const steps = [
      [
        '01',
        'Submit a Neverbeen Request',
        'Fill the form on the home page with your details, your destination and the package you chose.',
      ],
      [
        '02',
        'Submit photos & ID',
        'Send a passport-style portrait and a full-length photograph; verify with a government ID or a short video call.',
      ],
      [
        '03',
        'Let the studio compose',
        'Our model places you in the destination, then a human editor refines the stills until they read as travel photography.',
      ],
      [
        '04',
        'Download & share',
        'Your collection arrives print-ready \u2014 album, frame, wallpaper, or a gift for someone who never went either.',
      ],
    ];
    steps.forEach((step, index) => {
      const x = MARGIN + index * 186;
      k.glass(x, 262, 172, 190, { radius: 18, opacity: 0.96 });
      k.badge(step[0], x + 36, 300, 19, {
        fill: ['#FF3D6E', '#8A2BE2', '#00A86B', '#0B49C9'][index],
        size: 15,
      });
      k.fit(step[1], x + 16, 332, 140, 40, {
        font: 'BodyBold',
        size: 11,
        minSize: 9.2,
        color: INK,
        lineGap: 1,
      });
      k.fit(step[2], x + 16, 376, 140, 68, {
        font: 'Body',
        size: 8.4,
        minSize: 7.4,
        color: INK_SOFT,
        lineGap: 2.2,
      });
      if (index < 3) {
        k.line(x + 176, 300, x + 186, 300, '#1B1033', 1.4, 0.5);
      }
    });

    [
      [ctx.C('Backseat selfie'), 'Dubai'],
      [ctx.C('Jetty selfie, Lake Brienz'), 'Switzerland'],
      [ctx.C('Eiffel sparkles'), 'Paris'],
      [ctx.C('Before the rainbow steps'), 'Kuala Lumpur'],
    ].forEach((item, index) => {
      k.photo(item[0], MARGIN + index * 186, 462, 172, 90, {
        caption: item[1],
        captionHeight: 22,
        frame: 4,
        radius: 12,
      });
    });
  },

  // ------------------------------------------------------------------ 08 submit your request
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'Submit your request' });
    k.background(GRADIENTS.rose, 'circles', '#FFFFFF');
    k.heading(MARGIN, 68, 560, {
      eyebrow: 'Placing an order',
      title: 'How to place a Neverbeen Request',
      intro:
        'Everything starts on the home page, in the section called \u201CTell us where you have never been\u201D.',
      accent: '#FFD166',
    });

    k.glass(MARGIN, 200, 470, 330, { radius: 18, opacity: 0.96 });
    k.label('The request form, field by field', MARGIN + 20, 218, { color: '#C2185B', size: 8 });

    const fields = [
      ['Name', 'As you want it printed on nothing \u2014 it just tells us who you are.'],
      ['Email', 'Where your collection link and updates are delivered.'],
      ['Date of birth', 'Age helps us compose the right era of light and wardrobe.'],
      ['Gender', 'Used only to dress and frame the scene correctly.'],
      ['Country', 'Your country, for billing and season notes.'],
      ['Package', 'Pick Starter, Economy, Business or First Class on the pricing section first.'],
      ['Contact number', 'With country code \u2014 our studio replies by WhatsApp or phone.'],
      ['Destination', 'The place you have never been. Type any city, country or landmark.'],
      ['A note for the request', 'Light, wardrobe, season, mood, or the story behind the trip.'],
    ];
    fields.forEach((field, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = MARGIN + 20 + column * 226;
      const y = 240 + row * 60;
      k.text(field[0], x, y, { font: 'BodyBold', size: 9, color: INK, width: 200, lineGap: 0 });
      k.fit(field[1], x, y + 12, 202, 40, {
        font: 'Body',
        size: 8,
        minSize: 7,
        color: INK_SOFT,
        lineGap: 2,
      });
    });

    k.roundRect(MARGIN, 494, 470, 38, 12, '#E6F7EE', 1);
    k.icon('tick', MARGIN + 24, 513, 10, '#00A86B');
    k.text(
      'Prefer to talk first? Write to ' +
        ctx.CONTACT.email +
        ' or message ' +
        ctx.CONTACT.whatsapp +
        '.',
      MARGIN + 44,
      507,
      {
        font: 'BodySemi',
        size: 9,
        color: '#0B6B4F',
        width: 410,
        lineGap: 0,
      },
    );

    k.photo(ctx.AUD.register, 546, 200, 240, 200, {
      caption: 'Sending your first request takes minutes',
      captionHeight: 26,
    });

    k.glass(546, 418, 240, 116, { radius: 16, opacity: 0.96 });
    k.label('The button to look for', 562, 432, { color: '#C2185B', size: 7.6 });
    k.roundRect(562, 448, 208, 34, 17, '#24352C', 1);
    k.text('Submit Neverbeen Request', 562, 459, {
      font: 'BodyBold',
      size: 9.6,
      color: WHITE,
      width: 208,
      align: 'center',
      lineGap: 0,
    });
    k.fit(
      'Press it once. Our studio replies with your first look or a question \u2014 never with a mailing list.',
      562,
      490,
      208,
      36,
      {
        font: 'Body',
        size: 8,
        minSize: 7,
        color: INK_SOFT,
        lineGap: 2,
      },
    );
  },

  // ------------------------------------------------------------------ 09 your photo kit
  (k, ctx) => {
    k.startPage({ accent: '#1B1033', section: 'Your photo kit' });
    k.background(GRADIENTS.lime, 'dots', '#FFFFFF');
    k.heading(MARGIN, 68, 620, {
      eyebrow: 'Your photo kit',
      title: 'Two photographs are enough to begin',
      intro:
        'The clearer the input, the more believable the holiday. Here is what our studio works best with.',
      accent: '#1B1033',
      color: WHITE,
      introColor: WHITE,
    });

    k.glass(MARGIN, 200, 350, 340, { radius: 18, opacity: 0.96 });
    k.circle(MARGIN + 34, 236, 16, '#00A86B', 1);
    k.icon('tick', MARGIN + 34, 236, 11, WHITE);
    k.text('Send this', MARGIN + 58, 228, { font: 'BodyBlack', size: 14, color: INK, lineGap: 0 });
    k.checklist(
      [
        'One passport-style portrait: front-facing, well lit, simple background.',
        'One full-length photograph, standing naturally.',
        'Daylight if possible \u2014 window light or an overcast sky.',
        'Your preferred outfit, glasses on or off, hair as you wear it.',
        'A second portrait with a different expression, if you have one.',
      ],
      MARGIN + 22,
      266,
      306,
      { size: 9.2, bubble: '#00A86B', gap: 5 },
    );
    k.photo(ctx.C('Foreheads together'), MARGIN + 22, 398, 150, 128, { frame: 4, radius: 12 });
    k.photo(ctx.C('Blue domes behind us'), MARGIN + 186, 398, 150, 128, { frame: 4, radius: 12 });

    k.glass(430, 200, 356, 340, { radius: 18, opacity: 0.96 });
    k.circle(464, 236, 16, '#E8116B', 1);
    k.cross(464, 236, 11, WHITE, 2.4);
    k.text('Avoid this', 488, 228, { font: 'BodyBlack', size: 14, color: INK, lineGap: 0 });
    k.bullets(
      [
        'Heavy filters, beauty apps or edited skin \u2014 we work from the real you.',
        'Sunglasses or hats that hide your face.',
        'Dark rooms, strong backlight or blurry phone shots.',
        'Group photographs for a first collection.',
        'Someone else\u2019s photograph: the ID check exists for a reason.',
      ],
      452,
      266,
      316,
      { size: 9.2, dot: '#E8116B', gap: 5 },
    );
    k.photo(ctx.C('Sunglasses weather'), 452, 398, 150, 128, {
      frame: 4,
      radius: 12,
      badge: 'Not this',
      badgeColor: '#E8116B',
    });
    k.photo(ctx.C('Snow in her hair'), 616, 398, 150, 128, { frame: 4, radius: 12 });
    k.roundRect(MARGIN, 522, 730, 28, 12, '#0B2A6B', 0.9);
    k.text(
      'Send your photographs only after our team contacts you \u2014 never to a public link or a third-party upload page.',
      MARGIN + 20,
      529,
      {
        font: 'BodySemi',
        size: 8.8,
        color: WHITE,
        width: 690,
        lineGap: 0,
      },
    );
  },

  // ------------------------------------------------------------------ 10 verify & confirm
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'Verify & confirm' });
    k.background(GRADIENTS.sky, 'rings', '#0B49C9');
    k.heading(MARGIN, 70, 560, {
      eyebrow: 'Before we compose',
      title: 'Verified, consented, then composed',
      intro:
        'NeverBeen works only with the person in the photograph \u2014 and only with their written permission.',
      accent: '#FFD166',
    });

    const cards = [
      [
        'shield',
        'Identity verification',
        'We verify that the photographs belong to the real person who sent them, using a government ID, a short video call, or both. It protects you from anyone else using your face.',
      ],
      [
        'lock',
        'Your written consent',
        'Before a single frame is composed you sign a short document approving the use of your photographs for AI content generation \u2014 in plain language.',
      ],
      [
        'spark',
        'Full ownership of the delete button',
        'When the contract ends we delete your photographs. Your collection is yours; our copies are not kept for training or for our portfolio without permission.',
      ],
    ];
    cards.forEach((card, index) => {
      const x = MARGIN + index * 250;
      k.glass(x, 250, 236, 210, { radius: 18, opacity: 0.96 });
      k.circle(x + 34, 288, 17, ['#0B49C9', '#8A2BE2', '#00A86B'][index], 1);
      k.icon(card[0], x + 34, 288, 10, WHITE);
      k.fit(card[1], x + 18, 318, 200, 30, {
        font: 'BodyBold',
        size: 11.4,
        minSize: 9.4,
        color: INK,
        lineGap: 0.8,
      });
      k.fit(card[2], x + 18, 352, 200, 96, {
        font: 'Body',
        size: 8.6,
        minSize: 7.4,
        color: INK_SOFT,
        lineGap: 2.4,
      });
    });

    k.photo(ctx.C('Turquoise at Lake Louise'), MARGIN, 464, 236, 88, {
      frame: 4,
      radius: 12,
      caption: 'Banff, Canada',
      captionHeight: 22,
    });
    [
      'You approve every detail before payment.',
      'No identity documents are stored after verification.',
      'Ask us anything before you send a photograph.',
    ].forEach((line, index) => {
      k.text(line, MARGIN + 256, 470 + index * 28, {
        font: 'BodySemi',
        size: 9.6,
        color: WHITE,
        width: 480,
        lineGap: 0,
      });
      k.circle(MARGIN + 246, 474 + index * 28, 4, '#FFD166', 1);
    });
  },

  // ------------------------------------------------------------------ 11 inside the studio
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'Inside the studio' });
    k.background(GRADIENTS.midnight, 'sunburst', '#FF3D6E');
    k.heading(MARGIN, 68, 620, {
      eyebrow: 'Inside the studio',
      title: 'AI builds the scene. A human makes it believable.',
      intro: 'Five stages stand between your portrait and a printed holiday you never took.',
      accent: '#FFD166',
    });

    const stages = [
      [
        'Read the portrait',
        'Face, proportions, skin tone and posture are mapped from your photograph.',
      ],
      [
        'Build the destination',
        'Weather, season, architecture and time of day come from the real place.',
      ],
      ['Dress the scene', 'Wardrobe and accessories are composed with the destination in mind.'],
      ['Grade to film', 'Colour, contrast and grain are matched to editorial travel photography.'],
      [
        'Editor review',
        'A studio editor removes artefacts and checks every frame before delivery.',
      ],
    ];
    stages.forEach((stage, index) => {
      const x = MARGIN + index * 148;
      k.badge(String(index + 1).padStart(2, '0'), x + 22, 250, 16, {
        fill: ['#FF3D6E', '#8A2BE2', '#00A86B', '#0B49C9', '#FF8A00'][index],
        size: 13,
      });
      if (index < stages.length - 1) {
        k.line(x + 42, 250, x + 148, 250, WHITE, 1.2, 0.35);
      }
      k.fit(stage[0], x, 276, 130, 30, {
        font: 'BodyBold',
        size: 10.4,
        minSize: 8.8,
        color: WHITE,
        lineGap: 0.8,
      });
      k.fit(stage[1], x, 308, 130, 70, {
        font: 'Body',
        size: 8.2,
        minSize: 7.2,
        color: WHITE,
        opacity: 0.86,
        lineGap: 2.2,
      });
    });

    [
      [ctx.C('Neon glow - cold hands'), 'Amsterdam'],
      [ctx.C('Glove check at the plateau'), 'Jungfraujoch'],
      [ctx.C('Chicken rice, Maxwell'), 'Singapore'],
      [ctx.C('Marina seawall, midnight'), 'Dubai'],
    ].forEach((item, index) => {
      k.photo(item[0], MARGIN + index * 186, 386, 172, 132, {
        caption: item[1],
        captionHeight: 24,
        frame: 4,
        radius: 12,
      });
    });
    k.roundRect(MARGIN, 524, 730, 28, 12, '#FF3D6E', 0.92);
    k.text(
      'What we never compose: celebrity scenes, nudity, vulgarity or anything that misrepresents another real person.',
      MARGIN + 20,
      531,
      {
        font: 'BodySemi',
        size: 8.8,
        color: WHITE,
        width: 690,
        lineGap: 0,
      },
    );
  },

  // ------------------------------------------------------------------ 12 destination atlas
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'The destination atlas' });
    k.background(GRADIENTS.grape, 'blobs', '#FFFFFF');
    k.heading(MARGIN, 68, 560, {
      eyebrow: 'The destination atlas',
      title: '33 destination guides \u2014 and the places you name yourself',
      intro:
        'Every guide on the website is free to browse: live weather, local time, currency, food, sights and history.',
      accent: '#FFD166',
    });

    const groups = [
      [
        'Europe',
        [
          'Paris',
          'Rome',
          'London',
          'Venice',
          'Pisa',
          'Amalfi',
          'Santorini',
          'Interlaken',
          'Zermatt',
          'Oslo',
          'Reykjavik',
          'Amsterdam',
        ],
      ],
      [
        'Asia & India',
        [
          'Tokyo',
          'Singapore',
          'Kuala Lumpur',
          'Jaipur',
          'Bali',
          'Bangkok',
          'Maldives',
          'Seoul',
          'Everest',
        ],
      ],
      ['Middle East & Africa', ['Dubai', 'Abu Dhabi', 'Cairo', 'Marrakech', 'Cape Town']],
      ['Americas', ['Banff', 'Toronto', 'New York', 'Machu Picchu']],
      ['Oceania & the poles', ['Sydney', 'Auckland', 'Antarctica']],
    ];
    let y = 208;
    groups.forEach((group, index) => {
      k.text(group[0].toUpperCase(), MARGIN, y, {
        font: 'BodyBlack',
        size: 8.6,
        color: WHITE,
        width: 130,
        characterSpacing: 1.4,
        lineGap: 0,
      });
      const bottom = k.chipRow(
        group[1].map((name, i) => ({
          text: name,
          fill: WHITE,
          color: INK,
          opacity: 0.95,
          dot: ACCENTS[(index + i) % ACCENTS.length],
        })),
        MARGIN + 138,
        y - 6,
        470,
        { height: 21, size: 8.4, gap: 6, lineGap: 5 },
      );
      y = Math.max(bottom + 14, y + 34);
    });

    k.roundRect(MARGIN, 470, 610, 46, 14, '#2B1055', 0.9);
    k.icon('pin', MARGIN + 26, 493, 10, '#FFD166');
    k.fit(
      'Not on the list? Write the place in the destination field and the note \u2014 the guides are a beginning, not a border.',
      MARGIN + 46,
      483,
      550,
      28,
      {
        font: 'BodySemi',
        size: 9.4,
        minSize: 8.2,
        color: WHITE,
        lineGap: 1.4,
      },
    );

    k.photo(ctx.C('Front row, Dubai Fountain'), 692, 74, 94, 132, {
      frame: 4,
      radius: 12,
      shadow: false,
    });
    k.photo(ctx.C('Twirl at Hawa Mahal'), 692, 218, 94, 132, {
      frame: 4,
      radius: 12,
      shadow: false,
    });
    k.photo(ctx.C('Meadow trail, Lauterbrunnen'), 692, 362, 94, 132, {
      frame: 4,
      radius: 12,
      shadow: false,
    });
  },

  // ------------------------------------------------------------------ 13 atlas: europe in colour
  (k, ctx) => {
    k.startPage({ accent: '#FFD166', section: 'Atlas · Europe' });
    k.background(GRADIENTS.violet, 'circles', '#FFFFFF');
    k.heading(MARGIN, 66, 560, {
      eyebrow: 'Atlas I \u00B7 Europe in colour',
      title: 'Old streets, soft light, long evenings',
      intro:
        'Paris, Rome, London, Venice, Pisa, the Amalfi Coast, Santorini \u2014 composed with the light each place is famous for.',
      accent: '#FFD166',
    });

    const shots = [
      [ctx.C('Blue hour, Paris'), 'Paris, France'],
      [ctx.C('String lights and the Eye'), 'London, United Kingdom'],
      [ctx.C('Golden canal lights'), 'Amsterdam, Netherlands'],
      [ctx.C('Coins in the Trevi'), 'Rome, Italy'],
      [ctx.C('Lemon ice, Positano'), 'Amalfi Coast, Italy'],
      [ctx.C('Blue domes behind us'), 'Santorini, Greece'],
    ];
    shots.forEach((shot, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      k.photo(shot[0], MARGIN + column * 250, 228 + row * 166, 236, 152, {
        caption: shot[1],
        captionHeight: 26,
        frame: 5,
        radius: 14,
      });
    });

    k.chipRow(
      [
        'Paris',
        'Rome',
        'London',
        'Venice',
        'Pisa',
        'Amalfi Coast',
        'Santorini',
        'Amsterdam',
        'Reykjavik',
      ].map((name, index) => ({ text: name, dot: ACCENTS[index % ACCENTS.length] })),
      MARGIN,
      222 - 34,
      730,
      { height: 20, size: 8.2, gap: 6 },
    );
  },
];
