import { expect, it } from 'vitest';
import { createWorld } from '../../src/sim/world';
import { createSelectionGeometryOverlay } from '../../src/client/render/selection-geometry-overlay';
import { createGhostContactVisuals } from '../../src/client/render/ghost-contacts';
import type { BoardProjection } from '../../src/client/board/projection';

const projection: BoardProjection = {
  topLeft: { x: 0, y: 0 }, topRight: { x: 3200, y: 0 },
  bottomLeft: { x: 0, y: 3200 }, bottomRight: { x: 3200, y: 3200 },
};

it('places a selected outer V2 unit on the same 32-cell grid as the board', () => {
  const world = createWorld([
    { id: 'rook', faction: 'victoria', kind: 'rook', position: { x: 27, y: 18 } },
  ], { topologyId: 'triptych-v2' });
  const overlay = createSelectionGeometryOverlay(world, 'rook', projection);
  expect(overlay.selectedAnchor).toEqual({ x: 2750, y: 1850 });
  expect(overlay.selectedPolygon).toEqual([
    { x: 2700, y: 1800 }, { x: 2800, y: 1800 },
    { x: 2800, y: 1900 }, { x: 2700, y: 1900 },
  ]);
});

it('projects remembered V2 contacts without using legacy bounds', () => {
  const ghosts = createGhostContactVisuals({
    faction: 'victoria', units: [], tiles: [],
    ghosts: [{ unitId: 'lost-rook', cell: { x: 27, y: 18 }, lastSeenRound: 1 }],
  }, projection, 'triptych-v2');
  expect(ghosts[0]?.anchor).toEqual({ x: 2750, y: 1850 });
});
