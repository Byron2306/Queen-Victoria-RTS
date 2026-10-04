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


  it('cuts a one-tile owned bridge when a living enemy occupies it without changing ownership', () => {
    let world = createWorld([
      { id: 'raider', faction: 'obsidian', kind: 'pawn', position: { x: 1, y: 15 } },
    ], { topologyId: 'triptych-v2' });
    world = withOwnedTiles(world, 'victoria', [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
      { x: 3, y: 15 },
    ]);

    const supply = deriveFactionSupply(world, 'victoria');

    expect(getTileFactionControl(world, { x: 1, y: 15 })).toBe('victoria');
    expect(supply.suppliedTileIds).toContain('0,15');
    expect(supply.suppliedTileIds).not.toContain('1,15');
    expect(supply.suppliedTileIds).not.toContain('2,15');
    expect(supply.suppliedTileIds).not.toContain('3,15');
  });

  it('restores supply when the hostile bridge occupant is removed', () => {
    let world = createWorld([
      { id: 'raider', faction: 'obsidian', kind: 'pawn', position: { x: 1, y: 15 } },
    ], { topologyId: 'triptych-v2' });
    world = withOwnedTiles(world, 'victoria', [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
    ]);

    world = {
      ...world,
      units: {},
      occupancy: {},
      combat: {},
      military: {},
    };

    const supply = deriveFactionSupply(world, 'victoria');
    expect(supply.suppliedTileIds).toEqual(['0,15', '1,15', '2,15']);
  });

  it('does not let a dead hostile unit block supply traversal', () => {
    let world = createWorld([
      { id: 'fallen-raider', faction: 'obsidian', kind: 'pawn', position: { x: 1, y: 15 } },
    ], { topologyId: 'triptych-v2' });
    world = withOwnedTiles(world, 'victoria', [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
    ]);
    world = {
      ...world,
      combat: {
        ...world.combat,
        'fallen-raider': {
          ...world.combat['fallen-raider']!,
          health: 0,
        },
      },
    };

    expect(deriveFactionSupply(world, 'victoria').suppliedTileIds)
      .toEqual(['0,15', '1,15', '2,15']);
  });

  it('lets an owned uncontested Crown seed a disconnected controlled component', () => {
    let world = createWorld([], { topologyId: 'triptych-v2' });
    world = withOwnedTiles(world, 'victoria', [
      { x: 15, y: 1 },
      { x: 15, y: 2 },
      { x: 15, y: 3 },
    ]);
    world = {
      ...world,
      territory: {
        ...world.territory,
        nodes: {
          ...world.territory.nodes,
          crown: {
            ...world.territory.nodes.crown!,
            owner: 'victoria',
            contested: false,
          },
        },
      },
    };

    const supply = deriveFactionSupply(world, 'victoria');

    expect(supply.rootTileIds).toContain('15,1');
    expect(supply.suppliedTileIds).toContain('15,3');
  });

  it('does not seed supply from a contested Crown or an owned minor node', () => {
    let world = createWorld([], { topologyId: 'triptych-v2' });
    world = withOwnedTiles(world, 'victoria', [
      { x: 15, y: 1 },
      { x: 15, y: 2 },
      { x: 12, y: 10 },
      { x: 12, y: 11 },
    ]);
    world = {
      ...world,
      territory: {
        ...world.territory,
        nodes: {
          ...world.territory.nodes,
          crown: {
            ...world.territory.nodes.crown!,
            owner: 'victoria',
            contested: true,
          },
          'minor-nw': {
            ...world.territory.nodes['minor-nw']!,
            owner: 'victoria',
            contested: false,
          },
        },
      },
    };

    const supply = deriveFactionSupply(world, 'victoria');

    expect(supply.rootTileIds).toEqual([]);
    expect(supply.suppliedTileIds).toEqual([]);
    expect(getTileFactionControl(world, { x: 15, y: 1 })).toBe('victoria');
    expect(getTileFactionControl(world, { x: 15, y: 2 })).toBe('victoria');
  });

  it('does not recolour neutral cells when Crown supply is derived', () => {
    let world = createWorld([], { topologyId: 'triptych-v2' });
    world = withOwnedTiles(world, 'victoria', [
      { x: 15, y: 1 },
      { x: 15, y: 2 },
    ]);
    world = {
      ...world,
      territory: {
        ...world.territory,
        nodes: {
          ...world.territory.nodes,
          crown: {
            ...world.territory.nodes.crown!,
            owner: 'victoria',
            contested: false,
          },
        },
      },
    };

    deriveFactionSupply(world, 'victoria');

    expect(getTileFactionControl(world, { x: 14, y: 1 })).toBe('neutral');
    expect(getTileFactionControl(world, { x: 16, y: 1 })).toBe('neutral');
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
