import { describe, expect, it } from 'vitest';
import {
  allPlayableCells,
  isPlayableCell,
  orthogonalNeighbors,
  tileId,
} from '../../src/sim/board-topology';

describe('Royal War cross-board topology', () => {
  it('keeps the north/south sanctums and broad central theatre playable', () => {
    expect(isPlayableCell(7, 0)).toBe(true);
    expect(isPlayableCell(7, 15)).toBe(true);
    expect(isPlayableCell(0, 7)).toBe(true);
    expect(isPlayableCell(15, 7)).toBe(true);
    expect(isPlayableCell(7, 7)).toBe(true);
  });

  it('leaves the four corner quadrants outside the playable cross', () => {
    expect(isPlayableCell(0, 0)).toBe(false);
    expect(isPlayableCell(15, 0)).toBe(false);
    expect(isPlayableCell(0, 15)).toBe(false);
    expect(isPlayableCell(15, 15)).toBe(false);
  });

  it('assigns every playable cell one stable unique tile id', () => {
    const cells = allPlayableCells();
    const ids = cells.map((cell) => tileId(cell));

    expect(cells).toHaveLength(220);
    expect(new Set(ids).size).toBe(cells.length);
    expect(tileId({ x: 7, y: 0 })).toBe('7,0');
    expect(tileId({ x: 15, y: 7 })).toBe('15,7');
  });

  it('never returns an off-board void from orthogonal neighbor queries', () => {
    const neighbors = orthogonalNeighbors(3, 2);

    expect(neighbors).toEqual(
      expect.arrayContaining([
        { x: 4, y: 2 },
        { x: 3, y: 1 },
        { x: 3, y: 3 },
      ]),
    );
    expect(neighbors).not.toContainEqual({ x: 2, y: 2 });
    expect(neighbors.every((cell) => isPlayableCell(cell.x, cell.y))).toBe(true);
  });
});
