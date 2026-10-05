import { describe, expect, it } from 'vitest';

import * as sim from '../../src/sim';
import {
  capacityUsage,
  pieceCountWithQueue,
} from '../../src/sim/economy';
import { queueRecruitment } from '../../src/sim/production';
import type { Faction, WorldState } from '../../src/sim/types';
import { createWorld } from '../../src/sim/world';

function withCrown(world: WorldState, faction: Faction, amount: number): WorldState {
  return {
    ...world,
    economy: {
      crownPower: {
        ...world.economy.crownPower,
        [faction]: amount,
      },
    },
  };
}

function ownNodes(
  world: WorldState,
  faction: Faction,
  ids: readonly string[],
): WorldState {
  const nodes = { ...world.territory.nodes };
  for (const id of ids) {
    nodes[id] = {
      ...nodes[id]!,
      owner: faction,
    };
  }
  return {
    ...world,
    territory: {
      ...world.territory,
      nodes,
    },
  };
}

function matureQueuedReinforcements(world: WorldState): {
  state: WorldState;
  events: readonly unknown[];
} {
  const fn = (sim as typeof sim & {
    matureQueuedReinforcements?: (
      candidate: WorldState,
    ) => {
      state: WorldState;
      events: readonly unknown[];
    };
  }).matureQueuedReinforcements;

  expect(fn).toBeTypeOf('function');
  return fn!(world);
}

function queuePawn(
  world: WorldState,
  faction: Faction,
  sequence: number,
): WorldState {
  const result = queueRecruitment(world, {
    type: 'recruit',
    sequence,
    issuedTick: world.tick,
    faction,
    unitKind: 'pawn',
  });
  expect(result.receipt.accepted).toBe(true);
  return result.state;
}

describe('READY reinforcement maturation', () => {
  it('moves one queue head to READY without creating board-side state', () => {
    let world = withCrown(
      createWorld([], { topologyId: 'triptych-v2' }),
      'victoria',
      20,
    );
    world = queuePawn(world, 'victoria', 1);

    const beforeUnits = world.units;
    const beforeOccupancy = world.occupancy;
    const beforeCombat = world.combat;
    const beforeMilitary = world.military;
    const beforeSupply = world.supply;

    const result = matureQueuedReinforcements(world);
    const next = result.state;

    expect(next.production.queues.victoria).toEqual([]);
    expect(next.production.ready.victoria).toEqual([
      expect.objectContaining({
        id: 'victoria-recruit-1',
        faction: 'victoria',
        unitKind: 'pawn',
        cost: 10,
        capacityWeight: 1,
        queuedTick: 0,
        readyRound: 1,
      }),
    ]);
    expect(next.units).toEqual(beforeUnits);
    expect(next.occupancy).toEqual(beforeOccupancy);
    expect(next.combat).toEqual(beforeCombat);
    expect(next.military).toEqual(beforeMilitary);
    expect(next.supply).toEqual(beforeSupply);
    expect(next.units['unit:victoria-recruit-1']).toBeUndefined();
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'reinforcement.ready',
      faction: 'victoria',
      queueEntryId: 'victoria-recruit-1',
      unitKind: 'pawn',
    }));
  });

  it('matures at most one queue entry per faction per boundary', () => {
    let world = createWorld([], { topologyId: 'triptych-v2' });
    world = withCrown(world, 'victoria', 40);
    world = withCrown(world, 'obsidian', 40);

    world = queuePawn(world, 'victoria', 1);
    world = queuePawn(world, 'victoria', 2);
    world = queuePawn(world, 'obsidian', 3);
    world = queuePawn(world, 'obsidian', 4);

    const next = matureQueuedReinforcements(world).state;

    expect(next.production.ready.victoria.map(entry => entry.id))
      .toEqual(['victoria-recruit-1']);
    expect(next.production.ready.obsidian.map(entry => entry.id))
      .toEqual(['obsidian-recruit-1']);
    expect(next.production.queues.victoria.map(entry => entry.id))
      .toEqual(['victoria-recruit-2']);
    expect(next.production.queues.obsidian.map(entry => entry.id))
      .toEqual(['obsidian-recruit-2']);
  });

  it('accumulates READY entries in deterministic order across later boundaries', () => {
    let world = withCrown(
      createWorld([], { topologyId: 'triptych-v2' }),
      'victoria',
      40,
    );
    world = queuePawn(world, 'victoria', 1);
    world = queuePawn(world, 'victoria', 2);

    world = matureQueuedReinforcements(world).state;
    world = {
      ...world,
      turn: {
        ...world.turn,
        round: 2,
      },
    };
    world = matureQueuedReinforcements(world).state;

    expect(world.production.ready.victoria.map(entry => ({
      id: entry.id,
      readyRound: entry.readyRound,
    }))).toEqual([
      { id: 'victoria-recruit-1', readyRound: 1 },
      { id: 'victoria-recruit-2', readyRound: 2 },
    ]);
    expect(world.production.queues.victoria).toEqual([]);
  });

  it('preserves an existing READY entry unchanged when no queue entry matures', () => {
    let world = withCrown(
      createWorld([], { topologyId: 'triptych-v2' }),
      'victoria',
      20,
    );
    world = queuePawn(world, 'victoria', 1);
    world = matureQueuedReinforcements(world).state;

    const readyBefore = world.production.ready.victoria;
    const next = matureQueuedReinforcements(world).state;

    expect(next.production.ready.victoria).toEqual(readyBefore);
  });

  it('keeps capacity and piece-cap accounting invariant when QUEUED becomes READY', () => {
    let world = withCrown(
      createWorld([], { topologyId: 'triptych-v2' }),
      'victoria',
      20,
    );
    world = queuePawn(world, 'victoria', 1);

    const capacityBefore = capacityUsage(world, 'victoria');
    const pawnsBefore = pieceCountWithQueue(world, 'victoria', 'pawn');

    const next = matureQueuedReinforcements(world).state;

    expect(capacityUsage(next, 'victoria')).toBe(capacityBefore);
    expect(pieceCountWithQueue(next, 'victoria', 'pawn')).toBe(pawnsBefore);
  });

  it('does not revoke a purchased queue entry when unlocks later relock', () => {
    const unlockNodes = ['minor-nw', 'minor-ne', 'minor-w', 'minor-e'];
    let world = createWorld([], { topologyId: 'triptych-v2' });
    world = ownNodes(world, 'victoria', unlockNodes);
    world = withCrown(world, 'victoria', 100);

    const queued = queueRecruitment(world, {
      type: 'recruit',
      sequence: 1,
      issuedTick: 0,
      faction: 'victoria',
      unitKind: 'rook',
    });
    expect(queued.receipt.accepted).toBe(true);

    world = queued.state;
    const nodes = Object.fromEntries(
      Object.entries(world.territory.nodes).map(([id, node]) => [
        id,
        { ...node, owner: null },
      ]),
    );
    world = {
      ...world,
      territory: {
        ...world.territory,
        nodes,
      },
    };

    const next = matureQueuedReinforcements(world).state;

    expect(next.production.queues.victoria).toEqual([]);
    expect(next.production.ready.victoria).toContainEqual(
      expect.objectContaining({
        id: 'victoria-recruit-1',
        unitKind: 'rook',
      }),
    );
  });
});
