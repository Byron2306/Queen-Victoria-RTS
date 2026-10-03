import { canBuildFortification } from '../../sim/fortifications';
import { getBannerAt } from '../../sim/polarity';
import {
  canFactionClaimTile,
  getTileFactionControl,
  topologyForWorld,
} from '../../sim/territory';
import type { Coord, Faction, WorldState } from '../../sim/types';
import type { ClientCommandBridge } from '../runtime/command-bridge';

export type StrategicTargetMode =
  | 'deploy_banner'
  | 'build_bastion'
  | 'build_redoubt'
  | 'annex_tile';

function isLegalStrategicTarget(
  world: WorldState,
  faction: Faction,
  mode: StrategicTargetMode,
  cell: Coord,
): boolean {
  if (mode === 'deploy_banner') {
    return (
      getTileFactionControl(world, cell) === faction &&
      getBannerAt(world, cell) === null
    );
  }

  if (mode === 'build_bastion' || mode === 'build_redoubt') {
    return canBuildFortification(world, faction, cell).allowed;
  }

  return canFactionClaimTile(world, faction, cell, 'annex_command').allowed;
}

export function legalStrategicTargets(
  world: WorldState,
  faction: Faction,
  mode: StrategicTargetMode,
): readonly Coord[] {
  return topologyForWorld(world).allPlayableCells()
    .filter(cell => isLegalStrategicTarget(world, faction, mode, cell))
    .map(cell => ({ ...cell }));
}

export function stageStrategicTarget(
  bridge: ClientCommandBridge,
  world: WorldState,
  faction: Faction,
  mode: StrategicTargetMode,
  cell: Coord,
): boolean {
  if (!topologyForWorld(world).isPlayableCell(cell.x, cell.y)) return false;
  if (!isLegalStrategicTarget(world, faction, mode, cell)) return false;

  if (mode === 'deploy_banner') {
    bridge.deployBanner(world, faction, cell);
  } else if (mode === 'build_bastion') {
    bridge.buildFortification(world, faction, 'bastion', cell);
  } else if (mode === 'build_redoubt') {
    bridge.buildFortification(world, faction, 'redoubt', cell);
  } else {
    bridge.annexTile(world, faction, cell);
  }

  return true;
}
