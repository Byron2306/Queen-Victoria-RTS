import { describe, expect, it } from 'vitest';
import { createWorld } from '../../src/sim/world';
import { validateMoveGeometry } from '../../src/sim/geometry';
import { projectThreatCells } from '../../src/sim/threats';
import type { UnitState } from '../../src/sim/types';

function pawn(id: string, faction: 'victoria' | 'obsidian', x: number, y: number): UnitState {
  return { id, faction, kind: 'pawn', position: { x, y } };
}

const keys = (cells: readonly Readonly<{ x: number; y: number }>[]) =>
  cells.map(({ x, y }) => `${x},${y}`);

describe('Triptych V2 pawn east west semantics', () => {
  it('moves Victoria east and Obsidian west', () => {
    const victoria = pawn('v', 'victoria', 6, 15);
    const obsidian = pawn('o', 'obsidian', 25, 16);
    const world = createWorld([victoria, obsidian], { topologyId: 'triptych-v2' });

    expect(validateMoveGeometry(world, victoria, { x: 7, y: 15 })).toEqual({ legal: true });
    expect(validateMoveGeometry(world, victoria, { x: 6, y: 16 }).legal).toBe(false);
    expect(validateMoveGeometry(world, obsidian, { x: 24, y: 16 })).toEqual({ legal: true });
    expect(validateMoveGeometry(world, obsidian, { x: 25, y: 15 }).legal).toBe(false);
  });

  it('projects pawn threats diagonally along the east west advance axis', () => {
    const victoria = pawn('v', 'victoria', 6, 15);
    const obsidian = pawn('o', 'obsidian', 25, 16);
    const world = createWorld([victoria, obsidian], { topologyId: 'triptych-v2' });

    expect(keys(projectThreatCells(world, victoria))).toEqual(['7,14', '7,16']);
    expect(keys(projectThreatCells(world, obsidian))).toEqual(['24,15', '24,17']);
  });
});
