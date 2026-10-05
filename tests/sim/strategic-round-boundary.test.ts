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
import { queueRecruitment } from '../../src/sim/production';
import { resolveReinforcementPhase, TRIPTYCH_ROUND_STAGE_ORDER } from '../../src/sim/turns';
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

  it('declares supply attrition after node control and before crown income', () => {
    expect(TRIPTYCH_ROUND_STAGE_ORDER).toEqual([
      'settlement',
      'node_control',
      'supply_attrition',
      'crown_income',
      'banner_progress',
      'polarity_flip',
      'promotion',
      'deployment',
      'military_rank',
      'hero_round_state',
      'hero_respawn',
      'sovereign_truth',
    ]);
  });

  it('lets a Crown captured this boundary supply its disconnected controlled component immediately', () => {
    let world = createWorld([
      {
        id: 'victoria-queen',
        faction: 'victoria',
        kind: 'queen',
        position: { x: 15, y: 1 },
      },
      {
        id: 'forward-pawn',
        faction: 'victoria',
        kind: 'pawn',
        position: { x: 15, y: 3 },
      },
    ], { topologyId: 'triptych-v2' });

    world = withOwnedTile(world, { x: 15, y: 2 }, 'victoria');
    world = withOwnedTile(world, { x: 15, y: 3 }, 'victoria');
    world = {
      ...world,
      supply: {
        exposureRoundsByUnit: {
          'forward-pawn': 2,
        },
      },
      turn: { ...world.turn, phase: 'reinforcement' },
    };

    const next = resolveReinforcementPhase(world);

    expect(next.territory.nodes.crown?.owner).toBe('victoria');
    expect(next.supply.exposureRoundsByUnit['forward-pawn']).toBe(0);
  });

  it('evaluates existing units before queue maturation so a fresh READY recruit gets no same-boundary exposure', () => {
    let world = createWorld([
      {
        id: 'cut-off',
        faction: 'victoria',
        kind: 'pawn',
        position: { x: 5, y: 15 },
      },
    ], { topologyId: 'triptych-v2' });

    world = withOwnedTile(world, { x: 5, y: 15 }, 'victoria');
    world = {
      ...world,
      economy: {
        crownPower: {
          ...world.economy.crownPower,
          victoria: 20,
        },
      },
    };

    const queued = queueRecruitment(world, {
      type: 'recruit',
      sequence: 1,
      issuedTick: 0,
      faction: 'victoria',
      unitKind: 'pawn',
    });
    expect(queued.receipt.accepted).toBe(true);

    world = {
      ...queued.state,
      turn: { ...queued.state.turn, phase: 'reinforcement' },
    };

    const next = resolveReinforcementPhase(world);

    expect(next.supply.exposureRoundsByUnit['cut-off']).toBe(1);
    expect(next.units['unit:victoria-recruit-1']).toBeUndefined();
    expect(next.production.ready.victoria).toContainEqual(
      expect.objectContaining({
        id: 'victoria-recruit-1',
        unitKind: 'pawn',
      }),
    );
    expect(next.supply.exposureRoundsByUnit['unit:victoria-recruit-1']).toBeUndefined();
  });

});
