import { describe, expect, it } from 'vitest';
import { createWorld, validateMoveGeometry, type Faction, type UnitKind, type UnitState } from '../../src/sim';
import {
  applyMaturePolarityFlips,
  queueBanner,
  resolveBannerProgress,
} from '../../src/sim/polarity';

const unit = (kind: UnitKind, x = 7, y = 7, faction: Faction = 'victoria', id: string = kind): UnitState =>
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

  it('rejects geometrically valid landings in the void outside the selected topology mask', () => {
    const rook = unit('rook', 19, 5, 'victoria', 'v2-mask-rook');
    const world = createWorld([rook], { topologyId: 'triptych-v2' });

    expect(validateMoveGeometry(world, rook, { x: 19, y: 10 })).toEqual({ legal: true });
    expect(validateMoveGeometry(world, rook, { x: 20, y: 5 })).toEqual({
      legal: false,
      reason: 'illegal_geometry',
    });
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

  it('invalidates a future knight landing when banner polarity makes origin and destination match', () => {
    const knight = unit('knight', 11, 11, 'victoria', 'polarity-knight');
    let world = createWorld([knight]);
    const destination = { x: 13, y: 12 } as const;

    expect(validateMoveGeometry(world, knight, destination)).toEqual({ legal: true });
    world = flipPolarity(world, destination.x, destination.y);

    expect(validateMoveGeometry(world, knight, destination)).toEqual({
      legal: false,
      reason: 'polarity_mismatch',
    });
  });

  it('breaks a bishop colour corridor when an intermediate diagonal tile flips polarity', () => {
    const bishop = unit('bishop', 11, 11, 'victoria', 'polarity-bishop');
    let world = createWorld([bishop]);
    const destination = { x: 14, y: 14 } as const;

    expect(validateMoveGeometry(world, bishop, destination)).toEqual({ legal: true });
    world = flipPolarity(world, 12, 12);

    expect(validateMoveGeometry(world, bishop, destination)).toEqual({
      legal: false,
      reason: 'polarity_break',
    });
  });
});
