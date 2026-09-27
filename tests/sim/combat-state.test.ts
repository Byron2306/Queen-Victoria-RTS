import { describe, expect, it } from 'vitest';
import {
  UNIT_COMBAT_PROFILES, canonicalSnapshot, combatStateFor, createWorld, runReplay,
  type UnitKind, type UnitState,
} from '../../src/sim';

const unit = (id: string, kind: UnitKind, x: number, y: number): UnitState => ({
  id, faction: 'victoria', kind, position: { x, y },
});

describe('Phase 2 combat state', () => {
  it('locks the initial deterministic combat profiles', () => {
    expect(UNIT_COMBAT_PROFILES).toEqual({
      pawn: { maxHealth: 60, damage: 8, cooldownTicks: 10, range: 1, acquisitionRange: 3, leashRange: 4 },
      knight: { maxHealth: 90, damage: 14, cooldownTicks: 12, range: 1, acquisitionRange: 4, leashRange: 5 },
      bishop: { maxHealth: 70, damage: 12, cooldownTicks: 15, range: 4, acquisitionRange: 5, leashRange: 5 },
      rook: { maxHealth: 130, damage: 18, cooldownTicks: 18, range: 5, acquisitionRange: 5, leashRange: 4 },
      queen: { maxHealth: 180, damage: 16, cooldownTicks: 10, range: 4, acquisitionRange: 6, leashRange: 6 },
      king: { maxHealth: 300, damage: 10, cooldownTicks: 20, range: 2, acquisitionRange: 4, leashRange: 0 },
    });
  });

  it('creates guard combat state anchored to spawn without changing occupancy', () => {
    const rook = unit('r', 'rook', 3, 4);
    const state = combatStateFor(rook);
    expect(state).toEqual({ health: 130, cooldownTicks: 0, targetId: null, stance: 'guard', guardAnchor: { x: 3, y: 4 } });

    const world = createWorld([rook]);
    expect(world.combat.r).toEqual(state);
    expect(world.occupancy).toEqual({ '3,4': 'r' });
  });

  it('includes combat state in canonical replay snapshots', () => {
    const initial = createWorld([unit('q', 'queen', 5, 5), unit('k', 'king', 0, 0)]);
    const first = canonicalSnapshot(runReplay(initial, [[], []]));
    const second = canonicalSnapshot(runReplay(initial, [[], []]));
    expect(first).toBe(second);
    expect(JSON.parse(first).state.combat.q.health).toBe(180);
    expect(JSON.parse(first).state.combat.k.guardAnchor).toEqual({ x: 0, y: 0 });
  });
});
