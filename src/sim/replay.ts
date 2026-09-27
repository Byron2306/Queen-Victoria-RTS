import type { ReplayResult, SimCommand, WorldState } from './types';
import { stepWorld } from './step';

export function runReplay(initial: WorldState, frames: readonly (readonly SimCommand[])[]): ReplayResult {
  let state = initial;
  const eventsByTick = [] as Array<ReplayResult['eventsByTick'][number]>;
  for (const frame of frames) {
    const result = stepWorld(state, frame);
    state = result.state;
    eventsByTick.push(result.events);
  }
  return { state, eventsByTick };
}

export function canonicalSnapshot(result: ReplayResult): string {
  const unitIds = Object.keys(result.state.units).sort();
  const occupancyKeys = Object.keys(result.state.occupancy).sort();
  const units = Object.fromEntries(unitIds.map((id) => [id, result.state.units[id]]));
  const occupancy = Object.fromEntries(occupancyKeys.map((key) => [key, result.state.occupancy[key]]));
  return JSON.stringify({
    state: { tick: result.state.tick, width: result.state.width, height: result.state.height, units, occupancy },
    eventsByTick: result.eventsByTick,
  });
}
