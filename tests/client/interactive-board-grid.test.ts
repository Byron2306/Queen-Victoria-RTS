import { describe, expect, it } from 'vitest';
import { createInteractiveBoardGrid } from '../../src/client/board/interactive-board-grid';
import { tileCenter, type BoardProjection } from '../../src/client/board/projection';

const flat: BoardProjection = {
  topLeft: { x: 0, y: 0 },
  topRight: { x: 2400, y: 0 },
  bottomLeft: { x: 0, y: 2400 },
  bottomRight: { x: 2400, y: 2400 },
};

describe('Triptych interactive board grid', () => {
  it('covers the full canonical 24x24 logical extent', () => {
    const grid = createInteractiveBoardGrid(flat);

    expect(grid.cells).toHaveLength(24 * 24);
    expect(grid.cell(23, 23)).toMatchObject({ x: 23, y: 23 });
    expect(grid.cell(24, 23)).toBeUndefined();
  });

  it('hit-tests cells beyond the retired 16x16 extent', () => {
    const grid = createInteractiveBoardGrid(flat);
    const point = tileCenter({ x: 23, y: 15 }, flat);

    expect(grid.hitTest(point)).toEqual({ x: 23, y: 15 });
  });
});
