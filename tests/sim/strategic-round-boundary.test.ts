import { describe, expect, it } from 'vitest';
import { tileId } from '../../src/sim/board-topology';
import { validateMoveGeometry } from '../../src/sim/geometry';
import { getTilePolarity, queueBanner, resolveBannerProgress } from '../../src/sim/polarity';
import {
  getTileFactionControl,
  strategicTiles,
  type TriptychTerritoryState,
} from '../../src/sim/territory';
import { militaryRecordFor } from '../../src/sim/rank';
import { resolveReinforcementPhase } from '../../src/sim/turns';
import { createWorld } from '../../src/sim/world';
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

describe('Triptych strategic round boundary', () => {
  it('annexes at reinforcement and delays a two-round polarity flip until the following command phase', () => {
    const cell = { x: 7, y: 10 } as const;
    let world = withOwnedTile(createWorld([
      { id: 'victoria-pawn', faction: 'victoria', kind: 'pawn', position: cell },
    ]), { x: 7, y: 9 }, 'victoria');
    const initialPolarity = getTilePolarity(world, cell);
    world = queueBanner(world, {
      bannerId: 'boundary-banner',
      faction: 'victoria',
      cell,
    }).state;

    world = {
      ...world,
      turn: { ...world.turn, phase: 'reinforcement' },
    };
    world = resolveReinforcementPhase(world);

    expect(world.turn.phase).toBe('victoria_command');
    expect(getTileFactionControl(world, cell)).toBe('victoria');
    expect(getTilePolarity(world, cell)).toBe(initialPolarity);

    world = {
      ...world,
      turn: { ...world.turn, phase: 'reinforcement' },
    };
    world = resolveReinforcementPhase(world);

    expect(world.turn.phase).toBe('victoria_command');
    expect(getTilePolarity(world, cell)).toBe(
      initialPolarity === 'black' ? 'white' : 'black',
    );
  });

  it('publishes settlement, banner mutation and rank-up together before the next command phase', () => {
    const knightStart = { x: 11, y: 11 } as const;
    const futureLanding = { x: 13, y: 12 } as const;
    const settlementCell = { x: 7, y: 10 } as const;

    let world = withOwnedTile(createWorld([
      { id: 'victoria-knight', faction: 'victoria', kind: 'knight', position: knightStart },
      { id: 'victoria-pawn', faction: 'victoria', kind: 'pawn', position: settlementCell },
    ]), { x: 7, y: 9 }, 'victoria');

    expect(validateMoveGeometry(world, world.units['victoria-knight']!, futureLanding))
      .toEqual({ legal: true });

    world = queueBanner(world, {
      bannerId: 'topology-knife',
      faction: 'victoria',
      cell: futureLanding,
    }).state;
    world = resolveBannerProgress(world).state;
    world = {
      ...world,
      military: {
        ...world.military,
        'victoria-knight': { kills: 2, rank: 'recruit' },
      },
      turn: { ...world.turn, phase: 'reinforcement' },
    };

    const next = resolveReinforcementPhase(world);

    expect(next.turn.phase).toBe('victoria_command');
    expect(next.turn.round).toBe(2);
    expect(getTileFactionControl(next, settlementCell)).toBe('victoria');
    expect(militaryRecordFor(next, 'victoria-knight').rank).toBe('proven');
    expect(validateMoveGeometry(next, next.units['victoria-knight']!, futureLanding))
      .toEqual({ legal: false, reason: 'polarity_mismatch' });
  });
});
