import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  BattlefieldInput,
} from '../../src/client/input/battlefield-input';

import {
  ClientCommandBridge,
} from '../../src/client/runtime/command-bridge';

import {
  createPhase6SkirmishWorld,
} from '../../src/client/session/skirmish';

describe('Royal Tactical battlefield input', () => {
  it('selects a Victoria unit without queuing an order', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();
    const input = new BattlefieldInput(bridge);

    input.pointerDown(world, 0, { x: 5, y: 11 });

    expect(input.selectedUnitId).toBe('victoria-queen');
    expect(bridge.drainTactical()).toEqual([]);
  });

  it('does not select an enemy unit', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();
    const input = new BattlefieldInput(bridge);

    input.pointerDown(world, 0, { x: 18, y: 12 });

    expect(input.selectedUnitId).toBeNull();
    expect(bridge.drainTactical()).toEqual([]);
  });

  it('queues Move rather than mutating the battlefield', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();
    const input = new BattlefieldInput(bridge);

    input.pointerDown(world, 5, { x: 5, y: 11 });
    input.pointerDown(world, 5, { x: 6, y: 11 });

    expect(bridge.drainTactical()).toEqual([
      {
        orderId: 'victoria-r1-o0',
        kind: 'move',
        faction: 'victoria',
        unitId: 'victoria-queen',
        destination: { x: 6, y: 11 },
        issuedRound: 1,
        commandCost: 1,
      },
    ]);

    expect(world.units['victoria-queen']?.position).toEqual({ x: 5, y: 11 });
  });

  it('queues Attack rather than applying damage immediately', () => {
    const world = createPhase6SkirmishWorld();
    const beforeHealth = world.combat['obsidian-queen']!.health;
    const bridge = new ClientCommandBridge();
    const input = new BattlefieldInput(bridge);

    input.pointerDown(world, 9, { x: 5, y: 11 });
    input.pointerDown(world, 9, { x: 18, y: 12 });

    expect(bridge.drainTactical()).toEqual([
      {
        orderId: 'victoria-r1-o0',
        kind: 'attack',
        faction: 'victoria',
        unitId: 'victoria-queen',
        targetUnitId: 'obsidian-queen',
        issuedRound: 1,
        commandCost: 1,
      },
    ]);

    expect(world.combat['obsidian-queen']?.health).toBe(beforeHealth);
  });

  it('queues Guard for the selected unit', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();
    const input = new BattlefieldInput(bridge);

    input.pointerDown(world, 0, { x: 3, y: 9 });
    input.guardSelected(world);

    expect(bridge.drainTactical()).toEqual([
      {
        orderId: 'victoria-r1-o0',
        kind: 'guard',
        faction: 'victoria',
        unitId: 'victoria-rook-a',
        anchor: { x: 3, y: 9 },
        issuedRound: 1,
        commandCost: 1,
      },
    ]);
  });

  it('switches selection when another Victoria unit is tapped', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();
    const input = new BattlefieldInput(bridge);

    input.pointerDown(world, 2, { x: 5, y: 11 });
    input.pointerDown(world, 2, { x: 3, y: 9 });

    expect(input.selectedUnitId).toBe('victoria-rook-a');
    expect(bridge.drainTactical()).toEqual([]);
  });

  it('clears stale selection without queuing an order', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();
    const input = new BattlefieldInput(bridge);

    input.pointerDown(world, 0, { x: 5, y: 11 });

    const units = { ...world.units };
    delete units['victoria-queen'];

    input.pointerDown({ ...world, units }, 0, { x: 6, y: 11 });

    expect(input.selectedUnitId).toBeNull();
    expect(bridge.drainTactical()).toEqual([]);
  });
});

describe('Royal Tactical screen-space battlefield input', () => {
  it('converts a screen tap into a tactical Move order', async () => {
    const { screenToBoardCell, tileCenter } = await import('../../src/client/board/projection');
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();
    const input = new BattlefieldInput(bridge);

    const projection = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 1600, y: 0 },
      bottomLeft: { x: 0, y: 1600 },
      bottomRight: { x: 1600, y: 1600 },
    };

    const selectCell = screenToBoardCell(tileCenter({ x: 5, y: 11 }, projection), projection);
    const moveCell = screenToBoardCell(tileCenter({ x: 6, y: 11 }, projection), projection);

    expect(selectCell).toEqual({ x: 5, y: 11 });
    expect(moveCell).toEqual({ x: 6, y: 11 });

    input.pointerDown(world, 4, selectCell!);
    input.pointerDown(world, 4, moveCell!);

    expect(bridge.drainTactical()).toEqual([
      {
        orderId: 'victoria-r1-o0',
        kind: 'move',
        faction: 'victoria',
        unitId: 'victoria-queen',
        destination: { x: 6, y: 11 },
        issuedRound: 1,
        commandCost: 1,
      },
    ]);
  });
});
