import { afterEach, describe, expect, it } from 'vitest';
import { tileCenter } from '../../src/client/board/projection';
import { resetBattlefieldCamera } from '../../src/client/camera/battlefield-camera-store';
import { createResponsiveBattlefieldLayout } from '../../src/client/render/responsive-battlefield';

afterEach(() => resetBattlefieldCamera());

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('Triptych pawn forward presentation', () => {
  it('shows Victoria +x movement physically advancing toward the Obsidian home realm', () => {
    const layout = createResponsiveBattlefieldLayout(1600, 900);
    const start = tileCenter({ x: 6, y: 15 }, layout.projection);
    const forward = tileCenter({ x: 7, y: 15 }, layout.projection);
    const enemyHome = tileCenter({ x: 28, y: 15 }, layout.projection);

    expect(distance(forward, enemyHome)).toBeLessThan(distance(start, enemyHome));
  });

  it('shows Obsidian -x movement physically advancing toward the Victoria home realm', () => {
    const layout = createResponsiveBattlefieldLayout(1600, 900);
    const start = tileCenter({ x: 25, y: 16 }, layout.projection);
    const forward = tileCenter({ x: 24, y: 16 }, layout.projection);
    const enemyHome = tileCenter({ x: 3, y: 16 }, layout.projection);

    expect(distance(forward, enemyHome)).toBeLessThan(distance(start, enemyHome));
  });
});
