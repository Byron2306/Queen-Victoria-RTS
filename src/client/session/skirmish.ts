import {
  createWorld,
  type WorldState,
} from '../../sim';
import { TRIPTYCH_OPENING_UNITS } from '../../sim/triptych-opening';

// Compatibility alias for older client/tests while the final Triptych opening
// becomes the single authoritative source of scenario units.
export const PHASE6_OPENING_UNITS = TRIPTYCH_OPENING_UNITS;

export function createPhase6SkirmishWorld(): WorldState {
  return createWorld(TRIPTYCH_OPENING_UNITS, {
    heroIds: {
      victoria: 'victoria-queen',
    },
    aiFactions: ['obsidian'],
  });
}
