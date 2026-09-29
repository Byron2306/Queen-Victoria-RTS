import { describe, expect, it } from 'vitest';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import { tileId } from '../../src/sim/board-topology';
import { TRIPTYCH_OPENING_FORTIFICATIONS, TRIPTYCH_OPENING_UNITS } from '../../src/sim/triptych-opening';
import { strategicTiles } from '../../src/sim/territory';
import {
  OBSIDIAN_OPENING_TERRITORY,
  VICTORIA_OPENING_TERRITORY,
} from '../../src/sim/triptych-territory';

describe('Triptych opening territory freeze', () => {
  it('gives each faction exactly 39 mirrored starting tiles', () => {
    expect(VICTORIA_OPENING_TERRITORY).toHaveLength(39);
    expect(OBSIDIAN_OPENING_TERRITORY).toHaveLength(39);

    const mirroredVictoria = VICTORIA_OPENING_TERRITORY
      .map(cell => ({ x: 23 - cell.x, y: 23 - cell.y }))
      .sort((a, b) => a.y - b.y || a.x - b.x);
    const obsidian = [...OBSIDIAN_OPENING_TERRITORY]
      .sort((a, b) => a.y - b.y || a.x - b.x);

    expect(obsidian).toEqual(mirroredVictoria);
  });

  it('seeds exactly 39 Victoria and 39 Obsidian controlled tiles', () => {
    const world = createPhase6SkirmishWorld();
    const tiles = Object.values(strategicTiles(world));

    expect(tiles.filter(tile => tile.factionControl === 'victoria')).toHaveLength(39);
    expect(tiles.filter(tile => tile.factionControl === 'obsidian')).toHaveLength(39);
    expect(tiles.filter(tile => tile.factionControl === 'neutral')).toHaveLength(210);
  });

  it('places every opening unit and prepared fort on friendly controlled territory', () => {
    const world = createPhase6SkirmishWorld();
    const tiles = strategicTiles(world);

    for (const unit of TRIPTYCH_OPENING_UNITS) {
      expect(tiles[tileId(unit.position)]?.factionControl).toBe(unit.faction);
    }

    for (const fort of TRIPTYCH_OPENING_FORTIFICATIONS) {
      expect(tiles[tileId(fort.cell)]?.factionControl).toBe(fort.faction);
    }
  });

  it('leaves the six-column central theatre neutral at opening', () => {
    const world = createPhase6SkirmishWorld();
    const tiles = strategicTiles(world);

    for (let y = 8; y <= 15; y += 1) {
      for (let x = 9; x <= 14; x += 1) {
        expect(tiles[`${x},${y}`]?.factionControl).toBe('neutral');
      }
    }
  });
});
