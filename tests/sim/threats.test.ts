import { describe, expect, it } from 'vitest';
import {
  buildThreatMap,
  createWorld,
  projectThreatCells,
  type Faction,
  type UnitKind,
  type UnitState,
} from '../../src/sim';

const unit = (
  id: string,
  kind: UnitKind,
  x: number,
  y: number,
  faction: Faction = 'victoria',
): UnitState => ({ id, kind, faction, position: { x, y } });

const keys = (cells: readonly Readonly<{ x: number; y: number }>[]) =>
  cells.map(({ x, y }) => `${x},${y}`);

describe('Phase 1 threat projection', () => {
  it('gives pawns diagonal attack threats distinct from forward movement', () => {
    const victoria = unit('v', 'pawn', 7, 7, 'victoria');
    const obsidian = unit('o', 'pawn', 10, 10, 'obsidian');
    const world = createWorld([victoria, obsidian]);

    expect(keys(projectThreatCells(world, victoria))).toEqual(['6,8', '8,8']);
    expect(keys(projectThreatCells(world, obsidian))).toEqual(['9,9', '11,9']);
  });

  it('projects all in-bounds knight and king threats at edges', () => {
    const knight = unit('n', 'knight', 0, 0);
    const king = unit('k', 'king', 15, 15);
    const world = createWorld([knight, king]);

    expect(keys(projectThreatCells(world, knight))).toEqual(['2,1', '1,2']);
    expect(keys(projectThreatCells(world, king))).toEqual(['14,14', '15,14', '14,15']);
  });

  it('includes the first occupied square on a sliding ray and stops beyond it', () => {
    const rook = unit('r', 'rook', 2, 2);
    const blocker = unit('blocker', 'pawn', 2, 5, 'obsidian');
    const world = createWorld([rook, blocker]);
    const threatened = keys(projectThreatCells(world, rook));

    expect(threatened).toContain('2,5');
    expect(threatened).not.toContain('2,6');
    expect(threatened).toContain('2,0');
    expect(threatened).toContain('15,2');
  });

  it('projects bishop and queen rays through empty cells but never beyond blockers', () => {
    const bishop = unit('b', 'bishop', 4, 4);
    const queen = unit('q', 'queen', 10, 10);
    const bishopBlocker = unit('bb', 'pawn', 6, 6);
    const queenBlocker = unit('qb', 'pawn', 10, 12, 'obsidian');
    const world = createWorld([bishop, queen, bishopBlocker, queenBlocker]);

    const bishopThreats = keys(projectThreatCells(world, bishop));
    expect(bishopThreats).toContain('6,6');
    expect(bishopThreats).not.toContain('7,7');

    const queenThreats = keys(projectThreatCells(world, queen));
    expect(queenThreats).toContain('10,12');
    expect(queenThreats).not.toContain('10,13');
    expect(queenThreats).toContain('15,10');
    expect(queenThreats).toContain('15,15');
  });

  it('builds a deterministic faction threat map with sorted source ids', () => {
    const world = createWorld([
      unit('z-knight', 'knight', 4, 4),
      unit('a-rook', 'rook', 0, 0),
      unit('enemy', 'queen', 15, 15, 'obsidian'),
    ]);

    const first = buildThreatMap(world, 'victoria');
    const second = buildThreatMap(world, 'victoria');

    expect(first).toEqual(second);
    expect(first['0,1']).toEqual(['a-rook']);
    expect(first['5,2']).toEqual(['z-knight']);
    expect(first['0,4']).toEqual(['a-rook']);
    expect(Object.values(first).flat()).not.toContain('enemy');
  });

  it('records overlapping pressure from multiple friendly units deterministically', () => {
    const world = createWorld([
      unit('rook-b', 'rook', 5, 0),
      unit('rook-a', 'rook', 0, 5),
    ]);

    const map = buildThreatMap(world, 'victoria');
    expect(map['5,5']).toEqual(['rook-a', 'rook-b']);
  });
});
