import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  ROYAL_COMMANDS_PER_ROUND,
  canTransitionTurnPhase,
  createInitialTurnState,
  transitionTurnPhase,
} from '../../src/sim/turns';

describe('Royal Tactical turn state', () => {
  it('starts round one in Victoria command with four commands per side', () => {
    expect(ROYAL_COMMANDS_PER_ROUND)
      .toBe(4);

    expect(
      createInitialTurnState(),
    ).toEqual({
      round: 1,
      phase: 'victoria_command',
      royalCommandsRemaining: {
        victoria: 4,
        obsidian: 4,
      },
      pendingOrderIds: [],
    });
  });

  it('allows only the canonical phase sequence', () => {
    expect(
      canTransitionTurnPhase(
        'victoria_command',
        'victoria_resolve',
      ),
    ).toBe(true);

    expect(
      canTransitionTurnPhase(
        'victoria_command',
        'shadow_resolve',
      ),
    ).toBe(false);

    expect(
      canTransitionTurnPhase(
        'victoria_resolve',
        'shadow_command',
      ),
    ).toBe(true);

    expect(
      canTransitionTurnPhase(
        'shadow_command',
        'shadow_resolve',
      ),
    ).toBe(true);

    expect(
      canTransitionTurnPhase(
        'shadow_resolve',
        'reinforcement',
      ),
    ).toBe(true);

    expect(
      canTransitionTurnPhase(
        'reinforcement',
        'victoria_command',
      ),
    ).toBe(true);
  });

  it('increments the round and resets command budgets after reinforcement', () => {
    const initial =
      createInitialTurnState();

    const reinforcement = {
      ...initial,
      round: 3,
      phase:
        'reinforcement' as const,
      royalCommandsRemaining: {
        victoria: 0,
        obsidian: 1,
      },
    };

    const next =
      transitionTurnPhase(
        reinforcement,
        'victoria_command',
      );

    expect(next.round).toBe(4);

    expect(
      next.royalCommandsRemaining,
    ).toEqual({
      victoria: 4,
      obsidian: 4,
    });
  });

  it('leaves state unchanged when a transition is illegal', () => {
    const initial =
      createInitialTurnState();

    const next =
      transitionTurnPhase(
        initial,
        'shadow_resolve',
      );

    expect(next).toEqual(initial);
  });
});

import {
  createWorld,
} from '../../src/sim/world';

describe('World turn integration', () => {
  it('initializes every new world with canonical turn state', () => {
    const world = createWorld();

    expect((world as any).turn).toEqual(
      createInitialTurnState(),
    );
  });
});
