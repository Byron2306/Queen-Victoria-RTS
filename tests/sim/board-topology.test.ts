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
  { x: 15, y: 1 },
  { x: 16, y: 30 },
  { x: 12, y: 10 },
  { x: 19, y: 10 },
  { x: 13, y: 15 },
  { x: 18, y: 16 },
  { x: 12, y: 21 },
  { x: 19, y: 21 },
  { x: 2, y: 16 },
  { x: 6, y: 16 },
  { x: 4, y: 13 },
  { x: 4, y: 19 },
  { x: 6, y: 15 },
  { x: 6, y: 17 },
  { x: 29, y: 15 },
  { x: 25, y: 15 },
  { x: 27, y: 18 },
  { x: 27, y: 12 },
  { x: 25, y: 16 },
  { x: 25, y: 14 },
  { x: 7, y: 13 },
  { x: 7, y: 16 },
  { x: 7, y: 19 },
  { x: 24, y: 18 },
  { x: 24, y: 15 },
  { x: 24, y: 12 },
] as const;

describe('Royal War Triptych 32x32 cross-board topology', () => {
  it('uses the approved 32x32 logical bounds', () => {
    expect(BOARD_WIDTH).toBe(32);
    expect(BOARD_HEIGHT).toBe(32);
    expect(isPlayableCell(32, 11)).toBe(false);
    expect(isPlayableCell(31, 32)).toBe(false);
  });

  it('keeps the full-width central theatre playable on rows 11 through 20', () => {
    for (let x = 0; x < 32; x += 1) {
      expect(isPlayableCell(x, 11)).toBe(true);
      expect(isPlayableCell(x, 20)).toBe(true);
    }
  });

  it('keeps only the eight-wide north/south corridor playable outside the theatre', () => {
    for (const y of [0, 10, 21, 31]) {
      for (let x = 12; x <= 19; x += 1) {
        expect(isPlayableCell(x, y)).toBe(true);
      }
    }

    expect(isPlayableCell(11, 10)).toBe(false);
    expect(isPlayableCell(20, 10)).toBe(false);
    expect(isPlayableCell(11, 21)).toBe(false);
    expect(isPlayableCell(20, 21)).toBe(false);
    expect(isPlayableCell(0, 0)).toBe(false);
    expect(isPlayableCell(31, 31)).toBe(false);
  });

  it('keeps every approved opening unit, node, and fortification cell playable', () => {
    for (const cell of approvedPlayableCells) {
      expect(isPlayableCell(cell.x, cell.y)).toBe(true);
    }
  });

  it('assigns exactly 496 playable cells stable unique tile ids', () => {
    const cells = allPlayableCells();
    const ids = cells.map((cell) => tileId(cell));

    expect(cells).toHaveLength(496);
    expect(new Set(ids).size).toBe(cells.length);
    expect(tileId({ x: 15, y: 1 })).toBe('15,1');
    expect(tileId({ x: 31, y: 20 })).toBe('31,20');
  });

  it('never returns an off-board void from orthogonal neighbor queries', () => {
    const neighbors = orthogonalNeighbors(12, 10);

    expect(neighbors).toEqual(
      expect.arrayContaining([
        { x: 13, y: 10 },
        { x: 12, y: 9 },
        { x: 12, y: 11 },
      ]),
    );
    expect(neighbors).not.toContainEqual({ x: 11, y: 10 });
    expect(neighbors.every((cell) => isPlayableCell(cell.x, cell.y))).toBe(true);
  });
});
