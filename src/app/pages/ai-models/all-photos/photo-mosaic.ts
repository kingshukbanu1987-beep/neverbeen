/**
 * The "View All" mosaic: every photograph of an album laid out in a bento grid where the tiles come
 * in different sizes — small frames, tall and wide accents, large features and full-width heroes.
 *
 * The layout is built from hand-designed modules. Each module is a small block of the grid drawn as
 * ASCII art, one letter per tile (`AAB` / `AAC` is a 2×2 feature followed by two small frames).
 * Modules are always complete rectangles and are stacked one under the other, so the mosaic never
 * has a hole in it, whatever the number of photographs. A rotation of modules gives the rhythm; when
 * the album is nearly used up, the remaining photographs are placed with the largest module that
 * still fits, down to the one-tile modules every column count has, so the last row is always flush.
 *
 * The grid cell is 4:3 (the shape of most of the studio's photographs), so small frames and 2×2
 * features show a 4:3 photograph uncropped and only the accents crop it.
 */

/** Column counts the mosaic is laid out for: phones, tablets and desktops. */
export const MOSAIC_COLUMNS = [2, 3, 4] as const;
export type MosaicColumns = (typeof MOSAIC_COLUMNS)[number];

/** Where one tile sits in the grid, as 1-based CSS grid lines and spans. */
export interface MosaicPlacement {
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
}

/** A parsed module: its height in rows and its tiles, relative to the module's top-left cell. */
export interface MosaicModule {
  readonly rows: number;
  readonly tiles: readonly MosaicPlacement[];
}

/**
 * Parses one module's ASCII art. Every character is a cell and every letter is one tile, which must
 * cover a filled rectangle; tiles are ordered by their top-left cell, in reading order.
 */
export function parseModule(art: readonly string[], columns: number): MosaicModule {
  if (art.length === 0) throw new Error('A mosaic module needs at least one row.');

  const bounds = new Map<string, { top: number; left: number; bottom: number; right: number }>();
  art.forEach((line, row) => {
    if (line.length !== columns) {
      throw new Error(`Mosaic row "${line}" must be ${columns} cells wide.`);
    }
    [...line].forEach((cell, column) => {
      if (!/^[A-Z]$/.test(cell)) throw new Error(`Mosaic cell "${cell}" must be a letter A–Z.`);
      const box = bounds.get(cell);
      if (!box) {
        bounds.set(cell, { top: row, left: column, bottom: row, right: column });
        return;
      }
      box.top = Math.min(box.top, row);
      box.left = Math.min(box.left, column);
      box.bottom = Math.max(box.bottom, row);
      box.right = Math.max(box.right, column);
    });
  });

  const tiles: MosaicPlacement[] = [];
  for (const [letter, box] of bounds) {
    // Each letter must fill its whole bounding box, or the tile would not be a rectangle.
    for (let row = box.top; row <= box.bottom; row += 1) {
      for (let column = box.left; column <= box.right; column += 1) {
        if (art[row][column] !== letter) {
          throw new Error(`Mosaic tile "${letter}" in [${art.join(' / ')}] is not a rectangle.`);
        }
      }
    }
    tiles.push({
      column: box.left + 1,
      row: box.top + 1,
      columnSpan: box.right - box.left + 1,
      rowSpan: box.bottom - box.top + 1,
    });
  }

  tiles.sort((a, b) => a.row - b.row || a.column - b.column);
  return { rows: art.length, tiles };
}

/**
 * The rhythm of each layout. The cycle opens on a feature, alternates big frames left and right,
 * and breathes with rows of small frames in between.
 */
const ROTATIONS: Record<MosaicColumns, readonly (readonly string[])[]> = {
  2: [
    ['AA', 'AA'], //    full-width feature
    ['AB'], //          two small frames
    ['AB', 'AC'], //    tall accent left, two small frames right
    ['AB'],
    ['AB', 'CB'], //    two small frames left, tall accent right
    ['AA'], //          wide banner
    ['AB'],
    ['AB', 'AB'], //    two portraits side by side
  ],
  3: [
    ['AAB', 'AAC'], //  feature left
    ['ABC'],
    ['ABB', 'CBB'], //  feature right
    ['AAA', 'AAA'], //  cinematic full-width hero
    ['ABC', 'ADE'], //  tall accent and four small frames
    ['AAB', 'AAB'], //  feature with a tall accent
    ['ABC'],
    ['ABB', 'ABB'], //  tall accent with a feature
  ],
  4: [
    ['AAAB', 'AAAC', 'AAAD'], // hero left with a column of small frames
    ['ABCD'],
    ['ABCC', 'DECC'], //         feature right
    ['AABB', 'AABB'], //         diptych of features
    ['ABBC', 'ABBD'], //         tall accent, feature, small frames
    ['ABCD'],
    ['ABBB', 'CBBB', 'DBBB'], // hero right
    ['AABC', 'AADE'], //         feature left
    ['AAAB', 'AAAB'], //         cinematic frame with a tall accent
    ['ABCC', 'ADCC'], //         tall accent, small frames, feature
  ],
};

/**
 * Modules used to finish an album whose remaining photographs no longer fill the next module of the
 * rotation. Each column count includes a one-tile module, so any remainder can be placed exactly.
 */
const FINISHERS: Record<MosaicColumns, readonly (readonly string[])[]> = {
  2: [['AA', 'AA']],
  3: [
    ['AAA', 'AAA'],
    ['AAB', 'AAB'],
    ['AAB', 'AAC'],
  ],
  4: [['AAAA', 'AAAA', 'AAAA'], ['AABB', 'AABB'], ['AAAB', 'AAAC'], ['ABCD']],
};

interface ModuleSet {
  rotation: readonly MosaicModule[];
  /** Every module of the column count, largest first, used for the end of the album. */
  bySize: readonly MosaicModule[];
}

const moduleSets = new Map<MosaicColumns, ModuleSet>(
  MOSAIC_COLUMNS.map((columns) => {
    const rotation = ROTATIONS[columns].map((art) => parseModule(art, columns));
    const finishers = FINISHERS[columns].map((art) => parseModule(art, columns));
    const bySize = [...rotation, ...finishers].sort((a, b) => b.tiles.length - a.tiles.length);
    return [columns, { rotation, bySize }] as const;
  }),
);

/** Lays out `count` photographs in a `columns`-wide mosaic, one placement per photograph. */
export function packMosaic(count: number, columns: MosaicColumns): MosaicPlacement[] {
  const set = moduleSets.get(columns);
  if (!set) throw new Error(`The mosaic has no layout for ${columns} columns.`);

  const placements: MosaicPlacement[] = [];
  let remaining = Math.max(0, Math.floor(count));
  let rowOffset = 0;
  let step = 0;

  while (remaining > 0) {
    let module = set.rotation[step % set.rotation.length];
    if (module.tiles.length > remaining) {
      // The album is nearly used up: finish it with the largest module that still fits.
      module = set.bySize.find((candidate) => candidate.tiles.length <= remaining)!;
    }
    for (const tile of module.tiles) {
      placements.push({ ...tile, row: tile.row + rowOffset });
    }
    rowOffset += module.rows;
    remaining -= module.tiles.length;
    step += 1;
  }

  return placements;
}

/**
 * Inline style for every tile: its grid placement in each of the layouts, as CSS custom properties
 * (`--c4: 1 / span 3`, `--r4: 1 / span 3` …). The stylesheet picks the set that matches the width
 * of the grid with container queries, so the mosaic re-flows without any script.
 */
export function mosaicTileStyles(count: number): Record<string, string>[] {
  const layouts = MOSAIC_COLUMNS.map((columns) => [columns, packMosaic(count, columns)] as const);
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, index) => {
    const style: Record<string, string> = {};
    for (const [columns, placements] of layouts) {
      const placement = placements[index];
      style[`--c${columns}`] = `${placement.column} / span ${placement.columnSpan}`;
      style[`--r${columns}`] = `${placement.row} / span ${placement.rowSpan}`;
    }
    return style;
  });
}
