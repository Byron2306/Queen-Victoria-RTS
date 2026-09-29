import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import { isPlayableCell } from '../../src/sim/board-topology';
import { TRIPTYCH_OPENING_UNITS } from '../../src/sim/triptych-opening';

const APPROVED_OPENING = [
  ['victoria-king', 'victoria', 'king', 1, 11],
  ['victoria-queen', 'victoria', 'queen', 5, 11],
  ['victoria-rook-a', 'victoria', 'rook', 3, 9],
  ['victoria-knight-a', 'victoria', 'knight', 3, 13],
  ['victoria-pawn-a', 'victoria', 'pawn', 5, 10],
  ['victoria-pawn-b', 'victoria', 'pawn', 5, 12],
  ['obsidian-king', 'obsidian', 'king', 22, 12],
  ['obsidian-queen', 'obsidian', 'queen', 18, 12],
  ['obsidian-rook-a', 'obsidian', 'rook', 20, 14],
  ['obsidian-knight-a', 'obsidian', 'knight', 20, 10],
  ['obsidian-pawn-a', 'obsidian', 'pawn', 18, 13],
  ['obsidian-pawn-b', 'obsidian', 'pawn', 18, 11],
] as const;

describe('Phase 6 skirmish fixture', () => {
  it('creates the authoritative 24x24 Triptych battlefield', () => {
    const world = createPhase6SkirmishWorld();

    expect(world.width).toBe(24);
    expect(world.height).toBe(24);
    expect(world.tick).toBe(0);
    expect(world.match.status).toBe('active');
  });

  it('uses exactly the approved twelve-unit opening with no starting bishops', () => {
    const canonical = TRIPTYCH_OPENING_UNITS.map(unit => [
      unit.id,
      unit.faction,
      unit.kind,
      unit.position.x,
      unit.position.y,
    ] as const);

    expect(canonical).toEqual(APPROVED_OPENING);
    expect(TRIPTYCH_OPENING_UNITS).toHaveLength(12);
    expect(TRIPTYCH_OPENING_UNITS.some(unit => unit.kind === 'bishop')).toBe(false);
    expect(TRIPTYCH_OPENING_UNITS.every(unit =>
      isPlayableCell(unit.position.x, unit.position.y),
    )).toBe(true);
    expect(new Set(TRIPTYCH_OPENING_UNITS.map(unit => `${unit.position.x},${unit.position.y}`)).size)
      .toBe(12);
  });

  it('constructs the skirmish directly from the canonical opening', () => {
    const world = createPhase6SkirmishWorld();

    expect(Object.keys(world.units).sort())
      .toEqual(TRIPTYCH_OPENING_UNITS.map(unit => unit.id).sort());

    for (const unit of TRIPTYCH_OPENING_UNITS) {
      expect(world.units[unit.id]).toMatchObject(unit);
    }
  });

  it('binds Victoria as the player hero', () => {
    const world = createPhase6SkirmishWorld();

    expect(world.heroes.victoria).toMatchObject({
      heroUnitId: 'victoria-queen',
      status: 'alive',
      level: 1,
      xp: 0,
    });

    expect(world.units['victoria-queen']).toMatchObject({
      faction: 'victoria',
      kind: 'queen',
      position: { x: 5, y: 11 },
    });
  });

  it('enables only the balanced Obsidian AI', () => {
    const world = createPhase6SkirmishWorld();

    expect(world.ai.victoria.enabled).toBe(false);
    expect(world.ai.obsidian).toMatchObject({
      enabled: true,
      profile: 'balanced',
      commitments: [],
      pendingCommands: [],
    });
  });

  it('places both sovereign kings on their approved deep home cells', () => {
    const world = createPhase6SkirmishWorld();

    expect(world.match.sovereigns.victoria.kingId).toBe('victoria-king');
    expect(world.match.sovereigns.obsidian.kingId).toBe('obsidian-king');
    expect(world.units['victoria-king']?.position).toEqual({ x: 1, y: 11 });
    expect(world.units['obsidian-king']?.position).toEqual({ x: 22, y: 12 });
  });

  it('loads the eight approved neutral objectives', () => {
    const world = createPhase6SkirmishWorld();

    expect(Object.keys(world.territory.nodes)).toHaveLength(8);
    expect(world.territory.nodes.crown?.center).toEqual({ x: 11, y: 1 });
    expect(world.territory.nodes['crown-south']?.center).toEqual({ x: 12, y: 22 });
    expect(Object.values(world.territory.nodes).every(node => node.owner === null)).toBe(true);
  });

  it('is deterministic across repeated construction', () => {
    expect(createPhase6SkirmishWorld())
      .toEqual(createPhase6SkirmishWorld());
  });
});
