import { describe, expect, it } from 'vitest';
import { tileId } from '../../src/sim/board-topology';
import { createWorld, placeUnit } from '../../src/sim/world';
import {
  getTileFactionControl,
  resolveSettlement,
  strategicTiles,
  type TriptychTerritoryState,
} from '../../src/sim/territory';
import { getTilePolarity } from '../../src/sim/polarity';
import type { Faction, WorldState } from '../../src/sim/types';

function withOwnedTile(
  world: WorldState,
  cell: { x: number; y: number },
  faction: Faction,
): WorldState {
  const id = tileId(cell);
  const tiles = strategicTiles(world);
  return {
    ...world,
    territory: {
      ...world.territory,
      tiles: {
        ...tiles,
        [id]: { ...tiles[id]!, factionControl: faction },
      },
    } as TriptychTerritoryState,
  };
}

describe('Triptych faction settlement', () => {
  it('claims only an occupied neutral tile connected to friendly territory', () => {
    let world = withOwnedTile(createWorld(), { x: 7, y: 9 }, 'victoria');
    world = placeUnit(world, {
      id: 'victoria-pawn',
      faction: 'victoria',
      kind: 'pawn',
      position: { x: 7, y: 10 },
    });

    const beforePolarity = getTilePolarity(world, { x: 7, y: 10 });
    world = resolveSettlement(world);

    expect(getTileFactionControl(world, { x: 7, y: 10 })).toBe('victoria');
    expect(getTileFactionControl(world, { x: 8, y: 10 })).toBe('neutral');
    expect(getTilePolarity(world, { x: 7, y: 10 })).toBe(beforePolarity);
  });

  it('does not let enemy occupation overwrite existing ownership', () => {
    let world = withOwnedTile(createWorld(), { x: 7, y: 10 }, 'victoria');
    world = placeUnit(world, {
      id: 'obsidian-pawn',
      faction: 'obsidian',
      kind: 'pawn',
      position: { x: 7, y: 10 },
    });
    const polarity = getTilePolarity(world, { x: 7, y: 10 });

    world = resolveSettlement(world);

    expect(getTileFactionControl(world, { x: 7, y: 10 })).toBe('victoria');
    expect(getTilePolarity(world, { x: 7, y: 10 })).toBe(polarity);
  });

  it('settles the far edge of a 32x32 V2 world when connected to friendly territory', () => {
    let world = createWorld([], { topologyId: 'triptych-v2' });
    world = withOwnedTile(world, { x: 30, y: 11 }, 'victoria');
    world = placeUnit(world, {
      id: 'victoria-rook',
      faction: 'victoria',
      kind: 'rook',
      position: { x: 31, y: 11 },
    });

    expect(getTileFactionControl(world, { x: 31, y: 11 })).toBe('neutral');

    world = resolveSettlement(world);

    expect(getTileFactionControl(world, { x: 31, y: 11 })).toBe('victoria');
  });
});
