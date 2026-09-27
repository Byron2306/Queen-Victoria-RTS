import { describe, expect, it } from 'vitest';
import { createWorld, validateMoveGeometry, type Faction, type UnitKind, type UnitState } from '../../src/sim';

const unit = (kind: UnitKind, x = 7, y = 7, faction: Faction = 'victoria', id = kind): UnitState =>
  ({ id, faction, kind, position: { x, y } });

describe('Phase 1 chess geometry', () => {
  it.each([
    ['pawn', 7, 8], ['knight', 9, 8], ['bishop', 10, 10],
    ['rook', 7, 13], ['queen', 2, 12], ['king', 8, 8],
  ] as const)('accepts legal %s geometry', (kind, x, y) => {
    const piece = unit(kind);
    expect(validateMoveGeometry(createWorld([piece]), piece, { x, y })).toEqual({ legal: true });
  });

  it.each([
    ['pawn', 8, 7], ['knight', 9, 9], ['bishop', 7, 10],
    ['rook', 9, 9], ['queen', 9, 10], ['king', 9, 7],
  ] as const)('rejects illegal %s geometry', (kind, x, y) => {
    const piece = unit(kind);
    expect(validateMoveGeometry(createWorld([piece]), piece, { x, y })).toEqual({ legal: false, reason: 'illegal_geometry' });
  });

  it('orients pawns by faction and rejects zero distance', () => {
    const victoria = unit('pawn', 4, 4, 'victoria', 'v');
    const obsidian = unit('pawn', 4, 11, 'obsidian', 'o');
    const world = createWorld([victoria, obsidian]);
    expect(validateMoveGeometry(world, victoria, { x: 4, y: 5 }).legal).toBe(true);
    expect(validateMoveGeometry(world, victoria, { x: 4, y: 3 }).legal).toBe(false);
    expect(validateMoveGeometry(world, obsidian, { x: 4, y: 10 }).legal).toBe(true);
    expect(validateMoveGeometry(world, obsidian, { x: 4, y: 12 }).legal).toBe(false);
    expect(validateMoveGeometry(world, victoria, victoria.position).legal).toBe(false);
  });

  it.each([
    ['bishop', 2, 2, 8, 8, 5, 5],
    ['rook', 2, 2, 2, 10, 2, 6],
    ['queen', 2, 2, 10, 2, 6, 2],
  ] as const)('blocks %s rays on intermediate occupancy', (kind, fx, fy, tx, ty, bx, by) => {
    const slider = unit(kind, fx, fy, 'victoria', 'slider');
    const blocker = unit('pawn', bx, by, 'victoria', 'blocker');
    expect(validateMoveGeometry(createWorld([slider, blocker]), slider, { x: tx, y: ty }))
      .toEqual({ legal: false, reason: 'blocked' });
  });

  it('allows knights to jump intermediate occupancy', () => {
    const knight = unit('knight', 1, 1, 'victoria', 'n');
    const blockers = [unit('pawn', 1, 2, 'victoria', 'b1'), unit('pawn', 2, 1, 'victoria', 'b2')];
    expect(validateMoveGeometry(createWorld([knight, ...blockers]), knight, { x: 3, y: 2 })).toEqual({ legal: true });
  });

  it('handles long edge-to-edge rays using integer stepping', () => {
    const rook = unit('rook', 0, 0, 'victoria', 'r');
    const bishop = unit('bishop', 0, 0, 'victoria', 'b');
    expect(validateMoveGeometry(createWorld([rook]), rook, { x: 15, y: 0 }).legal).toBe(true);
    expect(validateMoveGeometry(createWorld([bishop]), bishop, { x: 15, y: 15 }).legal).toBe(true);
  });
});
