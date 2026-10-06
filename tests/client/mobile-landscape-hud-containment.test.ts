import { describe, expect, it } from 'vitest';

import {
  createResponsiveBattlefieldLayout,
} from '../../src/client/render/responsive-battlefield';

describe('mobile landscape HUD containment', () => {
  it('reserves a visible bottom HUD deck on a phone-sized landscape viewport', () => {
    const viewport = {
      width: 1638,
      height: 664,
    };

    const layout =
      createResponsiveBattlefieldLayout(
        viewport.width,
        viewport.height,
      );

    expect(layout.gameplayVisible).toBe(true);

    expect(layout.hud.y)
      .toBeGreaterThanOrEqual(0);

    expect(
      layout.hud.y +
      layout.hud.height,
    ).toBeLessThanOrEqual(
      viewport.height,
    );

    expect(layout.hud.height)
      .toBeGreaterThanOrEqual(110);

    expect(layout.board.y + layout.board.height)
      .toBeLessThanOrEqual(layout.hud.y);
  });

  it('keeps a minimum safe top HUD band on short landscape screens', () => {
    const layout =
      createResponsiveBattlefieldLayout(
        1638,
        664,
      );

    expect(layout.board.y)
      .toBeGreaterThanOrEqual(72);
  });

  it('does not let expanded world rendering redefine the HUD deck', () => {
    const layout =
      createResponsiveBattlefieldLayout(
        1638,
        664,
      );

    expect(layout.boardRender.height)
      .toBeGreaterThan(layout.board.height);

    expect(layout.hud.y)
      .toBe(layout.board.y + layout.board.height);
  });
});
