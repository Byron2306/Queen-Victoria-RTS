import { describe, expect, it } from 'vitest';

import productionSource from '../../src/sim/production.ts?raw';
import fixedTickSource from '../../src/client/runtime/fixed-tick-runtime.ts?raw';
import readyTargetingSource from '../../src/client/input/ready-deployment-targeting.ts?raw';
import deploymentSource from '../../src/sim/deployment.ts?raw';
import aiSource from '../../src/sim/ai.ts?raw';

describe('READY deployment architecture authority', () => {
  it('removes ordinary recruitment spawn-search authority', () => {
    expect(productionSource).not.toContain('findReinforcementSpawn');
    expect(productionSource).not.toContain("from './spawn'");
  });

  it('keeps client targeting as a canonical legality adapter only', () => {
    expect(readyTargetingSource).toContain('legalDeploymentCells');
    expect(readyTargetingSource).toContain('canDeployReadyUnit');
    expect(readyTargetingSource).not.toContain('production.ready =');
    expect(readyTargetingSource).not.toContain('placeUnit(');
  });

  it('keeps fixed ticks outside READY maturation and deployment mutation', () => {
    expect(fixedTickSource).not.toContain('matureQueuedReinforcements');
    expect(fixedTickSource).not.toContain('deployReadyUnit');
    expect(fixedTickSource).not.toContain('production.ready');
  });

  it('keeps deployment authority outside territorial ownership mutation', () => {
    expect(deploymentSource).not.toContain('factionControl =');
    expect(deploymentSource).not.toContain('factionControl:');
  });

  it('keeps human and AI deployment wired to canonical sim legality', () => {
    expect(readyTargetingSource).toContain('legalDeploymentCells');
    expect(aiSource).toContain('legalDeploymentCells');
    expect(aiSource).not.toContain('x >= 26');
    expect(aiSource).not.toContain('x <= 30');
  });
});
