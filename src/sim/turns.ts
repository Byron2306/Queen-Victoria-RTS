import { evaluateSovereignThreats } from './sovereign';
import { applyCrownIncome } from './economy';
import { advanceHeroRespawn, attemptHeroRespawns } from './hero';
import { evaluateNodeControl } from './nodes';
import { resolvePromotions } from './promotion';
import { deployReinforcements } from './production';
import { advanceHeroRoundState } from './turn-abilities';
import type { WorldState } from './types';
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


export function resolveReinforcementPhase(
  world: WorldState,
): WorldState {
  if (
    world.match.status !== 'active' ||
    world.turn.phase !== 'reinforcement'
  ) {
    return world;
  }

  let working = world;

  const nodes =
    evaluateNodeControl(working);
  working = nodes.state;

  const income =
    applyCrownIncome(working);
  working = income.state;

  const deployments =
    deployReinforcements(working);
  working = deployments.state;

  const promotions =
    resolvePromotions(working);
  working = promotions.state;

  working =
    advanceHeroRoundState(
      working,
    );

  const respawnLifecycle =
    advanceHeroRespawn(working);
  working =
    respawnLifecycle.state;

  const respawns =
    attemptHeroRespawns(working);
  working =
    respawns.state;

  const sovereign =
    evaluateSovereignThreats(
      working,
    );
  working =
    sovereign.state;

  return {
    ...working,
    turn:
      transitionTurnPhase(
        working.turn,
        'victoria_command',
      ),
  };
}
