import type {
  MilitaryRank,
  UnitMilitaryRecord,
  WorldState,
} from './types';

export type RankModifiers = Readonly<{
  damageBps: number;
  defenseBps: number;
  supportBps: number;
}>;

const MODIFIERS: Readonly<Record<MilitaryRank, RankModifiers>> = {
  recruit: { damageBps: 10000, defenseBps: 10000, supportBps: 10000 },
  proven: { damageBps: 10300, defenseBps: 9900, supportBps: 10200 },
  veteran: { damageBps: 10600, defenseBps: 9700, supportBps: 10500 },
  elite: { damageBps: 11000, defenseBps: 9400, supportBps: 10900 },
  guard: { damageBps: 11500, defenseBps: 9000, supportBps: 11400 },
};

export function rankForKills(kills: number): MilitaryRank {
  if (kills >= 14) return 'guard';
  if (kills >= 9) return 'elite';
  if (kills >= 5) return 'veteran';
  if (kills >= 2) return 'proven';
  return 'recruit';
}

export function combatModifiersForRank(rank: MilitaryRank): RankModifiers {
  return MODIFIERS[rank];
}

export function militaryRecordFor(
  world: WorldState,
  unitId: string,
): UnitMilitaryRecord {
  return world.military[unitId] ?? { kills: 0, rank: 'recruit' };
}

export function resolveRankUps(world: WorldState): WorldState {
  const military: Record<string, UnitMilitaryRecord> = {};

  for (const unitId of Object.keys(world.units).sort()) {
    const record = militaryRecordFor(world, unitId);
    military[unitId] = {
      kills: record.kills,
      rank: rankForKills(record.kills),
    };
  }

  return {
    ...world,
    military,
  };
}
