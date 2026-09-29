import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import {
  allPlayableCells,
  tileId,
} from '../../src/sim/board-topology';
import { fortificationsFor } from '../../src/sim/fortifications';
import { DEFAULT_CAPTURE_NODES } from '../../src/sim/nodes';
import {
  TRIPTYCH_OPENING_FORTIFICATIONS,
  TRIPTYCH_OPENING_UNITS,
} from '../../src/sim/triptych-opening';
import { strategicTiles } from '../../src/sim/territory';

describe('Final 24x24 Royal War Triptych battlefield gauntlet', () => {
  it('boots the exact approved battlefield deterministically', () => {
    const world = createPhase6SkirmishWorld();
    const repeat = createPhase6SkirmishWorld();
    const tiles = strategicTiles(world);
    const forts = fortificationsFor(world);

    expect(world).toEqual(repeat);
    expect(world.width).toBe(24);
    expect(world.height).toBe(24);
    expect(allPlayableCells()).toHaveLength(288);

    expect(Object.values(DEFAULT_CAPTURE_NODES).map(node => [
      node.id,
      node.kind,
      node.center.x,
      node.center.y,
    ])).toEqual([
      ['crown', 'crown', 11, 1],
      ['crown-south', 'crown', 12, 22],
      ['minor-nw', 'minor', 9, 7],
      ['minor-ne', 'minor', 14, 7],
      ['minor-w', 'minor', 10, 11],
      ['minor-e', 'minor', 13, 12],
      ['minor-sw', 'minor', 9, 16],
      ['minor-se', 'minor', 14, 16],
    ]);

    expect(Object.keys(world.units).sort())
      .toEqual(TRIPTYCH_OPENING_UNITS.map(unit => unit.id).sort());
    expect(TRIPTYCH_OPENING_UNITS).toHaveLength(12);
    expect(TRIPTYCH_OPENING_UNITS.some(unit => unit.kind === 'bishop')).toBe(false);

    expect(Object.keys(forts).sort())
      .toEqual(TRIPTYCH_OPENING_FORTIFICATIONS.map(fort => fort.id).sort());
    expect(Object.values(forts)).toHaveLength(6);

    expect(Object.values(tiles).filter(tile => tile.factionControl === 'victoria'))
      .toHaveLength(39);
    expect(Object.values(tiles).filter(tile => tile.factionControl === 'obsidian'))
      .toHaveLength(39);
    expect(Object.values(tiles).filter(tile => tile.factionControl === 'neutral'))
      .toHaveLength(210);

    expect(world.production.reinforcementAnchors).toEqual({
      victoria: { x: 2, y: 12 },
      obsidian: { x: 21, y: 11 },
    });

    for (const unit of TRIPTYCH_OPENING_UNITS) {
      expect(tiles[tileId(unit.position)]?.factionControl).toBe(unit.faction);
    }
    for (const fort of TRIPTYCH_OPENING_FORTIFICATIONS) {
      expect(tiles[tileId(fort.cell)]?.factionControl).toBe(fort.faction);
      expect(fort.durability).toBe(3);
    }

    for (let y = 8; y <= 15; y += 1) {
      for (let x = 9; x <= 14; x += 1) {
        expect(tiles[`${x},${y}`]?.factionControl).toBe('neutral');
      }
    }

    for (const crownId of ['crown', 'crown-south'] as const) {
      const node = world.territory.nodes[crownId]!;
      expect(node.owner).toBeNull();
      expect(world.occupancy[`${node.center.x},${node.center.y}`]).toBeUndefined();
    }
  });
});
