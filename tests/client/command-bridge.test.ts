import { describe, expect, it } from 'vitest';
import { ClientCommandBridge } from '../../src/client/runtime/command-bridge';

describe('Phase 6 client command bridge', () => {
  it('schedules player commands for T+1', () => {
    const bridge = new ClientCommandBridge();

    bridge.move(10, 'victoria-queen', { x: 4, y: 12 });

    expect(bridge.drain(10)).toEqual([]);

    expect(bridge.drain(11)).toEqual([
      {
        type: 'move',
        sequence: 0,
        issuedTick: 10,
        unitId: 'victoria-queen',
        to: { x: 4, y: 12 },
      },
    ]);
  });

  it('drains each command only once', () => {
    const bridge = new ClientCommandBridge();

    bridge.attack(4, 'victoria-rook-a', 'obsidian-pawn-a');

    expect(bridge.drain(5)).toHaveLength(1);
    expect(bridge.drain(5)).toEqual([]);
    expect(bridge.drain(6)).toEqual([]);
  });

  it('assigns deterministic sequence numbers across command types', () => {
    const bridge = new ClientCommandBridge();

    bridge.move(20, 'victoria-queen', { x: 4, y: 12 });
    bridge.attack(20, 'victoria-rook-a', 'obsidian-pawn-a');
    bridge.recruit(20, 'victoria', 'pawn');
    bridge.heroAbility(
      20,
      'victoria',
      'victoria-queen',
      'royal_decree',
    );
    bridge.promote(
      20,
      'victoria',
      'victoria-pawn-a',
      'rook',
    );

    const commands = bridge.drain(21);

    expect(commands.map(command => command.sequence))
      .toEqual([0, 1, 2, 3, 4]);

    expect(commands.map(command => command.type))
      .toEqual([
        'move',
        'attack',
        'recruit',
        'hero_ability',
        'promote',
      ]);
  });

  it('preserves exact SimCommand payloads', () => {
    const bridge = new ClientCommandBridge();

    bridge.recruit(7, 'victoria', 'bishop');

    bridge.heroAbility(
      7,
      'victoria',
      'victoria-queen',
      'hold_the_crown',
    );

    expect(bridge.drain(8)).toEqual([
      {
        type: 'recruit',
        sequence: 0,
        issuedTick: 7,
        faction: 'victoria',
        unitKind: 'bishop',
      },
      {
        type: 'hero_ability',
        sequence: 1,
        issuedTick: 7,
        faction: 'victoria',
        heroId: 'victoria-queen',
        ability: 'hold_the_crown',
      },
    ]);
  });

  it('keeps future commands queued', () => {
    const bridge = new ClientCommandBridge();

    bridge.move(30, 'victoria-queen', { x: 4, y: 12 });
    bridge.move(31, 'victoria-queen', { x: 5, y: 11 });

    expect(bridge.drain(31)).toHaveLength(1);

    expect(bridge.drain(32)).toEqual([
      {
        type: 'move',
        sequence: 1,
        issuedTick: 31,
        unitId: 'victoria-queen',
        to: { x: 5, y: 11 },
      },
    ]);
  });
});
