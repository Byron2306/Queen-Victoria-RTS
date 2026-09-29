import { describe, expect, it } from 'vitest';
import { createRoyalBattlefieldGuidance } from '../../src/client/phaser/royal-battlefield-guidance';

describe('Royal battlefield guidance', () => {
  it('teaches attack interaction when a selected unit has legal targets', () => {
    const guidance = createRoyalBattlefieldGuidance({
      selectedUnitId: 'victoria-rook-a',
      stagedOrders: 0,
      royalCommandsRemaining: 4,
      phase: 'victoria_command',
      attackableTargets: 2,
    });

    expect(guidance.instruction).toBe('MOVE OR ATTACK');
    expect(guidance.detail).toContain('highlighted Shadow unit');
  });

  it('teaches premium movement tiles when no attack is available', () => {
    const guidance = createRoyalBattlefieldGuidance({
      selectedUnitId: 'victoria-pawn-a',
      stagedOrders: 0,
      royalCommandsRemaining: 4,
      phase: 'victoria_command',
      attackableTargets: 0,
    });

    expect(guidance.instruction).toBe('TAP A CRIMSON TILE');
  });
});
