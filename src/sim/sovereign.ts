import { canUnitAttackTarget } from './combat';
import type { Faction, MatchState, SimEvent, SovereignState, UnitState, WorldState } from './types';

export const FACTIONS = ['victoria', 'obsidian'] as const satisfies readonly Faction[];

export function findFactionKingId(units: Readonly<Record<string, UnitState>>, faction: Faction): string | null {
  return Object.values(units)
    .filter((unit) => unit.faction === faction && unit.kind === 'king')
    .map((unit) => unit.id)
    .sort()[0] ?? null;
}

function initialSovereign(units: Readonly<Record<string, UnitState>>, faction: Faction): SovereignState {
  return { kingId: findFactionKingId(units, faction), threatened: false, threateningUnitIds: [] };
}

export function createInitialMatchState(units: Readonly<Record<string, UnitState>>): MatchState {
  return {
    status: 'active',
    victor: null,
    endedTick: null,
    sovereigns: {
      victoria: initialSovereign(units, 'victoria'),
      obsidian: initialSovereign(units, 'obsidian'),
    },
  };
}

export function deriveSovereignThreat(world: WorldState, faction: Faction): SovereignState {
  const current = world.match.sovereigns[faction];
  const kingId = current.kingId;
  if (!kingId || !world.units[kingId] || !world.combat[kingId] || world.combat[kingId]!.health <= 0) {
    return { kingId, threatened: false, threateningUnitIds: [] };
  }
  const threateningUnitIds = Object.keys(world.units)
    .filter((id) => canUnitAttackTarget(world, id, kingId))
    .sort();
  return { kingId, threatened: threateningUnitIds.length > 0, threateningUnitIds };
}

export function evaluateSovereignThreats(world: WorldState): { state: WorldState; events: readonly SimEvent[] } {
  const events: SimEvent[] = [];
  const sovereigns = { ...world.match.sovereigns };

  for (const faction of FACTIONS) {
    const previous = world.match.sovereigns[faction];
    const next = deriveSovereignThreat(world, faction);
    sovereigns[faction] = next;
    if (!next.kingId) continue;
    if (!previous.threatened && next.threatened) {
      events.push({
        type: 'sovereign.threatened',
        tick: world.tick,
        faction,
        kingId: next.kingId,
        threateningUnitIds: next.threateningUnitIds,
      });
    } else if (previous.threatened && !next.threatened) {
      events.push({ type: 'sovereign.relief', tick: world.tick, faction, kingId: next.kingId });
    }
  }

  return {
    state: { ...world, match: { ...world.match, sovereigns } },
    events,
  };
}

export function interpretSovereignDefeats(
  beforeCombat: WorldState,
  afterCombat: WorldState,
  combatEvents: readonly SimEvent[],
): { state: WorldState; events: readonly SimEvent[] } {
  if (beforeCombat.match.status !== 'active') return { state: afterCombat, events: [] };

  const killedById = new Map<string, readonly string[]>();
  for (const event of combatEvents) {
    if (event.type === 'unit.killed') killedById.set(event.unitId, event.byUnitIds);
  }

  const defeated = FACTIONS.flatMap((faction) => {
    const kingId = beforeCombat.match.sovereigns[faction].kingId;
    if (!kingId || !killedById.has(kingId)) return [];
    return [{ faction, kingId, byUnitIds: killedById.get(kingId)! }] as const;
  });
  if (defeated.length === 0) return { state: afterCombat, events: [] };

  const events: SimEvent[] = defeated.map(({ faction, kingId, byUnitIds }) => ({
    type: 'sovereign.defeated', tick: beforeCombat.tick, faction, kingId, byUnitIds,
  }));

  if (defeated.length === 2) {
    const state: WorldState = {
      ...afterCombat,
      match: { ...afterCombat.match, status: 'draw', victor: null, endedTick: beforeCombat.tick },
    };
    events.push({ type: 'match.draw', tick: beforeCombat.tick, defeatedKingIds: defeated.map((item) => item.kingId).sort() });
    return { state, events };
  }

  const defeatedFaction = defeated[0]!.faction;
  const victor: Faction = defeatedFaction === 'victoria' ? 'obsidian' : 'victoria';
  const state: WorldState = {
    ...afterCombat,
    match: {
      ...afterCombat.match,
      status: victor === 'victoria' ? 'victoria_won' : 'obsidian_won',
      victor,
      endedTick: beforeCombat.tick,
    },
  };
  events.push({ type: 'match.victory', tick: beforeCombat.tick, victor, defeatedFaction });
  return { state, events };
}
