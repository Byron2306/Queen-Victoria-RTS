import { describe, expect, it } from 'vitest';

import { unitVisualHeightForRank } from '../../src/client/render/unit-visual-footprint';

describe('unit visual footprint topology authority', () => {
  it('ranks perspective against the selected battlefield height rather than legacy V1 rows', () => {
    const height = unitVisualHeightForRank({
      boardY: 23,
      cellHeight: 10,
      boardHeight: 32,
    });

    expect(height).toBeCloseTo(20.2774193548, 8);
  });
});
