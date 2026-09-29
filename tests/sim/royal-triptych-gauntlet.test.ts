import { describe, expect, it } from 'vitest';
import { buildFortification, getFortificationAt } from '../../src/sim/fortifications';
import { getTilePolarity, queueBanner, resolveBannerProgress, getBannerState } from '../../src/sim/polarity';
import { queueRecruitment } from '../../src/sim/production';
import { resolveCommittedOrders } from '../../src/sim/resolve-orders';
import { combatModifiersForRank, militaryRecordFor } from '../../src/sim/rank';
import { supportPressureForChain, validateSupportGraph } from '../../src/sim/support';
import { resolveSettlement, getTileFactionControl } from '../../src/sim/territory';
import { resolveReinforcementPhase } from '../../src/sim/turns';
import { createWorld } from '../../src/sim/world';
import type { TacticalOrder } from '../../src/sim/orders';
import type { UnitState, WorldState } from '../../src/sim/types';

const unit = (
  id: string,
  faction: 'victoria' | 'obsidian',
  kind: UnitState['kind'],
  x: number,
  y: number,
): UnitState => ({ id, faction, kind, position: { x, y } });

function scenario() {
  const matureCell = { x: 9, y: 13 } as const;
  const contestedCell = { x: 7, y: 12 } as const;
  const supplyCell = { x: 9, y: 8 } as const;

  let world = createWorld([
    unit('victoria-knight', 'victoria', 'knight', 5, 9),
    unit('victoria-rook', 'victoria', 'rook', 5, 11),
    unit('victoria-bishop', 'victoria', 'bishop', 3, 9),
    unit('victoria-settler', 'victoria', 'pawn', supplyCell.x, supplyCell.y),
    unit('shadow-pawn', 'obsidian', 'pawn', 7, 10),
    unit('shadow-knight', 'obsidian', 'knight', 9, 11),
  ]);

  // This is not a bare opening position. Victoria begins with previously held
  // infrastructure sufficient to sustain the existing force. The gauntlet
  // then proves acquisition of a *new* supplied node at minor-nw.
  world = {
    ...world,
    territory: {
      ...world.territory,
      nodes: {
        ...world.territory.nodes,
        crown: {
          ...world.territory.nodes.crown!,
          owner: 'victoria',
        },
        'minor-ne': {
          ...world.territory.nodes['minor-ne']!,
          owner: 'victoria',
        },
      },
    },
    economy: {
      crownPower: { victoria: 50, obsidian: 35 },
    },
    combat: {
      ...world.combat,
      'shadow-pawn': {
        ...world.combat['shadow-pawn']!,
        health: 1,
      },
    },
    military: {
      ...world.military,
      'victoria-knight': { kills: 1, rank: 'recruit' },
    },
  };

  const purchase = queueRecruitment(world, {
    type: 'recruit', sequence: 1, issuedTick: 0,
    faction: 'victoria', unitKind: 'pawn',
  });
  world = purchase.state;

  world = queueBanner(world, {
    bannerId: 'topology-banner', faction: 'victoria', cell: matureCell,
  }).state;
  world = queueBanner(world, {
    bannerId: 'contested-banner', faction: 'victoria', cell: contestedCell,
  }).state;

  // Both banners have already survived one strategic boundary. One will be
  // defended through the next; the other will be legally landed upon.
  world = resolveBannerProgress(world).state;

  world = resolveSettlement(world);
  const fortification = buildFortification(world, {
    id: 'royal-wall', faction: 'victoria', cell: supplyCell,
  });
  world = fortification.state;

  const assaultOrders: TacticalOrder[] = [
    {
      orderId: 'assault-root', kind: 'assault', faction: 'victoria',
      unitId: 'victoria-knight', targetUnitId: 'shadow-pawn',
      issuedRound: 1, commandCost: 1,
    },
    {
      orderId: 'support-rook', kind: 'reinforce', faction: 'victoria',
      unitId: 'victoria-rook', supportedUnitId: 'victoria-knight',
      rootOrderId: 'assault-root', issuedRound: 1, commandCost: 1,
    },
    {
      orderId: 'support-bishop', kind: 'reinforce', faction: 'victoria',
      unitId: 'victoria-bishop', supportedUnitId: 'victoria-rook',
      rootOrderId: 'assault-root', issuedRound: 1, commandCost: 1,
    },
  ];

  const support = validateSupportGraph(world, assaultOrders);
  if (!support.valid) throw new Error(`support graph refused: ${support.reason}`);
  const supportPressure = supportPressureForChain(world, support.chains['assault-root']!);

  const assault = resolveCommittedOrders(world, assaultOrders);
  world = assault.world;

  const contest = resolveCommittedOrders(world, [{
    orderId: 'shadow-contest', kind: 'move', faction: 'obsidian',
    unitId: 'shadow-knight', destination: contestedCell,
    issuedRound: 1, commandCost: 1,
  }]);
  world = contest.world;

  const polarityBefore = getTilePolarity(world, matureCell);
  world = {
    ...world,
    turn: { ...world.turn, phase: 'reinforcement' },
  };
  world = resolveReinforcementPhase(world);

  return {
    world,
    purchase: purchase.receipt,
    assaultOutcomes: assault.outcomes,
    contestOutcomes: contest.outcomes,
    supportPressure,
    polarityBefore,
    matureCell,
    contestedCell,
    supplyCell,
  };
}

describe('Royal War Triptych whole-system gauntlet', () => {
  it('runs economy, creep, supply, Bastion, Manipulation, chained Assault and rank progression as one deterministic war state', () => {
    const result = scenario();

    expect(result.purchase).toMatchObject({
      accepted: true,
      unitKind: 'pawn',
      cost: 10,
      remainingCurrency: 40,
      queued: true,
    });
    expect(result.supportPressure).toBeGreaterThan(0);
    expect(result.assaultOutcomes[0]?.status).toBe('RESOLVED');
    expect(result.world.units['shadow-pawn']).toBeUndefined();
    expect(result.world.units['victoria-knight']?.position).toEqual({ x: 7, y: 10 });
    expect(militaryRecordFor(result.world, 'victoria-knight')).toMatchObject({
      kills: 2,
      rank: 'proven',
    });

    expect(getTileFactionControl(result.world, result.supplyCell)).toBe('victoria');
    expect(result.world.territory.nodes['minor-nw']?.owner).toBe('victoria');
    expect(getFortificationAt(result.world, result.supplyCell)?.durability).toBe(3);

    expect(result.world.units['unit:victoria-recruit-1']).toBeDefined();
    expect(getTilePolarity(result.world, result.matureCell)).not.toBe(result.polarityBefore);
    expect(getBannerState(result.world, 'contested-banner')).toMatchObject({
      roundsHeld: 1,
      contestedBy: 'obsidian',
      mature: false,
    });
    expect(result.contestOutcomes[0]?.status).toBe('RESOLVED');
    expect(result.world.turn.phase).toBe('victoria_command');
    expect(result.world.turn.round).toBe(2);
  });

  it('replays from identical initial truth to identical final state and receipts', () => {
    expect(scenario()).toEqual(scenario());
  });

  it('keeps doctrine power bounded instead of allowing infinite scaling', () => {
    const result = scenario();
    const guard = combatModifiersForRank('guard');

    expect(guard.damageBps).toBeLessThanOrEqual(11500);
    expect(guard.supportBps).toBeLessThanOrEqual(11400);
    expect(getFortificationAt(result.world, result.supplyCell)?.durability).toBeLessThanOrEqual(4);

    const tooDeep: TacticalOrder[] = [
      { orderId:'root', kind:'attack', faction:'victoria', unitId:'u0', targetUnitId:'enemy', issuedRound:1, commandCost:1 },
      { orderId:'s1', kind:'reinforce', faction:'victoria', unitId:'u1', supportedUnitId:'u0', rootOrderId:'root', issuedRound:1, commandCost:1 },
      { orderId:'s2', kind:'reinforce', faction:'victoria', unitId:'u2', supportedUnitId:'u1', rootOrderId:'root', issuedRound:1, commandCost:1 },
      { orderId:'s3', kind:'reinforce', faction:'victoria', unitId:'u3', supportedUnitId:'u2', rootOrderId:'root', issuedRound:1, commandCost:1 },
      { orderId:'s4', kind:'reinforce', faction:'victoria', unitId:'u4', supportedUnitId:'u3', rootOrderId:'root', issuedRound:1, commandCost:1 },
      { orderId:'s5', kind:'reinforce', faction:'victoria', unitId:'u5', supportedUnitId:'u4', rootOrderId:'root', issuedRound:1, commandCost:1 },
    ];
    const chainWorld = createWorld([
      unit('u0','victoria','rook',7,9), unit('u1','victoria','rook',7,10),
      unit('u2','victoria','rook',7,11), unit('u3','victoria','rook',7,12),
      unit('u4','victoria','rook',7,13), unit('u5','victoria','rook',7,14),
      unit('enemy','obsidian','pawn',7,8),
    ]);
    expect(validateSupportGraph(chainWorld, tooDeep)).toMatchObject({
      valid: false,
      reason: 'support_chain_too_deep',
    });
  });
});
