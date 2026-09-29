import { describe, expect, it } from 'vitest';
import {
  findVictoriaUnitAtPoint,
} from '../../src/client/input/unit-tap-target';

const candidates = [
  { id: 'victoria-queen', faction: 'victoria' as const, x: 240, y: 320 },
  { id: 'victoria-rook', faction: 'victoria' as const, x: 310, y: 330 },
  { id: 'obsidian-king', faction: 'obsidian' as const, x: 900, y: 320 },
];

describe('touch-first battlefield unit targeting', () => {
  it('selects a Victoria unit when the tap lands near its rendered sprite anchor', () => {
    expect(
      findVictoriaUnitAtPoint(
        { x: 252, y: 298 },
        candidates,
        48,
      ),
    ).toBe('victoria-queen');
  });

  it('chooses the nearest Victoria unit when touch targets overlap', () => {
    expect(
      findVictoriaUnitAtPoint(
        { x: 298, y: 326 },
        candidates,
        48,
      ),
    ).toBe('victoria-rook');
  });

  it('never selects Shadow units and returns null outside the hit radius', () => {
    expect(
      findVictoriaUnitAtPoint(
        { x: 900, y: 320 },
        candidates,
        48,
      ),
    ).toBeNull();

    expect(
      findVictoriaUnitAtPoint(
        { x: 500, y: 500 },
        candidates,
        48,
      ),
    ).toBeNull();
  });
});
