import { describe, expect, it } from 'vitest';

import aiSource from '../../src/sim/ai.ts?raw';
import stepSource from '../../src/sim/step.ts?raw';

function shadowPlannerSource(): string {
  const start = aiSource.indexOf('export function planShadowTurn');
  expect(start).toBeGreaterThanOrEqual(0);
  return aiSource.slice(start);
}

describe('AI authority architecture', () => {
  it('keeps strategic AI evaluation out of fixed-tick simulation', () => {
    expect(stepSource).not.toContain('evaluateBalancedAI');
  });

  it('keeps legacy pending strategic command consumption out of stepWorld', () => {
    expect(stepSource).not.toContain('pendingCommands');
    expect(stepSource).not.toContain('dueAICommands');
  });

  it('keeps the legacy scheduler outside the canonical Shadow planner', () => {
    const planner = shadowPlannerSource();

    expect(planner).not.toContain('commandsForCommitments(');
    expect(planner).not.toContain('scheduleAICommands(');
    expect(planner).not.toContain('pendingCommands');
    expect(planner).not.toContain('nextEvaluationTick');
  });

  it('keeps the legacy six-command allowance outside the canonical Shadow planner', () => {
    const planner = shadowPlannerSource();

    expect(planner).not.toContain('commands.length<6');
    expect(planner).not.toContain('commands.length >= 6');
    expect(planner).not.toContain('slice(0,6)');
  });

  it('routes READY through canonical deployment authority rather than direct placement', () => {
    const readyStart = aiSource.indexOf(
      'export function executeShadowReadyDeployments',
    );
    const nextFunction = aiSource.indexOf(
      'function objectivePosition',
      readyStart,
    );
    expect(readyStart).toBeGreaterThanOrEqual(0);
    expect(nextFunction).toBeGreaterThan(readyStart);

    const readyAuthority = aiSource.slice(readyStart, nextFunction);

    expect(readyAuthority).toContain('selectAIReadyDeploymentCell');
    expect(readyAuthority).toContain('deployReadyUnit');
    expect(readyAuthority).not.toContain('placeUnit(');
    expect(readyAuthority).not.toContain('production.ready =');
  });

  it('routes Shadow economy through canonical queue authorities', () => {
    const economyStart = aiSource.indexOf(
      'export function executeShadowStrategicEconomy',
    );
    const nextFunction = aiSource.indexOf(
      'function nearbyAllies',
      economyStart,
    );
    expect(economyStart).toBeGreaterThanOrEqual(0);
    expect(nextFunction).toBeGreaterThan(economyStart);

    const economyAuthority = aiSource.slice(economyStart, nextFunction);

    expect(economyAuthority).toContain('queueRecruitment');
    expect(economyAuthority).toContain('queuePromotionRequest');
    expect(economyAuthority).not.toContain('crownPower:');
    expect(economyAuthority).not.toContain('promotions: { pending');
  });
});
