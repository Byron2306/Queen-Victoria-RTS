import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import {
  createStrategicTargetVisuals,
} from '../../src/client/render/strategic-target-visuals';
import type { BoardProjection } from '../../src/client/board/projection';

const base: BoardProjection = {
  topLeft: { x: 0, y: 0 },
  topRight: { x: 2400, y: 0 },
  bottomLeft: { x: 0, y: 2400 },
  bottomRight: { x: 2400, y: 2400 },
};

const shifted: BoardProjection = {
  topLeft: { x: 120, y: -80 },
  topRight: { x: 2520, y: -80 },
  bottomLeft: { x: 120, y: 2320 },
  bottomRight: { x: 2520, y: 2320 },
};

describe('Triptych strategic target visuals', () => {
  it('projects only legal ANNEX targets to tile polygons', () => {
    const world = createPhase6SkirmishWorld();
    const visuals = createStrategicTargetVisuals(
      world,
      'victoria',
      'annex_tile',
      base,
    );

    expect(visuals.some(visual => visual.cell.x === 9 && visual.cell.y === 11))
      .toBe(true);
    expect(visuals.some(visual => visual.cell.x === 11 && visual.cell.y === 11))
      .toBe(false);
    expect(visuals.every(visual => visual.polygon.length === 4)).toBe(true);
  });

  it('reprojects the same logical target with the current camera projection', () => {
    const world = createPhase6SkirmishWorld();
    const before = createStrategicTargetVisuals(
      world,
      'victoria',
      'annex_tile',
      base,
    ).find(visual => visual.cell.x === 9 && visual.cell.y === 11)!;
    const after = createStrategicTargetVisuals(
      world,
      'victoria',
      'annex_tile',
      shifted,
    ).find(visual => visual.cell.x === 9 && visual.cell.y === 11)!;

    expect(after.anchor.x - before.anchor.x).toBeCloseTo(120, 6);
    expect(after.anchor.y - before.anchor.y).toBeCloseTo(-80, 6);
    expect(after.cell).toEqual(before.cell);
  });
});
