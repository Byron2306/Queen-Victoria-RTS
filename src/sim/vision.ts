import {
  tileId,
  type TileId,
} from './board-topology';
import {
  fortificationsFor,
  getFortificationAt,
  type FortificationState,
} from './fortifications';
import { strategicTiles, topologyForWorld } from './territory';
import type {
  CaptureNodeState,
  Coord,
  Faction,
  UnitState,
  WorldState,
} from './types';

const ORTHOGONAL_DIRECTIONS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
] as const;

const DIAGONAL_DIRECTIONS = [
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
] as const;

function sortedCells(cells: readonly Coord[]): readonly Coord[] {
  return [...cells].sort((a, b) => tileId(a).localeCompare(tileId(b)));
}

function surroundingCells(
  world: WorldState,
  center: Coord,
  range: number,
): readonly Coord[] {
  const topology = topologyForWorld(world);
  const cells: Coord[] = [];
  for (let dy = -range; dy <= range; dy += 1) {
    for (let dx = -range; dx <= range; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const cell = { x: center.x + dx, y: center.y + dy };
      if (topology.isPlayableCell(cell.x, cell.y)) cells.push(cell);
    }
  }
  return sortedCells(cells);
}

function localBeaconCells(
  world: WorldState,
  center: Coord,
  range: number,
): readonly Coord[] {
  const topology = topologyForWorld(world);
  const cells: Coord[] = [];
  for (let dy = -range; dy <= range; dy += 1) {
    for (let dx = -range; dx <= range; dx += 1) {
      const cell = { x: center.x + dx, y: center.y + dy };
      if (topology.isPlayableCell(cell.x, cell.y)) cells.push(cell);
    }
  }
  return sortedCells(cells);
}

function rayCells(
  world: WorldState,
  origin: Coord,
  directions: readonly Readonly<{ x: number; y: number }>[],
  range: number,
): readonly Coord[] {
  const topology = topologyForWorld(world);
  const cells: Coord[] = [];
  for (const direction of directions) {
    for (let distance = 1; distance <= range; distance += 1) {
      const cell = {
        x: origin.x + direction.x * distance,
        y: origin.y + direction.y * distance,
      };
      if (!topology.isPlayableCell(cell.x, cell.y)) break;
      cells.push(cell);
      if (getFortificationAt(world, cell)) break;
    }
  }
  return sortedCells(cells);
}

export function visibleCellsForUnit(
  world: WorldState,
  unit: UnitState,
): readonly Coord[] {
  const topology = topologyForWorld(world);
  switch (unit.kind) {
    case 'pawn':
      return surroundingCells(world, unit.position, 1);
    case 'knight': {
      const offsets = [
        { x: -2, y: -1 }, { x: -2, y: 1 },
        { x: -1, y: -2 }, { x: -1, y: 2 },
        { x: 1, y: -2 }, { x: 1, y: 2 },
        { x: 2, y: -1 }, { x: 2, y: 1 },
      ] as const;
      return sortedCells(offsets
        .map(offset => ({ x: unit.position.x + offset.x, y: unit.position.y + offset.y }))
        .filter(cell => topology.isPlayableCell(cell.x, cell.y)));
    }
    case 'rook':
      return rayCells(world, unit.position, ORTHOGONAL_DIRECTIONS, 3);
    case 'bishop':
      return rayCells(world, unit.position, DIAGONAL_DIRECTIONS, 3);
    case 'queen':
      return sortedCells([
        ...rayCells(world, unit.position, ORTHOGONAL_DIRECTIONS, 3),
        ...rayCells(world, unit.position, DIAGONAL_DIRECTIONS, 3),
      ]);
    case 'king':
      return surroundingCells(world, unit.position, 2);
  }
}

export function visibleCellsForFortification(
  world: WorldState,
  fortification: FortificationState,
): readonly Coord[] {
  return localBeaconCells(
    world,
    fortification.cell,
    fortification.kind === 'redoubt' ? 4 : 3,
  );
}

export function visibleCellsForNode(
  world: WorldState,
  node: CaptureNodeState,
  faction: Faction,
): readonly Coord[] {
  if (node.owner !== faction) return [];
  return localBeaconCells(world, node.center, node.kind === 'crown' ? 5 : 3);
}

export function computeFactionVisibleCells(
  world: WorldState,
  faction: Faction,
): ReadonlySet<TileId> {
  const topology = topologyForWorld(world);
  const visible = new Set<TileId>();
  const add = (cell: Coord) => {
    if (topology.isPlayableCell(cell.x, cell.y)) visible.add(tileId(cell));
  };

  for (const tile of Object.values(strategicTiles(world))) {
    if (tile.factionControl === faction) add(tile);
  }

  for (const id of Object.keys(world.units).sort()) {
    const unit = world.units[id]!;
    if (unit.faction !== faction) continue;
    const combat = world.combat[id];
    if (combat && combat.health <= 0) continue;
    add(unit.position);
    for (const cell of visibleCellsForUnit(world, unit)) add(cell);
  }

  for (const id of Object.keys(world.territory.nodes).sort()) {
    const node = world.territory.nodes[id]!;
    for (const cell of visibleCellsForNode(world, node, faction)) add(cell);
  }

  for (const id of Object.keys(fortificationsFor(world)).sort()) {
    const fortification = fortificationsFor(world)[id]!;
    if (fortification.faction !== faction) continue;
    for (const cell of visibleCellsForFortification(world, fortification)) add(cell);
  }

  return new Set([...visible].sort());
}
