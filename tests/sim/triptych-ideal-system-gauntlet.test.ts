import { describe, expect, it } from 'vitest';

import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import {
  FixedTickRuntime,
  SIM_TICK_MS,
} from '../../src/client/runtime/fixed-tick-runtime';
import { ClientCommandBridge } from '../../src/client/runtime/command-bridge';
import {
  executeShadowReadyDeployments,
  executeShadowStrategicEconomy,
  planShadowTurn,
} from '../../src/sim/ai';
import { getBattlefieldTopology } from '../../src/sim/battlefield-topology-authority';
import { tileId } from '../../src/sim/board-topology';
import { queueRecruitment } from '../../src/sim/production';
import {
  clearPendingOrders,
  enqueueTacticalOrder,
  pendingOrdersForFaction,
} from '../../src/sim/orders';
import {
  resolveCommittedOrders,
} from '../../src/sim/resolve-orders';
import {
  transitionTurnPhase,
} from '../../src/sim/turns';
import { supplyStatusForUnit } from '../../src/sim/supply';
import type {
  ReadyDeployment,
  WorldState,
} from '../../src/sim/types';
import { placeUnit } from '../../src/sim/world';

function createIdealSystemFixture(): WorldState {
  let world = createPhase6SkirmishWorld();

  world = placeUnit(world, {
    id: 'victoria-isolated-pawn',
    faction: 'victoria',
    kind: 'pawn',
    position: { x: 15, y: 15 },
  });

  const victoriaCapacityNodes =
    Object.values(world.territory.nodes)
      .filter(node => node.kind === 'minor')
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 2);

  expect(victoriaCapacityNodes).toHaveLength(2);

  const ownedCapacityNodes =
    Object.fromEntries(
      victoriaCapacityNodes.map(node => [
        node.id,
        {
          ...node,
          owner: 'victoria' as const,
          capturingFaction: null,
          captureProgressTicks: 0,
          contested: false,
        },
      ]),
    );

  world = {
    ...world,
    territory: {
      ...world.territory,
      nodes: {
        ...world.territory.nodes,
        ...ownedCapacityNodes,
      },
    },
    economy: {
      crownPower: {
        ...world.economy.crownPower,
        victoria: 40,
        obsidian: 40,
      },
    },
  };

  const queued = queueRecruitment(
    world,
    {
      type: 'recruit',
      sequence: 1,
      issuedTick: world.tick,
      faction: 'victoria',
      unitKind: 'pawn',
    },
  );

  expect(queued.receipt.accepted).toBe(true);
  world = queued.state;

  const ready: ReadyDeployment = {
    id: 'obsidian-ready-pawn',
    faction: 'obsidian',
    unitKind: 'pawn',
    cost: 10,
    capacityWeight: 1,
    queuedTick: world.tick,
    readyRound: world.turn.round,
  };

  const observedCell = { x: 6, y: 15 };
  const rememberedCell = { x: 6, y: 17 };
  const observedId = tileId(observedCell);
  const rememberedId = tileId(rememberedCell);
  const obsidianMemory =
    world.intelligence.byFaction.obsidian;

  world = {
    ...world,
    production: {
      ...world.production,
      ready: {
        ...world.production.ready,
        obsidian: [
          ...world.production.ready.obsidian,
          ready,
        ],
      },
    },
    intelligence: {
      ...world.intelligence,
      byFaction: {
        ...world.intelligence.byFaction,
        obsidian: {
          ...obsidianMemory,
          [observedId]: {
            ...obsidianMemory[observedId]!,
            visibility: 'observed',
            lastSeenRound: world.turn.round,
            lastKnownUnitId: 'victoria-pawn-a',
          },
          [rememberedId]: {
            ...obsidianMemory[rememberedId]!,
            visibility: 'remembered',
            lastSeenRound: world.turn.round - 1,
            lastKnownUnitId: 'victoria-pawn-b',
          },
        },
      },
    },
  };

  return world;
}

describe('Triptych ideal-system gauntlet fixture', () => {
  it('constructs one legal V2 world carrying every cross-system proof ingredient', () => {
    const world = createIdealSystemFixture();
    const topology =
      getBattlefieldTopology('triptych-v2');

    expect(world.width).toBe(32);
    expect(world.height).toBe(32);

    for (const unit of Object.values(world.units)) {
      expect(
        topology.isPlayableCell(
          unit.position.x,
          unit.position.y,
        ),
      ).toBe(true);
    }

    expect(
      topology.isPlayableCell(15, 15),
    ).toBe(true);

    expect(
      world.match.sovereigns.victoria.kingId,
    ).toBe('victoria-king');
    expect(
      world.match.sovereigns.obsidian.kingId,
    ).toBe('obsidian-king');

    expect(
      world.units['victoria-queen'],
    ).toBeDefined();
    expect(
      world.units['obsidian-knight-a'],
    ).toBeDefined();

    expect(
      supplyStatusForUnit(
        world,
        'victoria-queen',
      ),
    ).toBe('supplied');

    expect(
      supplyStatusForUnit(
        world,
        'victoria-isolated-pawn',
      ),
    ).toBe('exposed');

    expect(
      world.production.ready.obsidian
        .some(
          entry =>
            entry.id ===
            'obsidian-ready-pawn',
        ),
    ).toBe(true);

    expect(
      world.production.queues.victoria
        .some(
          entry =>
            entry.id ===
            'victoria-recruit-1',
        ),
    ).toBe(true);

    const observed =
      world.intelligence.byFaction.obsidian[
        tileId({ x: 6, y: 15 })
      ]!;
    const remembered =
      world.intelligence.byFaction.obsidian[
        tileId({ x: 6, y: 17 })
      ]!;

    expect(observed.visibility).toBe(
      'observed',
    );
    expect(
      observed.lastKnownUnitId,
    ).toBe('victoria-pawn-a');

    expect(remembered.visibility).toBe(
      'remembered',
    );
    expect(
      remembered.lastKnownUnitId,
    ).toBe('victoria-pawn-b');

    const objective =
      Object.values(
        world.territory.nodes,
      ).find(
        node =>
          node.center.x === 13 &&
          node.center.y === 15,
      );

    expect(objective).toBeDefined();
    expect(
      topology.isPlayableCell(
        objective!.center.x,
        objective!.center.y,
      ),
    ).toBe(true);

    expect(
      world.turn.royalCommandsRemaining
        .victoria,
    ).toBe(4);
    expect(
      world.turn.royalCommandsRemaining
        .obsidian,
    ).toBe(4);
    expect(world.turn.phase).toBe(
      'victoria_command',
    );
  });

  it('keeps the integrated strategic world inert under presentation time', () => {
    const world = createIdealSystemFixture();
    const runtime = new FixedTickRuntime(world);
    const before = runtime.world;

    const strategic = {
      phase: before.turn.phase,
      round: before.turn.round,
      crown: before.economy.crownPower,
      queues: before.production.queues,
      ready: before.production.ready,
      supply: before.supply,
      units: before.units,
      occupancy: before.occupancy,
      pendingOrders: before.pendingOrders,
      ai: before.ai,
    };

    const result = runtime.advance(
      SIM_TICK_MS * 250 + 37,
    );

    expect(
      result.presentationClock,
    ).toEqual({
      elapsedMs: 25_037,
      tick: 250,
      remainderMs: 37,
      alpha: 0.37,
    });

    expect(runtime.world).toBe(before);
    expect(runtime.world.turn.phase).toBe(
      strategic.phase,
    );
    expect(runtime.world.turn.round).toBe(
      strategic.round,
    );
    expect(
      runtime.world.economy.crownPower,
    ).toEqual(strategic.crown);
    expect(
      runtime.world.production.queues,
    ).toEqual(strategic.queues);
    expect(
      runtime.world.production.ready,
    ).toEqual(strategic.ready);
    expect(runtime.world.supply).toEqual(
      strategic.supply,
    );
    expect(runtime.world.units).toEqual(
      strategic.units,
    );
    expect(runtime.world.occupancy).toEqual(
      strategic.occupancy,
    );
    expect(
      runtime.world.pendingOrders,
    ).toEqual(strategic.pendingOrders);
    expect(runtime.world.ai).toEqual(
      strategic.ai,
    );
    expect(runtime.world.tick).toBe(0);

    expect(
      runtime.commands.peekTactical(),
    ).toEqual([]);
  });

  it('stages exactly four deterministic Victoria orders and resolves them through shared authority', () => {
    let world = createIdealSystemFixture();
    const bridge = new ClientCommandBridge();

    const unitsBefore = world.units;
    const combatBefore = world.combat;

    for (const unitId of [
      'victoria-queen',
      'victoria-rook-a',
      'victoria-knight-a',
      'victoria-pawn-a',
      'victoria-pawn-b',
    ]) {
      bridge.guard(world, unitId);
    }

    const staged = bridge.peekTactical();

    expect(staged).toHaveLength(4);
    expect(
      staged.map(order => order.orderId),
    ).toEqual([
      'victoria-r1-o0',
      'victoria-r1-o1',
      'victoria-r1-o2',
      'victoria-r1-o3',
    ]);

    expect(
      world.turn.royalCommandsRemaining.victoria,
    ).toBe(4);
    expect(world.units).toBe(unitsBefore);
    expect(world.combat).toBe(combatBefore);
    expect(world.pendingOrders).toEqual([]);

    for (const order of bridge.drainTactical()) {
      const queued =
        enqueueTacticalOrder(world, order);

      expect(queued.status).toBe(
        'ACCEPTED',
      );

      if (queued.status !== 'ACCEPTED') {
        throw new Error(
          `expected accepted Victoria order: ${queued.reason}`,
        );
      }

      world = queued.world;
    }

    expect(
      world.turn.royalCommandsRemaining.victoria,
    ).toBe(0);

    expect(
      pendingOrdersForFaction(
        world,
        'victoria',
      ).map(order => order.orderId),
    ).toEqual([
      'victoria-r1-o0',
      'victoria-r1-o1',
      'victoria-r1-o2',
      'victoria-r1-o3',
    ]);

    world = {
      ...world,
      turn: transitionTurnPhase(
        world.turn,
        'victoria_resolve',
      ),
    };

    const resolved =
      resolveCommittedOrders(
        world,
        pendingOrdersForFaction(
          world,
          'victoria',
        ),
      );

    expect(
      resolved.outcomes.map(
        outcome => outcome.status,
      ),
    ).toEqual([
      'RESOLVED',
      'RESOLVED',
      'RESOLVED',
      'RESOLVED',
    ]);

    world =
      clearPendingOrders(
        resolved.world,
      );

    expect(world.pendingOrders).toEqual([]);
    expect(
      world.turn.pendingOrderIds,
    ).toEqual([]);
    expect(world.turn.phase).toBe(
      'victoria_resolve',
    );

    expect(
      world.combat['victoria-queen']
        ?.guardAnchor,
    ).toEqual(
      world.units['victoria-queen']
        ?.position,
    );
  });

  it('composes live Shadow READY, economy, planning, and canonical enqueue authority', () => {
    let world = createIdealSystemFixture();

    world = {
      ...world,
      turn: transitionTurnPhase(
        world.turn,
        'victoria_resolve',
      ),
    };

    world = {
      ...world,
      turn: transitionTurnPhase(
        world.turn,
        'shadow_command',
      ),
    };

    expect(world.turn.phase).toBe(
      'shadow_command',
    );

    const crownBefore =
      world.economy.crownPower.obsidian;
    const queueBefore =
      world.production.queues.obsidian.length;

    const readyResult =
      executeShadowReadyDeployments(
        world,
      );

    world = readyResult.state;

    expect(
      readyResult.events.filter(
        event =>
          event.type ===
          'reinforcement.deployed',
      ),
    ).toHaveLength(1);

    expect(
      world.production.ready.obsidian
        .some(
          entry =>
            entry.id ===
            'obsidian-ready-pawn',
        ),
    ).toBe(false);

    const deployed =
      world.units[
        'unit:obsidian-ready-pawn'
      ];

    expect(deployed).toBeDefined();

    const topology =
      getBattlefieldTopology(
        'triptych-v2',
      );

    expect(
      topology.isPlayableCell(
        deployed!.position.x,
        deployed!.position.y,
      ),
    ).toBe(true);

    expect(
      world.turn.royalCommandsRemaining
        .obsidian,
    ).toBe(4);

    const economyResult =
      executeShadowStrategicEconomy(
        world,
      );

    world = economyResult.state;

    expect(
      world.production.queues.obsidian.length,
    ).toBeGreaterThan(queueBefore);

    expect(
      world.economy.crownPower.obsidian,
    ).toBeLessThan(crownBefore);

    const planned =
      planShadowTurn(world);

    expect(
      planned.length,
    ).toBeLessThanOrEqual(4);

    expect(
      planned.map(order => order.orderId),
    ).toEqual(
      planned.map(
        (_, index) =>
          `obsidian-r1-o${index}`,
      ),
    );

    const rememberedId =
      'victoria-pawn-b';

    expect(
      planned
        .filter(
          order =>
            order.kind === 'attack',
        )
        .map(
          order =>
            order.targetUnitId,
        ),
    ).not.toContain(
      rememberedId,
    );

    for (const order of planned) {
      const queued =
        enqueueTacticalOrder(
          world,
          order,
        );

      expect(queued.status).toBe(
        'ACCEPTED',
      );

      if (
        queued.status !==
        'ACCEPTED'
      ) {
        throw new Error(
          `expected accepted Shadow order: ${queued.reason}`,
        );
      }

      world = queued.world;
    }

    expect(
      world.turn.royalCommandsRemaining
        .obsidian,
    ).toBe(
      4 - planned.length,
    );

    expect(
      pendingOrdersForFaction(
        world,
        'obsidian',
      ).map(
        order => order.orderId,
      ),
    ).toEqual(
      planned.map(
        order => order.orderId,
      ),
    );

    expect(
      world.ai.obsidian.pendingCommands,
    ).toEqual([]);
  });
});
