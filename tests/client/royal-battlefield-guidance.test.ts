import { describe, expect, it } from 'vitest';
import {
  createRoyalBattlefieldGuidance,
} from '../../src/client/phaser/royal-battlefield-guidance';

describe('Royal battlefield guidance', () => {
  it('teaches the mobile move gesture before any unit is selected', () => {
    expect(
      createRoyalBattlefieldGuidance({
        selectedUnitId: null,
        stagedOrders: 0,
        royalCommandsRemaining: 4,
        phase: 'victoria_command',
      }),
    ).toEqual({
      headline: 'YOUR TURN',
      instruction: 'TAP A UNIT',
      detail: 'Choose a Victoria unit to reveal its legal moves.',
    });
  });

  it('explains the second tap once a unit is selected', () => {
    expect(
      createRoyalBattlefieldGuidance({
        selectedUnitId: 'victoria-queen',
        stagedOrders: 0,
        royalCommandsRemaining: 4,
        phase: 'victoria_command',
      }).instruction,
    ).toBe('TAP A GLOWING TILE');
  });

  it('moves the player toward commit after an order is staged', () => {
    expect(
      createRoyalBattlefieldGuidance({
        selectedUnitId: 'victoria-queen',
        stagedOrders: 1,
        royalCommandsRemaining: 3,
        phase: 'victoria_command',
      }).instruction,
    ).toBe('ORDER QUEUED · COMMIT WHEN READY');
  });
});
