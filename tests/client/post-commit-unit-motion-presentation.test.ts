import { describe, expect, it } from 'vitest';

import sceneSource from '../../src/client/phaser/phaser-scene.ts?raw';

describe('post-commit unit motion presentation', () => {
  it('does not rebase unit motion immediately after resolving committed orders', () => {
    const start = sceneSource.indexOf(
      '    private commitOrders(): void {',
    );

    const end = sceneSource.indexOf(
      '    private layoutHudText(): void {',
      start,
    );

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const block = sceneSource.slice(start, end);

    expect(block).toContain(
      'this.controller.endTurn()',
    );

    expect(block).not.toContain(
      'this.layoutBattlefield()',
    );

    expect(block).toContain(
      'this.refreshHudText()',
    );
  });
});
