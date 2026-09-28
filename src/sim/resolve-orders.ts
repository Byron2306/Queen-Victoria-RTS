import {
  canUnitAttackTarget,
  UNIT_COMBAT_PROFILES,
} from './combat';

import {
  effectiveAttackRange,
  incomingHeroDamageBps,
  outgoingHeroDamageBps,
} from './abilities';

import {
  evaluatePositionalAttack,
} from './position';

import {
  validateMoveGeometry,
} from './geometry';

import {
  interpretSovereignDefeats,
} from './sovereign';

import {
  coordKey,
  isInBounds,
} from './world';

import type {
  AttackOrder,
  MoveOrder,
  TacticalOrder,
} from './orders';

import type {
  SimEvent,
  WorldState,
} from './types';

export type OrderResolutionStatus =
  | 'RESOLVED'
  | 'REFUSED'
  | 'SKIPPED'
  | 'INTERRUPTED';

export type OrderResolutionOutcome =
  Readonly<{
    orderId: string;
    status:
      OrderResolutionStatus;
    reason?: string;
  }>;

export type OrderResolutionResult =
  Readonly<{
    world: WorldState;
    outcomes:
      readonly OrderResolutionOutcome[];
    events:
      readonly SimEvent[];
  }>;

type SingleResolution =
  Readonly<{
    world: WorldState;
    outcome:
      OrderResolutionOutcome;
    events:
      readonly SimEvent[];
  }>;

function refused(
  world: WorldState,
  orderId: string,
  reason: string,
): SingleResolution {
  return {
    world,
    outcome: {
      orderId,
      status: 'REFUSED',
      reason,
    },
    events: [],
  };
}

function skipped(
  world: WorldState,
  orderId: string,
  reason: string,
): SingleResolution {
  return {
    world,
    outcome: {
      orderId,
      status: 'SKIPPED',
      reason,
    },
    events: [],
  };
}

function resolveMove(
  world: WorldState,
  order: MoveOrder,
): SingleResolution {
  const actor =
    world.units[order.unitId];

  if (!actor) {
    return skipped(
      world,
      order.orderId,
      'actor_missing',
    );
  }

  const actorCombat =
    world.combat[order.unitId];

  if (
    !actorCombat ||
    actorCombat.health <= 0
  ) {
    return skipped(
      world,
      order.orderId,
      'actor_dead',
    );
  }

  if (
    actor.faction !==
    order.faction
  ) {
    return refused(
      world,
      order.orderId,
      'wrong_faction',
    );
  }

  if (
    !isInBounds(
      order.destination,
    )
  ) {
    return refused(
      world,
      order.orderId,
      'out_of_bounds',
    );
  }

  const destinationKey =
    coordKey(order.destination);

  if (
    world.occupancy[
      destinationKey
    ]
  ) {
    return refused(
      world,
      order.orderId,
      'occupied',
    );
  }

  const geometry =
    validateMoveGeometry(
      world,
      actor,
      order.destination,
    );

  if (!geometry.legal) {
    return refused(
      world,
      order.orderId,
      geometry.reason,
    );
  }

  const oldKey =
    coordKey(actor.position);

  const units = {
    ...world.units,

    [actor.id]: {
      ...actor,
      position: {
        ...order.destination,
      },
    },
  };

  const occupancy = {
    ...world.occupancy,
  };

  delete occupancy[oldKey];

  occupancy[destinationKey] =
    actor.id;

  return {
    world: {
      ...world,
      units,
      occupancy,

      combat: {
        ...world.combat,

        [actor.id]: {
          ...actorCombat,
          guardAnchor: {
            ...order.destination,
          },
        },
      },
    },

    outcome: {
      orderId:
        order.orderId,
      status: 'RESOLVED',
    },

    events: [],
  };
}

function resolveAttack(
  world: WorldState,
  order: AttackOrder,
): SingleResolution {
  const attacker =
    world.units[order.unitId];

  if (!attacker) {
    return skipped(
      world,
      order.orderId,
      'actor_missing',
    );
  }

  const attackerCombat =
    world.combat[order.unitId];

  if (
    !attackerCombat ||
    attackerCombat.health <= 0
  ) {
    return skipped(
      world,
      order.orderId,
      'actor_dead',
    );
  }

  if (
    attacker.faction !==
    order.faction
  ) {
    return refused(
      world,
      order.orderId,
      'wrong_faction',
    );
  }

  const target =
    world.units[
      order.targetUnitId
    ];

  const targetCombat =
    world.combat[
      order.targetUnitId
    ];

  if (
    !target ||
    !targetCombat ||
    targetCombat.health <= 0
  ) {
    return refused(
      world,
      order.orderId,
      'target_missing',
    );
  }

  if (
    attacker.faction ===
    target.faction
  ) {
    return refused(
      world,
      order.orderId,
      'friendly_target',
    );
  }

  /*
   * Keep the existing combat
   * legality boundary authoritative.
   */
  if (
    !canUnitAttackTarget(
      world,
      attacker.id,
      target.id,
    )
  ) {
    /*
     * effectiveAttackRange is
     * deliberately referenced here
     * as part of the same combat
     * authority surface.
     */
    void effectiveAttackRange(
      world,
      attacker.id,
    );

    return refused(
      world,
      order.orderId,
      'illegal_attack',
    );
  }

  const profile =
    UNIT_COMBAT_PROFILES[
      attacker.kind
    ];

  const positional =
    evaluatePositionalAttack(
      world,
      attacker.id,
      target.id,
    );

  const positionalDamage =
    Math.floor(
      (
        profile.damage *
        positional.multiplierBps
      ) /
        10000,
    );

  const outgoingDamage =
    Math.floor(
      (
        positionalDamage *
        outgoingHeroDamageBps(
          world,
          attacker.id,
        )
      ) /
        10000,
    );

  const damage =
    Math.max(
      1,
      Math.floor(
        (
          outgoingDamage *
          incomingHeroDamageBps(
            world,
            target.id,
          )
        ) /
          10000,
      ),
    );

  const healthAfter =
    Math.max(
      0,
      targetCombat.health -
        damage,
    );

  const events: SimEvent[] = [
    {
      type: 'attack.fired',
      tick: world.tick,
      unitId: attacker.id,
      targetId: target.id,
      damage,
      positionalTags: [
        ...positional.tags,
      ].sort(),
    },

    {
      type: 'unit.damaged',
      tick: world.tick,
      unitId: target.id,
      damage,
      healthBefore:
        targetCombat.health,
      healthAfter,
    },
  ];

  let afterAttack:
    WorldState = {
      ...world,

      combat: {
        ...world.combat,

        [target.id]: {
          ...targetCombat,
          health: healthAfter,
        },
      },
    };

  if (healthAfter === 0) {
    events.push({
      type: 'unit.killed',
      tick: world.tick,
      unitId: target.id,
      byUnitIds: [
        attacker.id,
      ],
      positionalBonusApplied:
        positional.tags.length > 0,
    });

    const units = {
      ...afterAttack.units,
    };

    const occupancy = {
      ...afterAttack.occupancy,
    };

    const combat = {
      ...afterAttack.combat,
    };

    delete occupancy[
      coordKey(target.position)
    ];

    delete units[target.id];
    delete combat[target.id];

    for (
      const id of
      Object.keys(combat)
    ) {
      const state =
        combat[id];

      if (
        state?.targetId ===
        target.id
      ) {
        combat[id] = {
          ...state,
          targetId: null,
        };
      }
    }

    afterAttack = {
      ...afterAttack,
      units,
      occupancy,
      combat,
    };
  }

  const sovereign =
    interpretSovereignDefeats(
      world,
      afterAttack,
      events,
    );

  return {
    world: sovereign.state,

    outcome: {
      orderId:
        order.orderId,
      status: 'RESOLVED',
    },

    events: [
      ...events,
      ...sovereign.events,
    ],
  };
}

function resolveGuard(
  world: WorldState,
  order: Extract<
    TacticalOrder,
    { kind: 'guard' }
  >,
): SingleResolution {
  const unit =
    world.units[order.unitId];

  if (!unit) {
    return skipped(
      world,
      order.orderId,
      'actor_missing',
    );
  }

  const combat =
    world.combat[
      order.unitId
    ];

  if (
    !combat ||
    combat.health <= 0
  ) {
    return skipped(
      world,
      order.orderId,
      'actor_dead',
    );
  }

  if (
    unit.faction !==
    order.faction
  ) {
    return refused(
      world,
      order.orderId,
      'wrong_faction',
    );
  }

  return {
    world: {
      ...world,

      combat: {
        ...world.combat,

        [unit.id]: {
          ...combat,
          stance: 'guard',
          guardAnchor: {
            ...order.anchor,
          },
          targetId: null,
        },
      },
    },

    outcome: {
      orderId:
        order.orderId,
      status:
        'RESOLVED',
    },

    events: [],
  };
}

function resolveSingleOrder(
  world: WorldState,
  order: TacticalOrder,
): SingleResolution {
  if (
    world.match.status !==
    'active'
  ) {
    return {
      world,

      outcome: {
        orderId:
          order.orderId,
        status:
          'INTERRUPTED',
        reason:
          'match_ended',
      },

      events: [],
    };
  }

  switch (order.kind) {
    case 'move':
      return resolveMove(
        world,
        order,
      );

    case 'attack':
      return resolveAttack(
        world,
        order,
      );

    case 'guard':
      return resolveGuard(
        world,
        order,
      );

    case 'ability':
    case 'recruit':
      return refused(
        world,
        order.orderId,
        'unsupported_order_kind',
      );
  }
}

export function resolveCommittedOrders(
  world: WorldState,
  orders:
    readonly TacticalOrder[],
): OrderResolutionResult {
  let current =
    world;

  const outcomes:
    OrderResolutionOutcome[] =
      [];

  const events:
    SimEvent[] = [];

  for (
    const order of orders
  ) {
    if (
      current.match.status !==
      'active'
    ) {
      outcomes.push({
        orderId:
          order.orderId,
        status:
          'INTERRUPTED',
        reason:
          'match_ended',
      });

      continue;
    }

    const result =
      resolveSingleOrder(
        current,
        order,
      );

    current =
      result.world;

    outcomes.push(
      result.outcome,
    );

    events.push(
      ...result.events,
    );
  }

  return {
    world: current,
    outcomes,
    events,
  };
}
