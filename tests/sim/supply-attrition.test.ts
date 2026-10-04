import { describe, expect, it } from 'vitest';

import { tileId } from '../../src/sim/board-topology';
import * as sim from '../../src/sim';
import {
  strategicTiles,
  type TriptychTerritoryState,
} from '../../src/sim/territory';
import type {
  Faction,
  UnitKind,
  WorldState,
} from '../../src/sim/types';
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

function resolveSupplyAttrition(world: WorldState): WorldState {
  const fn = (sim as typeof sim & {
    resolveSupplyAttrition?: (candidate: WorldState) => WorldState;
  }).resolveSupplyAttrition;

  expect(fn).toBeTypeOf('function');
  return fn!(world);
}

function disconnectedWorld(
  kind: UnitKind = 'pawn',
  exposureRounds = 0,
): WorldState {
  let world = createWorld([
    {
      id: 'cut-off',
      faction: 'victoria',
      kind,
      position: { x: 5, y: 15 },
    },
  ], { topologyId: 'triptych-v2' });

  world = withOwnedTiles(world, 'victoria', [{ x: 5, y: 15 }]);
  return {
    ...world,
    supply: {
      exposureRoundsByUnit: {
        'cut-off': exposureRounds,
      },
    },
  };
}

describe('Triptych delayed supply attrition', () => {
  it('does not damage a unit when exposure advances from zero to one', () => {
    const world = disconnectedWorld('pawn', 0);
    const before = world.combat['cut-off']!.health;

    const next = resolveSupplyAttrition(world);

    expect(next.supply.exposureRoundsByUnit['cut-off']).toBe(1);
    expect(next.combat['cut-off']!.health).toBe(before);
  });

  it('does not damage a unit when exposure advances from one to two', () => {
    const world = disconnectedWorld('pawn', 1);
    const before = world.combat['cut-off']!.health;

    const next = resolveSupplyAttrition(world);

    expect(next.supply.exposureRoundsByUnit['cut-off']).toBe(2);
    expect(next.combat['cut-off']!.health).toBe(before);
  });

  it('deals exactly ten HP when exposure first reaches three', () => {
    const world = disconnectedWorld('pawn', 2);
    const before = world.combat['cut-off']!.health;

    const next = resolveSupplyAttrition(world);

    expect(next.supply.exposureRoundsByUnit['cut-off']).toBe(3);
    expect(next.combat['cut-off']!.health).toBe(before - 10);
  });

  it('deals another exact ten HP on each later unsupplied boundary', () => {
    const world = disconnectedWorld('pawn', 3);
    const before = world.combat['cut-off']!.health;

    const next = resolveSupplyAttrition(world);

    expect(next.supply.exposureRoundsByUnit['cut-off']).toBe(4);
    expect(next.combat['cut-off']!.health).toBe(before - 10);
  });

  it('reconnection resets exposure and prevents attrition immediately', () => {
    let world = disconnectedWorld('pawn', 2);
    world = withOwnedTiles(world, 'victoria', [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
      { x: 3, y: 15 },
      { x: 4, y: 15 },
      { x: 5, y: 15 },
    ]);
    const before = world.combat['cut-off']!.health;

    const next = resolveSupplyAttrition(world);

    expect(next.supply.exposureRoundsByUnit['cut-off']).toBe(0);
    expect(next.combat['cut-off']!.health).toBe(before);
  });

  it.each([
    'pawn',
    'knight',
    'bishop',
    'rook',
    'queen',
    'king',
  ] as const)('applies the same delayed attrition rule to %s units', (kind) => {
    const world = disconnectedWorld(kind, 2);
    const before = world.combat['cut-off']!.health;

    const next = resolveSupplyAttrition(world);

    expect(next.combat['cut-off']!.health).toBe(before - 10);
    expect(next.supply.exposureRoundsByUnit['cut-off']).toBe(3);
  });

  it('removes every canonical unit record when attrition kills a unit', () => {
    let world = disconnectedWorld('pawn', 2);
    world = {
      ...world,
      combat: {
        ...world.combat,
        'cut-off': {
          ...world.combat['cut-off']!,
          health: 10,
        },
      },
      military: {
        ...world.military,
        'cut-off': { kills: 2, rank: 'proven' },
      },
    };

    const next = resolveSupplyAttrition(world);

    expect(next.units['cut-off']).toBeUndefined();
    expect(next.occupancy['5,15']).toBeUndefined();
    expect(next.combat['cut-off']).toBeUndefined();
    expect(next.military['cut-off']).toBeUndefined();
    expect(next.supply.exposureRoundsByUnit['cut-off']).toBeUndefined();
  });

  it('does not change unrelated living unit records when attrition kills another unit', () => {
    let world = createWorld([
      {
        id: 'cut-off',
        faction: 'victoria',
        kind: 'pawn',
        position: { x: 5, y: 15 },
      },
      {
        id: 'safe',
        faction: 'victoria',
        kind: 'rook',
        position: { x: 0, y: 15 },
      },
    ], { topologyId: 'triptych-v2' });

    world = withOwnedTiles(world, 'victoria', [
      { x: 0, y: 15 },
      { x: 5, y: 15 },
    ]);
    world = {
      ...world,
      combat: {
        ...world.combat,
        'cut-off': {
          ...world.combat['cut-off']!,
          health: 10,
        },
      },
      supply: {
        exposureRoundsByUnit: {
          'cut-off': 2,
          safe: 0,
        },
      },
    };

    const safeUnit = world.units.safe;
    const safeCombat = world.combat.safe;
    const safeMilitary = world.military.safe;

    const next = resolveSupplyAttrition(world);

    expect(next.units.safe).toEqual(safeUnit);
    expect(next.combat.safe).toEqual(safeCombat);
    expect(next.military.safe).toEqual(safeMilitary);
    expect(next.supply.exposureRoundsByUnit.safe).toBe(0);
  });
});
