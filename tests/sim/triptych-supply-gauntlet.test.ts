import { describe, expect, it } from 'vitest';

import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import { tileId } from '../../src/sim/board-topology';
import { canonicalSnapshot } from '../../src/sim/replay';
import {
  deriveFactionSupply,
  resolveSupplyAttrition,
} from '../../src/sim/supply';
import {
  strategicTiles,
  type TriptychTerritoryState,
} from '../../src/sim/territory';
import type { ReplayResult, WorldState } from '../../src/sim/types';
import { createWorld, placeUnit } from '../../src/sim/world';

function withOwnedTiles(
  world: WorldState,
  faction: 'victoria' | 'obsidian',
  cells: readonly { x: number; y: number }[],
): WorldState {
  const tiles = { ...strategicTiles(world) };
  for (const cell of cells) {
    const id = tileId(cell);
    tiles[id] = { ...tiles[id]!, factionControl: faction };
  }

  return {
    ...world,
    territory: {
      ...world.territory,
      tiles,
    } as TriptychTerritoryState,
  };
}

function snapshot(world: WorldState): string {
  const result: ReplayResult = {
    state: world,
    eventsByTick: [],
  };
  return canonicalSnapshot(result);
}

describe('Triptych supply integration gauntlet', () => {
  it('keeps the frozen V2 opening supplied from both home edges', () => {
    const world = createPhase6SkirmishWorld();

    expect(deriveFactionSupply(world, 'victoria').suppliedTileIds).toContain('7,16');
    expect(deriveFactionSupply(world, 'obsidian').suppliedTileIds).toContain('24,15');
  });

  it('cuts a forward unit, advances to attrition, then resets immediately after the blocker leaves', () => {
    let world = createWorld([
      {
        id: 'forward',
        faction: 'victoria',
        kind: 'rook',
        position: { x: 3, y: 15 },
      },
      {
        id: 'blocker',
        faction: 'obsidian',
        kind: 'pawn',
        position: { x: 1, y: 15 },
      },
    ], { topologyId: 'triptych-v2' });

    world = withOwnedTiles(world, 'victoria', [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
      { x: 3, y: 15 },
    ]);

    const healthBefore = world.combat.forward!.health;

    world = resolveSupplyAttrition(world);
    expect(world.supply.exposureRoundsByUnit.forward).toBe(1);
    world = resolveSupplyAttrition(world);
    expect(world.supply.exposureRoundsByUnit.forward).toBe(2);
    world = resolveSupplyAttrition(world);
    expect(world.supply.exposureRoundsByUnit.forward).toBe(3);
    expect(world.combat.forward!.health).toBe(healthBefore - 10);

    world = {
      ...world,
      units: Object.fromEntries(
        Object.entries(world.units).filter(([id]) => id !== 'blocker'),
      ),
      occupancy: Object.fromEntries(
        Object.entries(world.occupancy).filter(([, id]) => id !== 'blocker'),
      ),
      combat: Object.fromEntries(
        Object.entries(world.combat).filter(([id]) => id !== 'blocker'),
      ),
      military: Object.fromEntries(
        Object.entries(world.military).filter(([id]) => id !== 'blocker'),
      ),
    };

    world = resolveSupplyAttrition(world);

    expect(world.supply.exposureRoundsByUnit.forward).toBe(0);
    expect(world.combat.forward!.health).toBe(healthBefore - 10);
  });

  it('lets an owned uncontested Crown supply an otherwise disconnected controlled component without recolouring neighbors', () => {
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
    world = placeUnit(world, {
      id: 'crown-line',
      faction: 'victoria',
      kind: 'pawn',
      position: { x: 15, y: 3 },
    });

    const supply = deriveFactionSupply(world, 'victoria');

    expect(supply.rootTileIds).toContain('15,1');
    expect(supply.suppliedTileIds).toContain('15,3');
    expect(strategicTiles(world)[tileId({ x: 14, y: 1 })]!.factionControl).toBe('neutral');
  });

  it('serializes persistent supply exposure into the canonical replay snapshot', () => {
    let world = createWorld([], { topologyId: 'triptych-v2' });
    world = {
      ...world,
      supply: {
        exposureRoundsByUnit: {
          'unit-b': 1,
          'unit-a': 2,
        },
      },
    };

    const parsed = JSON.parse(snapshot(world)) as {
      state: {
        supply?: {
          exposureRoundsByUnit: Record<string, number>;
        };
      };
    };

    expect(parsed.state.supply).toEqual({
      exposureRoundsByUnit: {
        'unit-a': 2,
        'unit-b': 1,
      },
    });
  });

  it('produces byte-identical snapshots for identical strategic supply truth', () => {
    const run = () => {
      let world = createWorld([
        {
          id: 'isolated',
          faction: 'victoria',
          kind: 'pawn',
          position: { x: 5, y: 15 },
        },
      ], { topologyId: 'triptych-v2' });
      world = withOwnedTiles(world, 'victoria', [{ x: 5, y: 15 }]);
      world = resolveSupplyAttrition(world);
      world = resolveSupplyAttrition(world);
      return snapshot(world);
    };

    expect(run()).toBe(run());
  });
});
