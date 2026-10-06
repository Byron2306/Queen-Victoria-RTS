import { describe, expect, it } from 'vitest';

import {
  canonicalSnapshot,
  createWorld,
  executeShadowReadyDeployments,
  executeShadowStrategicEconomy,
  planShadowTurn,
  resolveReinforcementPhase,
  stepWorld,
  transitionTurnPhase,
} from '../../src/sim';
import { clearPendingOrders, enqueueTacticalOrder } from '../../src/sim/orders';
import { resolveCommittedOrders } from '../../src/sim/resolve-orders';
import { tileId } from '../../src/sim/board-topology';
import type {
  ReadyDeployment,
  ReplayResult,
  SimEvent,
  TileMemory,
  UnitState,
  WorldState,
} from '../../src/sim';

function ready(id: string): ReadyDeployment {
  return {
    id,
    faction: 'obsidian',
    unitKind: 'pawn',
    cost: 10,
    capacityWeight: 1,
    queuedTick: 0,
    readyRound: 1,
  };
}

function remembered(
  world: WorldState,
  unitId: string,
  cell: { x: number; y: number },
): WorldState {
  const memory: TileMemory = {
    visibility: 'remembered',
    lastSeenRound: 1,
    lastKnownPolarity: 'white',
    lastKnownControl: 'neutral',
    lastKnownUnitId: unitId,
    lastKnownFortificationId: null,
    lastKnownBannerId: null,
  };

  return {
    ...world,
    intelligence: {
      ...world.intelligence,
      byFaction: {
        ...world.intelligence.byFaction,
        obsidian: {
          ...world.intelligence.byFaction.obsidian,
          [tileId(cell)]: memory,
        },
      },
    },
  };
}

function deploymentBlockers(): readonly UnitState[] {
  const free = { x: 26, y: 13 };
  const result: UnitState[] = [];
  let ordinal = 1;

  for (let y = 13; y <= 17; y += 1) {
    for (let x = 26; x <= 30; x += 1) {
      if (x === free.x && y === free.y) continue;
      result.push({
        id: `oblocker-${String(ordinal).padStart(2, '0')}`,
        faction: 'obsidian',
        kind: 'pawn',
        position: { x, y },
      });
      ordinal += 1;
    }
  }

  return result;
}

function startingWorld(): WorldState {
  let world = createWorld([
    ...deploymentBlockers(),
    {
      id: 'orook',
      faction: 'obsidian',
      kind: 'rook',
      position: { x: 18, y: 15 },
    },
    {
      id: 'oking',
      faction: 'obsidian',
      kind: 'king',
      position: { x: 19, y: 12 },
    },
    {
      id: 'vking',
      faction: 'victoria',
      kind: 'king',
      position: { x: 18, y: 18 },
    },
    {
      id: 'hidden-vpawn',
      faction: 'victoria',
      kind: 'pawn',
      position: { x: 2, y: 15 },
    },
  ], {
    topologyId: 'triptych-v2',
    aiFactions: ['obsidian'],
  });

  world = {
    ...world,
    economy: {
      crownPower: {
        victoria: 0,
        obsidian: 100,
      },
    },
    production: {
      ...world.production,
      ready: {
        ...world.production.ready,
        obsidian: [
          ready('obsidian-recruit-2'),
          ready('obsidian-recruit-1'),
        ],
      },
    },
  };

  return remembered(
    world,
    'hidden-vpawn',
    { x: 22, y: 15 },
  );
}

function snapshot(
  state: WorldState,
  eventsByTick: readonly (readonly SimEvent[])[],
): string {
  const replay: ReplayResult = {
    state,
    eventsByTick,
  };
  return canonicalSnapshot(replay);
}

function runScenario(initial: WorldState): Readonly<{
  state: WorldState;
  eventsByTick: readonly (readonly SimEvent[])[];
  plannedOrderIds: readonly string[];
  plannedTargets: readonly string[];
  readyEvents: readonly SimEvent[];
}> {
  let world = initial;
  const eventsByTick: (readonly SimEvent[])[] = [];

  for (let index = 0; index < 5; index += 1) {
    const tick = stepWorld(world, []);
    world = tick.state;
    eventsByTick.push(tick.events);
  }

  world = {
    ...world,
    turn: transitionTurnPhase(world.turn, 'victoria_resolve'),
  };
  world = {
    ...world,
    turn: transitionTurnPhase(world.turn, 'shadow_command'),
  };

  const readyResult = executeShadowReadyDeployments(world);
  world = readyResult.state;
  eventsByTick.push(readyResult.events);

  const economyResult = executeShadowStrategicEconomy(world);
  world = economyResult.state;
  eventsByTick.push(economyResult.events);

  const planned = planShadowTurn(world);
  const plannedTargets = planned
    .filter(order => order.kind === 'attack')
    .map(order => order.targetUnitId);

  for (const order of planned) {
    const queued = enqueueTacticalOrder(world, order);
    expect(queued.status).toBe('ACCEPTED');
    world = queued.world;
  }

  const committed = world.pendingOrders.filter(
    order => order.faction === 'obsidian',
  );

  world = {
    ...world,
    turn: transitionTurnPhase(world.turn, 'shadow_resolve'),
  };

  const resolved = resolveCommittedOrders(world, committed);
  world = clearPendingOrders(resolved.world);
  eventsByTick.push(resolved.events);

  world = {
    ...world,
    turn: transitionTurnPhase(world.turn, 'reinforcement'),
  };
  world = resolveReinforcementPhase(world);

  return {
    state: world,
    eventsByTick,
    plannedOrderIds: planned.map(order => order.orderId),
    plannedTargets,
    readyEvents: readyResult.events,
  };
}

describe('Triptych Shadow AI parity gauntlet', () => {
  it('proves one deterministic Shadow authority across time, knowledge, READY, budget, resolution, and reinforcement', () => {
    const initial = startingWorld();

    const afterTicks = Array.from({ length: 5 }).reduce(
      state => stepWorld(state, []).state,
      initial,
    );
    expect(afterTicks.ai.obsidian.commitments).toEqual([]);
    expect(afterTicks.ai.obsidian.pendingCommands).toEqual([]);
    expect(afterTicks.production.queues.obsidian).toEqual([]);
    expect(afterTicks.production.ready.obsidian).toEqual(
      initial.production.ready.obsidian,
    );
    expect(afterTicks.economy.crownPower.obsidian).toBe(100);

    const wrongPhaseReady = executeShadowReadyDeployments(afterTicks);
    const wrongPhaseEconomy = executeShadowStrategicEconomy(afterTicks);
    expect(wrongPhaseReady.state).toEqual(afterTicks);
    expect(wrongPhaseReady.events).toEqual([]);
    expect(wrongPhaseEconomy.state).toEqual(afterTicks);
    expect(wrongPhaseEconomy.events).toEqual([]);

    const a = runScenario(initial);
    const b = runScenario(startingWorld());

    expect(a.readyEvents).toHaveLength(1);
    expect(a.readyEvents[0]).toMatchObject({
      type: 'reinforcement.deployed',
      faction: 'obsidian',
      queueEntryId: 'obsidian-recruit-1',
      position: { x: 26, y: 13 },
    });
    expect(
      a.state.production.ready.obsidian.map(entry => entry.id),
    ).toContain('obsidian-recruit-2');

    expect(a.plannedTargets).toContain('vking');
    expect(a.plannedTargets).not.toContain('hidden-vpawn');

    expect(a.plannedOrderIds.length).toBeLessThanOrEqual(4);
    expect(a.plannedOrderIds).toEqual(
      a.plannedOrderIds.map(
        (_, index) => `obsidian-r1-o${index}`,
      ),
    );

    expect(
      a.state.turn.round,
    ).toBe(2);
    expect(a.state.turn.phase).toBe('victoria_command');
    expect(a.state.turn.royalCommandsRemaining).toEqual({
      victoria: 4,
      obsidian: 4,
    });

    expect(a.plannedOrderIds).toEqual(b.plannedOrderIds);
    expect(a.plannedTargets).toEqual(b.plannedTargets);
    expect(a.readyEvents).toEqual(b.readyEvents);
    expect(
      snapshot(a.state, a.eventsByTick),
    ).toBe(
      snapshot(b.state, b.eventsByTick),
    );
  }, 15000);
});
