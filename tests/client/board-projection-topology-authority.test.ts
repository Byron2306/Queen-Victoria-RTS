import { describe, expect, it } from 'vitest';
import {
  boardCellToScreen,
  screenPointToPlayableCell,
  screenToBoardCell,
  tileCenter,
  type BoardProjection,
} from '../../src/client/board/projection';

const flat32: BoardProjection = {
  topLeft: { x: 0, y: 0 },
  topRight: { x: 3200, y: 0 },
  bottomLeft: { x: 0, y: 3200 },
  bottomRight: { x: 3200, y: 3200 },
};

describe('topology-aware board projection', () => {
  it('projects and round-trips the 32x32 candidate only when explicitly selected', () => {
    expect(boardCellToScreen({ x: 31, y: 31 }, flat32, 'triptych-v2'))
      .toEqual({ x: 3150, y: 3150 });

    const screen = boardCellToScreen(
      { x: 31, y: 11 },
      flat32,
      'triptych-v2',
    );

    expect(screenToBoardCell(screen, flat32, 'triptych-v2'))
      .toEqual({ x: 31, y: 11 });
  });

  it('keeps 32x32 cells invalid under the default live V1 projection', () => {
    expect(() => boardCellToScreen({ x: 31, y: 11 }, flat32))
      .toThrow();
  });

  it('filters V2 cross-board voids through the selected topology authority', () => {
    const voidPoint = tileCenter(
      { x: 0, y: 0 },
      flat32,
      'triptych-v2',
    );
    const theatrePoint = tileCenter(
      { x: 31, y: 11 },
      flat32,
      'triptych-v2',
    );

    expect(screenPointToPlayableCell(
      voidPoint,
      flat32,
      'triptych-v2',
    )).toBeNull();

    expect(screenPointToPlayableCell(
      theatrePoint,
      flat32,
      'triptych-v2',
    )).toEqual({ x: 31, y: 11 });
  });
});
