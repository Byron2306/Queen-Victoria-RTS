import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import { getBattlefieldTopology } from '../../src/sim/battlefield-topology-authority';
import { TRIPTYCH_V2_CAPTURE_NODES } from '../../src/sim/nodes';
import {
  TRIPTYCH_V2_OPENING_UNITS,
  createTriptychOpeningUnits,
} from '../../src/sim/triptych-opening';

const APPROVED_OPENING = [
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

describe('Phase 6 skirmish fixture', () => {
  it('creates the authoritative 32x32 Triptych V2 battlefield', () => {
    const world = createPhase6SkirmishWorld();

    expect(world.width).toBe(32);
    expect(world.height).toBe(32);
    expect(world.tick).toBe(0);
    expect(world.match.status).toBe('active');
  });

  it('uses exactly the approved twelve-unit V2 opening with no starting bishops', () => {
    const topology = getBattlefieldTopology('triptych-v2');
    const canonical = TRIPTYCH_V2_OPENING_UNITS.map(unit => [
      unit.id,
      unit.faction,
      unit.kind,
      unit.position.x,
      unit.position.y,
    ] as const);

    expect(canonical).toEqual(APPROVED_OPENING);
    expect(TRIPTYCH_V2_OPENING_UNITS).toHaveLength(12);
    expect(TRIPTYCH_V2_OPENING_UNITS.some(unit => unit.kind === 'bishop')).toBe(false);
    expect(TRIPTYCH_V2_OPENING_UNITS.every(unit =>
      topology.isPlayableCell(unit.position.x, unit.position.y),
    )).toBe(true);
    expect(new Set(TRIPTYCH_V2_OPENING_UNITS.map(unit => `${unit.position.x},${unit.position.y}`)).size)
      .toBe(12);
  });

  it('returns a deterministic fresh copy from the V2 opening constructor', () => {
    const first = createTriptychOpeningUnits('triptych-v2');
    const second = createTriptychOpeningUnits('triptych-v2');

    expect(first).toEqual(TRIPTYCH_V2_OPENING_UNITS);
    expect(second).toEqual(first);
    expect(first).not.toBe(second);
    expect(first[0]?.position).not.toBe(TRIPTYCH_V2_OPENING_UNITS[0]?.position);
  });

  it('starts no unit on an objective node', () => {
    const nodeCells = new Set(
      Object.values(TRIPTYCH_V2_CAPTURE_NODES)
        .map(node => `${node.center.x},${node.center.y}`),
    );

    expect(TRIPTYCH_V2_OPENING_UNITS.every(unit =>
      !nodeCells.has(`${unit.position.x},${unit.position.y}`),
    )).toBe(true);
  });

  it('constructs the skirmish directly from the V2 opening', () => {
    const world = createPhase6SkirmishWorld();

    expect(Object.keys(world.units).sort())
      .toEqual(TRIPTYCH_V2_OPENING_UNITS.map(unit => unit.id).sort());

    for (const unit of TRIPTYCH_V2_OPENING_UNITS) {
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
      position: { x: 6, y: 16 },
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
    expect(world.units['victoria-king']?.position).toEqual({ x: 2, y: 16 });
    expect(world.units['obsidian-king']?.position).toEqual({ x: 29, y: 15 });
  });

  it('loads the eight approved neutral V2 objectives', () => {
    const world = createPhase6SkirmishWorld();

    expect(Object.keys(world.territory.nodes)).toHaveLength(8);
    expect(world.territory.nodes.crown?.center).toEqual({ x: 15, y: 1 });
    expect(world.territory.nodes['crown-south']?.center).toEqual({ x: 16, y: 30 });
    expect(Object.values(world.territory.nodes).every(node => node.owner === null)).toBe(true);
  });

  it('is deterministic across repeated construction', () => {
    expect(createPhase6SkirmishWorld())
      .toEqual(createPhase6SkirmishWorld());
  });
});
