import { describe, expect, it } from 'vitest';

import { createPresentedWorld } from '../../src/client/intelligence/presented-world';
import { getBattlefieldTopology } from '../../src/sim/battlefield-topology-authority';
import {
  getTileMemory,
  refreshFactionIntelligence,
} from '../../src/sim/intelligence';
import { validateMoveKnowledge } from '../../src/sim/knowledge-legality';
import type { Coord, WorldState } from '../../src/sim/types';
import {
  OutOfBoundsError,
  createWorld,
  placeUnit,
} from '../../src/sim/world';

function reposition(
  world: WorldState,
  unitId: string,
  destination: Coord,
): WorldState {
  const unit = world.units[unitId]!;
  const occupancy = { ...world.occupancy };
  delete occupancy[`${unit.position.x},${unit.position.y}`];
  occupancy[`${destination.x},${destination.y}`] = unitId;

  return {
    ...world,
    units: {
      ...world.units,
      [unitId]: {
        ...unit,
        position: destination,
      },
    },
    occupancy,
    combat: {
      ...world.combat,
      [unitId]: {
        ...world.combat[unitId]!,
        guardAnchor: destination,
      },
    },
  };
}

describe('Triptych V2 topology closure gauntlet', () => {
  it('keeps geometry, LOS, fog memory, knowledge, presentation and placement on one V2 authority', () => {
    const topology = getBattlefieldTopology('triptych-v2');
    let world = createWorld([
      {
        id: 'victoria-frontier-rook',
        faction: 'victoria',
        kind: 'rook',
        position: { x: 27, y: 18 },
      },
      {
        id: 'shadow-frontier-pawn',
        faction: 'obsidian',
        kind: 'pawn',
        position: { x: 29, y: 18 },
      },
    ], { topologyId: 'triptych-v2' });

    expect(world.width).toBe(32);
    expect(world.height).toBe(32);
    expect(topology.allPlayableCells()).toHaveLength(496);
    expect(topology.isPlayableCell(27, 18)).toBe(true);
    expect(topology.isPlayableCell(2, 2)).toBe(false);

    world = refreshFactionIntelligence(world, 'victoria');
    expect(getTileMemory(world, 'victoria', { x: 29, y: 18 }).visibility)
      .toBe('observed');

    world = reposition(world, 'victoria-frontier-rook', { x: 16, y: 18 });
    world = refreshFactionIntelligence(world, 'victoria');

    expect(getTileMemory(world, 'victoria', { x: 29, y: 18 }).visibility)
      .toBe('remembered');

    const presented = createPresentedWorld(world, 'victoria');
    expect(presented.tiles).toHaveLength(496);
    expect(presented.tiles.some(tile => tile.cell.x === 27 && tile.cell.y === 18))
      .toBe(true);
    expect(presented.tiles.some(tile => tile.cell.x === 2 && tile.cell.y === 2))
      .toBe(false);
    expect(presented.ghosts).toContainEqual({
      unitId: 'shadow-frontier-pawn',
      cell: { x: 29, y: 18 },
      lastSeenRound: world.turn.round,
    });

    let knowledgeWorld = createWorld([
      {
        id: 'knowledge-rook',
        faction: 'victoria',
        kind: 'rook',
        position: { x: 25, y: 18 },
      },
    ], { topologyId: 'triptych-v2' });

    expect(validateMoveKnowledge(
      knowledgeWorld,
      'victoria',
      { x: 25, y: 18 },
      { x: 28, y: 18 },
      'rook',
    )).toEqual({ legal: false, reason: 'unknown_destination' });

    const destinationMemory = knowledgeWorld.intelligence.byFaction.victoria['28,18']!;
    knowledgeWorld = {
      ...knowledgeWorld,
      intelligence: {
        ...knowledgeWorld.intelligence,
        byFaction: {
          ...knowledgeWorld.intelligence.byFaction,
          victoria: {
            ...knowledgeWorld.intelligence.byFaction.victoria,
            '28,18': {
              ...destinationMemory,
              visibility: 'remembered',
              lastSeenRound: 1,
            },
          },
        },
      },
    };

    expect(validateMoveKnowledge(
      knowledgeWorld,
      'victoria',
      { x: 25, y: 18 },
      { x: 28, y: 18 },
      'rook',
    )).toEqual({ legal: false, reason: 'unknown_path' });

    expect(() => placeUnit(world, {
      id: 'void-intruder',
      faction: 'victoria',
      kind: 'pawn',
      position: { x: 2, y: 2 },
    })).toThrow(OutOfBoundsError);
  });
});
