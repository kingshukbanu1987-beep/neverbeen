#!/usr/bin/env node
/**
 * CreatePortfolio — builds the NeverBeen model portfolio.
 *
 *   node CreatePortfolio.mjs --model "Model Name"
 *   npm run portfolio -- --model "Model Name"
 *
 * The script writes a 24-page, A4-portrait, black-finish fashion portfolio PDF
 * plus its `portfolio.json` receipt into the model's own
 * `public/NeverBeenModels/<Album>/Portfolio/` folder, then refreshes the
 * portfolio manifest so the model's page immediately offers **Watch Portfolio**
 * and **Download Portfolio**.
 *
 * Every model draws her own style (palette, type treatment, motifs, headlines
 * and page variants) from a seed of her name, so no two portfolios read alike.
 * Photographs come from her album, her personal details from the album/shared
 * metadata, and the story pages from her fictional Multiverse biography.
 *
 * Image preparation uses ImageMagick when it is on PATH (`magick` or `convert`)
 * to keep the PDF small and to produce the blurred card backdrops; without it
 * the album files are embedded directly.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { extname, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

import { PortfolioKit } from './scripts/portfolio/portfolio-kit.mjs';
import { fill, resolveDesign } from './scripts/portfolio/portfolio-styles.mjs';
import { buildPages } from './scripts/portfolio/portfolio-pages.mjs';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const modelsDir = join(projectRoot, 'public', 'NeverBeenModels');
const sharedProfilesFile = join(projectRoot, 'data', 'ai-models', 'profiles.json');
const fontDir = join(projectRoot, 'docs', 'presentation', 'fonts');
const logoFile = join(projectRoot, 'public', 'neverbeen-logo.png');

const FONTS = {
  Body: 'Poppins_400Regular.ttf',
  BodySemi: 'Poppins_600SemiBold.ttf',
  BodyBold: 'Poppins_800ExtraBold.ttf',
  BodyBlack: 'Poppins_900Black.ttf',
  Display: 'PlayfairDisplay_900Black.ttf',
  DisplayBold: 'PlayfairDisplay_700Bold.ttf',
  DisplayItalic: 'PlayfairDisplay_700Bold_Italic.ttf',
  DisplayBlack: 'Poppins_900Black.ttf',
};

const LOGO_ASPECT = 1408 / 768;
const VERSION = '1.0.0';
const PAGE_COUNT = 24;
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
/** Folders inside an album that never feed the portfolio's photograph pool. */
const reservedFolders = new Set(['biography', 'portfolio', 'video', 'videos']);

// --------------------------------------------------------------------- helpers

function readJson(file, fallback = {}) {
  if (!existsSync(file)) return fallback;
  try {
    const value = JSON.parse(readFileSync(file, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
  } catch (error) {
    throw new Error(`Could not parse ${file}: ${error.message}`);
  }
}

function text(value) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function normalized(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function humanize(folder) {
  return folder
    .replaceAll('_', ' ')
    .replace(/([a-z0-9])([A-Z])/, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/, '$1 $2')
    .replace(/[-.]+/, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function naturalSort(values) {
  return [...values].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  );
}

function findImageMagick() {
  for (const binary of ['magick', 'convert']) {
    const probe = spawnSync(binary, ['--version'], { encoding: 'utf8' });
    if (probe.status === 0) return binary;
  }
  return null;
}

// ------------------------------------------------------------------ model data

function readModelDirectories() {
  return readdirSync(modelsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function sharedProfileFor(folder) {
  const sharedProfiles = readJson(sharedProfilesFile);
  const match = Object.entries(sharedProfiles).find(([key, value]) => {
    const cleanKey = key.replace(/\.[^.]+$/, '');
    return (
      normalized(cleanKey) === normalized(folder) ||
      normalized(cleanKey) === normalized(humanize(folder)) ||
      normalized(value?.name) === normalized(folder) ||
      normalized(value?.name) === normalized(humanize(folder))
    );
  });
  return match?.[1] ?? {};
}

function findModel(requestedName) {
  const requestedKey = normalized(requestedName);
  const matches = readModelDirectories()
    .map((folder) => {
      const albumDir = join(modelsDir, folder);
      const localProfile = readJson(join(albumDir, 'profile.json'));
      const sharedProfile = sharedProfileFor(folder);
      const name = text(localProfile.name) || text(sharedProfile.name) || humanize(folder);
      return { folder, albumDir, localProfile, sharedProfile, name };
    })
    .filter(({ folder, name }) => {
      const slug = name
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      return (
        requestedKey === normalized(folder) ||
        requestedKey === normalized(name) ||
        requestedKey === normalized(slug)
      );
    });

  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(`More than one model matches “${requestedName}”. Use the exact album name.`);
  }
  const examples = readModelDirectories()
    .slice(0, 5)
    .map((folder) => humanize(folder))
    .join(', ');
  throw new Error(
    `Could not find model “${requestedName}” in ${relative(projectRoot, modelsDir)}. Example album names: ${examples}.`,
  );
}

/** Every photograph of the album, cover first — the pool the portfolio draws from. */
function albumPhotos(model) {
  const files = naturalSort(
    readdirSync(model.albumDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && imageExtensions.has(extname(entry.name).toLowerCase()))
      .map((entry) => entry.name),
  );
  const coverName =
    text(model.localProfile.cover) ||
    text(model.sharedProfile.cover) ||
    files.find((fileName) => fileName.replace(/\.[^.]+$/, '') === model.name) ||
    files.find((fileName) => fileName.replace(/\.[^.]+$/, '').toLowerCase() === 'cover') ||
    files[0] ||
    '';
  return [coverName, ...files.filter((fileName) => fileName !== coverName)]
    .filter(Boolean)
    .map((fileName) => join(model.albumDir, fileName));
}

/** Completed degrees and the story fields the portfolio's story pages quote. */
function readStory(albumDir) {
  const source = readJson(join(albumDir, 'Biography', 'biography.json'));
  if (source.fictional !== true) return null;
  const degree =
    /\b(?:bachelor(?:['’]s)?|master(?:['’]s)?|mba|ph\.?d\.?|doctor of philosophy|post[\s-]?doctorate)\b/i;
  const incomplete =
    /\b(?:in progress|ongoing|pending|pursuing|expected|candidate|not completed|not earned)\b/i;
  const list = (value, fields) =>
    Array.isArray(value)
      ? value
          .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
          .map((entry) => Object.fromEntries(fields.map((field) => [field, text(entry[field])])))
      : [];

  return {
    title: text(source.title),
    summary: text(source.summary),
    earlyLife: Array.isArray(source.earlyLife) ? source.earlyLife.map(text).filter(Boolean) : [],
    educationalBackground: list(source.educationalBackground, [
      'period',
      'qualification',
      'institution',
      'location',
      'description',
    ]).filter(
      (entry) =>
        entry.completed !== false &&
        degree.test(entry.qualification) &&
        !incomplete.test(`${entry.qualification} ${entry.description}`),
    ),
    career: list(source.career, ['period', 'role', 'organization', 'location', 'description']),
    achievements: Array.isArray(source.achievements)
      ? source.achievements.map(text).filter(Boolean)
      : [],
    interests: Array.isArray(source.interests) ? source.interests.map(text).filter(Boolean) : [],
    passions: Array.isArray(source.passions) ? source.passions.map(text).filter(Boolean) : [],
    hobbies: Array.isArray(source.hobbies) ? source.hobbies.map(text).filter(Boolean) : [],
    ambitions: Array.isArray(source.ambitions) ? source.ambitions.map(text).filter(Boolean) : [],
    quotes: list(source.quotes, ['text', 'by']).filter((entry) => entry.text),
  };
}

// ------------------------------------------------------------- image pipeline

class ImagePreparer {
  constructor({ binary, workDir, accent }) {
    this.binary = binary;
    this.workDir = workDir;
    this.accent = accent;
    this.cache = new Map();
    mkdirSync(workDir, { recursive: true });
  }

  get engine() {
    return this.binary ? 'imagemagick' : 'direct';
  }

  key(source, spec) {
    return `${relative(projectRoot, source)}|${spec.mode}|${spec.w ?? 0}x${spec.h ?? 0}|${spec.treatment ?? 'none'}`;
  }

  run(source, args, out) {
    execFileSync(this.binary, [source, ...args, out], { stdio: ['ignore', 'ignore', 'pipe'] });
    return out;
  }

  treatmentArgs(treatment) {
    switch (treatment) {
      case 'mono':
        return ['-colorspace', 'Gray', '-level', '6%,94%'];
      case 'duotone':
        return ['-colorspace', 'Gray', '-fill', this.accent, '-tint', '58'];
      case 'warm':
        return ['-modulate', '102,118'];
      default:
        return [];
    }
  }

  /**
   * Prepares one photograph for one role.
   *  - `bleed`: a top-anchored cover crop at page ratio — the head always stays
   *    in frame because the crop only ever trims the bottom or the sides.
   *  - `card`: the untouched photograph (so nothing is cropped) plus a blurred,
   *    darkened cover-cropped echo used as the card backdrop.
   */
  prepare(source, spec) {
    const treatment = spec.treatment ?? 'none';
    const cacheKey = this.key(source, spec);
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    if (!this.binary) {
      const direct = { file: source, backdrop: null, width: 0, height: 0 };
      this.cache.set(cacheKey, direct);
      return direct;
    }

    const digest = createHash('sha1').update(cacheKey).digest('hex').slice(0, 12);
    if (spec.mode === 'bleed') {
      const out = join(this.workDir, `${digest}-bleed.jpg`);
      this.run(
        source,
        [
          '-resize',
          '1400x1980^',
          '-gravity',
          'North',
          '-extent',
          '1400x1980',
          ...this.treatmentArgs(treatment),
          '-quality',
          '74',
          '-strip',
          '-interlace',
          'Plane',
        ],
        out,
      );
      const prepared = { file: out, backdrop: null };
      this.cache.set(cacheKey, prepared);
      return prepared;
    }

    const pixelsW = Math.min(1600, Math.round(((spec.w ?? 200) * 2.4) / 20) * 20);
    const pixelsH = Math.min(2000, Math.round(((spec.h ?? 260) * 2.4) / 20) * 20);
    const sharpOut = join(this.workDir, `${digest}-sharp.jpg`);
    this.run(
      source,
      [
        '-resize',
        '1200x1200',
        ...this.treatmentArgs(treatment),
        '-quality',
        '80',
        '-strip',
        '-interlace',
        'Plane',
      ],
      sharpOut,
    );
    const backdropOut = join(this.workDir, `${digest}-backdrop.jpg`);
    this.run(
      source,
      [
        '-resize',
        `${pixelsW}x${pixelsH}^`,
        '-gravity',
        'North',
        '-extent',
        `${pixelsW}x${pixelsH}`,
        '-blur',
        '0x22',
        '-modulate',
        '70,80',
        '-quality',
        '70',
        '-strip',
      ],
      backdropOut,
    );
    const prepared = { file: sharpOut, backdrop: backdropOut };
    this.cache.set(cacheKey, prepared);
    return prepared;
  }

  /** The website logo, flattened onto paper white and downsized for the masthead. */
  logo() {
    if (!this.binary) return { file: logoFile, aspect: LOGO_ASPECT };
    const out = join(this.workDir, 'neverbeen-logo-masthead.jpg');
    if (!existsSync(out)) {
      this.run(
        logoFile,
        ['-resize', 'x220', '-background', '#F6F2EC', '-flatten', '-quality', '90', '-strip'],
        out,
      );
    }
    const probe = spawnSync(this.binary, [out, '-format', '%w %h', 'info:'], { encoding: 'utf8' });
    const [w, h] = (probe.stdout || '').trim().split(/\s+/).map(Number);
    return { file: out, aspect: w && h ? w / h : LOGO_ASPECT };
  }
}

// --------------------------------------------------------------------- content

/** Seductive one-line caption notes for the photo pages, per model and seed. */
const NOTE_BANK = [
  'Shot in a single breath — {city} light, studio nerve, and a look that refuses to be cropped.',
  'The {style} series: {first} holds the frame the way a secret holds a room.',
  'No retouching can add what she arrives with. The lens only signs for it.',
  '{city} gave her the light; she gave it back with interest.',
  'A frame kept from the album because the whole team went quiet when it landed.',
  'Colour, composure, and a little danger — the {style} register in one exposure.',
  'She treats the camera like an old colleague: no performance, only truth.',
  'The frame the client asked to keep for the campaign wall.',
];

function buildContent({ model, story, design, photos, preparer }) {
  const nameParts = model.name.split(/\s+/);
  const city = (model.location.split(',')[0] || '').trim();
  const country = model.location.split(',').slice(1).join(',').trim();
  const copyContext = {
    name: model.name,
    first: nameParts[0] || model.name,
    city: city || 'the studio',
    country: country || 'the NeverBeen studio',
    style: design.style.name,
  };
  const sources = photos.length ? photos : [];

  const treatments = ['none', 'none', 'mono', 'duotone'];
  const ctx = {
    model,
    story,
    design,
    pageIndex: 0,
    /** How many photographs the model's album holds — quoted on the contents page. */
    photoCount: sources.length,
    shoot(index, spec = {}) {
      if (sources.length === 0) return null;
      const source = sources[((index % sources.length) + sources.length) % sources.length];
      return preparer.prepare(source, spec);
    },
    treatmentFor(index) {
      return treatments[design.variant(index + 31) % treatments.length];
    },
    editorialNote(index) {
      const note = NOTE_BANK[design.variant(index + 41) % NOTE_BANK.length];
      const extra = NOTE_BANK[design.variant(index + 57) % NOTE_BANK.length];
      return `${fill(note, copyContext)} ${note === extra ? '' : fill(extra, copyContext)}`.trim();
    },
  };
  return ctx;
}

// ------------------------------------------------------------------------- run

function parseArguments(argv) {
  const options = { model: '', style: '', dryRun: false, force: false, help: false, all: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--model' || argument === '-m') options.model = argv[++index] ?? '';
    else if (argument === '--style' || argument === '-s') options.style = argv[++index] ?? '';
    else if (argument === '--dry-run') options.dryRun = true;
    else if (argument === '--force') options.force = true;
    else if (argument === '--all') options.all = true;
    else if (argument === '--help' || argument === '-h') options.help = true;
    else if (!argument.startsWith('-') && !options.model) options.model = argument;
    else throw new Error(`Unknown option: ${argument}`);
  }
  return options;
}

function printHelp() {
  console.log(
    [
      'CreatePortfolio.mjs — the NeverBeen model portfolio generator',
      '',
      'Usage:',
      '  node CreatePortfolio.mjs --model "Model Name" [--style <style-id>] [--dry-run] [--force]',
      '  npm run portfolio -- --model "Model Name"',
      '  node CreatePortfolio.mjs --all            (every album that has photographs)',
      '',
      `Writes a ${PAGE_COUNT}-page A4-portrait black-finish portfolio PDF and its portfolio.json`,
      'receipt into public/NeverBeenModels/<Album>/Portfolio/, then refreshes the manifest so',
      'the model page offers Watch Portfolio and Download Portfolio.',
      '',
      'Styles: obsidian-muse, solar-editorial, aurora-chrome, cobalt-velvet, ember-rose,',
      '        jade-obsidian, ultra-violet, neon-mango   (default: seeded by the model name)',
      '',
      'An existing portfolio is protected; pass --force to replace it.',
    ].join('\n'),
  );
}

function createForModel(model, options) {
  const portfolioDir = join(model.albumDir, 'Portfolio');
  const pdfName = `${model.folder}_Portfolio.pdf`;
  const pdfFile = join(portfolioDir, pdfName);
  const receiptFile = join(portfolioDir, 'portfolio.json');

  if (existsSync(pdfFile) && !options.force && !options.dryRun) {
    throw new Error(
      `${relative(projectRoot, pdfFile)} already exists. Use --force to replace the current portfolio.`,
    );
  }

  const photos = albumPhotos(model);
  const story = readStory(model.albumDir);
  const design = resolveDesign(`${model.folder}:${model.name}`, options.style);
  const locationParts = text(model.localProfile.location ?? model.sharedProfile.location).split(
    ',',
  );

  const modelFacts = {
    slug: model.name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''),
    name: model.name,
    handle:
      text(model.localProfile.handle ?? model.sharedProfile.handle) ||
      `@${model.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '')}`,
    location: text(model.localProfile.location ?? model.sharedProfile.location),
    city: locationParts[0]?.trim() ?? '',
    country: locationParts.slice(1).join(',').trim(),
    age: text(model.localProfile.age ?? model.sharedProfile.age),
    height: text(model.localProfile.height ?? model.sharedProfile.height),
    weight: text(model.localProfile.weight ?? model.sharedProfile.weight),
    bust: text(model.localProfile.bust ?? model.sharedProfile.bust),
    waist: text(model.localProfile.waist ?? model.sharedProfile.waist),
    hip: text(model.localProfile.hip ?? model.sharedProfile.hip),
    bodyShape: text(model.localProfile.bodyShape ?? model.sharedProfile.bodyShape),
    tags: [
      ...(Array.isArray(model.localProfile.tags) ? model.localProfile.tags : []),
      ...(Array.isArray(model.sharedProfile.tags) && !Array.isArray(model.localProfile.tags)
        ? model.sharedProfile.tags
        : []),
    ]
      .map(text)
      .filter(Boolean),
    availability: text(model.localProfile.availability ?? model.sharedProfile.availability),
    photoRate: Number(model.localProfile.photoRate ?? model.sharedProfile.photoRate ?? 0) || 0,
    photoNote: text(model.localProfile.photoNote ?? model.sharedProfile.photoNote),
    bio: text(model.localProfile.bio ?? model.sharedProfile.bio),
    album: model.folder,
  };
  if (!modelFacts.handle.startsWith('@')) modelFacts.handle = `@${modelFacts.handle}`;

  if (options.dryRun) {
    console.log(`[portfolio] Dry run for ${model.name} (${model.folder})`);
    console.log(
      `[portfolio] Style: ${design.style.name} (${design.style.id}) — ${design.style.mood}`,
    );
    console.log(
      `[portfolio] Photograph pool: ${photos.length} frame${photos.length === 1 ? '' : 's'}`,
    );
    console.log(
      `[portfolio] Story source: ${story ? 'Biography/biography.json' : 'none — story pages fall back to studio copy'}`,
    );
    console.log(
      `[portfolio] Would write ${relative(projectRoot, pdfFile)} (${PAGE_COUNT} pages, A4 portrait)`,
    );
    console.log(`[portfolio] Would write ${relative(projectRoot, receiptFile)}`);
    return null;
  }

  const binary = findImageMagick();
  if (!binary) {
    console.warn(
      '[portfolio] ImageMagick not found — embedding album files directly (larger PDF, no card backdrops).',
    );
  }
  const workDir = join(tmpdir(), `neverbeen-portfolio-${model.folder}`);
  const preparer = new ImagePreparer({ binary, workDir, accent: design.accent });
  const logo = preparer.logo();

  const doc = new PDFDocument({
    autoFirstPage: false,
    size: [595.28, 841.89],
    margin: 0,
    compress: true,
    info: {
      Title: `${model.name} — NeverBeen Model Portfolio`,
      Author: 'NeverBeen',
      Subject: `24-page portrait-orientation fashion portfolio in the ${design.style.name} style`,
      Keywords: `NeverBeen, portfolio, ${model.name}, ${design.style.id}, fashion, editorial`,
      Creator: `CreatePortfolio.mjs v${VERSION}`,
    },
  });

  mkdirSync(portfolioDir, { recursive: true });
  doc.pipe(createWriteStream(pdfFile));

  const fonts = Object.fromEntries(
    Object.entries(FONTS).map(([name, file]) => [name, join(fontDir, file)]),
  );
  for (const [name, file] of Object.entries(fonts)) {
    if (!existsSync(file)) throw new Error(`Missing portfolio font ${name}: ${file}`);
  }

  const year = new Date().getFullYear();
  const kit = new PortfolioKit(doc, fonts, {
    logo: logo.file,
    logoAspect: logo.aspect,
    year,
    accent: design.accent,
    accent2: design.accent2,
    documentLabel: `${model.name} · NeverBeen portfolio`,
  });
  kit.registerFonts();
  kit.totalPages = PAGE_COUNT;

  const generatedAt = new Date().toISOString();
  const content = buildContent({ model: modelFacts, story, design, photos, preparer });
  content.meta = {
    logo: logo.file,
    logoAspect: logo.aspect,
    year,
    fileName: pdfName,
    generatedAt,
  };

  buildPages(kit, content);
  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const sizeBytes = statSync(pdfFile).size;
      const receipt = {
        model: model.name,
        album: model.folder,
        slug: modelFacts.slug,
        fictional: true,
        document: pdfName,
        url: `/NeverBeenModels/${model.folder}/Portfolio/${encodeURIComponent(pdfName)}`,
        pages: PAGE_COUNT,
        orientation: 'portrait',
        page: {
          width: 595.28,
          height: 841.89,
          units: 'pt',
          note: 'A4 portrait vector master — photographs prepared at print resolution; the page art renders crisp at 8K and beyond.',
        },
        style: {
          id: design.style.id,
          name: design.style.name,
          mood: design.style.mood,
          seed: design.seed,
        },
        sizeBytes,
        generatedAt,
        generator: { script: 'CreatePortfolio.mjs', version: VERSION },
        imageEngine: preparer.engine,
        photography: {
          pool: photos.length,
          used: [...new Set(Array.from({ length: photos.length }, (_, i) => i))].length,
          folder: `public/NeverBeenModels/${model.folder}`,
        },
        storySource: story ? 'Biography/biography.json' : null,
        fictionalNotice:
          'Story pages quote the model’s fictional NeverBeen Multiverse biography; photographs are studio album frames.',
      };
      writeFileSync(receiptFile, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
      console.log(
        `[portfolio] ${model.name}: wrote ${relative(projectRoot, pdfFile)} — ${PAGE_COUNT} pages, ` +
          `${design.style.name} style, ${(sizeBytes / 1024 / 1024).toFixed(1)} MB (${preparer.engine}).`,
      );
      resolve(receipt);
    });
    doc.on('error', reject);
  });
}

/** Small helper so the pipe stays readable above. */
async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) return printHelp();

  const targets = options.all
    ? readModelDirectories().map((folder) => ({ folder }))
    : [{ folder: null }];

  if (!options.all && !options.model.trim()) {
    throw new Error('A model name is required. Try --model "Model Name".');
  }

  const models = options.all
    ? targets
        .map(({ folder }) => {
          const albumDir = join(modelsDir, folder);
          const localProfile = readJson(join(albumDir, 'profile.json'));
          const sharedProfile = sharedProfileFor(folder);
          const name = text(localProfile.name) || text(sharedProfile.name) || humanize(folder);
          return { folder, albumDir, localProfile, sharedProfile, name };
        })
        .filter((model) => albumPhotos(model).length > 0)
    : [findModel(options.model.trim())];

  for (const model of models) {
    try {
      await createForModel(model, options);
    } catch (error) {
      if (options.all) {
        console.error(`[portfolio] ${model.name}: ${error.message}`);
        continue;
      }
      throw error;
    }
  }

  if (!options.dryRun) {
    execFileSync(process.execPath, ['scripts/generate-ai-models.mjs'], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    console.log(
      '[portfolio] Portfolio manifest refreshed — Watch & Download are live on the model page.',
    );
  }
}

main().catch((error) => {
  console.error(`[portfolio] ${error.message}`);
  process.exitCode = 1;
});
