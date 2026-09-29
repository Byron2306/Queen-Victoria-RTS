import { evaluatePositionalAttack } from './position';
import { effectiveAttackRange, effectiveCooldownReload, incomingHeroDamageBps, outgoingHeroDamageBps } from './abilities';
import { combatModifiersForRank, militaryRecordFor } from './rank';
import type { CombatProfile, CombatTickResult, SimEvent, UnitCombatState, UnitKind, UnitMilitaryRecord, UnitState, WorldState } from './types';
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

export function canUnitAttackTarget(world: WorldState, attackerId: string, targetId: string): boolean {
  const attacker = world.units[attackerId];
  const attackerCombat = world.combat[attackerId];
  const target = world.units[targetId];
  const targetCombat = world.combat[targetId];
  if (!attacker || !attackerCombat || attackerCombat.health <= 0 || !target || !targetCombat || targetCombat.health <= 0) return false;
  if (attacker.faction === target.faction) return false;
  return chebyshevDistance(attacker.position, target.position) <= effectiveAttackRange(world, attackerId);
}

type AttackIntent = Readonly<{ unitId: string; targetId: string; damage: number; positionalTags: readonly string[] }>;

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
    if (!target || !canUnitAttackTarget(world, unitId, state.targetId)) continue;

    const profile = UNIT_COMBAT_PROFILES[attacker.kind];
    if (nextState.cooldownTicks !== 0) continue;

    const positional = evaluatePositionalAttack(world, unitId, target.id);
    const positionalDamage = Math.floor((profile.damage * positional.multiplierBps) / 10000);
    const outgoingDamage = Math.floor((positionalDamage * outgoingHeroDamageBps(world, unitId)) / 10000);
    const rankedDamage = Math.floor((outgoingDamage * combatModifiersForRank(militaryRecordFor(world, unitId).rank).damageBps) / 10000);
    const heroAdjusted = Math.floor((rankedDamage * incomingHeroDamageBps(world, target.id)) / 10000);
    const damage = Math.max(1, Math.floor((heroAdjusted * combatModifiersForRank(militaryRecordFor(world, target.id).rank).defenseBps) / 10000));
    intents.push({ unitId, targetId: target.id, damage, positionalTags: [...positional.tags].sort() });
    nextCombat[unitId] = { ...nextState, cooldownTicks: effectiveCooldownReload(world, unitId) };
  }

  const events: SimEvent[] = intents.map((intent) => ({
    type: 'attack.fired',
    tick: world.tick,
    unitId: intent.unitId,
    targetId: intent.targetId,
    damage: intent.damage,
    positionalTags: intent.positionalTags,
  }));

  const damageByTarget = new Map<string, { damage: number; attackers: string[]; positionalBonusApplied: boolean }>();
  for (const intent of intents) {
    const current = damageByTarget.get(intent.targetId) ?? { damage: 0, attackers: [], positionalBonusApplied: false };
    current.damage += intent.damage;
    current.attackers.push(intent.unitId);
    current.positionalBonusApplied = current.positionalBonusApplied || intent.positionalTags.length > 0;
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
        positionalBonusApplied: aggregate.positionalBonusApplied,
      });
    }
  }

  if (deadIds.length === 0) return { state: { ...world, combat: nextCombat }, events };

  const deadSet = new Set(deadIds);
  const units = { ...world.units };
  const occupancy = { ...world.occupancy };
  const combat = { ...nextCombat };
  const military: Record<string, UnitMilitaryRecord> = { ...world.military };

  for (const deadId of deadIds.sort()) {
    const aggregate = damageByTarget.get(deadId);
    for (const attackerId of [...(aggregate?.attackers ?? [])].sort()) {
      if (!world.units[attackerId]) continue;
      const record = militaryRecordFor(world, attackerId);
      military[attackerId] = {
        ...record,
        kills: record.kills + 1,
      };
    }
  }

  for (const deadId of deadIds.sort()) {
    const deadUnit = units[deadId];
    if (deadUnit) delete occupancy[coordKey(deadUnit.position)];
    delete units[deadId];
    delete combat[deadId];
    delete military[deadId];
  }
  for (const id of Object.keys(combat)) {
    const state = combat[id];
    if (state?.targetId && deadSet.has(state.targetId)) {
      combat[id] = { ...state, targetId: null };
    }
  }

  return { state: { ...world, units, occupancy, combat, military }, events };
}