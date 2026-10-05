import type { Faction, RecruitableUnitKind, SimEvent, UnitKind, WorldState } from './types';

export const KILL_REWARD: Readonly<Record<UnitKind, number>> = {
  pawn: 5, knight: 10, bishop: 10, rook: 14, queen: 25, king: 0,
};
export const RECRUIT_UNLOCK_NODE_COUNT: Readonly<Record<RecruitableUnitKind, number>> = {
  pawn: 0, knight: 2, bishop: 3, rook: 4,
};
export const CAPACITY_WEIGHT: Readonly<Record<UnitKind, number>> = {
  pawn: 1, knight: 2, bishop: 2, rook: 3, queen: 0, king: 0,
};
export const PIECE_CAP: Readonly<Record<RecruitableUnitKind, number>> = {
  pawn: 6, knight: 2, bishop: 2, rook: 2,
};

export function ownedNodeCount(world: WorldState, faction: Faction): number {
  return Object.values(world.territory.nodes).filter((node) => node.owner === faction).length;
}

export function isRecruitUnlocked(world: WorldState, faction: Faction, kind: RecruitableUnitKind): boolean {
  return ownedNodeCount(world, faction) >= RECRUIT_UNLOCK_NODE_COUNT[kind];
}

export function commandCapacity(world: WorldState, faction: Faction): number {
  let value = 6;
  for (const node of Object.values(world.territory.nodes)) {
    if (node.owner !== faction) continue;
    value += node.kind === 'crown' ? 1 : 2;
  }
  return Math.min(16, value);
}

export function capacityUsage(world: WorldState, faction: Faction): number {
  let total = 0;
  for (const unit of Object.values(world.units)) {
    if (unit.faction === faction) total += CAPACITY_WEIGHT[unit.kind];
  }
  for (const entry of world.production.queues[faction]) total += entry.capacityWeight;
  for (const entry of world.production.ready[faction]) total += entry.capacityWeight;
  return total;
}

export function pieceCountWithQueue(world: WorldState, faction: Faction, kind: RecruitableUnitKind): number {
  let total = Object.values(world.units).filter((unit) => unit.faction === faction && unit.kind === kind).length;
  total += world.production.queues[faction].filter((entry) => entry.unitKind === kind).length;
  total += world.production.ready[faction].filter((entry) => entry.unitKind === kind).length;
  return total;
}

export function applyCrownIncome(world: WorldState): { state: WorldState; events: readonly SimEvent[] } {
  const crownPower = { ...world.economy.crownPower };
  const events: SimEvent[] = [];
  for (const faction of ['victoria', 'obsidian'] as const) {
    const sources = Object.values(world.territory.nodes).filter((node) => node.owner === faction).sort((a,b)=>a.id.localeCompare(b.id));
    const amount = sources.reduce((sum, node) => sum + (node.kind === 'crown' ? 2 : 1), 0);
    if (amount === 0) continue;
    crownPower[faction] += amount;
    events.push({ type: 'crown.income', tick: world.tick, faction, amount, resultingCrownPower: crownPower[faction], sourceNodeIds: sources.map((node)=>node.id) });
  }
  return { state: { ...world, economy: { crownPower } }, events };
}

export function applyKillRewards(world: WorldState, preCombatWorld: WorldState, combatEvents: readonly SimEvent[]): { state: WorldState; events: readonly SimEvent[] } {
  const crownPower = { ...world.economy.crownPower };
  const events: SimEvent[] = [];
  for (const event of combatEvents) {
    if (event.type !== 'unit.killed') continue;
    const defeated = preCombatWorld.units[event.unitId];
    const attackerId = [...event.byUnitIds].sort()[0];
    const attacker = attackerId ? preCombatWorld.units[attackerId] : undefined;
    if (!defeated || !attacker) continue;
    const base = KILL_REWARD[defeated.kind];
    if (base <= 0) continue;
    const amount = event.positionalBonusApplied ? Math.floor(base * 1.25) : base;
    crownPower[attacker.faction] += amount;
    events.push({ type: 'crown.kill_reward', tick: world.tick, faction: attacker.faction, defeatedUnitId: defeated.id, amount, positionalBonusApplied: event.positionalBonusApplied, resultingCrownPower: crownPower[attacker.faction] });
  }
  return { state: { ...world, economy: { crownPower } }, events };
}
