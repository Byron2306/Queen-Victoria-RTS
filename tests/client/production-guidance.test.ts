import { describe, expect, it } from 'vitest';
import { createRoyalBattlefieldGuidance } from '../../src/client/phaser/royal-battlefield-guidance';

describe('Royal deployment guidance', () => {
  it('surfaces a queued purchase with cost and remaining Crown', () => {
    const guidance = createRoyalBattlefieldGuidance({
      selectedUnitId: null,
      stagedOrders: 0,
      royalCommandsRemaining: 4,
      phase: 'victoria_command',
      productionFeedback: {
        accepted: true,
        reason: null,
        unitKind: 'knight',
        cost: 24,
        remainingCurrency: 17,
        queued: true,
        placed: false,
        queueEntryId: 'victoria-recruit-3',
      },
    });

    expect(guidance.instruction).toContain('KNIGHT QUEUED');
    expect(guidance.detail).toContain('24');
    expect(guidance.detail).toContain('17');
  });

  it.each([
    ['insufficient_crown', 'NEED MORE CROWN'],
    ['locked', 'UNIT LOCKED'],
    ['capacity_exceeded', 'COMMAND CAPACITY FULL'],
    ['piece_cap_reached', 'PIECE CAP REACHED'],
    ['invalid_deployment_territory', 'DEPLOYMENT TERRITORY INVALID'],
    ['blocked_spawn', 'DEPLOYMENT BLOCKED'],
  ] as const)('maps %s to explicit player guidance', (reason, text) => {
    const guidance = createRoyalBattlefieldGuidance({
      selectedUnitId: null,
      stagedOrders: 0,
      royalCommandsRemaining: 4,
      phase: 'victoria_command',
      productionFeedback: {
        accepted: false,
        reason,
        unitKind: 'rook',
        cost: 38,
        remainingCurrency: 12,
        queued: false,
        placed: false,
      },
    });

    expect(guidance.instruction).toBe(text);
  });
});
