import {
  PIECE_CAP,
  capacityUsage,
  commandCapacity,
  isRecruitUnlocked,
  ownedNodeCount,
} from '../../sim/economy';

import {
  RECRUITMENT_COST,
} from '../../sim/production';

import {
  UNIT_COMBAT_PROFILES,
} from '../../sim/combat';

import type {
  HeroAbilityState,
  HeroState,
  MatchStatus,
  ProductionQueueEntry,
  RecruitableUnitKind,
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
  health: number | null;
  maxHealth: number | null;
}

export interface HudNodesModel {
  owned: number;
  total: number;
}

export interface HudCommandModel {
  used: number;
  capacity: number;
}

export interface HudEnemySovereignModel {
  unitId: string | null;
  health: number | null;
  maxHealth: number | null;
  threatened: boolean;
}

export interface HudDeployEntryModel {
  cost: number;
  unlocked: boolean;
  count: number;
  cap: number;
  queued: number;
}

export type HudDeployModel =
  Readonly<Record<RecruitableUnitKind, HudDeployEntryModel>>;


export interface HudModel {
  tick: number;
  matchStatus: MatchStatus;
  crownPower: number;
  nodes: HudNodesModel;
  command: HudCommandModel;
  productionQueue: readonly ProductionQueueEntry[];
  hero: HudHeroModel;
  sovereigns: Readonly<Record<'victoria' | 'obsidian', SovereignState>>;
  enemySovereign: HudEnemySovereignModel;
  selectedUnit: UnitState | null;
  selectedCombat: UnitCombatState | null;
  selectedMaxHealth: number | null;
  deploy: HudDeployModel;
  turn: {
    round: number;
    phase: WorldState['turn']['phase'];
    royalCommandsRemaining: number;
    royalCommandsMaximum: number;
    pendingOrders: readonly TacticalOrder[];
  };
}

const RECRUITABLE_KINDS:
  readonly RecruitableUnitKind[] = [
    'pawn',
    'knight',
    'bishop',
    'rook',
  ];

export function createHudModel(
  world: WorldState,
  selectedUnitId: string | null,
): HudModel {
  const hero = world.heroes.victoria;

  const heroUnit =
    hero.heroUnitId
      ? world.units[hero.heroUnitId] ?? null
      : null;

  const heroCombat =
    hero.heroUnitId
      ? world.combat[hero.heroUnitId] ?? null
      : null;

  const heroMaxHealth =
    heroUnit
      ? UNIT_COMBAT_PROFILES[heroUnit.kind].maxHealth
      : null;

  const selectedUnit =
    selectedUnitId
      ? world.units[selectedUnitId] ?? null
      : null;

  const selectedCombat =
    selectedUnit
      ? world.combat[selectedUnit.id] ?? null
      : null;

  const selectedMaxHealth =
    selectedUnit
      ? UNIT_COMBAT_PROFILES[selectedUnit.kind].maxHealth
      : null;

  const enemySovereign =
    world.match.sovereigns.obsidian;

  const enemyKing =
    enemySovereign.kingId
      ? world.units[enemySovereign.kingId] ?? null
      : null;

  const enemyCombat =
    enemySovereign.kingId
      ? world.combat[enemySovereign.kingId] ?? null
      : null;

  const enemyMaxHealth =
    enemyKing
      ? UNIT_COMBAT_PROFILES[enemyKing.kind].maxHealth
      : null;

  const totalNodes =
    Object.keys(world.territory.nodes).length;

  const queuedByKind =
    Object.fromEntries(
      RECRUITABLE_KINDS.map(kind => [
        kind,
        world.production.queues.victoria.filter(
          entry => entry.unitKind === kind,
        ).length,
      ]),
    ) as Record<RecruitableUnitKind, number>;

  const fieldedByKind =
    Object.fromEntries(
      RECRUITABLE_KINDS.map(kind => [
        kind,
        Object.values(world.units).filter(
          unit =>
            unit.faction === 'victoria' &&
            unit.kind === kind,
        ).length,
      ]),
    ) as Record<RecruitableUnitKind, number>;

  const deploy =
    Object.fromEntries(
      RECRUITABLE_KINDS.map(kind => [
        kind,
        {
          cost: RECRUITMENT_COST[kind],
          unlocked: isRecruitUnlocked(
            world,
            'victoria',
            kind,
          ),
          count: fieldedByKind[kind],
          cap: PIECE_CAP[kind],
          queued: queuedByKind[kind],
        },
      ]),
    ) as HudDeployModel;

  return {
    tick: world.tick,
    matchStatus: world.match.status,
    crownPower: world.economy.crownPower.victoria,

    nodes: {
      owned: ownedNodeCount(
        world,
        'victoria',
      ),
      total: totalNodes,
    },

    command: {
      used: capacityUsage(
        world,
        'victoria',
      ),
      capacity: commandCapacity(
        world,
        'victoria',
      ),
    },
    productionQueue: world.production.queues.victoria,
    hero: {
      unitId: hero.heroUnitId,
      status: hero.status,
      level: hero.level,
      xp: hero.xp,
      activeAbility: hero.activeAbility,
      respawnTicksRemaining: hero.respawnTicksRemaining,
      abilities: hero.abilities,
      health: heroCombat?.health ?? null,
      maxHealth: heroMaxHealth,
    },
    sovereigns: world.match.sovereigns,

    enemySovereign: {
      unitId: enemySovereign.kingId,
      health: enemyCombat?.health ?? null,
      maxHealth: enemyMaxHealth,
      threatened: enemySovereign.threatened,
    },

    selectedUnit,
    selectedCombat,
    selectedMaxHealth,
    deploy,

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
