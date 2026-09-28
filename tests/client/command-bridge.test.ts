import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  ClientCommandBridge,
} from '../../src/client/runtime/command-bridge';

import {
  createPhase6SkirmishWorld,
} from '../../src/client/session/skirmish';

describe('Royal Tactical client command bridge', () => {
  it('queues Move as a tactical order rather than a legacy SimCommand', () => {
    const world =
      createPhase6SkirmishWorld();

    const bridge =
      new ClientCommandBridge();

    bridge.move(
      world,
      'victoria-queen',
      { x: 4, y: 12 },
    );

    expect(
      bridge.drainTactical(),
    ).toEqual([
      {
        orderId:
          'victoria-r1-o0',
        kind: 'move',
        faction: 'victoria',
        unitId:
          'victoria-queen',
        destination:
          { x: 4, y: 12 },
        issuedRound: 1,
        commandCost: 1,
      },
    ]);

    expect(
      bridge.drainLegacy(
        world.tick + 1,
      ),
    ).toEqual([]);
  });

  it('queues Attack as a tactical order', () => {
    const world =
      createPhase6SkirmishWorld();

    const bridge =
      new ClientCommandBridge();

    bridge.attack(
      world,
      'victoria-rook-a',
      'obsidian-pawn-a',
    );

    expect(
      bridge.drainTactical(),
    ).toEqual([
      {
        orderId:
          'victoria-r1-o0',
        kind: 'attack',
        faction: 'victoria',
        unitId:
          'victoria-rook-a',
        targetUnitId:
          'obsidian-pawn-a',
        issuedRound: 1,
        commandCost: 1,
      },
    ]);
  });

  it('queues Guard as a tactical order', () => {
    const world =
      createPhase6SkirmishWorld();

    const bridge =
      new ClientCommandBridge();

    bridge.guard(
      world,
      'victoria-rook-a',
    );

    expect(
      bridge.drainTactical(),
    ).toEqual([
      {
        orderId:
          'victoria-r1-o0',
        kind: 'guard',
        faction: 'victoria',
        unitId:
          'victoria-rook-a',
        anchor:
          world.units[
            'victoria-rook-a'
          ]!.position,
        issuedRound: 1,
        commandCost: 1,
      },
    ]);
  });

  it('assigns deterministic tactical order ids', () => {
    const world =
      createPhase6SkirmishWorld();

    const bridge =
      new ClientCommandBridge();

    bridge.move(
      world,
      'victoria-queen',
      { x: 4, y: 12 },
    );

    bridge.attack(
      world,
      'victoria-rook-a',
      'obsidian-pawn-a',
    );

    bridge.guard(
      world,
      'victoria-rook-b',
    );

    expect(
      bridge
        .drainTactical()
        .map(
          order =>
            order.orderId,
        ),
    ).toEqual([
      'victoria-r1-o0',
      'victoria-r1-o1',
      'victoria-r1-o2',
    ]);
  });

  it('keeps recruit, ability, and promotion on the legacy bridge temporarily', () => {
    const bridge =
      new ClientCommandBridge();

    bridge.recruit(
      20,
      'victoria',
      'pawn',
    );

    bridge.heroAbility(
      20,
      'victoria',
      'victoria-queen',
      'royal_decree',
    );

    bridge.promote(
      20,
      'victoria',
      'victoria-pawn-a',
      'rook',
    );

    expect(
      bridge
        .drainLegacy(21)
        .map(
          command =>
            command.type,
        ),
    ).toEqual([
      'recruit',
      'hero_ability',
      'promote',
    ]);
  });

  it('drains tactical orders only once', () => {
    const world =
      createPhase6SkirmishWorld();

    const bridge =
      new ClientCommandBridge();

    bridge.move(
      world,
      'victoria-queen',
      { x: 4, y: 12 },
    );

    expect(
      bridge.drainTactical(),
    ).toHaveLength(1);

    expect(
      bridge.drainTactical(),
    ).toEqual([]);
  });
});

describe('Royal Tactical Victoria ability bridge', () => {
  it('queues Victoria hero ability as a tactical AbilityOrder', () => {
    const world =
      createPhase6SkirmishWorld();

    const bridge =
      new ClientCommandBridge();

    bridge.heroAbility(
      world,
      'victoria',
      'victoria-queen',
      'royal_decree',
    );

    expect(
      bridge.drainTactical(),
    ).toEqual([
      {
        orderId:
          'victoria-r1-o0',
        kind: 'ability',
        faction:
          'victoria',
        unitId:
          'victoria-queen',
        abilityId:
          'royal_decree',
        issuedRound: 1,
        commandCost: 1,
      },
    ]);

    expect(
      bridge.drainLegacy(
        world.tick + 1,
      ),
    ).toEqual([]);
  });
});
