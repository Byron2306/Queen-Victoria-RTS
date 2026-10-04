import { describe, expect, it } from 'vitest';

import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import { tileId } from '../../src/sim/board-topology';
import * as sim from '../../src/sim';
import {
  getTileFactionControl,
  strategicTiles,
  type TriptychTerritoryState,
} from '../../src/sim/territory';
import type { Faction, WorldState } from '../../src/sim/types';
import { createWorld } from '../../src/sim/world';

function withOwnedTiles(
  world: WorldState,
  faction: Faction,
  cells: readonly { x: number; y: number }[],
): WorldState {
  const tiles = { ...strategicTiles(world) };
  for (const cell of cells) {
    const id = tileId(cell);
    tiles[id] = {
      ...tiles[id]!,
      factionControl: faction,
    };
  }

  return {
    ...world,
    territory: {
      ...world.territory,
      tiles,
    } as TriptychTerritoryState,
  };
}

function deriveFactionSupply(world: WorldState, faction: Faction) {
  const derive = (sim as typeof sim & {
    deriveFactionSupply?: (
      candidate: WorldState,
      side: Faction,
    ) => {
      faction: Faction;
      rootTileIds: readonly string[];
      suppliedTileIds: readonly string[];
    };
  }).deriveFactionSupply;

  expect(derive).toBeTypeOf('function');
  return derive!(world, faction);
}

describe('Triptych supply graph', () => {
  it('initializes world supply exposure state empty', () => {
    const world = createWorld() as WorldState & {
      supply?: {
        exposureRoundsByUnit: Readonly<Record<string, number>>;
      };
    };

    expect(world.supply).toEqual({ exposureRoundsByUnit: {} });
  });

  it('supplies both V2 opening territories from their owned home edges', () => {
    const world = createPhase6SkirmishWorld();

    const victoria = deriveFactionSupply(world, 'victoria');
    expect(victoria.rootTileIds).toContain('0,11');
    expect(victoria.suppliedTileIds).toContain('7,20');

    const obsidian = deriveFactionSupply(world, 'obsidian');
    expect(obsidian.rootTileIds).toContain('31,11');
    expect(obsidian.suppliedTileIds).toContain('24,20');
  });

  it('floods a connected owned corridor orthogonally from the home edge', () => {
    let world = createWorld([], { topologyId: 'triptych-v2' });
    world = withOwnedTiles(world, 'victoria', [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
    ]);

    const supply = deriveFactionSupply(world, 'victoria');

    expect(supply.rootTileIds).toEqual(['0,15']);
    expect(supply.suppliedTileIds).toEqual(['0,15', '1,15', '2,15']);
  });

  it('leaves a disconnected owned island owned but unsupplied', () => {
    let world = createWorld([], { topologyId: 'triptych-v2' });
    world = withOwnedTiles(world, 'victoria', [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 4, y: 15 },
    ]);

    const supply = deriveFactionSupply(world, 'victoria');

    expect(getTileFactionControl(world, { x: 4, y: 15 })).toBe('victoria');
    expect(supply.suppliedTileIds).toContain('1,15');
    expect(supply.suppliedTileIds).not.toContain('4,15');
  });

  it('returns no supply when owned territory has no active root', () => {
    let world = createWorld([], { topologyId: 'triptych-v2' });
    world = withOwnedTiles(world, 'victoria', [
      { x: 5, y: 15 },
      { x: 6, y: 15 },
    ]);

    const supply = deriveFactionSupply(world, 'victoria');

    expect(supply.rootTileIds).toEqual([]);
    expect(supply.suppliedTileIds).toEqual([]);
  });

  it('derives identical snapshots from identical world truth', () => {
    let world = createWorld([], { topologyId: 'triptych-v2' });
    world = withOwnedTiles(world, 'victoria', [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
      { x: 2, y: 16 },
    ]);

    expect(deriveFactionSupply(world, 'victoria'))
      .toEqual(deriveFactionSupply(world, 'victoria'));
  });
});
