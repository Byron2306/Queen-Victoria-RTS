import type {
  HeroAbilityState,
  HeroState,
  MatchStatus,
  ProductionQueueEntry,
  SovereignState,
  UnitCombatState,
  UnitState,
  WorldState,
} from '../../sim/types';
import type {
  TacticalOrder,
} from '../../sim/orders';
import {
  ROYAL_COMMANDS_PER_ROUND,
} from '../../sim/turns';

export interface HudHeroModel {
  unitId: string | null;
  status: HeroState['status'];
  level: HeroState['level'];
  xp: number;
  activeAbility: HeroState['activeAbility'];
  respawnTicksRemaining: number;
  abilities: Readonly<Record<string, HeroAbilityState>>;
}

export interface HudModel {
  tick: number;
  matchStatus: MatchStatus;
  crownPower: number;
  productionQueue: readonly ProductionQueueEntry[];
  hero: HudHeroModel;
  sovereigns: Readonly<Record<'victoria' | 'obsidian', SovereignState>>;
  selectedUnit: UnitState | null;
  selectedCombat: UnitCombatState | null;
  turn: {
    round: number;
    phase: WorldState['turn']['phase'];
    royalCommandsRemaining: number;
    royalCommandsMaximum: number;
    pendingOrders: readonly TacticalOrder[];
  };
}

export function createHudModel(
  world: WorldState,
  selectedUnitId: string | null,
): HudModel {
  const hero = world.heroes.victoria;

  const selectedUnit =
    selectedUnitId
      ? world.units[selectedUnitId] ?? null
      : null;

  const selectedCombat =
    selectedUnit
      ? world.combat[selectedUnit.id] ?? null
      : null;

  return {
    tick: world.tick,
    matchStatus: world.match.status,
    crownPower: world.economy.crownPower.victoria,
    productionQueue: world.production.queues.victoria,
    hero: {
      unitId: hero.heroUnitId,
      status: hero.status,
      level: hero.level,
      xp: hero.xp,
      activeAbility: hero.activeAbility,
      respawnTicksRemaining: hero.respawnTicksRemaining,
      abilities: hero.abilities,
    },
    sovereigns: world.match.sovereigns,
    selectedUnit,
    selectedCombat,
    turn: {
      round: world.turn.round,
      phase: world.turn.phase,
      royalCommandsRemaining:
        world.turn.royalCommandsRemaining.victoria,
      royalCommandsMaximum:
        ROYAL_COMMANDS_PER_ROUND,
      pendingOrders: world.pendingOrders,
    },
  };
}
