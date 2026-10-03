import { describe, expect, it } from 'vitest';

import { legalStrategicTargets } from '../../src/client/input/strategic-targeting';
import { createPhase6SkirmishWorld } from '../../src/client/session/skirmish';
import { tileId } from '../../src/sim/board-topology';
import { getFortificationAt } from '../../src/sim/fortifications';
import { queueBanner } from '../../src/sim/polarity';
import {
  canFactionClaimTile,
  claimFactionTile,
  getTileFactionControl,
  resolveSettlement,
  strategicTiles,
} from '../../src/sim/territory';
import { placeUnit } from '../../src/sim/world';

function hasCell(cells: readonly { x: number; y: number }[], x: number, y: number): boolean {
  return cells.some(cell => cell.x === x && cell.y === y);
}

describe('Triptych V2 canonical claim-authority gauntlet', () => {
  it('boots the frozen V2 opening ownership and keeps the central theatre neutral', () => {
    const world = createPhase6SkirmishWorld();

    expect(world.width).toBe(32);
    expect(world.height).toBe(32);
    expect(getTileFactionControl(world, { x: 7, y: 14 })).toBe('victoria');
    expect(getTileFactionControl(world, { x: 24, y: 14 })).toBe('obsidian');
    expect(getTileFactionControl(world, { x: 8, y: 14 })).toBe('neutral');
    expect(getTileFactionControl(world, { x: 23, y: 14 })).toBe('neutral');

    const controls = Object.values(strategicTiles(world)).reduce(
      (counts, tile) => {
        counts[tile.factionControl] += 1;
        return counts;
      },
      { victoria: 0, obsidian: 0, neutral: 0 },
    );

    expect(controls).toEqual({ victoria: 80, obsidian: 80, neutral: 336 });
  });

  it('gives explicit annex and settlement the same legal adjacent-neutral result', () => {
    const base = createPhase6SkirmishWorld();
    const frontier = { x: 8, y: 14 } as const;

    const annexed = claimFactionTile(base, 'victoria', frontier, 'annex_command');
    expect(annexed.accepted).toBe(true);
    expect(getTileFactionControl(annexed.state, frontier)).toBe('victoria');

    const occupied = placeUnit(base, {
      id: 'settler',
      faction: 'victoria',
      kind: 'pawn',
      position: frontier,
    });
    const settled = resolveSettlement(occupied);
    expect(getTileFactionControl(settled, frontier)).toBe('victoria');
  });

  it('does not turn occupation into ownership for remote neutral or enemy territory', () => {
    let world = createPhase6SkirmishWorld();
    world = placeUnit(world, {
      id: 'remote-raider',
      faction: 'victoria',
      kind: 'pawn',
      position: { x: 10, y: 14 },
    });
    world = placeUnit(world, {
      id: 'enemy-occupier',
      faction: 'victoria',
      kind: 'pawn',
      position: { x: 24, y: 14 },
    });

    const settled = resolveSettlement(world);

    expect(settled.units['remote-raider']!.position).toEqual({ x: 10, y: 14 });
    expect(settled.units['enemy-occupier']!.position).toEqual({ x: 24, y: 14 });
    expect(getTileFactionControl(settled, { x: 10, y: 14 })).toBe('neutral');
    expect(getTileFactionControl(settled, { x: 24, y: 14 })).toBe('obsidian');
  });

  it('keeps nodes, banners, forts, polarity, and territorial ownership as separate strategic facts', () => {
    const base = createPhase6SkirmishWorld();
    const friendly = { x: 7, y: 14 } as const;
    const beforeControl = getTileFactionControl(base, friendly);
    const beforePolarity = strategicTiles(base)[tileId(friendly)]!.polarity;
    const beforeNodes = base.territory.nodes;
    const openingFort = getFortificationAt(base, { x: 7, y: 16 });

    const banner = queueBanner(base, {
      bannerId: 'gauntlet-banner',
      faction: 'victoria',
      cell: friendly,
    });

    expect(banner.accepted).toBe(true);
    expect(getTileFactionControl(banner.state, friendly)).toBe(beforeControl);
    expect(strategicTiles(banner.state)[tileId(friendly)]!.polarity).toBe(beforePolarity);
    expect(banner.state.territory.nodes).toEqual(beforeNodes);
    expect(getFortificationAt(banner.state, { x: 7, y: 16 })).toEqual(openingFort);
  });

  it('keeps client annex targeting exactly aligned with sim claim legality across every playable V2 cell', () => {
    const world = createPhase6SkirmishWorld();
    const clientTargets = legalStrategicTargets(world, 'victoria', 'annex_tile');

    for (const tile of Object.values(strategicTiles(world))) {
      const sim = canFactionClaimTile(world, 'victoria', tile, 'annex_command').allowed;
      expect(hasCell(clientTargets, tile.x, tile.y)).toBe(sim);
    }
  });

  it('replays the same deterministic claim sequence to an identical world state', () => {
    const run = () => {
      let world = createPhase6SkirmishWorld();
      for (const cell of [
        { x: 8, y: 14 },
        { x: 9, y: 14 },
        { x: 10, y: 14 },
      ] as const) {
        const result = claimFactionTile(world, 'victoria', cell, 'annex_command');
        expect(result.accepted).toBe(true);
        world = result.state;
      }
      return world;
    };

    const a = run();
    const b = run();

    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
