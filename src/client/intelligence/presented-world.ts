import {
  allPlayableCells,
  createBoardTile,
  tileId,
  type FactionControl,
  type TileId,
  type TilePolarity,
} from '../../sim/board-topology';
import type {
  CaptureNodeState,
  Coord,
  Faction,
  UnitState,
  VisibilityState,
  WorldState,
} from '../../sim/types';

export type PresentedGhost = Readonly<{
  unitId: string;
  cell: Coord;
  lastSeenRound: number;
}>;

export type PresentedTile = Readonly<{
  id: TileId;
  cell: Coord;
  visibility: VisibilityState;
  polarity: TilePolarity | null;
  control: FactionControl | null;
  lastSeenRound: number | null;
}>;

export type PresentedWorld = Readonly<{
  faction: Faction;
  units: readonly UnitState[];
  ghosts: readonly PresentedGhost[];
  tiles: readonly PresentedTile[];
  nodes?: readonly CaptureNodeState[];
}>;

function cellFromTileId(id: TileId): Coord {
  const [xText, yText] = id.split(',');
  return {
    x: Number(xText),
    y: Number(yText),
  };
}

export function createPresentedWorld(
  world: WorldState,
  faction: Faction,
): PresentedWorld {
  const memory = world.intelligence.byFaction[faction];

  const units = Object.values(world.units)
    .filter((unit) => {
      if (unit.faction === faction) {
        return true;
      }

      const remembered = memory[tileId(unit.position)];
      return remembered?.visibility === 'observed'
        && remembered.lastKnownUnitId === unit.id;
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const ghosts = (Object.entries(memory) as Array<[TileId, (typeof memory)[TileId]]>)
    .filter(([, remembered]) =>
      remembered.visibility === 'remembered'
      && remembered.lastKnownUnitId !== null
      && remembered.lastSeenRound !== null,
    )
    .map(([id, remembered]) => ({
      unitId: remembered.lastKnownUnitId!,
      cell: cellFromTileId(id),
      lastSeenRound: remembered.lastSeenRound!,
    }))
    .sort((a, b) =>
      a.lastSeenRound - b.lastSeenRound
      || a.cell.y - b.cell.y
      || a.cell.x - b.cell.x
      || a.unitId.localeCompare(b.unitId),
    );

  const tiles = allPlayableCells()
    .map<PresentedTile>((cell) => {
      const id = tileId(cell);
      const remembered = memory[id];

      if (!remembered || remembered.visibility === 'unknown') {
        return {
          id,
          cell,
          visibility: 'unknown',
          polarity: null,
          control: null,
          lastSeenRound: null,
        };
      }

      return {
        id,
        cell,
        visibility: remembered.visibility,
        polarity: remembered.lastKnownPolarity,
        control: remembered.lastKnownControl,
        lastSeenRound: remembered.lastSeenRound,
      };
    });

  const nodes = Object.values(world.territory.nodes)
    .filter((node) => memory[tileId(node.center)]?.visibility === 'observed')
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    faction,
    units,
    ghosts,
    tiles,
    nodes,
  };
}

export function createPresentedWorldState(
  world: WorldState,
  presented: PresentedWorld,
): WorldState {
  const units = Object.fromEntries(
    presented.units.map((unit) => [unit.id, unit]),
  );
  const occupancy = Object.fromEntries(
    presented.units.map((unit) => [
      `${unit.position.x},${unit.position.y}`,
      unit.id,
    ]),
  );
  const combat = Object.fromEntries(
    presented.units
      .map((unit) => [unit.id, world.combat[unit.id]] as const)
      .filter((entry): entry is readonly [string, NonNullable<typeof entry[1]>] => entry[1] !== undefined),
  );
  const military = Object.fromEntries(
    presented.units
      .map((unit) => [unit.id, world.military[unit.id]] as const)
      .filter((entry): entry is readonly [string, NonNullable<typeof entry[1]>] => entry[1] !== undefined),
  );
  const tiles = Object.fromEntries(
    presented.tiles.map((tile) => {
      const base = createBoardTile(tile.cell, tile.control ?? 'neutral');
      return [
        tile.id,
        tile.polarity
          ? { ...base, polarity: tile.polarity }
          : base,
      ];
    }),
  );
  const nodes = Object.fromEntries(
    (presented.nodes ?? []).map((node) => [node.id, node]),
  );

  return {
    ...world,
    units,
    occupancy,
    combat,
    military,
    territory: {
      nodes,
      tiles,
    } as WorldState['territory'],
  };
}
