import { describe, expect, it } from 'vitest';
import { createInteractiveBoardGrid } from '../../src/client/board/interactive-board-grid';
import { tileCenter, type BoardProjection } from '../../src/client/board/projection';

const flat32: BoardProjection = {
  topLeft: { x: 0, y: 0 },
  topRight: { x: 3200, y: 0 },
  bottomLeft: { x: 0, y: 3200 },
  bottomRight: { x: 3200, y: 3200 },
};

describe('topology-aware interactive board grid', () => {
  it('keeps the default live grid on 24x24', () => {
    const grid = createInteractiveBoardGrid(flat32);
    expect(grid.cells).toHaveLength(24 * 24);
    expect(grid.cell(24, 23)).toBeUndefined();
  });

  it('builds the full 32x32 candidate only when explicitly selected', () => {
    const grid = createInteractiveBoardGrid(flat32, 'triptych-v2');
    expect(grid.cells).toHaveLength(32 * 32);
    expect(grid.cell(31, 31)).toMatchObject({ x: 31, y: 31 });
    expect(grid.cell(32, 31)).toBeUndefined();
  });

  it('hit-tests V2 cells through the selected projection', () => {
    const grid = createInteractiveBoardGrid(flat32, 'triptych-v2');
    const point = tileCenter({ x: 31, y: 11 }, flat32, 'triptych-v2');
    expect(grid.hitTest(point)).toEqual({ x: 31, y: 11 });
  });
});
