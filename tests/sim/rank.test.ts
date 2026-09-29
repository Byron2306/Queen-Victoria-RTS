import { describe, expect, it } from 'vitest';
import { resolveCombatTick } from '../../src/sim/combat';
import {
  combatModifiersForRank,
  rankForKills,
  resolveRankUps,
} from '../../src/sim/rank';
import { createWorld } from '../../src/sim/world';

describe('persistent military rank', () => {
  it('uses the canonical 0/2/5/9/14 kill thresholds', () => {
    expect(rankForKills(0)).toBe('recruit');
    expect(rankForKills(1)).toBe('recruit');
    expect(rankForKills(2)).toBe('proven');
    expect(rankForKills(4)).toBe('proven');
    expect(rankForKills(5)).toBe('veteran');
    expect(rankForKills(8)).toBe('veteran');
    expect(rankForKills(9)).toBe('elite');
    expect(rankForKills(13)).toBe('elite');
    expect(rankForKills(14)).toBe('guard');
  });

  it('keeps one central conservative modifier table', () => {
    expect(combatModifiersForRank('recruit')).toEqual({ damageBps: 10000, defenseBps: 10000, supportBps: 10000 });
    expect(combatModifiersForRank('guard').damageBps).toBeGreaterThan(10000);
    expect(combatModifiersForRank('guard').supportBps).toBeGreaterThan(10000);
  });

  it('credits a lethal attacker immediately but delays its rank change until rank resolution', () => {
    let world = createWorld([
      { id: 'v', faction: 'victoria', kind: 'pawn', position: { x: 7, y: 7 } },
      { id: 'o', faction: 'obsidian', kind: 'pawn', position: { x: 7, y: 8 } },
    ]);
    world = {
      ...world,
      combat: {
        ...world.combat,
        v: { ...world.combat.v!, targetId: 'o' },
        o: { ...world.combat.o!, health: 1 },
      },
      military: {
        ...world.military,
        v: { kills: 1, rank: 'recruit' },
        o: { kills: 7, rank: 'veteran' },
      },
    };

    const resolved = resolveCombatTick(world).state;
    expect(resolved.military.v).toEqual({ kills: 2, rank: 'recruit' });
    expect(resolved.military.o).toBeUndefined();

    const ranked = resolveRankUps(resolved);
    expect(ranked.military.v).toEqual({ kills: 2, rank: 'proven' });
  });
});
