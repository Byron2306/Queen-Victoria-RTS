import { describe, expect, it } from 'vitest';
import { getBattlefieldTopology } from '../../src/sim/battlefield-topology-authority';
import {
  TRIPTYCH_V2_OPENING_FORTIFICATIONS,
  TRIPTYCH_V2_OPENING_UNITS,
  createTriptychOpeningUnits,
  triptychOpeningFortifications,
} from '../../src/sim/triptych-opening';

const APPROVED_V2_UNITS = [
  ['victoria-king', 'victoria', 'king', 2, 16],
  ['victoria-queen', 'victoria', 'queen', 6, 16],
  ['victoria-rook-a', 'victoria', 'rook', 4, 13],
  ['victoria-knight-a', 'victoria', 'knight', 4, 19],
  ['victoria-pawn-a', 'victoria', 'pawn', 6, 15],
  ['victoria-pawn-b', 'victoria', 'pawn', 6, 17],
  ['obsidian-king', 'obsidian', 'king', 29, 15],
  ['obsidian-queen', 'obsidian', 'queen', 25, 15],
  ['obsidian-rook-a', 'obsidian', 'rook', 27, 18],
  ['obsidian-knight-a', 'obsidian', 'knight', 27, 12],
  ['obsidian-pawn-a', 'obsidian', 'pawn', 25, 16],
  ['obsidian-pawn-b', 'obsidian', 'pawn', 25, 14],
] as const;

const APPROVED_V2_FORTS = [
  ['victoria-bastion-north', 'victoria', 'bastion', 7, 13, 3],
  ['victoria-redoubt', 'victoria', 'redoubt', 7, 16, 3],
  ['victoria-bastion-south', 'victoria', 'bastion', 7, 19, 3],
  ['obsidian-bastion-south', 'obsidian', 'bastion', 24, 18, 3],
  ['obsidian-redoubt', 'obsidian', 'redoubt', 24, 15, 3],
  ['obsidian-bastion-north', 'obsidian', 'bastion', 24, 12, 3],
] as const;

describe('Triptych V2 opening geography', () => {
  it('pins the frozen 32x32 opening armies exactly', () => {
    expect(TRIPTYCH_V2_OPENING_UNITS.map(unit => [
      unit.id,
      unit.faction,
      unit.kind,
      unit.position.x,
      unit.position.y,
    ] as const)).toEqual(APPROVED_V2_UNITS);

    expect(createTriptychOpeningUnits('triptych-v2')).toEqual(TRIPTYCH_V2_OPENING_UNITS);
  });

  it('pins the frozen 32x32 prepared fort belts exactly', () => {
    expect(TRIPTYCH_V2_OPENING_FORTIFICATIONS.map(fort => [
      fort.id,
      fort.faction,
      fort.kind,
      fort.cell.x,
      fort.cell.y,
      fort.durability,
    ] as const)).toEqual(APPROVED_V2_FORTS);

    expect(triptychOpeningFortifications('triptych-v2')).toEqual(TRIPTYCH_V2_OPENING_FORTIFICATIONS);
  });

  it('keeps every V2 opening unit and fort on the 32x32 playable mask with unique cells', () => {
    const topology = getBattlefieldTopology('triptych-v2');
    const unitCells = TRIPTYCH_V2_OPENING_UNITS.map(unit => `${unit.position.x},${unit.position.y}`);
    const fortCells = TRIPTYCH_V2_OPENING_FORTIFICATIONS.map(fort => `${fort.cell.x},${fort.cell.y}`);

    expect(TRIPTYCH_V2_OPENING_UNITS.every(unit =>
      topology.isPlayableCell(unit.position.x, unit.position.y),
    )).toBe(true);
    expect(TRIPTYCH_V2_OPENING_FORTIFICATIONS.every(fort =>
      topology.isPlayableCell(fort.cell.x, fort.cell.y),
    )).toBe(true);
    expect(new Set(unitCells).size).toBe(unitCells.length);
    expect(new Set(fortCells).size).toBe(fortCells.length);
    expect(fortCells.every(cell => !unitCells.includes(cell))).toBe(true);
  });
});
