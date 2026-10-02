import {
  createWorld,
  type WorldState,
} from '../../sim';
import {
  TRIPTYCH_V2_OPENING_UNITS,
  applyTriptychOpeningFortifications,
  createTriptychOpeningUnits,
} from '../../sim/triptych-opening';
import { applyTriptychOpeningTerritory } from '../../sim/triptych-territory';

// Compatibility alias for older client/tests while the canonical live skirmish
// now boots from the Triptych V2 32x32 opening authority.
export const PHASE6_OPENING_UNITS = TRIPTYCH_V2_OPENING_UNITS;

export function createPhase6SkirmishWorld(): WorldState {
  let world = createWorld(createTriptychOpeningUnits('triptych-v2'), {
    topologyId: 'triptych-v2',
    heroIds: {
      victoria: 'victoria-queen',
    },
    aiFactions: ['obsidian'],
  });

  world = applyTriptychOpeningTerritory(world);
  return applyTriptychOpeningFortifications(world);
}
