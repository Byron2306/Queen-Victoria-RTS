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
  it('gives each faction exactly 80 mirrored starting tiles', () => {
    expect(VICTORIA_OPENING_TERRITORY).toHaveLength(80);
    expect(OBSIDIAN_OPENING_TERRITORY).toHaveLength(80);

    const mirroredVictoria = VICTORIA_OPENING_TERRITORY
      .map(cell => ({ x: 31 - cell.x, y: 31 - cell.y }))
      .sort((a, b) => a.y - b.y || a.x - b.x);
    const obsidian = [...OBSIDIAN_OPENING_TERRITORY]
      .sort((a, b) => a.y - b.y || a.x - b.x);

    expect(obsidian).toEqual(mirroredVictoria);
  });

  it('seeds exactly 80 Victoria and 80 Obsidian controlled tiles', () => {
    const world = createPhase6SkirmishWorld();
    const tiles = Object.values(strategicTiles(world));

    expect(tiles.filter(tile => tile.factionControl === 'victoria')).toHaveLength(80);
    expect(tiles.filter(tile => tile.factionControl === 'obsidian')).toHaveLength(80);
    expect(tiles.filter(tile => tile.factionControl === 'neutral')).toHaveLength(336);
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

  it('leaves a deep neutral central theatre between the home realms', () => {
    const world = createPhase6SkirmishWorld();
    const tiles = strategicTiles(world);

    for (let y = 11; y <= 20; y += 1) {
      for (let x = 8; x <= 23; x += 1) {
        expect(tiles[`${x},${y}`]?.factionControl).toBe('neutral');
      }
    }
  });
});
