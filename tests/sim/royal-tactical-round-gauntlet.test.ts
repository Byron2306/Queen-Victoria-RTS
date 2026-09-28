import { describe, expect, it } from 'vitest';
import { FixedTickRuntime, SIM_TICK_MS } from '../../src/client/runtime/fixed-tick-runtime';
import { planShadowTurn } from '../../src/sim/ai';
import {
  clearPendingOrders,
  enqueueTacticalOrder,
  type GuardOrder,
  type TacticalOrder,
} from '../../src/sim/orders';
import { resolveCommittedOrders } from '../../src/sim/resolve-orders';
import {
  resolveReinforcementPhase,
  transitionTurnPhase,
} from '../../src/sim/turns';
import { createWorld } from '../../src/sim/world';
import type { UnitState, WorldState } from '../../src/sim/types';

function unit(id: string, faction: 'victoria' | 'obsidian', kind: UnitState['kind'], x: number, y: number): UnitState {
  return { id, faction, kind, position: { x, y } };
}

function startingWorld(): WorldState {
  return createWorld([
    unit('vking', 'victoria', 'king', 1, 1),
    unit('vqueen', 'victoria', 'queen', 2, 2),
    unit('vrook', 'victoria', 'rook', 3, 3),
    unit('vknight', 'victoria', 'knight', 4, 4),
    unit('vpawn', 'victoria', 'pawn', 5, 5),
    unit('oking', 'obsidian', 'king', 14, 14),
    unit('oqueen', 'obsidian', 'queen', 13, 13),
    unit('orook', 'obsidian', 'rook', 12, 12),
    unit('oknight', 'obsidian', 'knight', 11, 11),
  ], { aiFactions: ['obsidian'] });
}

function guard(world: WorldState, orderId: string, unitId: string): GuardOrder {
  return {
    orderId,
    kind: 'guard',
    faction: 'victoria',
    unitId,
    anchor: world.units[unitId]!.position,
    issuedRound: world.turn.round,
    commandCost: 1,
  };
}

function queue(world: WorldState, order: TacticalOrder): WorldState {
  const result = enqueueTacticalOrder(world, order);
  expect(result.status).toBe('ACCEPTED');
  return result.world;
}

function resolveFaction(world: WorldState, faction: 'victoria' | 'obsidian'): WorldState {
  const committed = world.pendingOrders.filter(order => order.faction === faction);
  const resolved = resolveCommittedOrders(world, committed);
  return clearPendingOrders(resolved.world);
}

function runRound(initial: WorldState): WorldState {
  let world = initial;
  for (const [index, id] of ['vking', 'vqueen', 'vrook', 'vknight'].entries()) {
    world = queue(world, guard(world, `victoria-r1-o${index}`, id));
  }

  world = resolveFaction({
    ...world,
    turn: transitionTurnPhase(world.turn, 'victoria_resolve'),
  }, 'victoria');

  world = {
    ...world,
    turn: transitionTurnPhase(world.turn, 'shadow_command'),
  };

  for (const order of planShadowTurn(world)) world = queue(world, order);

  world = resolveFaction({
    ...world,
    turn: transitionTurnPhase(world.turn, 'shadow_resolve'),
  }, 'obsidian');

  world = {
    ...world,
    turn: transitionTurnPhase(world.turn, 'reinforcement'),
  };

  return resolveReinforcementPhase(world);
}

describe('Royal Tactical full-round gauntlet', () => {
  it('queues exactly four Victoria commands, refuses a fifth, resolves both sides, reinforces once, and resets round two deterministically', () => {
    let world = startingWorld();
    const beforeUnits = world.units;

    for (const [index, id] of ['vking', 'vqueen', 'vrook', 'vknight'].entries()) {
      world = queue(world, guard(world, `victoria-r1-o${index}`, id));
    }

    expect(world.turn.royalCommandsRemaining.victoria).toBe(0);
    expect(world.units).toEqual(beforeUnits);

    const fifth = enqueueTacticalOrder(world, guard(world, 'victoria-r1-o4', 'vpawn'));
    expect(fifth.status).toBe('REFUSED');
    if (fifth.status === 'REFUSED') expect(fifth.reason).toBe('insufficient_royal_commands');

    const a = runRound(startingWorld());
    const b = runRound(startingWorld());

    expect(a).toEqual(b);
    expect(a.turn.round).toBe(2);
    expect(a.turn.phase).toBe('victoria_command');
    expect(a.turn.royalCommandsRemaining).toEqual({ victoria: 4, obsidian: 4 });
  });

  it('wall-clock fixed ticks have no strategic authority', () => {
    const initial = startingWorld();
    const runtime = new FixedTickRuntime(initial);
    const before = JSON.stringify(runtime.world);

    const result = runtime.advance(SIM_TICK_MS * 20);

    expect(result.steps).toBe(20);
    expect(result.events).toEqual([]);
    expect(JSON.stringify(runtime.world)).toBe(before);
  });
});
