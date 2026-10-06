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
  resolveReinforcementPhase,
  transitionTurnPhase,
  TRIPTYCH_ROUND_STAGE_ORDER,
} from '../../src/sim/turns';
import { supplyStatusForUnit } from '../../src/sim/supply';
import { canonicalSnapshot } from '../../src/sim/replay';
import type {
  ReadyDeployment,
  ReplayResult,
  SimEvent,
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

  const minorNodes =
    Object.values(world.territory.nodes)
      .filter(node => node.kind === 'minor')
      .sort((a, b) => a.id.localeCompare(b.id));

  const victoriaCapacityNodes =
    minorNodes.slice(0, 2);
  const obsidianCapacityNodes =
    minorNodes.slice(-2);

  expect(victoriaCapacityNodes).toHaveLength(2);
  expect(obsidianCapacityNodes).toHaveLength(2);

  const ownedCapacityNodes =
    Object.fromEntries([
      ...victoriaCapacityNodes.map(node => [
        node.id,
        {
          ...node,
          owner: 'victoria' as const,
          capturingFaction: null,
          captureProgressTicks: 0,
          contested: false,
        },
      ] as const),
      ...obsidianCapacityNodes.map(node => [
        node.id,
        {
          ...node,
          owner: 'obsidian' as const,
          capturingFaction: null,
          captureProgressTicks: 0,
          contested: false,
        },
      ] as const),
    ]);

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


type IdealRoundResult = Readonly<{
  state: WorldState;
  victoriaOrderIds: readonly string[];
  shadowOrderIds: readonly string[];
  shadowTargets: readonly string[];
  readyEvents: readonly SimEvent[];
  eventsByTick: readonly (readonly SimEvent[])[];
  snapshot: string;
}>;

function reverseRecord<T>(
  record: Readonly<Record<string, T>>,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).reverse(),
  );
}

function withReversedInsertionOrder(
  world: WorldState,
): WorldState {
  return {
    ...world,
    units: reverseRecord(world.units),
    occupancy: reverseRecord(world.occupancy),
    combat: reverseRecord(world.combat),
    military: reverseRecord(world.military),
  };
}

function runIdealRound(
  initial: WorldState,
): IdealRoundResult {
  const runtime =
    new FixedTickRuntime(initial);

  runtime.advance(
    SIM_TICK_MS * 250 + 37,
  );

  let world = runtime.world;
  const eventsByTick:
    (readonly SimEvent[])[] = [];

  const bridge =
    new ClientCommandBridge();

  for (const unitId of [
    'victoria-queen',
    'victoria-rook-a',
    'victoria-knight-a',
    'victoria-pawn-a',
    'victoria-pawn-b',
  ]) {
    bridge.guard(world, unitId);
  }

  const victoriaStaged =
    bridge.drainTactical();

  for (const order of victoriaStaged) {
    const queued =
      enqueueTacticalOrder(
        world,
        order,
      );

    if (queued.status !== 'ACCEPTED') {
      throw new Error(
        `Victoria order refused in ideal runner: ${queued.reason}`,
      );
    }

    world = queued.world;
  }

  world = {
    ...world,
    turn: transitionTurnPhase(
      world.turn,
      'victoria_resolve',
    ),
  };

  const victoriaResolved =
    resolveCommittedOrders(
      world,
      pendingOrdersForFaction(
        world,
        'victoria',
      ),
    );

  world =
    clearPendingOrders(
      victoriaResolved.world,
    );

  eventsByTick.push(
    victoriaResolved.events,
  );

  world = {
    ...world,
    turn: transitionTurnPhase(
      world.turn,
      'shadow_command',
    ),
  };

  const readyResult =
    executeShadowReadyDeployments(
      world,
    );
  world = readyResult.state;
  eventsByTick.push(
    readyResult.events,
  );

  const economyResult =
    executeShadowStrategicEconomy(
      world,
    );
  world = economyResult.state;
  eventsByTick.push(
    economyResult.events,
  );

  const shadowPlanned =
    planShadowTurn(world);

  for (const order of shadowPlanned) {
    const queued =
      enqueueTacticalOrder(
        world,
        order,
      );

    if (queued.status !== 'ACCEPTED') {
      throw new Error(
        `Shadow order refused in ideal runner: ${queued.reason}`,
      );
    }

    world = queued.world;
  }

  world = {
    ...world,
    turn: transitionTurnPhase(
      world.turn,
      'shadow_resolve',
    ),
  };

  const shadowResolved =
    resolveCommittedOrders(
      world,
      pendingOrdersForFaction(
        world,
        'obsidian',
      ),
    );

  world =
    clearPendingOrders(
      shadowResolved.world,
    );

  eventsByTick.push(
    shadowResolved.events,
  );

  world = {
    ...world,
    turn: transitionTurnPhase(
      world.turn,
      'reinforcement',
    ),
  };

  world =
    resolveReinforcementPhase(
      world,
    );

  const replay: ReplayResult = {
    state: world,
    eventsByTick,
  };

  return {
    state: world,
    victoriaOrderIds:
      victoriaStaged.map(
        order => order.orderId,
      ),
    shadowOrderIds:
      shadowPlanned.map(
        order => order.orderId,
      ),
    shadowTargets:
      shadowPlanned
        .filter(
          order =>
            order.kind === 'attack',
        )
        .map(
          order =>
            order.targetUnitId,
        ),
    readyEvents:
      readyResult.events,
    eventsByTick,
    snapshot:
      canonicalSnapshot(replay),
  };
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

  it('resolves Shadow orders through the same committed-order authority as Victoria', () => {
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

    world =
      executeShadowReadyDeployments(
        world,
      ).state;

    world =
      executeShadowStrategicEconomy(
        world,
      ).state;

    const planned =
      planShadowTurn(world);

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

    const committed =
      pendingOrdersForFaction(
        world,
        'obsidian',
      );

    expect(
      committed.map(
        order => order.orderId,
      ),
    ).toEqual(
      planned.map(
        order => order.orderId,
      ),
    );

    const beforeResolveUnits =
      world.units;
    const beforeResolveCombat =
      world.combat;

    world = {
      ...world,
      turn: transitionTurnPhase(
        world.turn,
        'shadow_resolve',
      ),
    };

    expect(world.turn.phase).toBe(
      'shadow_resolve',
    );

    const resolved =
      resolveCommittedOrders(
        world,
        committed,
      );

    expect(
      resolved.outcomes,
    ).toHaveLength(
      committed.length,
    );

    expect(
      resolved.outcomes.map(
        outcome => outcome.orderId,
      ),
    ).toEqual(
      committed.map(
        order => order.orderId,
      ),
    );

    if (committed.length > 0) {
      expect(
        resolved.world.units ===
          beforeResolveUnits &&
        resolved.world.combat ===
          beforeResolveCombat,
      ).toBe(false);
    }

    world =
      clearPendingOrders(
        resolved.world,
      );

    expect(
      world.pendingOrders,
    ).toEqual([]);
    expect(
      world.turn.pendingOrderIds,
    ).toEqual([]);
    expect(
      pendingOrdersForFaction(
        world,
        'obsidian',
      ),
    ).toEqual([]);

    expect(
      world.ai.obsidian.pendingCommands,
    ).toEqual([]);
    expect(world.turn.phase).toBe(
      'shadow_resolve',
    );
  });

  it('composes supply, production maturation, and round reset only at reinforcement', () => {
    let world = createIdealSystemFixture();

    const isolatedId =
      'victoria-isolated-pawn';
    const queuedId =
      'victoria-recruit-1';

    const healthBefore =
      world.combat[isolatedId]!.health;

    world = {
      ...world,
      supply: {
        exposureRoundsByUnit: {
          ...world.supply.exposureRoundsByUnit,
          [isolatedId]: 2,
        },
      },
    };

    const readyBefore =
      world.production.ready.victoria;
    const queuesBefore =
      world.production.queues.victoria;

    expect(
      queuesBefore.map(
        entry => entry.id,
      ),
    ).toContain(queuedId);

    expect(
      readyBefore.map(
        entry => entry.id,
      ),
    ).not.toContain(queuedId);

    expect(
      world.units[
        `unit:${queuedId}`
      ],
    ).toBeUndefined();

    expect(
      world.supply
        .exposureRoundsByUnit[
          isolatedId
        ],
    ).toBe(2);

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

    world = {
      ...world,
      turn: transitionTurnPhase(
        world.turn,
        'shadow_resolve',
      ),
    };

    world = {
      ...world,
      turn: transitionTurnPhase(
        world.turn,
        'reinforcement',
      ),
    };

    expect(world.turn.phase).toBe(
      'reinforcement',
    );

    expect(
      TRIPTYCH_ROUND_STAGE_ORDER,
    ).toEqual([
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

    const resolved =
      resolveReinforcementPhase(
        world,
      );

    expect(
      resolved.supply
        .exposureRoundsByUnit[
          isolatedId
        ],
    ).toBe(3);

    expect(
      resolved.combat[
        isolatedId
      ]?.health,
    ).toBe(
      healthBefore - 10,
    );

    expect(
      resolved.production.queues
        .victoria
        .map(entry => entry.id),
    ).not.toContain(queuedId);

    const matured =
      resolved.production.ready
        .victoria
        .find(
          entry =>
            entry.id === queuedId,
        );

    expect(matured).toBeDefined();
    expect(matured).toMatchObject({
      id: queuedId,
      faction: 'victoria',
      unitKind: 'pawn',
      queuedTick: 0,
      readyRound: 1,
    });

    expect(
      resolved.units[
        `unit:${queuedId}`
      ],
    ).toBeUndefined();

    expect(
      resolved.occupancy[
        '3,16'
      ],
    ).not.toBe(
      `unit:${queuedId}`,
    );

    expect(
      resolved.supply
        .exposureRoundsByUnit[
          `unit:${queuedId}`
        ],
    ).toBeUndefined();

    expect(
      resolved.turn.round,
    ).toBe(2);
    expect(
      resolved.turn.phase,
    ).toBe(
      'victoria_command',
    );

    expect(
      resolved.turn
        .royalCommandsRemaining,
    ).toEqual({
      victoria: 4,
      obsidian: 4,
    });

    expect(
      resolved.turn.pendingOrderIds,
    ).toEqual([]);
  });

  it('replays deterministically and resists record insertion order', () => {
    const first =
      runIdealRound(
        createIdealSystemFixture(),
      );

    const second =
      runIdealRound(
        createIdealSystemFixture(),
      );

    const reversed =
      runIdealRound(
        withReversedInsertionOrder(
          createIdealSystemFixture(),
        ),
      );

    expect(
      first.victoriaOrderIds,
    ).toEqual([
      'victoria-r1-o0',
      'victoria-r1-o1',
      'victoria-r1-o2',
      'victoria-r1-o3',
    ]);

    expect(
      first.shadowOrderIds.length,
    ).toBeLessThanOrEqual(4);

    expect(
      first.shadowOrderIds,
    ).toEqual(
      first.shadowOrderIds.map(
        (_, index) =>
          `obsidian-r1-o${index}`,
      ),
    );

    expect(
      first.shadowTargets,
    ).not.toContain(
      'victoria-pawn-b',
    );

    expect(
      first.victoriaOrderIds,
    ).toEqual(
      second.victoriaOrderIds,
    );
    expect(
      first.shadowOrderIds,
    ).toEqual(
      second.shadowOrderIds,
    );
    expect(
      first.shadowTargets,
    ).toEqual(
      second.shadowTargets,
    );
    expect(
      first.readyEvents,
    ).toEqual(
      second.readyEvents,
    );
    expect(
      first.eventsByTick,
    ).toEqual(
      second.eventsByTick,
    );
    expect(first.snapshot).toBe(
      second.snapshot,
    );

    expect(
      reversed.victoriaOrderIds,
    ).toEqual(
      first.victoriaOrderIds,
    );
    expect(
      reversed.shadowOrderIds,
    ).toEqual(
      first.shadowOrderIds,
    );
    expect(
      reversed.shadowTargets,
    ).toEqual(
      first.shadowTargets,
    );
    expect(
      reversed.readyEvents,
    ).toEqual(
      first.readyEvents,
    );
    expect(
      reversed.eventsByTick,
    ).toEqual(
      first.eventsByTick,
    );
    expect(reversed.snapshot).toBe(
      first.snapshot,
    );

    expect(
      reversed.state,
    ).toEqual(
      first.state,
    );
  });
});
