import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import { isPlayableCell } from '../../src/sim/board-topology';
import { fortificationsFor } from '../../src/sim/fortifications';
import { DEFAULT_CAPTURE_NODES } from '../../src/sim/nodes';
import {
  TRIPTYCH_OPENING_FORTIFICATIONS,
  TRIPTYCH_OPENING_UNITS,
} from '../../src/sim/triptych-opening';

const APPROVED_FORTS = [
  ['victoria-bastion-north', 'victoria', 'bastion', 7, 13, 3],
  ['victoria-redoubt', 'victoria', 'redoubt', 7, 16, 3],
  ['victoria-bastion-south', 'victoria', 'bastion', 7, 19, 3],
  ['obsidian-bastion-south', 'obsidian', 'bastion', 24, 18, 3],
  ['obsidian-redoubt', 'obsidian', 'redoubt', 24, 15, 3],
  ['obsidian-bastion-north', 'obsidian', 'bastion', 24, 12, 3],
] as const;

describe('Triptych prepared opening fortification belts', () => {
  it('defines exactly the approved mirrored three-fort belts', () => {
    expect(TRIPTYCH_OPENING_FORTIFICATIONS.map(fort => [
      fort.id,
      fort.faction,
      fort.kind,
      fort.cell.x,
      fort.cell.y,
      fort.durability,
    ] as const)).toEqual(APPROVED_FORTS);

    expect(TRIPTYCH_OPENING_FORTIFICATIONS).toHaveLength(6);
    expect(TRIPTYCH_OPENING_FORTIFICATIONS.every(fort => fort.durability === 3)).toBe(true);
    expect(TRIPTYCH_OPENING_FORTIFICATIONS.every(fort =>
      isPlayableCell(fort.cell.x, fort.cell.y),
    )).toBe(true);
  });

  it('uses unique cells that overlap neither opening units nor objective nodes', () => {
    const fortCells = TRIPTYCH_OPENING_FORTIFICATIONS.map(
      fort => `${fort.cell.x},${fort.cell.y}`,
    );
    const unitCells = new Set(
      TRIPTYCH_OPENING_UNITS.map(unit => `${unit.position.x},${unit.position.y}`),
    );
    const nodeCells = new Set(
      Object.values(DEFAULT_CAPTURE_NODES)
        .map(node => `${node.center.x},${node.center.y}`),
    );

    expect(new Set(fortCells).size).toBe(6);
    expect(fortCells.every(cell => !unitCells.has(cell))).toBe(true);
    expect(fortCells.every(cell => !nodeCells.has(cell))).toBe(true);
  });

  it('seeds all six forts into the canonical skirmish as real simulation fortifications', () => {
    const world = createPhase6SkirmishWorld();
    const forts = fortificationsFor(world);

    expect(Object.keys(forts).sort()).toEqual(
      TRIPTYCH_OPENING_FORTIFICATIONS.map(fort => fort.id).sort(),
    );
    for (const fort of TRIPTYCH_OPENING_FORTIFICATIONS) {
      expect(forts[fort.id]).toEqual(fort);
    }
  });
});
