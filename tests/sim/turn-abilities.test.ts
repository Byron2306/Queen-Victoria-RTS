import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  enqueueTacticalOrder,
  type AbilityOrder,
} from '../../src/sim/orders';

import {
  HERO_ABILITY_CROWN_COST,
  resolveAbilityOrder,
} from '../../src/sim/turn-abilities';

import {
  createWorld,
} from '../../src/sim/world';

import type {
  HeroAbilityId,
  WorldState,
} from '../../src/sim/types';

function abilityOrder(
  ability: HeroAbilityId,
): AbilityOrder {
  return {
    orderId: `ability-${ability}`,
    kind: 'ability',
    faction: 'victoria',
    unitId: 'victoria-queen',
    abilityId: ability,
    issuedRound: 1,
    commandCost: 1,
  };
}

function abilityReadyWorld(
  ability: HeroAbilityId,
  crownPower = 3,
): WorldState {
  let world = createWorld([
    {
      id: 'victoria-queen',
      faction: 'victoria',
      kind: 'queen',
      position: { x: 4, y: 4 },
    },
    {
      id: 'victoria-pawn-a',
      faction: 'victoria',
      kind: 'pawn',
      position: { x: 4, y: 5 },
    },
    {
      id: 'victoria-pawn-b',
      faction: 'victoria',
      kind: 'pawn',
      position: { x: 4, y: 6 },
    },
  ]);

  world = {
    ...world,

    economy: {
      crownPower: {
        ...world.economy.crownPower,
        victoria: crownPower,
      },
    },

    heroes: {
      ...world.heroes,

      victoria: {
        ...world.heroes.victoria,
        heroUnitId: 'victoria-queen',
        status: 'alive',
        level: 5,
        activeAbility: null,

        abilities: {
          ...world.heroes.victoria.abilities,

          [ability]: {
            cooldownTicksRemaining: 0,
            activeTicksRemaining: 0,
          },
        },
      },
    },
  };

  return world;
}

describe('Royal Tactical turn-resolved abilities', () => {
  it('defines the provisional flat Crown migration cost', () => {
    expect(
      HERO_ABILITY_CROWN_COST,
    ).toEqual({
      royal_decree: 1,
      hold_the_crown: 1,
      sovereign_line: 1,
      imperial_gambit: 1,
    });
  });

  it.each([
    'royal_decree',
    'hold_the_crown',
    'sovereign_line',
    'imperial_gambit',
  ] as const)(
    'enqueueing %s consumes a Royal Command but does not spend Crown or activate the ability',
    ability => {
      const world =
        abilityReadyWorld(
          ability,
        );

      const result =
        enqueueTacticalOrder(
          world,
          abilityOrder(
            ability,
          ),
        );

      expect(result.status)
        .toBe('ACCEPTED');

      if (
        result.status !==
        'ACCEPTED'
      ) {
        throw new Error(
          'expected accepted order',
        );
      }

      expect(
        result.world
          .turn
          .royalCommandsRemaining
          .victoria,
      ).toBe(3);

      expect(
        result.world
          .economy
          .crownPower
          .victoria,
      ).toBe(3);

      expect(
        result.world
          .heroes
          .victoria
          .activeAbility,
      ).toBeNull();
    },
  );

  it.each([
    'royal_decree',
    'hold_the_crown',
    'sovereign_line',
    'imperial_gambit',
  ] as const)(
    'resolves %s atomically and spends Crown exactly once',
    ability => {
      const world =
        abilityReadyWorld(
          ability,
          3,
        );

      const result =
        resolveAbilityOrder(
          world,
          abilityOrder(
            ability,
          ),
        );

      expect(result.status)
        .toBe('RESOLVED');

      expect(
        result.world
          .economy
          .crownPower
          .victoria,
      ).toBe(2);

      expect(
        result.world
          .heroes
          .victoria
          .activeAbility,
      ).toBe(ability);
    },
  );

  it('refuses an ability when Crown is insufficient without altering hero state', () => {
    const world =
      abilityReadyWorld(
        'royal_decree',
        0,
      );

    const beforeHero =
      world.heroes.victoria;

    const result =
      resolveAbilityOrder(
        world,
        abilityOrder(
          'royal_decree',
        ),
      );

    expect(result.status)
      .toBe('REFUSED');

    if (
      result.status !==
      'REFUSED'
    ) {
      throw new Error(
        'expected refused ability',
      );
    }

    expect(result.reason)
      .toBe(
        'insufficient_crown',
      );

    expect(
      result.world
        .economy
        .crownPower
        .victoria,
    ).toBe(0);

    expect(
      result.world
        .heroes
        .victoria,
    ).toEqual(beforeHero);
  });

  it('does not spend Crown when existing ability legality rejects activation', () => {
    let world =
      abilityReadyWorld(
        'royal_decree',
        3,
      );

    world = {
      ...world,

      heroes: {
        ...world.heroes,

        victoria: {
          ...world.heroes
            .victoria,

          activeAbility:
            'hold_the_crown',
        },
      },
    };

    const result =
      resolveAbilityOrder(
        world,
        abilityOrder(
          'royal_decree',
        ),
      );

    expect(result.status)
      .toBe('REFUSED');

    expect(
      result.world
        .economy
        .crownPower
        .victoria,
    ).toBe(3);
  });
});

describe('round-based hero ability lifecycle', () => {
  it('advances active duration and cooldown only when hero round state advances', async () => {
    const {
      advanceHeroRoundState,
    } = await import(
      '../../src/sim/turn-abilities'
    );

    let world =
      abilityReadyWorld(
        'royal_decree',
        3,
      );

    const activated =
      resolveAbilityOrder(
        world,
        abilityOrder(
          'royal_decree',
        ),
      );

    if (
      activated.status !==
      'RESOLVED'
    ) {
      throw new Error(
        'expected resolved ability',
      );
    }

    world =
      activated.world;

    const before =
      world.heroes
        .victoria
        .abilities
        .royal_decree;

    const next =
      advanceHeroRoundState(
        world,
      );

    expect(
      next.heroes
        .victoria
        .abilities
        .royal_decree
        .cooldownTicksRemaining,
    ).toBe(
      before
        .cooldownTicksRemaining -
        1,
    );

    expect(
      next.heroes
        .victoria
        .abilities
        .royal_decree
        .activeTicksRemaining,
    ).toBe(
      before
        .activeTicksRemaining -
        1,
    );
  });

  it('does not advance hero ability lifecycle merely because fixed simulation ticks pass', async () => {
    const {
      stepWorld,
    } = await import(
      '../../src/sim/step'
    );

    let world =
      abilityReadyWorld(
        'royal_decree',
        3,
      );

    const activated =
      resolveAbilityOrder(
        world,
        abilityOrder(
          'royal_decree',
        ),
      );

    if (
      activated.status !==
      'RESOLVED'
    ) {
      throw new Error(
        'expected resolved ability',
      );
    }

    world =
      activated.world;

    const before =
      world.heroes
        .victoria
        .abilities
        .royal_decree;

    const stepped =
      stepWorld(
        world,
        [],
      ).state;

    expect(
      stepped.heroes
        .victoria
        .abilities
        .royal_decree,
    ).toEqual(before);
  });
});
