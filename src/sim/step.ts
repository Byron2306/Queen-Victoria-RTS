import { advanceTick } from './clock';
import type { SimCommand, SimEvent, StepResult, WorldState } from './types';
import { coordKey, isInBounds } from './world';

export function stepWorld(world: WorldState, commands: readonly SimCommand[]): StepResult {
  let working = world;
  const events: SimEvent[] = [];
  const ordered = [...commands].sort((a, b) => a.sequence - b.sequence || a.unitId.localeCompare(b.unitId));

  for (const command of ordered) {
    const unit = working.units[command.unitId];
    if (!unit) {
      events.push({ type: 'move.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, to: command.to, reason: 'missing_unit' });
      continue;
    }
    if (!isInBounds(command.to)) {
      events.push({ type: 'move.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, to: command.to, reason: 'out_of_bounds' });
      continue;
    }
    const dx = Math.abs(command.to.x - unit.position.x);
    const dy = Math.abs(command.to.y - unit.position.y);
    if (dx + dy !== 1) {
      events.push({ type: 'move.rejected', tick: world.tick, sequence: command.sequence, unitId: command.unitId, to: command.to, reason: 'illegal_step' });
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
