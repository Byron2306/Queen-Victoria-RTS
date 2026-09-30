import { describe, expect, it } from 'vitest';
import {
  OutOfBoundsError,
  createWorld,
  placeUnit,
} from '../../src/sim/world';

describe('topology-aware world dimensions', () => {
  it('keeps the default live world at 24x24', () => {
    const world = createWorld();

    expect(world.width).toBe(24);
    expect(world.height).toBe(24);
  });

  it('creates an explicit 32x32 candidate world without changing the default', () => {
    const world = createWorld([], {
      topologyId: 'triptych-v2',
    });

    expect(world.width).toBe(32);
    expect(world.height).toBe(32);
  });

  it('places units against the selected world dimensions', () => {
    const candidate = createWorld([], {
      topologyId: 'triptych-v2',
    });

    const placed = placeUnit(candidate, {
      id: 'v2-pawn',
      faction: 'victoria',
      kind: 'pawn',
      position: { x: 31, y: 11 },
    });

    expect(placed.units['v2-pawn']?.position)
      .toEqual({ x: 31, y: 11 });

    expect(() =>
      placeUnit(createWorld(), {
        id: 'v1-pawn',
        faction: 'victoria',
        kind: 'pawn',
        position: { x: 31, y: 11 },
      }),
    ).toThrow(OutOfBoundsError);
  });
});
