import type { WorldState } from './types';

export const TICK_MS = 100 as const;
export function advanceTick(world: WorldState): WorldState {
  return { ...world, tick: world.tick + 1 };
}
