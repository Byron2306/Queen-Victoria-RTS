import type { CombatProfile, UnitCombatState, UnitKind, UnitState } from './types';

export const UNIT_COMBAT_PROFILES: Readonly<Record<UnitKind, CombatProfile>> = {
  pawn: { maxHealth: 60, damage: 8, cooldownTicks: 10, range: 1, acquisitionRange: 3, leashRange: 4 },
  knight: { maxHealth: 90, damage: 14, cooldownTicks: 12, range: 1, acquisitionRange: 4, leashRange: 5 },
  bishop: { maxHealth: 70, damage: 12, cooldownTicks: 15, range: 4, acquisitionRange: 5, leashRange: 5 },
  rook: { maxHealth: 130, damage: 18, cooldownTicks: 18, range: 5, acquisitionRange: 5, leashRange: 4 },
  queen: { maxHealth: 180, damage: 16, cooldownTicks: 10, range: 4, acquisitionRange: 6, leashRange: 6 },
  king: { maxHealth: 300, damage: 10, cooldownTicks: 20, range: 2, acquisitionRange: 4, leashRange: 0 },
};

export function combatStateFor(unit: UnitState): UnitCombatState {
  const profile = UNIT_COMBAT_PROFILES[unit.kind];
  return {
    health: profile.maxHealth,
    cooldownTicks: 0,
    targetId: null,
    stance: 'guard',
    guardAnchor: { ...unit.position },
  };
}
