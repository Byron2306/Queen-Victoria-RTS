import { describe, expect, it } from 'vitest';

import {
  canonicalSnapshot,
  deployReadyUnit,
  resolveReinforcementPhase,
} from '../../src/sim';
import { tileId } from '../../src/sim/board-topology';
import {
  strategicTiles,
  type TriptychTerritoryState,
} from '../../src/sim/territory';
import type { ReadyDeployment, ReplayResult, WorldState } from '../../src/sim/types';
import { createWorld } from '../../src/sim/world';

const ready: ReadyDeployment = {
  id: 'victoria-recruit-1',
  faction: 'victoria',
  unitKind: 'pawn',
  cost: 10,
  capacityWeight: 1,
  queuedTick: 0,
  readyRound: 1,
};

function withReady(world: WorldState): WorldState {
  return {
    ...world,
    production: {
      ...world.production,
      ready: {
        ...world.production.ready,
        victoria: [ready],
      },
    },
  };
}

function snapshot(world: WorldState): string {
  const replay: ReplayResult = {
    state: world,
    eventsByTick: [],
  };
  return canonicalSnapshot(replay);
}

describe('READY replay and supply timing', () => {
  it('serializes READY state canonically', () => {
    const world = withReady(
      createWorld([], { topologyId: 'triptych-v2' }),
    );

    const encoded = snapshot(world);

    expect(encoded).toContain('"ready"');
    expect(encoded).toContain('"victoria-recruit-1"');
    expect(encoded).toBe(snapshot(world));
  });

  it('does not create supply exposure at command-phase deployment', () => {
    let world = withReady(
      createWorld([], { topologyId: 'triptych-v2' }),
    );

    const cell = { x: 5, y: 18 } as const;
    const tiles = { ...strategicTiles(world) };
    const id = tileId(cell);
    tiles[id] = {
      ...tiles[id]!,
      factionControl: null,
    };
    world = {
      ...world,
      territory: {
        ...world.territory,
        tiles,
      } as TriptychTerritoryState,
    };

    const deployed = deployReadyUnit(
      world,
      'victoria',
      ready.id,
      cell,
    ).state;

    expect(deployed.units['unit:victoria-recruit-1']).toBeDefined();
    expect(
      deployed.supply.exposureRoundsByUnit['unit:victoria-recruit-1'],
    ).toBeUndefined();
  });

  it('first evaluates a newly deployed unit at the next reinforcement boundary', () => {
    let world = withReady(
      createWorld([], { topologyId: 'triptych-v2' }),
    );

    const cell = { x: 5, y: 18 } as const;
    const tiles = { ...strategicTiles(world) };
    const id = tileId(cell);
    tiles[id] = {
      ...tiles[id]!,
      factionControl: null,
    };
    world = {
      ...world,
      territory: {
        ...world.territory,
        tiles,
      } as TriptychTerritoryState,
    };

    world = deployReadyUnit(
      world,
      'victoria',
      ready.id,
      cell,
    ).state;

    expect(
      world.supply.exposureRoundsByUnit['unit:victoria-recruit-1'],
    ).toBeUndefined();

    world = {
      ...world,
      turn: {
        ...world.turn,
        phase: 'reinforcement',
      },
    };
    world = resolveReinforcementPhase(world);

    expect(
      world.supply.exposureRoundsByUnit['unit:victoria-recruit-1'],
    ).toBe(1);
  });

  it('produces byte-identical snapshots for identical READY/deployment histories', () => {
    const build = (): WorldState => {
      let world = withReady(
        createWorld([], { topologyId: 'triptych-v2' }),
      );
      return deployReadyUnit(
        world,
        'victoria',
        ready.id,
        { x: 3, y: 16 },
      ).state;
    };

    expect(snapshot(build())).toBe(snapshot(build()));
  });
});
