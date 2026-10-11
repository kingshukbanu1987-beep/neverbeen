import {
  MOSAIC_COLUMNS,
  MosaicPlacement,
  mosaicTileStyles,
  packMosaic,
  parseModule,
} from './photo-mosaic';

/** Paints the placements onto a grid, failing on any overlap or any tile outside the columns. */
function paint(placements: MosaicPlacement[], columns: number): number[][] {
  const rows = Math.max(0, ...placements.map((tile) => tile.row + tile.rowSpan - 1));
  const grid = Array.from({ length: rows }, () => Array<number>(columns).fill(-1));
  placements.forEach((tile, index) => {
    expect(tile.column).toBeGreaterThanOrEqual(1);
    expect(tile.column + tile.columnSpan - 1).toBeLessThanOrEqual(columns);
    for (let row = tile.row - 1; row < tile.row - 1 + tile.rowSpan; row += 1) {
      for (let column = tile.column - 1; column < tile.column - 1 + tile.columnSpan; column += 1) {
        if (grid[row][column] !== -1) {
          throw new Error(
            `Tiles ${grid[row][column]} and ${index} overlap at ${row + 1}/${column + 1}`,
          );
        }
        grid[row][column] = index;
      }
    }
  });
  return grid;
}

describe('photo mosaic', () => {
  it('places every photograph, without overlaps or holes, for any album size and width', () => {
    for (const columns of MOSAIC_COLUMNS) {
      for (let count = 0; count <= 140; count += 1) {
        const placements = packMosaic(count, columns);
        expect(placements.length).toBe(count);
        const grid = paint(placements, columns);
        // Every cell of every row is covered, so the mosaic ends flush with no gaps.
        expect(grid.flat().every((cell) => cell !== -1)).toBe(true);
      }
    }
  });

  it('lays the album out in tiles of clearly different sizes', () => {
    for (const columns of MOSAIC_COLUMNS) {
      const sizes = new Set(
        packMosaic(30, columns).map((tile) => `${tile.columnSpan}x${tile.rowSpan}`),
      );
      expect(sizes.size).toBeGreaterThanOrEqual(3);
    }

    // The album opens on a feature: the first photograph gets the largest tile on a wide screen.
    const desktop = packMosaic(30, 4);
    const area = (tile: MosaicPlacement) => tile.columnSpan * tile.rowSpan;
    expect(area(desktop[0])).toBe(Math.max(...desktop.map(area)));
    expect(area(desktop[0])).toBeGreaterThan(1);
  });

  it('keeps reading order: tiles run top to bottom, left to right', () => {
    for (const columns of MOSAIC_COLUMNS) {
      const placements = packMosaic(60, columns);
      for (let index = 1; index < placements.length; index += 1) {
        const previous = placements[index - 1];
        const current = placements[index];
        const ordered =
          current.row > previous.row ||
          (current.row === previous.row && current.column > previous.column);
        expect(ordered).toBe(true);
      }
    }
  });

  it('describes each tile placement for every layout as CSS custom properties', () => {
    const styles = mosaicTileStyles(5);
    expect(styles.length).toBe(5);
    expect(styles[0]).toEqual({
      '--c2': '1 / span 2',
      '--r2': '1 / span 2',
      '--c3': '1 / span 2',
      '--r3': '1 / span 2',
      '--c4': '1 / span 3',
      '--r4': '1 / span 3',
    });
    expect(mosaicTileStyles(0)).toEqual([]);
  });

  it('rejects module drawings that are not made of whole rectangles', () => {
    expect(parseModule(['AAB', 'AAC'], 3).tiles).toEqual([
      { column: 1, row: 1, columnSpan: 2, rowSpan: 2 },
      { column: 3, row: 1, columnSpan: 1, rowSpan: 1 },
      { column: 3, row: 2, columnSpan: 1, rowSpan: 1 },
    ]);
    expect(() => parseModule(['AAB', 'ABB'], 3)).toThrowError(/not a rectangle/);
    expect(() => parseModule(['AB', 'A.'], 2)).toThrowError(/letter/);
    expect(() => parseModule(['ABC'], 2)).toThrowError(/2 cells wide/);
    expect(() => parseModule([], 2)).toThrowError(/at least one row/);
  });
});
