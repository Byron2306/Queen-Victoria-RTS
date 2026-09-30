import { describe, expect, it } from 'vitest';
import { createWorld, validateMoveGeometry, type Faction, type UnitKind, type UnitState } from '../../src/sim';
import {
  applyMaturePolarityFlips,
  queueBanner,
  resolveBannerProgress,
} from '../../src/sim/polarity';

const unit = (kind: UnitKind, x = 15, y = 15, faction: Faction = 'victoria', id: string = kind): UnitState =>
  ({ id, faction, kind, position: { x, y } });

function flipPolarity<T extends ReturnType<typeof createWorld>>(world: T, x: number, y: number): T {
  let next = queueBanner(world, {
    bannerId: `flip-${x}-${y}`,
    faction: 'victoria',
    cell: { x, y },
  }).state;
  next = resolveBannerProgress(next).state;
  next = resolveBannerProgress(next).state;
  return applyMaturePolarityFlips(next).state as T;
}

describe('Phase 1 chess geometry', () => {
  it.each([
    ['pawn', 16, 15], ['knight', 17, 16], ['bishop', 18, 18],
    ['rook', 15, 20], ['queen', 12, 18], ['king', 16, 16],
  ] as const)('accepts legal %s geometry', (kind, x, y) => {
    const piece = unit(kind);
    expect(validateMoveGeometry(createWorld([piece]), piece, { x, y })).toEqual({ legal: true });
  });

  it.each([
    ['pawn', 15, 16], ['knight', 17, 17], ['bishop', 15, 18],
    ['rook', 17, 17], ['queen', 17, 18], ['king', 17, 15],
  ] as const)('rejects illegal %s geometry', (kind, x, y) => {
    const piece = unit(kind);
    expect(validateMoveGeometry(createWorld([piece]), piece, { x, y })).toEqual({ legal: false, reason: 'illegal_geometry' });
  });

  it('orients pawns east west by faction and rejects zero distance', () => {
    const victoria = unit('pawn', 6, 15, 'victoria', 'v');
    const obsidian = unit('pawn', 25, 16, 'obsidian', 'o');
    const world = createWorld([victoria, obsidian]);
    expect(validateMoveGeometry(world, victoria, { x: 7, y: 15 }).legal).toBe(true);
    expect(validateMoveGeometry(world, victoria, { x: 5, y: 15 }).legal).toBe(false);
    expect(validateMoveGeometry(world, victoria, { x: 6, y: 16 }).legal).toBe(false);
    expect(validateMoveGeometry(world, obsidian, { x: 24, y: 16 }).legal).toBe(true);
    expect(validateMoveGeometry(world, obsidian, { x: 26, y: 16 }).legal).toBe(false);
    expect(validateMoveGeometry(world, obsidian, { x: 25, y: 15 }).legal).toBe(false);
    expect(validateMoveGeometry(world, victoria, victoria.position).legal).toBe(false);
  });

  it.each([
    ['bishop', 13, 12, 19, 18, 16, 15],
    ['rook', 2, 15, 22, 15, 10, 15],
    ['queen', 12, 12, 19, 19, 15, 15],
  ] as const)('blocks %s rays on intermediate occupancy', (kind, fx, fy, tx, ty, bx, by) => {
    const slider = unit(kind, fx, fy, 'victoria', 'slider');
    const blocker = unit('pawn', bx, by, 'victoria', 'blocker');
    expect(validateMoveGeometry(createWorld([slider, blocker]), slider, { x: tx, y: ty }))
      .toEqual({ legal: false, reason: 'blocked' });
  });

  it('allows knights to jump intermediate occupancy', () => {
    const knight = unit('knight', 15, 15, 'victoria', 'n');
    const blockers = [unit('pawn', 15, 16, 'victoria', 'b1'), unit('pawn', 16, 15, 'victoria', 'b2')];
    expect(validateMoveGeometry(createWorld([knight, ...blockers]), knight, { x: 17, y: 16 })).toEqual({ legal: true });
  });

  it('handles long legal rays using integer stepping across the enlarged theatre', () => {
    const rook = unit('rook', 0, 15, 'victoria', 'r');
    const bishop = unit('bishop', 12, 11, 'victoria', 'b');
    expect(validateMoveGeometry(createWorld([rook]), rook, { x: 31, y: 15 }).legal).toBe(true);
    expect(validateMoveGeometry(createWorld([bishop]), bishop, { x: 19, y: 18 }).legal).toBe(true);
  });

  it('invalidates a future knight landing when banner polarity makes origin and destination match', () => {
    const knight = unit('knight', 15, 15, 'victoria', 'polarity-knight');
    let world = createWorld([knight]);
    const destination = { x: 17, y: 16 } as const;

    expect(validateMoveGeometry(world, knight, destination)).toEqual({ legal: true });
    world = flipPolarity(world, destination.x, destination.y);

    expect(validateMoveGeometry(world, knight, destination)).toEqual({
      legal: false,
      reason: 'polarity_mismatch',
    });
  });

  it('breaks a bishop colour corridor when an intermediate diagonal tile flips polarity', () => {
    const bishop = unit('bishop', 13, 13, 'victoria', 'polarity-bishop');
    let world = createWorld([bishop]);
    const destination = { x: 19, y: 19 } as const;

    expect(validateMoveGeometry(world, bishop, destination)).toEqual({ legal: true });
    world = flipPolarity(world, 16, 16);

    expect(validateMoveGeometry(world, bishop, destination)).toEqual({
      legal: false,
      reason: 'polarity_break',
    });
  });
});
