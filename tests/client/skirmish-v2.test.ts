import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import { strategicTiles } from '../../src/sim/territory';
import { fortificationsFor } from '../../src/sim/fortifications';

const EXPECTED_UNITS = [
  ['victoria-king', 2, 16],
  ['victoria-queen', 6, 16],
  ['victoria-rook-a', 4, 13],
  ['victoria-knight-a', 4, 19],
  ['victoria-pawn-a', 6, 15],
  ['victoria-pawn-b', 6, 17],
  ['obsidian-king', 29, 15],
  ['obsidian-queen', 25, 15],
  ['obsidian-rook-a', 27, 18],
  ['obsidian-knight-a', 27, 12],
  ['obsidian-pawn-a', 25, 16],
  ['obsidian-pawn-b', 25, 14],
] as const;

describe('canonical Triptych skirmish V2', () => {
  it('boots the live skirmish on the 32x32 authority with V2 opening state', () => {
    const world = createPhase6SkirmishWorld();

    expect([world.width, world.height]).toEqual([32, 32]);
    expect(Object.values(world.units).map(unit => [
      unit.id,
      unit.position.x,
      unit.position.y,
    ] as const).sort((a, b) => a[0].localeCompare(b[0]))).toEqual(
      [...EXPECTED_UNITS].sort((a, b) => a[0].localeCompare(b[0])),
    );

    expect(Object.keys(world.territory.nodes)).toHaveLength(8);
    expect(Object.keys(fortificationsFor(world))).toHaveLength(6);

    const tiles = Object.values(strategicTiles(world));
    expect(tiles).toHaveLength(496);
    expect(tiles.filter(tile => tile.factionControl === 'victoria')).toHaveLength(80);
    expect(tiles.filter(tile => tile.factionControl === 'obsidian')).toHaveLength(80);
    expect(tiles.filter(tile => tile.factionControl === 'neutral')).toHaveLength(336);
  });
});
