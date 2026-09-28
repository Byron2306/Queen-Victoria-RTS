import { describe, expect, it } from 'vitest';
import { PHASE6_ASSETS } from '../../src/client/assets/manifest';

describe('Phase 6 canonical asset manifest', () => {
  it('pins the approved battlefield masters', () => {
    expect(PHASE6_ASSETS.board.source)
      .toBe('c5cdd10e-600a-4345-853c-0e15d6a8db45.png');

    expect(PHASE6_ASSETS.victoria.source)
      .toBe('da0a7c16-f335-4750-b213-8e2c062a0cb1.png');

    expect(PHASE6_ASSETS.shadowKing.source)
      .toBe('shadow-king-v3.png');
  });

  it('anchors battlefield units by their feet', () => {
    const units = Object.values(PHASE6_ASSETS)
      .filter(asset => asset.kind === 'unit');

    expect(units.length).toBeGreaterThan(0);

    for (const unit of units) {
      expect(unit.anchorX).toBeGreaterThanOrEqual(0);
      expect(unit.anchorX).toBeLessThanOrEqual(1);
      expect(unit.anchorY).toBeGreaterThan(0.7);
      expect(unit.anchorY).toBeLessThanOrEqual(1);
    }
  });
});
