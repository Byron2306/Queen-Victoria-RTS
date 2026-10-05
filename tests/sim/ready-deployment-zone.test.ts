import { describe, expect, it } from 'vitest';

import * as sim from '../../src/sim';
import { tileId } from '../../src/sim/board-topology';
import { getBattlefieldTopology } from '../../src/sim/battlefield-topology-authority';
import { capacityUsage, pieceCountWithQueue } from '../../src/sim/economy';
import { strategicTiles, type TriptychTerritoryState } from '../../src/sim/territory';
import type { Coord, Faction, WorldState } from '../../src/sim/types';
import { createWorld, placeUnit } from '../../src/sim/world';

type ReadyFixture = Readonly<{
  id: string;
  faction: Faction;
  unitKind: 'pawn' | 'knight' | 'bishop' | 'rook';
  cost: number;
  capacityWeight: number;
  queuedTick: number;
  readyRound: number;
}>;

function withReady(
  world: WorldState,
  faction: Faction,
  entries: readonly ReadyFixture[],
): WorldState {
  return {
    ...world,
    production: {
      ...world.production,
      ready: {
        victoria: faction === 'victoria' ? entries : [],
        obsidian: faction === 'obsidian' ? entries : [],
      },
    },
  } as WorldState;
}

function deploymentZoneForFaction(
  world: WorldState,
  faction: Faction,
): readonly Coord[] {
  const fn = (sim as typeof sim & {
    deploymentZoneForFaction?: (
      candidate: WorldState,
      side: Faction,
    ) => readonly Coord[];
  }).deploymentZoneForFaction;
  expect(fn).toBeTypeOf('function');
  return fn!(world, faction);
}

function legalDeploymentCells(
  world: WorldState,
  faction: Faction,
  readyId: string,
): readonly Coord[] {
  const fn = (sim as typeof sim & {
    legalDeploymentCells?: (
      candidate: WorldState,
      side: Faction,
      id: string,
    ) => readonly Coord[];
  }).legalDeploymentCells;
  expect(fn).toBeTypeOf('function');
  return fn!(world, faction, readyId);
}

const readyPawn = (faction: Faction, id = `${faction}-recruit-1`): ReadyFixture => ({
  id,
  faction,
  unitKind: 'pawn',
  cost: 10,
  capacityWeight: 1,
  queuedTick: 0,
  readyRound: 2,
});

describe('Triptych READY deployment zones', () => {
  it('initializes persistent READY production state empty', () => {
    const world = createWorld() as WorldState & {
      production: WorldState['production'] & {
        ready?: Readonly<Record<Faction, readonly ReadyFixture[]>>;
      };
    };

    expect(world.production.ready).toEqual({
      victoria: [],
      obsidian: [],
    });
  });

  it('defines Victoria V2 as the exact 25-cell x=1..5 y=14..18 zone', () => {
    const world = createWorld([], { topologyId: 'triptych-v2' });
    const cells = deploymentZoneForFaction(world, 'victoria');

    expect(cells).toHaveLength(25);
    expect(new Set(cells.map(cell => cell.x))).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(new Set(cells.map(cell => cell.y))).toEqual(new Set([14, 15, 16, 17, 18]));
    expect(cells).toContainEqual({ x: 3, y: 16 });
  });

  it('defines Obsidian V2 as the exact 25-cell x=26..30 y=13..17 zone', () => {
    const world = createWorld([], { topologyId: 'triptych-v2' });
    const cells = deploymentZoneForFaction(world, 'obsidian');

    expect(cells).toHaveLength(25);
    expect(new Set(cells.map(cell => cell.x))).toEqual(new Set([26, 27, 28, 29, 30]));
    expect(new Set(cells.map(cell => cell.y))).toEqual(new Set([13, 14, 15, 16, 17]));
    expect(cells).toContainEqual({ x: 28, y: 15 });
  });

  it('returns only topology-playable cells and filters occupied zone cells', () => {
    let world = createWorld([], { topologyId: 'triptych-v2' });
    world = withReady(world, 'victoria', [readyPawn('victoria')]);
    world = placeUnit(world, {
      id: 'blocker',
      faction: 'victoria',
      kind: 'pawn',
      position: { x: 3, y: 16 },
    });

    const legal = legalDeploymentCells(world, 'victoria', 'victoria-recruit-1');
    const topology = getBattlefieldTopology('triptych-v2');

    expect(legal).toHaveLength(24);
    expect(legal).not.toContainEqual({ x: 3, y: 16 });
    expect(legal.every(cell => topology.isPlayableCell(cell.x, cell.y))).toBe(true);
  });

  it('does not let ownership, polarity, nodes, forts, banners, or supply truth redefine the raw zone', () => {
    let world = createWorld([], { topologyId: 'triptych-v2' });
    world = withReady(world, 'victoria', [readyPawn('victoria')]);

    const cell = { x: 4, y: 16 } as const;
    const tiles = { ...strategicTiles(world) };
    const id = tileId(cell);
    tiles[id] = {
      ...tiles[id]!,
      factionControl: 'obsidian',
      polarity: tiles[id]!.polarity === 'white' ? 'black' : 'white',
    };

    world = {
      ...world,
      territory: {
        ...world.territory,
        tiles,
      } as TriptychTerritoryState,
      supply: {
        exposureRoundsByUnit: {
          irrelevant: 3,
        },
      },
    };

    const legal = legalDeploymentCells(world, 'victoria', 'victoria-recruit-1');
    expect(legal).toContainEqual(cell);
  });

  it('counts READY commitments toward capacity usage and piece caps', () => {
    let world = createWorld([], { topologyId: 'triptych-v2' });
    world = withReady(world, 'victoria', [
      readyPawn('victoria', 'victoria-recruit-1'),
      {
        ...readyPawn('victoria', 'victoria-recruit-2'),
        unitKind: 'rook',
        capacityWeight: 3,
        cost: 38,
      },
    ]);

    expect(capacityUsage(world, 'victoria')).toBe(4);
    expect(pieceCountWithQueue(world, 'victoria', 'pawn')).toBe(1);
    expect(pieceCountWithQueue(world, 'victoria', 'rook')).toBe(1);
  });
});
