import { topologyForWorld } from './territory';
import type {
  Coord,
  Faction,
  ReadyDeployment,
  WorldState,
} from './types';

export type DeploymentRejectReason =
  | 'match_ended'
  | 'missing_ready_entry'
  | 'wrong_faction'
  | 'outside_deployment_zone'
  | 'unplayable_cell'
  | 'occupied_cell';

export type DeploymentDecision = Readonly<{
  allowed: boolean;
  reason?: DeploymentRejectReason;
}>;

function deploymentCenter(
  world: WorldState,
  faction: Faction,
): Coord {
  const topology = topologyForWorld(world);
  if (topology.id === 'triptych-v2') {
    return faction === 'victoria'
      ? { x: 3, y: 16 }
      : { x: 28, y: 15 };
  }
  return world.production.reinforcementAnchors[faction];
}

function readyEntryForFaction(
  world: WorldState,
  faction: Faction,
  readyId: string,
): ReadyDeployment | undefined {
  return world.production.ready[faction].find(entry => entry.id === readyId);
}

function readyEntryExistsForOtherFaction(
  world: WorldState,
  faction: Faction,
  readyId: string,
): boolean {
  const other = faction === 'victoria' ? 'obsidian' : 'victoria';
  return world.production.ready[other].some(entry => entry.id === readyId);
}

export function deploymentZoneForFaction(
  world: WorldState,
  faction: Faction,
): readonly Coord[] {
  const center = deploymentCenter(world, faction);
  const cells: Coord[] = [];

  for (let y = center.y - 2; y <= center.y + 2; y += 1) {
    for (let x = center.x - 2; x <= center.x + 2; x += 1) {
      cells.push({ x, y });
    }
  }

  return cells;
}

export function canDeployReadyUnit(
  world: WorldState,
  faction: Faction,
  readyId: string,
  cell: Coord,
): DeploymentDecision {
  if (world.match.status !== 'active') {
    return { allowed: false, reason: 'match_ended' };
  }

  const entry = readyEntryForFaction(world, faction, readyId);
  if (!entry) {
    if (readyEntryExistsForOtherFaction(world, faction, readyId)) {
      return { allowed: false, reason: 'wrong_faction' };
    }
    return { allowed: false, reason: 'missing_ready_entry' };
  }

  const inZone = deploymentZoneForFaction(world, faction)
    .some(candidate => candidate.x === cell.x && candidate.y === cell.y);
  if (!inZone) {
    return { allowed: false, reason: 'outside_deployment_zone' };
  }

  const topology = topologyForWorld(world);
  if (!topology.isPlayableCell(cell.x, cell.y)) {
    return { allowed: false, reason: 'unplayable_cell' };
  }

  if (world.occupancy[`${cell.x},${cell.y}`]) {
    return { allowed: false, reason: 'occupied_cell' };
  }

  return { allowed: true };
}

export function legalDeploymentCells(
  world: WorldState,
  faction: Faction,
  readyId: string,
): readonly Coord[] {
  return deploymentZoneForFaction(world, faction)
    .filter(cell => canDeployReadyUnit(world, faction, readyId, cell).allowed);
}
