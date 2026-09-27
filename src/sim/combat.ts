import type { CombatProfile, CombatTickResult, SimEvent, UnitCombatState, UnitKind, UnitState, WorldState } from './types';
import { coordKey } from './world';

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

export function chebyshevDistance(a: UnitState['position'], b: UnitState['position']): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

type AttackIntent = Readonly<{ unitId: string; targetId: string; damage: number }>;

export function resolveCombatTick(world: WorldState): CombatTickResult {
  const nextCombat: Record<string, UnitCombatState> = {};
  for (const id of Object.keys(world.combat).sort()) {
    const state = world.combat[id];
    if (!state) continue;
    nextCombat[id] = {
      ...state,
      cooldownTicks: state.cooldownTicks > 0 ? state.cooldownTicks - 1 : 0,
    };
  }

  const intents: AttackIntent[] = [];
  for (const unitId of Object.keys(world.units).sort()) {
    const attacker = world.units[unitId];
    const state = world.combat[unitId];
    const nextState = nextCombat[unitId];
    if (!attacker || !state || !nextState || state.health <= 0 || !state.targetId) continue;

    const target = world.units[state.targetId];
    const targetCombat = world.combat[state.targetId];
    if (!target || !targetCombat || targetCombat.health <= 0 || target.faction === attacker.faction) continue;

    const profile = UNIT_COMBAT_PROFILES[attacker.kind];
    if (nextState.cooldownTicks !== 0) continue;
    if (chebyshevDistance(attacker.position, target.position) > profile.range) continue;

    intents.push({ unitId, targetId: target.id, damage: profile.damage });
    nextCombat[unitId] = { ...nextState, cooldownTicks: profile.cooldownTicks };
  }

  const events: SimEvent[] = intents.map((intent) => ({
    type: 'attack.fired',
    tick: world.tick,
    unitId: intent.unitId,
    targetId: intent.targetId,
    damage: intent.damage,
  }));

  const damageByTarget = new Map<string, { damage: number; attackers: string[] }>();
  for (const intent of intents) {
    const current = damageByTarget.get(intent.targetId) ?? { damage: 0, attackers: [] };
    current.damage += intent.damage;
    current.attackers.push(intent.unitId);
    damageByTarget.set(intent.targetId, current);
  }

  const deadIds: string[] = [];
  for (const targetId of [...damageByTarget.keys()].sort()) {
    const aggregate = damageByTarget.get(targetId);
    const before = world.combat[targetId];
    const current = nextCombat[targetId];
    if (!aggregate || !before || !current) continue;
    const healthAfter = Math.max(0, before.health - aggregate.damage);
    nextCombat[targetId] = { ...current, health: healthAfter };
    events.push({
      type: 'unit.damaged',
      tick: world.tick,
      unitId: targetId,
      damage: aggregate.damage,
      healthBefore: before.health,
      healthAfter,
    });
    if (healthAfter === 0) {
      deadIds.push(targetId);
      events.push({
        type: 'unit.killed',
        tick: world.tick,
        unitId: targetId,
        byUnitIds: [...aggregate.attackers].sort(),
      });
    }
  }

  if (deadIds.length === 0) return { state: { ...world, combat: nextCombat }, events };

  const deadSet = new Set(deadIds);
  const units = { ...world.units };
  const occupancy = { ...world.occupancy };
  const combat = { ...nextCombat };
  for (const deadId of deadIds.sort()) {
    const deadUnit = units[deadId];
    if (deadUnit) delete occupancy[coordKey(deadUnit.position)];
    delete units[deadId];
    delete combat[deadId];
  }
  for (const id of Object.keys(combat)) {
    const state = combat[id];
    if (state?.targetId && deadSet.has(state.targetId)) {
      combat[id] = { ...state, targetId: null };
    }
  }

  return { state: { ...world, units, occupancy, combat }, events };
}
