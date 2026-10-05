import { describe, expect, it } from 'vitest';

import {
  createWorld,
  deployReinforcements,
  findReinforcementSpawn,
} from '../../src/sim';
import type {
  ProductionQueueEntry,
  WorldState,
} from '../../src/sim';

const entry = (
  id = 'victoria-recruit-1',
  kind: 'pawn' | 'knight' | 'bishop' | 'rook' = 'pawn',
): ProductionQueueEntry => ({
  id,
  faction: 'victoria',
  unitKind: kind,
  cost: 10,
  capacityWeight: kind === 'pawn' ? 1 : kind === 'rook' ? 3 : 2,
  queuedTick: 0,
});

function queued(
  world: WorldState,
  entries: readonly ProductionQueueEntry[],
): WorldState {
  return {
    ...world,
    production: {
      ...world.production,
      queues: {
        ...world.production.queues,
        victoria: entries,
      },
    },
  };
}

describe('reinforcement maturation', () => {
  it('matures the queue head to READY without board placement', () => {
    const world = queued(createWorld(), [entry()]);
    const result = deployReinforcements({ ...world, tick: 48 });

    expect(result.events[0]).toMatchObject({
      type: 'reinforcement.ready',
      queueEntryId: 'victoria-recruit-1',
    });
    expect(result.state.production.queues.victoria).toEqual([]);
    expect(result.state.production.ready.victoria.map(candidate => candidate.id))
      .toEqual(['victoria-recruit-1']);
    expect(result.state.units['unit:victoria-recruit-1']).toBeUndefined();
    expect(result.state.combat['unit:victoria-recruit-1']).toBeUndefined();
  });

  it('matures only one queue head and prevents leapfrog by construction', () => {
    const world = queued(createWorld(), [
      entry(),
      entry('victoria-recruit-2'),
    ]);
    const result = deployReinforcements(world);

    expect(result.state.production.ready.victoria.map(candidate => candidate.id))
      .toEqual(['victoria-recruit-1']);
    expect(result.state.production.queues.victoria.map(candidate => candidate.id))
      .toEqual(['victoria-recruit-2']);
  });

  it('keeps a purchased relocked head and matures it without refund', () => {
    let world = queued(
      createWorld(),
      [entry('victoria-recruit-1', 'knight')],
    );
    world = {
      ...world,
      tick: 49,
      economy: {
        crownPower: {
          victoria: 9,
          obsidian: 0,
        },
      },
    };

    const result = deployReinforcements(world);

    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'reinforcement.ready',
      queueEntryId: 'victoria-recruit-1',
    }));
    expect(result.state.production.queues.victoria).toEqual([]);
    expect(result.state.production.ready.victoria).toHaveLength(1);
    expect(result.state.economy.crownPower.victoria).toBe(9);
  });

  it('matures an already-purchased over-capacity head without deleting or refunding', () => {
    const units = Array.from({ length: 6 }, (_, i) => ({
      id: `p${i}`,
      faction: 'victoria' as const,
      kind: 'pawn' as const,
      position: { x: i, y: 8 },
    }));
    let world = queued(createWorld(units), [entry()]);
    world = {
      ...world,
      tick: 49,
      economy: {
        crownPower: {
          victoria: 7,
          obsidian: 0,
        },
      },
    };

    const result = deployReinforcements(world);

    expect(result.state.production.queues.victoria).toEqual([]);
    expect(result.state.production.ready.victoria).toHaveLength(1);
    expect(result.state.units).toEqual(world.units);
    expect(result.state.economy.crownPower.victoria).toBe(7);
  });

  it('ignores legacy reinforcement-anchor validity during queue-to-READY maturation', () => {
    let world = queued(
      createWorld([], { topologyId: 'triptych-v2' }),
      [entry()],
    );
    world = {
      ...world,
      production: {
        ...world.production,
        reinforcementAnchors: {
          ...world.production.reinforcementAnchors,
          victoria: { x: 11, y: 10 },
        },
      },
    };

    const result = deployReinforcements(world);

    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'reinforcement.ready',
    }));
    expect(result.state.production.ready.victoria).toHaveLength(1);
  });
});

describe('legacy reinforcement spawn compatibility helper', () => {
  it('still searches deterministically without being used by ordinary recruitment', () => {
    let world = createWorld([
      {
        id: 'block',
        faction: 'victoria',
        kind: 'king',
        position: { x: 2, y: 12 },
      },
    ]);

    expect(findReinforcementSpawn(world, 'victoria'))
      .toEqual({ x: 1, y: 11 });

    const occupancy = { ...world.occupancy };
    for (let y = 0; y < 24; y += 1) {
      for (let x = 0; x < 24; x += 1) {
        occupancy[`${x},${y}`] = 'x';
      }
    }

    expect(findReinforcementSpawn({ ...world, occupancy }, 'victoria'))
      .toBeNull();
  });

  it('uses the selected V2 topology for compatibility spawn search', () => {
    const world = createWorld([], { topologyId: 'triptych-v2' });
    expect(findReinforcementSpawn(world, 'victoria'))
      .toEqual({ x: 1, y: 16 });
  });
});
