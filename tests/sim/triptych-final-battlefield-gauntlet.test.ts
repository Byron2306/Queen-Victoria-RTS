import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import { getBattlefieldTopology } from '../../src/sim/battlefield-topology-authority';
import { tileId } from '../../src/sim/board-topology';
import { fortificationsFor } from '../../src/sim/fortifications';
import { TRIPTYCH_V2_CAPTURE_NODES } from '../../src/sim/nodes';
import {
  TRIPTYCH_V2_OPENING_FORTIFICATIONS,
  TRIPTYCH_V2_OPENING_UNITS,
} from '../../src/sim/triptych-opening';
import { strategicTiles } from '../../src/sim/territory';

describe('Final 32x32 Royal War Triptych V2 battlefield gauntlet', () => {
  it('boots the exact approved battlefield deterministically', () => {
    const world = createPhase6SkirmishWorld();
    const repeat = createPhase6SkirmishWorld();
    const tiles = strategicTiles(world);
    const forts = fortificationsFor(world);
    const topology = getBattlefieldTopology('triptych-v2');

    expect(world).toEqual(repeat);
    expect(world.width).toBe(32);
    expect(world.height).toBe(32);
    expect(topology.allPlayableCells()).toHaveLength(496);

    expect(Object.values(TRIPTYCH_V2_CAPTURE_NODES).map(node => [
      node.id,
      node.kind,
      node.center.x,
      node.center.y,
    ])).toEqual([
      ['crown', 'crown', 15, 1],
      ['crown-south', 'crown', 16, 30],
      ['minor-nw', 'minor', 12, 10],
      ['minor-ne', 'minor', 19, 10],
      ['minor-w', 'minor', 13, 15],
      ['minor-e', 'minor', 18, 16],
      ['minor-sw', 'minor', 12, 21],
      ['minor-se', 'minor', 19, 21],
    ]);

    expect(Object.keys(world.units).sort())
      .toEqual(TRIPTYCH_V2_OPENING_UNITS.map(unit => unit.id).sort());
    expect(TRIPTYCH_V2_OPENING_UNITS).toHaveLength(12);
    expect(TRIPTYCH_V2_OPENING_UNITS.some(unit => unit.kind === 'bishop')).toBe(false);

    expect(Object.keys(forts).sort())
      .toEqual(TRIPTYCH_V2_OPENING_FORTIFICATIONS.map(fort => fort.id).sort());
    expect(Object.values(forts)).toHaveLength(6);

    expect(Object.values(tiles).filter(tile => tile.factionControl === 'victoria'))
      .toHaveLength(80);
    expect(Object.values(tiles).filter(tile => tile.factionControl === 'obsidian'))
      .toHaveLength(80);
    expect(Object.values(tiles).filter(tile => tile.factionControl === 'neutral'))
      .toHaveLength(336);

    expect(world.production.reinforcementAnchors).toEqual({
      victoria: { x: 1, y: 16 },
      obsidian: { x: 30, y: 15 },
    });

    for (const unit of TRIPTYCH_V2_OPENING_UNITS) {
      expect(tiles[tileId(unit.position)]?.factionControl).toBe(unit.faction);
    }
    for (const fort of TRIPTYCH_V2_OPENING_FORTIFICATIONS) {
      expect(tiles[tileId(fort.cell)]?.factionControl).toBe(fort.faction);
      expect(fort.durability).toBe(3);
    }

    for (let y = 11; y <= 20; y += 1) {
      for (let x = 8; x <= 23; x += 1) {
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
