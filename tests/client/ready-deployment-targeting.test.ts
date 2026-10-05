import { describe, expect, it } from 'vitest';

import readyTargetingSource from '../../src/client/input/ready-deployment-targeting.ts?raw';
import {
  legalReadyDeploymentTargets,
  stageReadyDeploymentTarget,
} from '../../src/client/input/ready-deployment-targeting';
import { ClientCommandBridge } from '../../src/client/runtime/command-bridge';
import { legalDeploymentCells } from '../../src/sim/deployment';
import type { ReadyDeployment, WorldState } from '../../src/sim/types';
import { createWorld, placeUnit } from '../../src/sim/world';

function withReady(world: WorldState, entry: ReadyDeployment): WorldState {
  return {
    ...world,
    production: {
      ...world.production,
      ready: {
        ...world.production.ready,
        [entry.faction]: [entry],
      },
    },
  };
}

const ready: ReadyDeployment = {
  id: 'victoria-recruit-1',
  faction: 'victoria',
  unitKind: 'pawn',
  cost: 10,
  capacityWeight: 1,
  queuedTick: 0,
  readyRound: 1,
};

describe('READY deployment client targeting', () => {
  it('matches canonical sim legality exactly', () => {
    let world = createWorld([], { topologyId: 'triptych-v2' });
    world = withReady(world, ready);
    world = placeUnit(world, {
      id: 'blocker',
      faction: 'victoria',
      kind: 'pawn',
      position: { x: 3, y: 16 },
    });

    expect(legalReadyDeploymentTargets(
      world,
      'victoria',
      ready.id,
    )).toEqual(
      legalDeploymentCells(world, 'victoria', ready.id),
    );
  });

  it('never invents a fallback target outside the exact 5x5 zone', () => {
    const world = withReady(
      createWorld([], { topologyId: 'triptych-v2' }),
      ready,
    );

    const targets = legalReadyDeploymentTargets(
      world,
      'victoria',
      ready.id,
    );

    expect(targets.every(cell =>
      cell.x >= 1 && cell.x <= 5 &&
      cell.y >= 14 && cell.y <= 18
    )).toBe(true);
  });

  it('refuses illegal staging without producing a command', () => {
    const world = withReady(
      createWorld([], { topologyId: 'triptych-v2' }),
      ready,
    );
    const bridge = new ClientCommandBridge();

    expect(stageReadyDeploymentTarget(
      bridge,
      world,
      'victoria',
      ready.id,
      { x: 6, y: 16 },
    )).toBe(false);

    expect(bridge.drainLegacy(world.tick + 1)).toEqual([]);
  });

  it('stages legal READY deployment as a zero-cost legacy sim command', () => {
    const world = withReady(
      createWorld([], { topologyId: 'triptych-v2' }),
      ready,
    );
    const bridge = new ClientCommandBridge();
    const royalBefore = world.turn.royalCommandsRemaining.victoria;

    expect(stageReadyDeploymentTarget(
      bridge,
      world,
      'victoria',
      ready.id,
      { x: 3, y: 16 },
    )).toBe(true);

    const staged = bridge.drainLegacy(world.tick + 1);
    expect(staged).toHaveLength(1);
    expect(staged[0]).toMatchObject({
      type: 'deploy_ready',
      faction: 'victoria',
      readyId: ready.id,
      to: { x: 3, y: 16 },
    });
    expect(world.turn.royalCommandsRemaining.victoria).toBe(royalBefore);
  });

  it('delegates legality to the canonical deployment authority', () => {
    expect(readyTargetingSource).toContain('legalDeploymentCells');
    expect(readyTargetingSource).toContain('canDeployReadyUnit');
    expect(readyTargetingSource).not.toContain('x >= 1');
    expect(readyTargetingSource).not.toContain('x <= 5');
  });
});
