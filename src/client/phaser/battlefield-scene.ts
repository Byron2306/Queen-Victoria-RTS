import {
  planShadowTurn,
} from '../../sim/ai';

import {
  cancelTacticalOrder,
  clearPendingOrders,
  enqueueTacticalOrder,
  pendingOrdersForFaction,
} from '../../sim/orders';

import {
  resolveCommittedOrders,
} from '../../sim/resolve-orders';

import {
  resolveReinforcementPhase,
  transitionTurnPhase,
} from '../../sim/turns';

import type {
  WorldState,
} from '../../sim/types';

import {
  FixedTickRuntime,
  type RuntimeAdvanceResult,
} from '../runtime/fixed-tick-runtime';

export class BattlefieldSceneController {
  public readonly runtime:
    FixedTickRuntime;

  constructor(
    runtime:
      FixedTickRuntime =
        new FixedTickRuntime(),
  ) {
    this.runtime = runtime;
  }

  get world(): WorldState {
    return this.runtime.world;
  }

  update(
    deltaMs: number,
  ): RuntimeAdvanceResult {
    return this.runtime.advance(
      deltaMs,
    );
  }

  cancelPendingOrder(
    orderId: string,
  ): void {
    const result =
      cancelTacticalOrder(
        this.runtime.world,
        orderId,
      );

    if (
      result.status ===
      'ACCEPTED'
    ) {
      this.runtime.world =
        result.world;
    }
  }

  endTurn(): void {
    let world =
      this.runtime.world;

    for (
      const order of
      this.runtime.commands
        .drainTactical()
    ) {
      const queued =
        enqueueTacticalOrder(
          world,
          order,
        );

      world =
        queued.world;
    }

    if (
      world.match.status !==
        'active' ||
      world.turn.phase !==
        'victoria_command'
    ) {
      return;
    }

    world = {
      ...world,
      turn:
        transitionTurnPhase(
          world.turn,
          'victoria_resolve',
        ),
    };

    const victoria =
      resolveCommittedOrders(
        world,
        pendingOrdersForFaction(
          world,
          'victoria',
        ),
      );

    world =
      clearPendingOrders(
        victoria.world,
      );

    if (
      world.match.status !==
      'active'
    ) {
      this.runtime.world =
        world;
      return;
    }

    world = {
      ...world,
      turn:
        transitionTurnPhase(
          world.turn,
          'shadow_command',
        ),
    };

    const shadowOrders =
      planShadowTurn(world);

    for (
      const order of
      shadowOrders
    ) {
      const queued =
        enqueueTacticalOrder(
          world,
          order,
        );

      world =
        queued.world;
    }

    world = {
      ...world,
      turn:
        transitionTurnPhase(
          world.turn,
          'shadow_resolve',
        ),
    };

    const shadow =
      resolveCommittedOrders(
        world,
        pendingOrdersForFaction(
          world,
          'obsidian',
        ),
      );

    world =
      clearPendingOrders(
        shadow.world,
      );

    if (
      world.match.status !==
      'active'
    ) {
      this.runtime.world =
        world;
      return;
    }

    world = {
      ...world,
      turn:
        transitionTurnPhase(
          world.turn,
          'reinforcement',
        ),
    };

    this.runtime.world =
      resolveReinforcementPhase(
        world,
      );
  }
}
