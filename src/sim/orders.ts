import {
  ROYAL_COMMANDS_PER_ROUND,
} from './turns';

import type {
  Coord,
  Faction,
  HeroAbilityId,
  RecruitableUnitKind,
  WorldState,
} from './types';

export interface TacticalOrderBase {
  orderId: string;
  faction: Faction;
  issuedRound: number;
  commandCost: number;
}

export interface MoveOrder
  extends TacticalOrderBase {
  kind: 'move';
  unitId: string;
  destination: Coord;
}

export interface AttackOrder
  extends TacticalOrderBase {
  kind: 'attack';
  unitId: string;
  targetUnitId: string;
}

export interface GuardOrder
  extends TacticalOrderBase {
  kind: 'guard';
  unitId: string;
  anchor: Coord;
}

export interface AbilityOrder
  extends TacticalOrderBase {
  kind: 'ability';
  unitId: string;
  abilityId: HeroAbilityId;
  target?: Coord | string;
}

export interface RecruitOrder
  extends TacticalOrderBase {
  kind: 'recruit';
  unitKind: RecruitableUnitKind;
}

export type TacticalOrder =
  | MoveOrder
  | AttackOrder
  | GuardOrder
  | AbilityOrder
  | RecruitOrder;

export type OrderQueueResult =
  | Readonly<{
      status: 'ACCEPTED';
      world: WorldState;
    }>
  | Readonly<{
      status: 'REFUSED';
      world: WorldState;
      reason: string;
    }>;

function activeCommandFaction(
  world: WorldState,
): Faction | null {
  if (
    world.turn.phase ===
    'victoria_command'
  ) {
    return 'victoria';
  }

  if (
    world.turn.phase ===
    'shadow_command'
  ) {
    return 'obsidian';
  }

  return null;
}

export function enqueueTacticalOrder(
  world: WorldState,
  order: TacticalOrder,
): OrderQueueResult {
  const activeFaction =
    activeCommandFaction(world);

  if (
    activeFaction === null ||
    activeFaction !==
      order.faction
  ) {
    return {
      status: 'REFUSED',
      world,
      reason: 'wrong_phase',
    };
  }

  if (
    order.issuedRound !==
    world.turn.round
  ) {
    return {
      status: 'REFUSED',
      world,
      reason: 'wrong_round',
    };
  }

  if (
    !Number.isInteger(
      order.commandCost,
    ) ||
    order.commandCost <= 0
  ) {
    return {
      status: 'REFUSED',
      world,
      reason:
        'invalid_command_cost',
    };
  }

  if (
    world.turn
      .pendingOrderIds
      .includes(order.orderId)
  ) {
    return {
      status: 'REFUSED',
      world,
      reason:
        'duplicate_order_id',
    };
  }

  const remaining =
    world.turn
      .royalCommandsRemaining[
        order.faction
      ];

  if (
    remaining <
    order.commandCost
  ) {
    return {
      status: 'REFUSED',
      world,
      reason:
        'insufficient_royal_commands',
    };
  }

  return {
    status: 'ACCEPTED',

    world: {
      ...world,

      pendingOrders: [
        ...world.pendingOrders,
        order,
      ],

      turn: {
        ...world.turn,

        royalCommandsRemaining: {
          ...world.turn
            .royalCommandsRemaining,

          [order.faction]:
            remaining -
            order.commandCost,
        },

        pendingOrderIds: [
          ...world.turn
            .pendingOrderIds,
          order.orderId,
        ],
      },
    },
  };
}

export function cancelTacticalOrder(
  world: WorldState,
  orderId: string,
): OrderQueueResult {
  const order =
    world.pendingOrders.find(
      candidate =>
        candidate.orderId ===
        orderId,
    );

  if (!order) {
    return {
      status: 'REFUSED',
      world,
      reason:
        'missing_order',
    };
  }

  const activeFaction =
    activeCommandFaction(world);

  if (
    activeFaction !==
    order.faction
  ) {
    return {
      status: 'REFUSED',
      world,
      reason:
        'wrong_phase',
    };
  }

  const restored =
    Math.min(
      ROYAL_COMMANDS_PER_ROUND,

      world.turn
        .royalCommandsRemaining[
          order.faction
        ] +
        order.commandCost,
    );

  return {
    status: 'ACCEPTED',

    world: {
      ...world,

      pendingOrders:
        world.pendingOrders.filter(
          candidate =>
            candidate.orderId !==
            orderId,
        ),

      turn: {
        ...world.turn,

        royalCommandsRemaining: {
          ...world.turn
            .royalCommandsRemaining,

          [order.faction]:
            restored,
        },

        pendingOrderIds:
          world.turn
            .pendingOrderIds
            .filter(
              id =>
                id !== orderId,
            ),
      },
    },
  };
}

export function clearPendingOrders(
  world: WorldState,
): WorldState {
  return {
    ...world,

    pendingOrders: [],

    turn: {
      ...world.turn,
      pendingOrderIds: [],
    },
  };
}

export function pendingOrdersForFaction(
  world: WorldState,
  faction: Faction,
): readonly TacticalOrder[] {
  const byId =
    new Map(
      world.pendingOrders.map(
        order => [
          order.orderId,
          order,
        ] as const,
      ),
    );

  return world.turn
    .pendingOrderIds
    .map(id => byId.get(id))
    .filter(
      (
        order,
      ): order is TacticalOrder =>
        order !== undefined &&
        order.faction ===
          faction,
    );
}
