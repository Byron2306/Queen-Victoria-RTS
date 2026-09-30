import { describe, expect, it } from 'vitest';
import {
  STRATEGIC_COMMAND_BUTTONS,
  strategicTargetCellAtPoint,
} from '../../src/client/input/strategic-controls';
import type { BoardProjection } from '../../src/client/board/projection';

const flat: BoardProjection = {
  topLeft: { x: 0, y: 0 },
  topRight: { x: 2400, y: 0 },
  bottomLeft: { x: 0, y: 2400 },
  bottomRight: { x: 2400, y: 2400 },
};

describe('Triptych strategic command controls', () => {
  it('exposes the four canonical player-facing strategic modes', () => {
    expect(STRATEGIC_COMMAND_BUTTONS.map(button => [button.label, button.mode]))
      .toEqual([
        ['BANNER', 'deploy_banner'],
        ['BASTION', 'build_bastion'],
        ['REDOUBT', 'build_redoubt'],
        ['ANNEX', 'annex_tile'],
      ]);
  });

  it('maps a rendered tile point back to the same 24x24 logical cell', () => {
    expect(strategicTargetCellAtPoint({ x: 2350, y: 1550 }, flat))
      .toEqual({ x: 23, y: 15 });
  });

  it('refuses points outside the canonical board projection', () => {
    expect(strategicTargetCellAtPoint({ x: 2500, y: 1550 }, flat))
      .toBeNull();
  });
});
