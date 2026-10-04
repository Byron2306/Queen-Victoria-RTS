import { describe, expect, it } from 'vitest';

import { tileId } from '../../src/sim/board-topology';
import * as sim from '../../src/sim';
import {
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

function supplyStatusForUnit(world: WorldState, unitId: string) {
  const fn = (sim as typeof sim & {
    supplyStatusForUnit?: (
      candidate: WorldState,
      id: string,
    ) => 'supplied' | 'exposed' | 'strained' | 'attrition';
  }).supplyStatusForUnit;
  expect(fn).toBeTypeOf('function');
  return fn!(world, unitId);
}

function advanceSupplyExposure(world: WorldState): WorldState {
  const fn = (sim as typeof sim & {
    advanceSupplyExposure?: (candidate: WorldState) => WorldState;
  }).advanceSupplyExposure;
  expect(fn).toBeTypeOf('function');
  return fn!(world);
}

describe('Triptych supply exposure', () => {
  it('reports a unit on connected owned territory as supplied', () => {
    let world = createWorld([
      { id: 'line-pawn', faction: 'victoria', kind: 'pawn', position: { x: 2, y: 15 } },
    ], { topologyId: 'triptych-v2' });
    world = withOwnedTiles(world, 'victoria', [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
    ]);

    expect(supplyStatusForUnit(world, 'line-pawn')).toBe('supplied');
  });

  it('reports a disconnected friendly unit as exposed from zero prior exposure', () => {
    let world = createWorld([
      { id: 'island-pawn', faction: 'victoria', kind: 'pawn', position: { x: 5, y: 15 } },
    ], { topologyId: 'triptych-v2' });
    world = withOwnedTiles(world, 'victoria', [
      { x: 0, y: 15 },
      { x: 5, y: 15 },
    ]);

    expect(supplyStatusForUnit(world, 'island-pawn')).toBe('exposed');
  });

  it('treats neutral and enemy-territory raiders as unsupplied', () => {
    let world = createWorld([
      { id: 'neutral-raider', faction: 'victoria', kind: 'pawn', position: { x: 8, y: 15 } },
      { id: 'enemy-raider', faction: 'victoria', kind: 'pawn', position: { x: 24, y: 15 } },
    ], { topologyId: 'triptych-v2' });
    world = withOwnedTiles(world, 'obsidian', [{ x: 24, y: 15 }]);

    expect(supplyStatusForUnit(world, 'neutral-raider')).toBe('exposed');
    expect(supplyStatusForUnit(world, 'enemy-raider')).toBe('exposed');
  });

  it('does not treat adjacency to supplied territory as supplied', () => {
    let world = createWorld([
      { id: 'adjacent-raider', faction: 'victoria', kind: 'pawn', position: { x: 3, y: 15 } },
    ], { topologyId: 'triptych-v2' });
    world = withOwnedTiles(world, 'victoria', [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
    ]);

    expect(supplyStatusForUnit(world, 'adjacent-raider')).toBe('exposed');
  });

  it('progresses unsupplied exposure from exposed to strained to attrition', () => {
    let world = createWorld([
      { id: 'cut-off', faction: 'victoria', kind: 'pawn', position: { x: 5, y: 15 } },
    ], { topologyId: 'triptych-v2' });
    world = withOwnedTiles(world, 'victoria', [{ x: 5, y: 15 }]);

    world = advanceSupplyExposure(world);
    expect(world.supply.exposureRoundsByUnit['cut-off']).toBe(1);
    expect(supplyStatusForUnit(world, 'cut-off')).toBe('exposed');

    world = advanceSupplyExposure(world);
    expect(world.supply.exposureRoundsByUnit['cut-off']).toBe(2);
    expect(supplyStatusForUnit(world, 'cut-off')).toBe('strained');

    world = advanceSupplyExposure(world);
    expect(world.supply.exposureRoundsByUnit['cut-off']).toBe(3);
    expect(supplyStatusForUnit(world, 'cut-off')).toBe('attrition');
  });

  it('resets exposure immediately when supply reconnects', () => {
    let world = createWorld([
      { id: 'returning', faction: 'victoria', kind: 'pawn', position: { x: 2, y: 15 } },
    ], { topologyId: 'triptych-v2' });
    world = withOwnedTiles(world, 'victoria', [{ x: 2, y: 15 }]);
    world = {
      ...world,
      supply: { exposureRoundsByUnit: { returning: 2 } },
    };

    world = withOwnedTiles(world, 'victoria', [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
    ]);
    world = advanceSupplyExposure(world);

    expect(world.supply.exposureRoundsByUnit['returning']).toBe(0);
    expect(supplyStatusForUnit(world, 'returning')).toBe('supplied');
  });

  it('does not retain exposure for a missing unit', () => {
    let world = createWorld([], { topologyId: 'triptych-v2' });
    world = {
      ...world,
      supply: { exposureRoundsByUnit: { ghost: 2 } },
    };

    world = advanceSupplyExposure(world);

    expect(world.supply.exposureRoundsByUnit).toEqual({});
  });

  it('is deterministic regardless of unit insertion order', () => {
    const unitsA = [
      { id: 'b-unit', faction: 'victoria' as const, kind: 'pawn' as const, position: { x: 5, y: 15 } },
      { id: 'a-unit', faction: 'victoria' as const, kind: 'pawn' as const, position: { x: 6, y: 15 } },
    ];
    const unitsB = [...unitsA].reverse();

    let a = createWorld(unitsA, { topologyId: 'triptych-v2' });
    let b = createWorld(unitsB, { topologyId: 'triptych-v2' });
    a = withOwnedTiles(a, 'victoria', [{ x: 5, y: 15 }, { x: 6, y: 15 }]);
    b = withOwnedTiles(b, 'victoria', [{ x: 5, y: 15 }, { x: 6, y: 15 }]);

    a = advanceSupplyExposure(a);
    b = advanceSupplyExposure(b);

    expect(a.supply).toEqual(b.supply);
  });
});
