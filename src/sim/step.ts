import { advanceTick } from './clock';
import { resolveCombatTick } from './combat';
import { validateMoveGeometry } from './geometry';
import type { SimCommand, SimEvent, StepResult, WorldState } from './types';
import { coordKey, isInBounds } from './world';

function resolveAttackOrder(world: WorldState, command: Extract<SimCommand, { type: 'attack' }>): { state: WorldState; event: SimEvent } {
  const unit = world.units[command.unitId];
  if (!unit) {
    return { state: world, event: { type: 'attack.order.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, targetId: command.targetId, reason: 'missing_unit' } };
  }
  const target = world.units[command.targetId];
  if (!target) {
    return { state: world, event: { type: 'attack.order.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, targetId: command.targetId, reason: 'missing_target' } };
  }
  if (command.targetId === command.unitId) {
    return { state: world, event: { type: 'attack.order.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, targetId: command.targetId, reason: 'self_target' } };
  }
  if (target.faction === unit.faction) {
    return { state: world, event: { type: 'attack.order.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, targetId: command.targetId, reason: 'friendly_target' } };
  }
  const targetCombat = world.combat[command.targetId];
  if (!targetCombat || targetCombat.health <= 0) {
    return { state: world, event: { type: 'attack.order.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, targetId: command.targetId, reason: 'dead_target' } };
  }
  const unitCombat = world.combat[command.unitId];
  const state = unitCombat
    ? { ...world, combat: { ...world.combat, [command.unitId]: { ...unitCombat, targetId: command.targetId } } }
    : world;
  return { state, event: { type: 'attack.order.accepted', tick: world.tick, sequence: command.sequence, unitId: command.unitId, targetId: command.targetId } };
}

export function stepWorld(world: WorldState, commands: readonly SimCommand[]): StepResult {
  const combatResult = resolveCombatTick(world);
  let working = combatResult.state;
  const events: SimEvent[] = [...combatResult.events];
  const ordered = [...commands].sort((a, b) => a.sequence - b.sequence || a.unitId.localeCompare(b.unitId));

  for (const command of ordered) {
    if (command.type === 'attack') {
      const result = resolveAttackOrder(working, command);
      working = result.state;
      events.push(result.event);
      continue;
    }

    const unit = working.units[command.unitId];
    if (!unit) {
      events.push({ type: 'move.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, to: command.to, reason: 'missing_unit' });
      continue;
    }
    if (!isInBounds(command.to)) {
      events.push({ type: 'move.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, to: command.to, reason: 'out_of_bounds' });
      continue;
    }
    const geometry = validateMoveGeometry(working, unit, command.to);
    if (!geometry.legal) {
      events.push({ type: 'move.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, to: command.to, reason: geometry.reason });
      continue;
    }
    const targetKey = coordKey(command.to);
    if (working.occupancy[targetKey]) {
      events.push({ type: 'move.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, to: command.to, reason: 'occupied' });
      continue;
    }

    const from = unit.position;
    const fromKey = coordKey(from);
    const nextOccupancy = { ...working.occupancy };
    delete nextOccupancy[fromKey];
    nextOccupancy[targetKey] = unit.id;
    working = {
      ...working,
      units: { ...working.units, [unit.id]: { ...unit, position: { ...command.to } } },
      occupancy: nextOccupancy,
    };
    events.push({ type: 'move.accepted', tick: world.tick, sequence: command.sequence, unitId: unit.id, from, to: command.to });
  }

  return { state: advanceTick(working), events };
}
