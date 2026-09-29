import { evaluateSovereignThreats } from './sovereign';
import { applyCrownIncome } from './economy';
import { advanceHeroRespawn, attemptHeroRespawns } from './hero';
import { evaluateNodeControlForRound } from './nodes';
import { resolvePromotions } from './promotion';
import { deployReinforcements } from './production';
import { advanceHeroRoundState } from './turn-abilities';
import { resolveSettlement } from './territory';
import { applyMaturePolarityFlips, resolveBannerProgress } from './polarity';
import { resolveRankUps } from './rank';
import type { Faction, WorldState } from './types';

export const ROYAL_COMMANDS_PER_ROUND = 4;

export const TRIPTYCH_ROUND_STAGE_ORDER = [
  'settlement',
  'node_control',
  'crown_income',
  'banner_progress',
  'polarity_flip',
  'promotion',
  'deployment',
  'military_rank',
  'hero_round_state',
  'hero_respawn',
  'sovereign_truth',
] as const;

export type TurnPhase =
  | 'victoria_command'
  | 'victoria_resolve'
  | 'shadow_command'
  | 'shadow_resolve'
  | 'reinforcement';

export interface TurnState {
  round: number;
  phase: TurnPhase;
  royalCommandsRemaining: Record<Faction, number>;
  pendingOrderIds: string[];
}

const NEXT_PHASE: Readonly<Record<TurnPhase, TurnPhase>> = {
  victoria_command: 'victoria_resolve',
  victoria_resolve: 'shadow_command',
  shadow_command: 'shadow_resolve',
  shadow_resolve: 'reinforcement',
  reinforcement: 'victoria_command',
};

export function createInitialTurnState(): TurnState {
  return {
    round: 1,
    phase: 'victoria_command',
    royalCommandsRemaining: {
      victoria: ROYAL_COMMANDS_PER_ROUND,
      obsidian: ROYAL_COMMANDS_PER_ROUND,
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
  if (!canTransitionTurnPhase(state.phase, to)) return state;

  if (state.phase === 'reinforcement' && to === 'victoria_command') {
    return {
      ...state,
      round: state.round + 1,
      phase: to,
      royalCommandsRemaining: {
        victoria: ROYAL_COMMANDS_PER_ROUND,
        obsidian: ROYAL_COMMANDS_PER_ROUND,
      },
      pendingOrderIds: [],
    };
  }

  return { ...state, phase: to };
}

function resolveGeographyStage(world: WorldState): WorldState {
  // Pieces that survived the combat phases now settle. Freshly annexed tiles
  // can immediately supply a node at this same round boundary.
  let working = resolveSettlement(world);
  working = evaluateNodeControlForRound(working).state;
  return applyCrownIncome(working).state;
}

function resolveManipulationStage(world: WorldState): WorldState {
  // Banner clocks mature only here. Their black/white mutation is then
  // published before the next command phase, never during locked orders.
  const progressed = resolveBannerProgress(world).state;
  return applyMaturePolarityFlips(progressed).state;
}

function resolveForceDevelopmentStage(world: WorldState): WorldState {
  // Class, reserves, and military standing all become authoritative together.
  // Promotion keeps the unit's military record, while new deployments begin
  // as recruits through the normal placement authority.
  let working = resolvePromotions(world).state;
  working = deployReinforcements(working).state;
  return resolveRankUps(working);
}

function resolveHeroLifecycleStage(world: WorldState): WorldState {
  // Ability duration/cooldown changes last, after its strategic modifier has
  // been allowed to affect this boundary's shared verbs.
  let working = advanceHeroRoundState(world);
  working = advanceHeroRespawn(working).state;
  working = attemptHeroRespawns(working).state;
  return evaluateSovereignThreats(working).state;
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

  let working = resolveGeographyStage(world);
  working = resolveManipulationStage(working);
  working = resolveForceDevelopmentStage(working);
  working = resolveHeroLifecycleStage(working);

  return {
    ...working,
    turn: transitionTurnPhase(working.turn, 'victoria_command'),
  };
}
