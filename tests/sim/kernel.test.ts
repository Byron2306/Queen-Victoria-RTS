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

  it('accepts piece geometry and rejects illegal commands atomically', () => {
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

describe('Phase 1 deterministic chess geometry', () => {
  it('replays a mixed six-piece command stream byte-identically', () => {
    const initial = createWorld([
      piece('p', 'pawn', 0, 0),
      piece('n', 'knight', 2, 2),
      piece('b', 'bishop', 5, 5),
      piece('r', 'rook', 8, 8),
      piece('q', 'queen', 11, 11),
      piece('k', 'king', 14, 14),
    ]);
    const frames = [
      [move(6, 'k', 15, 14), move(1, 'p', 0, 1), move(4, 'r', 8, 10)],
      [move(3, 'b', 7, 7, 1), move(2, 'n', 4, 3, 1)],
      [move(5, 'q', 13, 11, 2)],
      [],
    ] as const;

    const first = runReplay(initial, frames);
    const second = runReplay(initial, frames);
    expect(canonicalSnapshot(first)).toBe(canonicalSnapshot(second));
    expect(first.eventsByTick).toEqual(second.eventsByTick);
    expect(first.state.tick).toBe(4);
    expect(first.state.units.p?.position).toEqual({ x: 0, y: 1 });
    expect(first.state.units.n?.position).toEqual({ x: 4, y: 3 });
    expect(first.state.units.b?.position).toEqual({ x: 7, y: 7 });
    expect(first.state.units.r?.position).toEqual({ x: 8, y: 10 });
    expect(first.state.units.q?.position).toEqual({ x: 13, y: 11 });
    expect(first.state.units.k?.position).toEqual({ x: 15, y: 14 });
  });

  it('keeps blocked and illegal moves atomic except for fixed tick advance', () => {
    const initial = createWorld([
      piece('rook', 'rook', 1, 1),
      piece('blocker', 'pawn', 1, 3),
      piece('knight', 'knight', 4, 4),
    ]);
    const result = stepWorld(initial, [
      move(1, 'rook', 1, 5),
      move(2, 'knight', 5, 5),
    ]);

    expect(result.events).toMatchObject([
      { type: 'move.rejected', unitId: 'rook', reason: 'blocked' },
      { type: 'move.rejected', unitId: 'knight', reason: 'illegal_geometry' },
    ]);
    expect(result.state.tick).toBe(initial.tick + 1);
    expect(result.state.units).toEqual(initial.units);
    expect(result.state.occupancy).toEqual(initial.occupancy);
  });

  it('preserves deterministic command order when legal geometry races for one destination', () => {
    const initial = createWorld([
      piece('left', 'king', 5, 5),
      piece('right', 'king', 7, 5),
    ]);
    const result = stepWorld(initial, [
      move(20, 'left', 6, 5),
      move(10, 'right', 6, 5),
    ]);

    expect(result.events).toMatchObject([
      { type: 'move.accepted', sequence: 10, unitId: 'right' },
      { type: 'move.rejected', sequence: 20, unitId: 'left', reason: 'occupied' },
    ]);
    expect(result.state.occupancy['6,5']).toBe('right');
  });
});
