import { describe, expect, it } from 'vitest';

import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import { getBattlefieldTopology } from '../../src/sim/battlefield-topology-authority';
import { tileId } from '../../src/sim/board-topology';
import { queueRecruitment } from '../../src/sim/production';
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
});
