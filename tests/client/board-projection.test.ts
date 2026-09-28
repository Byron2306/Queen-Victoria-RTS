import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE,
  boardCellToScreen,
  screenToBoardCell,
  type BoardProjection,
} from '../../src/client/board/projection';

const flat: BoardProjection = {
  topLeft: { x: 0, y: 0 },
  topRight: { x: 1600, y: 0 },
  bottomLeft: { x: 0, y: 1600 },
  bottomRight: { x: 1600, y: 1600 },
};

const perspective: BoardProjection = {
  topLeft: { x: 400, y: 180 },
  topRight: { x: 1200, y: 180 },
  bottomLeft: { x: 120, y: 820 },
  bottomRight: { x: 1480, y: 820 },
};

describe('Phase 6 16x16 board projection', () => {
  it('keeps the authoritative board size at 16', () => {
    expect(BOARD_SIZE).toBe(16);
  });

  it('maps cells by their visual centre', () => {
    expect(boardCellToScreen({ x: 0, y: 0 }, flat))
      .toEqual({ x: 50, y: 50 });

    expect(boardCellToScreen({ x: 15, y: 15 }, flat))
      .toEqual({ x: 1550, y: 1550 });
  });

  it('widens lower rows under battlefield perspective', () => {
    const topLeft = boardCellToScreen({ x: 0, y: 0 }, perspective);
    const topRight = boardCellToScreen({ x: 15, y: 0 }, perspective);
    const bottomLeft = boardCellToScreen({ x: 0, y: 15 }, perspective);
    const bottomRight = boardCellToScreen({ x: 15, y: 15 }, perspective);

    expect(bottomRight.x - bottomLeft.x)
      .toBeGreaterThan(topRight.x - topLeft.x);
  });

  it('rejects cells outside the 16x16 board', () => {
    expect(() => boardCellToScreen({ x: 16, y: 0 }, flat)).toThrow();
    expect(() => boardCellToScreen({ x: -1, y: 0 }, flat)).toThrow();
  });
});

describe('Phase 6 inverse board projection', () => {
  it('maps screen positions back to board cells', () => {
    const projection = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 1600, y: 0 },
      bottomLeft: { x: 0, y: 1600 },
      bottomRight: { x: 1600, y: 1600 },
    };

    expect(
      screenToBoardCell({ x: 50, y: 50 }, projection),
    ).toEqual({ x: 0, y: 0 });

    expect(
      screenToBoardCell({ x: 1550, y: 1550 }, projection),
    ).toEqual({ x: 15, y: 15 });
  });

  it('returns null outside the board quadrilateral', () => {
    const projection = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 1600, y: 0 },
      bottomLeft: { x: 0, y: 1600 },
      bottomRight: { x: 1600, y: 1600 },
    };

    expect(
      screenToBoardCell({ x: -10, y: 500 }, projection),
    ).toBeNull();

    expect(
      screenToBoardCell({ x: 1700, y: 500 }, projection),
    ).toBeNull();
  });
});
