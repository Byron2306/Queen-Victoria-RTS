import { describe, expect, it } from 'vitest';
import {
  resolveBoardPointerCell,
} from '../../src/client/input/board-pointer-cell';
import {
  tileCenter,
  type BoardProjection,
} from '../../src/client/board/projection';

const flat32: BoardProjection = {
  topLeft: { x: 0, y: 0 },
  topRight: { x: 3200, y: 0 },
  bottomLeft: { x: 0, y: 3200 },
  bottomRight: { x: 3200, y: 3200 },
};

describe('topology-aware board pointer cell resolution', () => {
  it('keeps the default pointer authority on V1', () => {
    const point = tileCenter({ x: 23, y: 15 }, flat32);

    expect(resolveBoardPointerCell(point, flat32))
      .toEqual({ x: 23, y: 15 });
  });

  it('resolves V2-only cells when explicitly selected', () => {
    const point = tileCenter(
      { x: 31, y: 11 },
      flat32,
      'triptych-v2',
    );

    expect(resolveBoardPointerCell(
      point,
      flat32,
      'triptych-v2',
    )).toEqual({ x: 31, y: 11 });
  });
});
