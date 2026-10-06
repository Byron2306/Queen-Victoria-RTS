import { describe, expect, it } from 'vitest';

import {
  createWorld,
  executeShadowReadyDeployments,
} from '../../src/sim';
import type {
  ReadyDeployment,
  UnitState,
  WorldState,
} from '../../src/sim';

function entry(id: string): ReadyDeployment {
  return {
    id,
    faction: 'obsidian',
    unitKind: 'pawn',
    cost: 10,
    capacityWeight: 1,
    queuedTick: 0,
    readyRound: 1,
  };
}

function withReady(
  ids: readonly string[] = ['obsidian-recruit-1'],
): WorldState {
  const world = createWorld([], {
    topologyId: 'triptych-v2',
    aiFactions: ['obsidian'],
  });

  return {
    ...world,
    turn: {
      ...world.turn,
      phase: 'shadow_command',
      royalCommandsRemaining: {
        ...world.turn.royalCommandsRemaining,
        obsidian: 2,
      },
    },
    production: {
      ...world.production,
      ready: {
        ...world.production.ready,
        obsidian: ids.map(entry),
      },
    },
  };
}

function zoneBlockers(
  except?: Readonly<{ x: number; y: number }>,
): readonly UnitState[] {
  const units: UnitState[] = [];
  let ordinal = 1;

  for (let y = 13; y <= 17; y += 1) {
    for (let x = 26; x <= 30; x += 1) {
      if (except && x === except.x && y === except.y) continue;
      units.push({
        id: `blocker-${ordinal}`,
        faction: 'victoria',
        kind: 'pawn',
        position: { x, y },
      });
      ordinal += 1;
    }
  }

  return units;
}

describe('Shadow READY deployment authority', () => {
  it('deploys READY only during shadow_command and spends zero Royal Commands', () => {
    const world = withReady();
    const beforeCommands = world.turn.royalCommandsRemaining.obsidian;

    const result = executeShadowReadyDeployments(world);

    expect(result.state.production.ready.obsidian).toEqual([]);
    expect(result.state.units['unit:obsidian-recruit-1']).toBeDefined();
    expect(result.state.turn.royalCommandsRemaining.obsidian).toBe(beforeCommands);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      type: 'reinforcement.deployed',
      faction: 'obsidian',
      queueEntryId: 'obsidian-recruit-1',
    });
  });

  it('is inert outside shadow_command', () => {
    const world = withReady();
    const wrongPhase: WorldState = {
      ...world,
      turn: {
        ...world.turn,
        phase: 'victoria_command',
      },
    };

    const result = executeShadowReadyDeployments(wrongPhase);

    expect(result.state).toEqual(wrongPhase);
    expect(result.events).toEqual([]);
  });

  it('leaves READY untouched when all 25 canonical cells are blocked', () => {
    let world = createWorld(zoneBlockers(), {
      topologyId: 'triptych-v2',
      aiFactions: ['obsidian'],
    });
    world = {
      ...world,
      turn: {
        ...world.turn,
        phase: 'shadow_command',
      },
      production: {
        ...world.production,
        ready: {
          ...world.production.ready,
          obsidian: [entry('obsidian-recruit-1')],
        },
      },
    };

    const result = executeShadowReadyDeployments(world);

    expect(result.state.production.ready.obsidian).toEqual(
      world.production.ready.obsidian,
    );
    expect(result.state.units['unit:obsidian-recruit-1']).toBeUndefined();
    expect(result.events).toEqual([]);
  });

  it('uses the one legal canonical cell when a blocked zone frees it', () => {
    const free = { x: 26, y: 13 } as const;
    let world = createWorld(zoneBlockers(free), {
      topologyId: 'triptych-v2',
      aiFactions: ['obsidian'],
    });
    world = {
      ...world,
      turn: {
        ...world.turn,
        phase: 'shadow_command',
      },
      production: {
        ...world.production,
        ready: {
          ...world.production.ready,
          obsidian: [entry('obsidian-recruit-1')],
        },
      },
    };

    const result = executeShadowReadyDeployments(world);

    expect(
      result.state.units['unit:obsidian-recruit-1']?.position,
    ).toEqual(free);
    expect(result.state.production.ready.obsidian).toEqual([]);
  });

  it('deploys multiple READY entries deterministically without fallback', () => {
    const a = executeShadowReadyDeployments(
      withReady(['obsidian-recruit-2', 'obsidian-recruit-1']),
    );
    const b = executeShadowReadyDeployments(
      withReady(['obsidian-recruit-2', 'obsidian-recruit-1']),
    );

    expect(a).toEqual(b);
    expect(a.state.production.ready.obsidian).toEqual([]);
    expect(a.state.units['unit:obsidian-recruit-1']).toBeDefined();
    expect(a.state.units['unit:obsidian-recruit-2']).toBeDefined();
    expect(
      a.state.units['unit:obsidian-recruit-1']?.position,
    ).not.toEqual(
      a.state.units['unit:obsidian-recruit-2']?.position,
    );
  });
});
