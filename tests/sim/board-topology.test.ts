import { describe, expect, it } from 'vitest';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  allPlayableCells,
  isPlayableCell,
  orthogonalNeighbors,
  tileId,
} from '../../src/sim/board-topology';

const approvedPlayableCells = [
  { x: 11, y: 1 },
  { x: 12, y: 22 },
  { x: 9, y: 7 },
  { x: 14, y: 7 },
  { x: 10, y: 11 },
  { x: 13, y: 12 },
  { x: 9, y: 16 },
  { x: 14, y: 16 },
  { x: 1, y: 11 },
  { x: 5, y: 11 },
  { x: 3, y: 9 },
  { x: 3, y: 13 },
  { x: 5, y: 10 },
  { x: 5, y: 12 },
  { x: 22, y: 12 },
  { x: 18, y: 12 },
  { x: 20, y: 14 },
  { x: 20, y: 10 },
  { x: 18, y: 13 },
  { x: 18, y: 11 },
  { x: 8, y: 9 },
  { x: 8, y: 11 },
  { x: 8, y: 13 },
  { x: 15, y: 14 },
  { x: 15, y: 12 },
  { x: 15, y: 10 },
] as const;

describe('Royal War Triptych 24x24 cross-board topology', () => {
  it('uses the approved 24x24 logical bounds', () => {
    expect(BOARD_WIDTH).toBe(24);
    expect(BOARD_HEIGHT).toBe(24);
    expect(isPlayableCell(24, 8)).toBe(false);
    expect(isPlayableCell(23, 24)).toBe(false);
  });

  it('keeps the full-width central theatre playable on rows 8 through 15', () => {
    for (let x = 0; x < 24; x += 1) {
      expect(isPlayableCell(x, 8)).toBe(true);
      expect(isPlayableCell(x, 15)).toBe(true);
    }
  });

  it('keeps only the six-wide north/south corridor playable outside the theatre', () => {
    for (const y of [0, 7, 16, 23]) {
      for (let x = 9; x <= 14; x += 1) {
        expect(isPlayableCell(x, y)).toBe(true);
      }
    }

    expect(isPlayableCell(8, 7)).toBe(false);
    expect(isPlayableCell(15, 7)).toBe(false);
    expect(isPlayableCell(8, 16)).toBe(false);
    expect(isPlayableCell(15, 16)).toBe(false);
    expect(isPlayableCell(0, 0)).toBe(false);
    expect(isPlayableCell(23, 23)).toBe(false);
  });

  it('keeps every approved opening unit, node, and fortification cell playable', () => {
    for (const cell of approvedPlayableCells) {
      expect(isPlayableCell(cell.x, cell.y)).toBe(true);
    }
  });

  it('assigns exactly 288 playable cells stable unique tile ids', () => {
    const cells = allPlayableCells();
    const ids = cells.map((cell) => tileId(cell));

    expect(cells).toHaveLength(288);
    expect(new Set(ids).size).toBe(cells.length);
    expect(tileId({ x: 11, y: 1 })).toBe('11,1');
    expect(tileId({ x: 23, y: 15 })).toBe('23,15');
  });

  it('never returns an off-board void from orthogonal neighbor queries', () => {
    const neighbors = orthogonalNeighbors(9, 7);

    expect(neighbors).toEqual(
      expect.arrayContaining([
        { x: 10, y: 7 },
        { x: 9, y: 6 },
        { x: 9, y: 8 },
      ]),
    );
    expect(neighbors).not.toContainEqual({ x: 8, y: 7 });
    expect(neighbors.every((cell) => isPlayableCell(cell.x, cell.y))).toBe(true);
  });
});
