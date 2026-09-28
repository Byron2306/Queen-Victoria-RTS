import {
  activateHeroAbility,
  advanceHeroAbilityLifecycle,
} from './abilities';

import type {
  AbilityOrder,
} from './orders';

import type {
  HeroAbilityId,
  SimEvent,
  WorldState,
} from './types';

export const HERO_ABILITY_CROWN_COST:
  Readonly<Record<
    HeroAbilityId,
    number
  >> = {
    royal_decree: 1,
    hold_the_crown: 1,
    sovereign_line: 1,
    imperial_gambit: 1,
  };

export type AbilityResolutionResult =
  | Readonly<{
      status: 'RESOLVED';
      world: WorldState;
      events:
        readonly SimEvent[];
    }>
  | Readonly<{
      status: 'REFUSED';
      world: WorldState;
      events:
        readonly SimEvent[];
      reason: string;
    }>;

export function resolveAbilityOrder(
  world: WorldState,
  order: AbilityOrder,
): AbilityResolutionResult {
  const cost =
    HERO_ABILITY_CROWN_COST[
      order.abilityId
    ];

  const available =
    world.economy
      .crownPower[
        order.faction
      ];

  if (available < cost) {
    return {
      status: 'REFUSED',
      world,
      events: [],
      reason:
        'insufficient_crown',
    };
  }

  const activation =
    activateHeroAbility(
      world,
      {
        type: 'hero_ability',
        sequence: 0,
        issuedTick:
          world.tick,
        faction:
          order.faction,
        heroId:
          order.unitId,
        ability:
          order.abilityId,
      },
    );

  const rejection =
    activation.events.find(
      event =>
        event.type ===
        'hero.ability.rejected',
    );

  if (rejection) {
    return {
      status: 'REFUSED',
      world,
      events:
        activation.events,
      reason:
        rejection.reason,
    };
  }

  const activated =
    activation.events.some(
      event =>
        event.type ===
        'hero.ability.activated',
    );

  if (!activated) {
    return {
      status: 'REFUSED',
      world,
      events:
        activation.events,
      reason:
        'activation_failed',
    };
  }

  return {
    status: 'RESOLVED',

    world: {
      ...activation.state,

      economy: {
        crownPower: {
          ...activation.state
            .economy
            .crownPower,

          [order.faction]:
            available -
            cost,
        },
      },
    },

    events:
      activation.events,
  };
}


export function advanceHeroRoundState(
  world: WorldState,
): WorldState {
  return advanceHeroAbilityLifecycle(
    world,
  ).state;
}
