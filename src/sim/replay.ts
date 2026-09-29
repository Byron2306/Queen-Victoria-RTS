import type { ReplayResult, SimCommand, WorldState } from './types';
import { stepWorld } from './step';
import { compareSimCommands } from './commands';

export function runReplay(initial: WorldState, frames: readonly (readonly SimCommand[])[]): ReplayResult {
  let state = initial;
  const eventsByTick = [] as Array<ReplayResult['eventsByTick'][number]>;
  for (const frame of frames) {
    const result = stepWorld(state, frame);
    state = result.state;
    eventsByTick.push(result.events);
  }
  return { state, eventsByTick };
}

export function canonicalSnapshot(result: ReplayResult): string {
  const unitIds = Object.keys(result.state.units).sort();
  const occupancyKeys = Object.keys(result.state.occupancy).sort();
  const combatIds = Object.keys(result.state.combat).sort();
  const units = Object.fromEntries(unitIds.map((id) => [id, result.state.units[id]]));
  const occupancy = Object.fromEntries(occupancyKeys.map((key) => [key, result.state.occupancy[key]]));
  const combat = Object.fromEntries(combatIds.map((id) => [id, result.state.combat[id]]));
  const match = {
    status: result.state.match.status,
    victor: result.state.match.victor,
    endedTick: result.state.match.endedTick,
    sovereigns: {
      victoria: {
        ...result.state.match.sovereigns.victoria,
        threateningUnitIds: [...result.state.match.sovereigns.victoria.threateningUnitIds].sort(),
      },
      obsidian: {
        ...result.state.match.sovereigns.obsidian,
        threateningUnitIds: [...result.state.match.sovereigns.obsidian.threateningUnitIds].sort(),
      },
    },
  };
  const nodeIds = Object.keys(result.state.territory.nodes).sort();
  const territory = { nodes: Object.fromEntries(nodeIds.map((id) => [id, result.state.territory.nodes[id]])) };
  const economy = { crownPower: { victoria: result.state.economy.crownPower.victoria, obsidian: result.state.economy.crownPower.obsidian } };
  const production = {
    queues: {
      victoria: [...result.state.production.queues.victoria],
      obsidian: [...result.state.production.queues.obsidian],
    },
    nextEntryOrdinal: {
      victoria: result.state.production.nextEntryOrdinal.victoria,
      obsidian: result.state.production.nextEntryOrdinal.obsidian,
    },
    reinforcementAnchors: {
      victoria: result.state.production.reinforcementAnchors.victoria,
      obsidian: result.state.production.reinforcementAnchors.obsidian,
    },
  };
  const promotions = {
    pending: [...result.state.promotions.pending].sort((a, b) =>
      a.sequence - b.sequence || a.pawnId.localeCompare(b.pawnId) || a.targetKind.localeCompare(b.targetKind)),
  };
  const abilityOrder = ['royal_decree', 'hold_the_crown', 'sovereign_line', 'imperial_gambit'] as const;
  const heroes = Object.fromEntries((['victoria', 'obsidian'] as const).map((faction) => {
    const hero = result.state.heroes[faction];
    return [faction, {
      ...hero,
      abilities: Object.fromEntries(abilityOrder.map((ability) => [ability, hero.abilities[ability]])),
    }];
  }));
  const ai = Object.fromEntries((['victoria', 'obsidian'] as const).map((faction) => {
    const state = result.state.ai[faction];
    const commitments = [...state.commitments].sort((a, b) =>
      a.intention.localeCompare(b.intention) || a.objectiveId.localeCompare(b.objectiveId) || a.startedTick - b.startedTick || a.expiresTick - b.expiresTick || a.score - b.score);
    const pendingCommands = [...state.pendingCommands].sort((a, b) =>
      a.executeTick - b.executeTick || compareSimCommands(a.command, b.command));
    return [faction, { ...state, commitments, pendingCommands }];
  }));
  const turn = {
    ...result.state.turn,

    royalCommandsRemaining: {
      victoria:
        result.state.turn
          .royalCommandsRemaining
          .victoria,

      obsidian:
        result.state.turn
          .royalCommandsRemaining
          .obsidian,
    },

    pendingOrderIds: [
      ...result.state.turn
        .pendingOrderIds,
    ],
  };

  const pendingOrders = [
    ...result.state.pendingOrders,
  ];

  const intelligence = {
    byFaction: Object.fromEntries(
      (['victoria', 'obsidian'] as const).map((faction) => {
        const memory = result.state.intelligence.byFaction[faction];
        const tileIds = Object.keys(memory).sort();
        return [
          faction,
          Object.fromEntries(
            tileIds.map((id) => [id, memory[id]]),
          ),
        ];
      }),
    ),
  };

  return JSON.stringify({
    state: {
      tick: result.state.tick,
      width: result.state.width,
      height: result.state.height,
      units,
      occupancy,
      combat,
      match,
      territory,
      economy,
      production,
      promotions,
      heroes,
      ai,
      turn,
      pendingOrders,
      intelligence,
    },
    eventsByTick: result.eventsByTick,
  });
}
