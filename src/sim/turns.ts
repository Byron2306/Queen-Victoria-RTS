import type {
  Faction,
} from './types';

export const ROYAL_COMMANDS_PER_ROUND = 4;

export type TurnPhase =
  | 'victoria_command'
  | 'victoria_resolve'
  | 'shadow_command'
  | 'shadow_resolve'
  | 'reinforcement';

export interface TurnState {
  round: number;
  phase: TurnPhase;
  royalCommandsRemaining:
    Record<Faction, number>;
  pendingOrderIds: string[];
}

const NEXT_PHASE:
  Readonly<
    Record<TurnPhase, TurnPhase>
  > = {
    victoria_command:
      'victoria_resolve',

    victoria_resolve:
      'shadow_command',

    shadow_command:
      'shadow_resolve',

    shadow_resolve:
      'reinforcement',

    reinforcement:
      'victoria_command',
  };

export function createInitialTurnState():
  TurnState {
  return {
    round: 1,
    phase: 'victoria_command',

    royalCommandsRemaining: {
      victoria:
        ROYAL_COMMANDS_PER_ROUND,

      obsidian:
        ROYAL_COMMANDS_PER_ROUND,
    },

    pendingOrderIds: [],
  };
}

export function canTransitionTurnPhase(
  from: TurnPhase,
  to: TurnPhase,
): boolean {
  return NEXT_PHASE[from] === to;
}

export function transitionTurnPhase(
  state: TurnState,
  to: TurnPhase,
): TurnState {
  if (
    !canTransitionTurnPhase(
      state.phase,
      to,
    )
  ) {
    return state;
  }

  if (
    state.phase ===
      'reinforcement' &&
    to ===
      'victoria_command'
  ) {
    return {
      ...state,

      round:
        state.round + 1,

      phase:
        to,

      royalCommandsRemaining: {
        victoria:
          ROYAL_COMMANDS_PER_ROUND,

        obsidian:
          ROYAL_COMMANDS_PER_ROUND,
      },

      pendingOrderIds: [],
    };
  }

  return {
    ...state,
    phase: to,
  };
}
