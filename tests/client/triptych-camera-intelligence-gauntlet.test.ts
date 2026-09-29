import { afterEach, describe, expect, it } from 'vitest';

import {
  boardCellToScreen,
  screenToBoardCell,
  tileCenter,
} from '../../src/client/board/projection';
import {
  centerBattlefieldCameraOn,
  createBattlefieldCameraState,
} from '../../src/client/camera/battlefield-camera';
import {
  resetBattlefieldCamera,
  setBattlefieldCameraState,
} from '../../src/client/camera/battlefield-camera-store';
import { createPresentedWorld } from '../../src/client/intelligence/presented-world';
import {
  createGhostContactVisuals,
} from '../../src/client/render/ghost-contacts';
import {
  createProjectedIntelligenceFrontier,
} from '../../src/client/render/intelligence-frontier-layer';
import {
  createResponsiveBattlefieldLayout,
} from '../../src/client/render/responsive-battlefield';
import {
  createBattlefieldSceneRuntime,
} from '../../src/client/phaser/scene-rendering';
import {
  refreshFactionIntelligence,
} from '../../src/sim/intelligence';
import type {
  Coord,
  WorldState,
} from '../../src/sim/types';
import { createWorld } from '../../src/sim/world';

function reposition(
  world: WorldState,
  unitId: string,
  destination: Coord,
): WorldState {
  const unit = world.units[unitId]!;
  const occupancy = { ...world.occupancy };
  delete occupancy[`${unit.position.x},${unit.position.y}`];
  occupancy[`${destination.x},${destination.y}`] = unitId;

  return {
    ...world,
    units: {
      ...world.units,
      [unitId]: {
        ...unit,
        position: { ...destination },
      },
    },
    occupancy,
  };
}

afterEach(() => {
  resetBattlefieldCamera();
});

describe('Triptych free-roam camera + intelligence presentation gauntlet', () => {
  it('navigates a larger battlefield without leaking hidden truth or breaking stale memory', () => {
    let world = createWorld([
      {
        id: 'victoria-rook',
        faction: 'victoria',
        kind: 'rook',
        position: { x: 7, y: 7 },
      },
      {
        id: 'shadow-knight',
        faction: 'obsidian',
        kind: 'knight',
        position: { x: 7, y: 10 },
      },
      {
        id: 'shadow-hidden-rook',
        faction: 'obsidian',
        kind: 'rook',
        position: { x: 14, y: 14 },
      },
    ]);

    world = refreshFactionIntelligence(world, 'victoria');
    expect(
      createPresentedWorld(world, 'victoria').units.map(unit => unit.id),
    ).toContain('shadow-knight');

    world = reposition(world, 'victoria-rook', { x: 12, y: 7 });
    world = reposition(world, 'shadow-knight', { x: 13, y: 13 });
    world = refreshFactionIntelligence(world, 'victoria');

    const beforeCamera = JSON.stringify(world.units);
    const baseLayout = createResponsiveBattlefieldLayout(1600, 900);

    setBattlefieldCameraState({
      panX: -220,
      panY: 110,
      zoom: 1.45,
    });

    const movedLayout = createResponsiveBattlefieldLayout(1600, 900);
    const runtime = createBattlefieldSceneRuntime(
      world,
      null,
      movedLayout.projection,
    );

    expect(JSON.stringify(world.units)).toBe(beforeCamera);
    expect(movedLayout.hud).toEqual(baseLayout.hud);
    expect(movedLayout.projection).not.toEqual(baseLayout.projection);

    const liveIds = runtime.presented.units.map(unit => unit.id);
    expect(liveIds).toContain('victoria-rook');
    expect(liveIds).not.toContain('shadow-knight');
    expect(liveIds).not.toContain('shadow-hidden-rook');

    const ghost = runtime.presented.ghosts.find(
      contact => contact.unitId === 'shadow-knight',
    );
    expect(ghost).toMatchObject({
      cell: { x: 7, y: 10 },
    });

    const ghostVisual = createGhostContactVisuals(
      runtime.presented,
      movedLayout.projection,
    ).find(contact => contact.unitId === 'shadow-knight');

    expect(ghostVisual?.anchor).toEqual(
      tileCenter({ x: 7, y: 10 }, movedLayout.projection),
    );
    expect(ghostVisual?.interactive).toBe(false);

    const frontier = createProjectedIntelligenceFrontier(
      runtime.intelligenceOverlay,
      movedLayout.projection,
    );

    expect(frontier.some(tile => tile.treatment === 'subdued'))
      .toBe(true);
    expect(frontier.some(tile => tile.treatment === 'terrain_only'))
      .toBe(true);

    const hiddenCurrentCell = runtime.presented.ghosts.some(
      contact =>
        contact.unitId === 'shadow-knight'
        && contact.cell.x === 13
        && contact.cell.y === 13,
    );
    expect(hiddenCurrentCell).toBe(false);

    resetBattlefieldCamera();
    const centeringLayout = createResponsiveBattlefieldLayout(1600, 900);
    const rookCell = world.units['victoria-rook']!.position;
    const baseAnchor = boardCellToScreen(
      rookCell,
      centeringLayout.projection,
    );
    const focus = {
      x: centeringLayout.board.x + centeringLayout.board.width / 2,
      y: centeringLayout.board.y + centeringLayout.board.height / 2,
    };

    setBattlefieldCameraState(
      centerBattlefieldCameraOn(
        createBattlefieldCameraState(),
        baseAnchor,
        focus,
      ),
    );

    const centeredLayout = createResponsiveBattlefieldLayout(1600, 900);
    const centeredAnchor = boardCellToScreen(
      rookCell,
      centeredLayout.projection,
    );

    expect(centeredAnchor.x).toBeCloseTo(focus.x, 6);
    expect(centeredAnchor.y).toBeCloseTo(focus.y, 6);
    expect(
      screenToBoardCell(centeredAnchor, centeredLayout.projection),
    ).toEqual(rookCell);
  });
});
