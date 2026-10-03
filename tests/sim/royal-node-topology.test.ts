import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import {
  DEFAULT_CAPTURE_NODES,
  evaluateNodeControlForRound,
} from '../../src/sim/nodes';
import { isPlayableCell, tileId } from '../../src/sim/board-topology';
import {
  strategicTiles,
  type TriptychTerritoryState,
} from '../../src/sim/territory';

const APPROVED_NODES = {
  crown: { id: 'crown', kind: 'crown', center: { x: 11, y: 1 } },
  'crown-south': { id: 'crown-south', kind: 'crown', center: { x: 12, y: 22 } },
  'minor-nw': { id: 'minor-nw', kind: 'minor', center: { x: 9, y: 7 } },
  'minor-ne': { id: 'minor-ne', kind: 'minor', center: { x: 14, y: 7 } },
  'minor-w': { id: 'minor-w', kind: 'minor', center: { x: 10, y: 11 } },
  'minor-e': { id: 'minor-e', kind: 'minor', center: { x: 13, y: 12 } },
  'minor-sw': { id: 'minor-sw', kind: 'minor', center: { x: 9, y: 16 } },
  'minor-se': { id: 'minor-se', kind: 'minor', center: { x: 14, y: 16 } },
} as const;

describe('Royal Tactical node topology', () => {
  it('uses the eight approved Crown and minor node coordinates with no center node', () => {
    expect(DEFAULT_CAPTURE_NODES).toEqual(APPROVED_NODES);

    const nodes = Object.values(DEFAULT_CAPTURE_NODES);
    const centers = nodes.map((node) => `${node.center.x},${node.center.y}`);
    expect(nodes).toHaveLength(8);
    expect(nodes.filter((node) => node.kind === 'crown')).toHaveLength(2);
    expect(nodes.filter((node) => node.kind === 'minor')).toHaveLength(6);
    expect(nodes.every((node) => isPlayableCell(node.center.x, node.center.y))).toBe(true);
    expect(centers).not.toContain('11,11');
    expect(centers).not.toContain('12,12');
  });

  it('refuses node capture without orthogonally adjacent faction supply', () => {
    const world = createPhase6SkirmishWorld();
    const crown = world.territory.nodes.crown!;
    const queen = world.units['victoria-queen']!;

    const positioned = {
      ...world,
      units: {
        ...world.units,
        [queen.id]: {
          ...queen,
          position: { ...crown.center },
        },
      },
      occupancy: {
        [`${crown.center.x},${crown.center.y}`]: queen.id,
      },
    };

    const result = evaluateNodeControlForRound(positioned);
    expect(result.state.territory.nodes.crown?.owner).toBeNull();
  });

  it('claims a neutral node when occupation is supplied by an adjacent faction tile', () => {
    const world = createPhase6SkirmishWorld();
    const crown = world.territory.nodes.crown!;
    const queen = world.units['victoria-queen']!;
    const supplyCell = { x: crown.center.x, y: crown.center.y + 1 };
    const supplyId = tileId(supplyCell);
    const tiles = strategicTiles(world);

    const supplied = {
      ...world,
      units: {
        [queen.id]: {
          ...queen,
          position: { ...crown.center },
        },
      },
      occupancy: {
        [`${crown.center.x},${crown.center.y}`]: queen.id,
      },
      combat: {
        [queen.id]: world.combat[queen.id]!,
      },
      territory: {
        ...world.territory,
        tiles: {
          ...tiles,
          [supplyId]: {
            ...tiles[supplyId]!,
            factionControl: 'victoria',
          },
        },
      } as TriptychTerritoryState,
    };

    const result = evaluateNodeControlForRound(supplied);
    expect(result.state.territory.nodes.crown?.owner).toBe('victoria');
  });
});
