import {
  canDeployReadyUnit,
  legalDeploymentCells,
} from '../../sim/deployment';
import type { Coord, Faction, WorldState } from '../../sim/types';
import type { ClientCommandBridge } from '../runtime/command-bridge';

export function legalReadyDeploymentTargets(
  world: WorldState,
  faction: Faction,
  readyId: string,
): readonly Coord[] {
  return legalDeploymentCells(world, faction, readyId)
    .map(cell => ({ ...cell }));
}

export function stageReadyDeploymentTarget(
  bridge: ClientCommandBridge,
  world: WorldState,
  faction: Faction,
  readyId: string,
  cell: Coord,
): boolean {
  if (!canDeployReadyUnit(world, faction, readyId, cell).allowed) {
    return false;
  }

  bridge.deployReady(
    world.tick,
    faction,
    readyId,
    cell,
  );
  return true;
}
