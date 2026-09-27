import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE, TICK_MS, CellOccupiedError, OutOfBoundsError,
  advanceTick, canonicalSnapshot, createWorld, placeUnit, runReplay, stepWorld,
  type MoveCommand, type UnitState,
} from '../../src/sim';

const piece = (id: string, kind: UnitState['kind'], x: number, y: number, faction: UnitState['faction'] = 'victoria'): UnitState => ({ id, faction, kind, position: { x, y } });
const pawn = (id: string, x: number, y: number): UnitState => piece(id, 'pawn', x, y);
const move = (sequence: number, unitId: string, x: number, y: number, issuedTick = 0): MoveCommand => ({ type: 'move', sequence, issuedTick, unitId, to: { x, y } });

describe('Phase 0 contracts', () => {
  it('locks the royal board and fixed clock', () => {
    expect(BOARD_SIZE).toBe(16);
    expect(TICK_MS).toBe(100);
    let world = createWorld();
    for (let i = 0; i < 10; i++) world = advanceTick(world);
    expect(world.tick * TICK_MS).toBe(1000);
  });

  it('owns occupancy immutably and rejects invalid placement', () => {
    const empty = createWorld();
    const placed = placeUnit(empty, pawn('p1', 1, 1));
    expect(empty.units).toEqual({});
    expect(placed.occupancy['1,1']).toBe('p1');
    expect(() => placeUnit(placed, pawn('p2', 1, 1))).toThrow(CellOccupiedError);
    expect(() => placeUnit(placed, pawn('p3', 16, 0))).toThrow(OutOfBoundsError);
    expect(placed.occupancy).toEqual({ '1,1': 'p1' });
  });

  it('accepts one-cell orthogonal moves and rejects illegal commands atomically', () => {
    const initial = createWorld([pawn('p1', 1, 1)]);
    const legal = stepWorld(initial, [move(1, 'p1', 1, 2)]);
    expect(legal.state.units.p1?.position).toEqual({ x: 1, y: 2 });
    expect(legal.events[0]?.type).toBe('move.accepted');
    expect(initial.units.p1?.position).toEqual({ x: 1, y: 1 });

    const illegal = stepWorld(initial, [move(1, 'p1', 2, 2), move(2, 'missing', 1, 2)]);
    expect(illegal.state.units.p1?.position).toEqual({ x: 1, y: 1 });
    expect(illegal.events).toMatchObject([
      { type: 'move.rejected', reason: 'illegal_geometry' },
      { type: 'move.rejected', reason: 'missing_unit' },
    ]);
  });

  it('resolves same-cell races by sequence', () => {
    const initial = createWorld([piece('a', 'king', 0, 1), piece('b', 'king', 2, 1)]);
    const result = stepWorld(initial, [move(20, 'a', 1, 1), move(10, 'b', 1, 1)]);
    expect(result.state.occupancy['1,1']).toBe('b');
    expect(result.events).toMatchObject([
      { type: 'move.accepted', sequence: 10, unitId: 'b' },
      { type: 'move.rejected', sequence: 20, unitId: 'a', reason: 'occupied' },
    ]);
  });

  it('produces byte-equivalent canonical replay snapshots', () => {
    const initial = createWorld([piece('z', 'rook', 1, 1), piece('a', 'king', 4, 4)]);
    const frames = [
      [move(2, 'z', 2, 1)],
      [move(3, 'a', 4, 5, 1)],
      [],
      [move(4, 'z', 3, 1, 3)],
    ] as const;
    const first = canonicalSnapshot(runReplay(initial, frames));
    const second = canonicalSnapshot(runReplay(initial, frames));
    expect(first).toBe(second);
    expect(JSON.parse(first).state.tick).toBe(4);
  });
});
