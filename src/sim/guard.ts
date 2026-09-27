import { UNIT_COMBAT_PROFILES, chebyshevDistance } from './combat';
import type { UnitState, WorldState } from './types';

function livingEnemy(world: WorldState, source: UnitState, candidate: UnitState): boolean {
  const combat = world.combat[candidate.id];
  return candidate.faction !== source.faction && Boolean(combat && combat.health > 0);
}

export function acquireGuardTarget(world: WorldState, unitId: string): string | null {
  const unit = world.units[unitId];
  const combat = world.combat[unitId];
  if (!unit || !combat || combat.health <= 0 || combat.stance !== 'guard') return null;

  const range = UNIT_COMBAT_PROFILES[unit.kind].acquisitionRange;
  const candidates = Object.values(world.units)
    .filter((candidate) => livingEnemy(world, unit, candidate))
    .map((candidate) => ({ id: candidate.id, distance: chebyshevDistance(unit.position, candidate.position) }))
    .filter((candidate) => candidate.distance <= range)
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));

  return candidates[0]?.id ?? null;
}

function retainedTargetIsValid(world: WorldState, unitId: string, targetId: string): boolean {
  const unit = world.units[unitId];
  const combat = world.combat[unitId];
  const target = world.units[targetId];
  const targetCombat = world.combat[targetId];
  if (!unit || !combat || !target || !targetCombat || targetCombat.health <= 0 || target.faction === unit.faction) return false;

  const profile = UNIT_COMBAT_PROFILES[unit.kind];
  const pursuitEnvelope = profile.acquisitionRange + profile.leashRange;
  return Math.max(
    Math.abs(target.position.x - combat.guardAnchor.x),
    Math.abs(target.position.y - combat.guardAnchor.y),
  ) <= pursuitEnvelope;
}

export function refreshGuardTargets(world: WorldState): WorldState {
  const combat = { ...world.combat };
  for (const unitId of Object.keys(world.units).sort()) {
    const state = combat[unitId];
    if (!state || state.health <= 0 || state.stance !== 'guard') continue;

    if (state.targetId && retainedTargetIsValid(world, unitId, state.targetId)) continue;
    combat[unitId] = { ...state, targetId: acquireGuardTarget({ ...world, combat }, unitId) };
  }
  return { ...world, combat };
}
