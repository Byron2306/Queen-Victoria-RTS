import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE,
  boardCellToScreen,
  screenPointToPlayableCell,
  screenToBoardCell,
  tileCenter,
  type BoardProjection,
} from '../../src/client/board/projection';

const flat: BoardProjection = {
  topLeft: { x: 0, y: 0 },
  topRight: { x: 2400, y: 0 },
  bottomLeft: { x: 0, y: 2400 },
  bottomRight: { x: 2400, y: 2400 },
};

const perspective: BoardProjection = {
  topLeft: { x: 400, y: 180 },
  topRight: { x: 1200, y: 180 },
  bottomLeft: { x: 120, y: 820 },
  bottomRight: { x: 1480, y: 820 },
};

describe('Triptych 24x24 board projection', () => {
  it('uses the canonical 24-cell logical extent', () => {
    expect(BOARD_SIZE).toBe(24);
  });

  it('maps cells by visual centre while preserving a 100px flat tile step', () => {
    expect(boardCellToScreen({ x: 0, y: 0 }, flat))
      .toEqual({ x: 50, y: 50 });
    expect(boardCellToScreen({ x: 23, y: 23 }, flat))
      .toEqual({ x: 2350, y: 2350 });

    const a = tileCenter({ x: 10, y: 11 }, flat);
    const b = tileCenter({ x: 11, y: 11 }, flat);
    expect(b.x - a.x).toBe(100);
    expect(b.y - a.y).toBe(0);
  });

  it('widens lower rows under battlefield perspective', () => {
    const topLeft = boardCellToScreen({ x: 0, y: 0 }, perspective);
    const topRight = boardCellToScreen({ x: 23, y: 0 }, perspective);
    const bottomLeft = boardCellToScreen({ x: 0, y: 23 }, perspective);
    const bottomRight = boardCellToScreen({ x: 23, y: 23 }, perspective);

    expect(bottomRight.x - bottomLeft.x)
      .toBeGreaterThan(topRight.x - topLeft.x);
  });

  it('rejects cells outside the 24x24 board', () => {
    expect(() => boardCellToScreen({ x: 24, y: 0 }, flat)).toThrow();
    expect(() => boardCellToScreen({ x: -1, y: 0 }, flat)).toThrow();
  });
});

describe('Triptych inverse board projection', () => {
  it('round-trips representative theatre and sanctuary cells', () => {
    for (const cell of [
      { x: 23, y: 15 },
      { x: 11, y: 1 },
      { x: 12, y: 22 },
      { x: 0, y: 8 },
    ]) {
      const screen = boardCellToScreen(cell, flat);
      expect(screenToBoardCell(screen, flat)).toEqual(cell);
    }
  });

  it('returns null outside the board quadrilateral', () => {
    expect(screenToBoardCell({ x: -10, y: 500 }, flat)).toBeNull();
    expect(screenToBoardCell({ x: 2500, y: 500 }, flat)).toBeNull();
  });

  it('filters rectangular projection cells that belong to the cross-board void', () => {
    const voidPoint = tileCenter({ x: 0, y: 0 }, flat);
    const theatrePoint = tileCenter({ x: 0, y: 8 }, flat);

    expect(screenPointToPlayableCell(voidPoint, flat)).toBeNull();
    expect(screenPointToPlayableCell(theatrePoint, flat)).toEqual({ x: 0, y: 8 });
  });
});
