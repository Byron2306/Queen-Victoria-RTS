import { describe, expect, it } from 'vitest';
import {
  TRIPTYCH_V2_HEIGHT,
  TRIPTYCH_V2_WIDTH,
  allTriptychV2PlayableCells,
  isTriptychV2PlayableCell,
  triptychV2OrthogonalNeighbors,
} from '../../src/sim/triptych-topology-v2';

describe('Royal War Triptych 32x32 topology candidate', () => {
  it('defines a 32x32 logical world', () => {
    expect(TRIPTYCH_V2_WIDTH).toBe(32);
    expect(TRIPTYCH_V2_HEIGHT).toBe(32);

    expect(isTriptychV2PlayableCell(31, 11)).toBe(true);
    expect(isTriptychV2PlayableCell(32, 11)).toBe(false);
    expect(isTriptychV2PlayableCell(12, 31)).toBe(true);
    expect(isTriptychV2PlayableCell(12, 32)).toBe(false);
  });

  it('uses an eight-wide vertical spine and ten-row central theatre', () => {
    for (let x = 0; x < 32; x += 1) {
      expect(isTriptychV2PlayableCell(x, 11)).toBe(true);
      expect(isTriptychV2PlayableCell(x, 20)).toBe(true);
    }

    for (const y of [0, 10, 21, 31]) {
      for (let x = 12; x <= 19; x += 1) {
        expect(isTriptychV2PlayableCell(x, y)).toBe(true);
      }
    }

    expect(isTriptychV2PlayableCell(11, 10)).toBe(false);
    expect(isTriptychV2PlayableCell(20, 10)).toBe(false);
    expect(isTriptychV2PlayableCell(11, 21)).toBe(false);
    expect(isTriptychV2PlayableCell(20, 21)).toBe(false);
  });

  it('contains exactly 496 playable cells', () => {
    const cells = allTriptychV2PlayableCells();

    expect(cells).toHaveLength(496);
    expect(new Set(cells.map((cell) => `${cell.x},${cell.y}`)).size).toBe(496);
  });

  it('never returns void cells as orthogonal neighbours', () => {
    expect(triptychV2OrthogonalNeighbors(12, 10)).toEqual(
      expect.arrayContaining([
        { x: 13, y: 10 },
        { x: 12, y: 9 },
        { x: 12, y: 11 },
      ]),
    );

    expect(triptychV2OrthogonalNeighbors(12, 10))
      .not.toContainEqual({ x: 11, y: 10 });
  });
});
