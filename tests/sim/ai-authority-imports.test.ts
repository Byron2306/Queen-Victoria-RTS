import { describe, expect, it } from 'vitest';

import stepSource from '../../src/sim/step.ts?raw';

describe('AI authority architecture', () => {
  it('keeps strategic AI evaluation out of fixed-tick simulation', () => {
    expect(stepSource).not.toContain('evaluateBalancedAI');
  });

  it('keeps legacy pending strategic command consumption out of stepWorld', () => {
    expect(stepSource).not.toContain('pendingCommands');
    expect(stepSource).not.toContain('dueAICommands');
  });
});
