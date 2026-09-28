import { describe, expect, it } from 'vitest';
import { BattlefieldInput } from '../../src/client/input/battlefield-input';
import { ClientCommandBridge } from '../../src/client/runtime/command-bridge';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';

describe('Phase 6 battlefield input', () => {
  it('selects a Victoria unit on pointer down', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();
    const input = new BattlefieldInput(bridge);

    input.pointerDown(
      world,
      0,
      { x: 3, y: 13 },
    );

    expect(input.selectedUnitId)
      .toBe('victoria-queen');

    expect(bridge.drain(1))
      .toEqual([]);
  });

  it('does not select an enemy unit', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();
    const input = new BattlefieldInput(bridge);

    input.pointerDown(
      world,
      0,
      { x: 12, y: 2 },
    );

    expect(input.selectedUnitId)
      .toBeNull();
  });

  it('issues a move when an empty cell is tapped after selection', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();
    const input = new BattlefieldInput(bridge);

    input.pointerDown(world, 5, { x: 3, y: 13 });
    input.pointerDown(world, 5, { x: 4, y: 12 });

    expect(bridge.drain(6)).toEqual([
      {
        type: 'move',
        sequence: 0,
        issuedTick: 5,
        unitId: 'victoria-queen',
        to: { x: 4, y: 12 },
      },
    ]);
  });

  it('issues an attack when an enemy cell is tapped after selection', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();
    const input = new BattlefieldInput(bridge);

    input.pointerDown(world, 9, { x: 3, y: 13 });
    input.pointerDown(world, 9, { x: 12, y: 2 });

    expect(bridge.drain(10)).toEqual([
      {
        type: 'attack',
        sequence: 0,
        issuedTick: 9,
        unitId: 'victoria-queen',
        targetId: 'obsidian-queen',
      },
    ]);
  });

  it('switches selection when another Victoria unit is tapped', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();
    const input = new BattlefieldInput(bridge);

    input.pointerDown(world, 2, { x: 3, y: 13 });
    input.pointerDown(world, 2, { x: 5, y: 14 });

    expect(input.selectedUnitId)
      .toBe('victoria-rook-a');

    expect(bridge.drain(3))
      .toEqual([]);
  });

  it('clears stale selection when the selected unit no longer exists', () => {
    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();
    const input = new BattlefieldInput(bridge);

    input.pointerDown(world, 0, { x: 3, y: 13 });

    const units = { ...world.units };
    delete units['victoria-queen'];

    input.pointerDown(
      { ...world, units },
      0,
      { x: 4, y: 12 },
    );

    expect(input.selectedUnitId)
      .toBeNull();

    expect(bridge.drain(1))
      .toEqual([]);
  });
});

describe('Phase 6 screen-space battlefield input', () => {
  it('converts a screen tap into a move command', async () => {
    const { screenToBoardCell } =
      await import('../../src/client/board/projection');

    const world = createPhase6SkirmishWorld();
    const bridge = new ClientCommandBridge();
    const input = new BattlefieldInput(bridge);

    const projection = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 1600, y: 0 },
      bottomLeft: { x: 0, y: 1600 },
      bottomRight: { x: 1600, y: 1600 },
    };

    const selectCell =
      screenToBoardCell(
        { x: 350, y: 1350 },
        projection,
      );

    const moveCell =
      screenToBoardCell(
        { x: 450, y: 1250 },
        projection,
      );

    expect(selectCell).toEqual({ x: 3, y: 13 });
    expect(moveCell).toEqual({ x: 4, y: 12 });

    input.pointerDown(world, 4, selectCell!);
    input.pointerDown(world, 4, moveCell!);

    expect(bridge.drain(5)).toEqual([
      {
        type: 'move',
        sequence: 0,
        issuedTick: 4,
        unitId: 'victoria-queen',
        to: { x: 4, y: 12 },
      },
    ]);
  });
});
