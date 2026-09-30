import { describe, expect, it } from 'vitest';
import { createInteractiveBoardGrid } from '../../src/client/board/interactive-board-grid';
import { tileCenter, type BoardProjection } from '../../src/client/board/projection';

const flat: BoardProjection = {
  topLeft: { x: 0, y: 0 },
  topRight: { x: 3200, y: 0 },
  bottomLeft: { x: 0, y: 3200 },
  bottomRight: { x: 3200, y: 3200 },
};

describe('Triptych interactive board grid', () => {
  it('covers the full canonical 32x32 logical extent', () => {
    const grid = createInteractiveBoardGrid(flat);

    expect(grid.cells).toHaveLength(32 * 32);
    expect(grid.cell(31, 31)).toMatchObject({ x: 31, y: 31 });
    expect(grid.cell(32, 31)).toBeUndefined();
  });

  it('hit-tests cells across the enlarged east theatre', () => {
    const grid = createInteractiveBoardGrid(flat);
    const point = tileCenter({ x: 31, y: 20 }, flat);

    expect(grid.hitTest(point)).toEqual({ x: 31, y: 20 });
  });
});
