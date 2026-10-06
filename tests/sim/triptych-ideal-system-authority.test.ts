import { describe, expect, it } from 'vitest';

import battlefieldSource from '../../src/client/phaser/battlefield-scene.ts?raw';
import runtimeSource from '../../src/client/runtime/fixed-tick-runtime.ts?raw';
import aiSource from '../../src/sim/ai.ts?raw';
import deploymentSource from '../../src/sim/deployment.ts?raw';
import territorySource from '../../src/sim/territory.ts?raw';

function functionSlice(
  source: string,
  startNeedle: string,
  endNeedle?: string,
): string {
  const start = source.indexOf(startNeedle);
  expect(start).toBeGreaterThanOrEqual(0);

  if (!endNeedle) {
    return source.slice(start);
  }

  const end = source.indexOf(
    endNeedle,
    start + startNeedle.length,
  );

  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('Triptych ideal-system authority tripwires', () => {
  it('keeps strategic phase authority out of fixed presentation time', () => {
    const advance =
      functionSlice(
        runtimeSource,
        '  advance(elapsedMs: number)',
      );

    for (const forbidden of [
      'stepWorld',
      'planShadowTurn',
      'executeShadowReadyDeployments',
      'executeShadowStrategicEconomy',
      'resolveCommittedOrders',
      'resolveReinforcementPhase',
      'transitionTurnPhase',
      'queueRecruitment',
      'deployReadyUnit',
    ]) {
      expect(advance).not.toContain(
        forbidden,
      );
    }
  });

  it('keeps the live battlefield on explicit strategic authorities rather than stepWorld', () => {
    expect(
      battlefieldSource,
    ).not.toContain('stepWorld(');

    expect(
      battlefieldSource,
    ).toContain(
      'executeShadowReadyDeployments(',
    );
    expect(
      battlefieldSource,
    ).toContain(
      'executeShadowStrategicEconomy(',
    );
    expect(
      battlefieldSource,
    ).toContain(
      'planShadowTurn(',
    );
    expect(
      battlefieldSource,
    ).toContain(
      'resolveCommittedOrders(',
    );
    expect(
      battlefieldSource,
    ).toContain(
      'resolveReinforcementPhase(',
    );
  });

  it('keeps the legacy Shadow scheduler quarantined from the canonical planner', () => {
    const planner =
      functionSlice(
        aiSource,
        'export function planShadowTurn',
      );

    expect(planner).not.toContain(
      'scheduleAICommands(',
    );
    expect(planner).not.toContain(
      'commandsForCommitments(',
    );
    expect(planner).not.toContain(
      'pendingCommands',
    );
  });

  it('keeps ordinary READY deployment on exact canonical cells without fallback spawning', () => {
    const deploy =
      functionSlice(
        deploymentSource,
        'export function deployReadyUnit',
      );

    expect(deploy).toContain(
      'canDeployReadyUnit(',
    );
    expect(deploy).toContain(
      'placeUnit(',
    );

    expect(deploy).not.toContain(
      'findReinforcementSpawn',
    );
    expect(deploy).not.toContain(
      'nearest',
    );
    expect(deploy).not.toContain(
      'fallback',
    );
  });

  it('keeps client gameplay code from directly rewriting READY state', () => {
    expect(
      battlefieldSource,
    ).not.toContain(
      'production.ready =',
    );
    expect(
      battlefieldSource,
    ).not.toMatch(
      /ready:\s*\{/,
    );
  });

  it('keeps territory ownership mutation inside territory authority rather than client or AI paths', () => {
    expect(
      battlefieldSource,
    ).not.toContain(
      'factionControl:',
    );
    expect(
      aiSource,
    ).not.toContain(
      'factionControl:',
    );

    expect(
      territorySource,
    ).toContain(
      'factionControl',
    );
  });

  it('keeps presentation time out of strategic battlefield decisions', () => {
    for (const forbidden of [
      'presentationClock',
      'elapsedPresentation',
      'performance.now',
      'Date.now',
    ]) {
      expect(
        battlefieldSource,
      ).not.toContain(forbidden);
    }
  });
});
