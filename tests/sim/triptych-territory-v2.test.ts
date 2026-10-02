import { describe, expect, it } from 'vitest';
import { createWorld } from '../../src/sim/world';
import { strategicTiles } from '../../src/sim/territory';
import {
  applyTriptychOpeningTerritory,
  OBSIDIAN_OPENING_TERRITORY_V2,
  VICTORIA_OPENING_TERRITORY_V2,
} from '../../src/sim/triptych-territory';

describe('Triptych V2 opening territory', () => {
  it('freezes the 32x32 west/east home realms at 80 tiles each', () => {
    expect(VICTORIA_OPENING_TERRITORY_V2).toHaveLength(80);
    expect(OBSIDIAN_OPENING_TERRITORY_V2).toHaveLength(80);

    expect(VICTORIA_OPENING_TERRITORY_V2.every(cell =>
      cell.x >= 0 && cell.x <= 7 && cell.y >= 11 && cell.y <= 20,
    )).toBe(true);
    expect(OBSIDIAN_OPENING_TERRITORY_V2.every(cell =>
      cell.x >= 24 && cell.x <= 31 && cell.y >= 11 && cell.y <= 20,
    )).toBe(true);
  });

  it('applies the V2 home realms and leaves the enlarged frontier neutral', () => {
    let world = createWorld([], { topologyId: 'triptych-v2' });
    world = applyTriptychOpeningTerritory(world);
    const tiles = Object.values(strategicTiles(world));

    expect(tiles.filter(tile => tile.factionControl === 'victoria')).toHaveLength(80);
    expect(tiles.filter(tile => tile.factionControl === 'obsidian')).toHaveLength(80);
    expect(tiles.filter(tile => tile.factionControl === 'neutral')).toHaveLength(336);

    for (let y = 11; y <= 20; y += 1) {
      for (let x = 8; x <= 23; x += 1) {
        expect(strategicTiles(world)[`${x},${y}`]?.factionControl).toBe('neutral');
      }
    }
  });
});
