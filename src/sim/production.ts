import {
  CAPACITY_WEIGHT,
  PIECE_CAP,
  capacityUsage,
  commandCapacity,
  isRecruitUnlocked,
  pieceCountWithQueue,
} from './economy';
import { topologyForWorld } from './territory';
import type {
  Faction,
  ProductionQueueEntry,
  RecruitCommand,
  RecruitableUnitKind,
  SimEvent,
  UnitState,
  WorldState,
} from './types';
import { placeUnit } from './world';
import { findReinforcementSpawn } from './spawn';
export { findReinforcementSpawn } from './spawn';

export const RECRUITMENT_COST: Readonly<Record<RecruitableUnitKind, number>> = {
  pawn: 10,
  knight: 24,
  bishop: 24,
  rook: 38,
};

export type ProductionFeedbackReason =
  | Extract<SimEvent, { type: 'production.rejected' }>['reason']
  | 'invalid_deployment_territory'
  | 'blocked_spawn'
  | 'deployment_relocked';

export type ProductionReceipt = Readonly<{
  accepted: boolean;
  reason: ProductionFeedbackReason | null;
  unitKind: RecruitableUnitKind;
  cost: number;
  remainingCurrency: number;
  queued: boolean;
  placed: boolean;
  queueEntryId?: string;
  unitId?: string;
}>;

export type RecruitmentResult = Readonly<{
  state: WorldState;
  events: readonly SimEvent[];
  receipt: ProductionReceipt;
}>;

export type DeploymentResult = Readonly<{
  state: WorldState;
  events: readonly SimEvent[];
  receipts: Readonly<Record<Faction, ProductionReceipt | null>>;
}>;

export function queueRecruitment(
  world: WorldState,
  command: RecruitCommand,
): RecruitmentResult {
  const cost = RECRUITMENT_COST[command.unitKind];
  const remainingCurrency = world.economy.crownPower[command.faction];

  const reject = (
    reason: Extract<SimEvent, { type: 'production.rejected' }>['reason'],
  ): RecruitmentResult => ({
    state: world,
    events: [{
      type: 'production.rejected',
      tick: world.tick,
      faction: command.faction,
      unitKind: command.unitKind,
      reason,
    } as SimEvent],
    receipt: {
      accepted: false,
      reason,
      unitKind: command.unitKind,
      cost,
      remainingCurrency,
      queued: false,
      placed: false,
    },
  });

  if (world.match.status !== 'active') return reject('match_ended');
  if (!isRecruitUnlocked(world, command.faction, command.unitKind)) return reject('locked');
  if (remainingCurrency < cost) return reject('insufficient_crown');

  const weight = CAPACITY_WEIGHT[command.unitKind];
  if (
    capacityUsage(world, command.faction) + weight >
    commandCapacity(world, command.faction)
  ) {
    return reject('capacity_exceeded');
  }
  if (
    pieceCountWithQueue(world, command.faction, command.unitKind) >=
    PIECE_CAP[command.unitKind]
  ) {
    return reject('piece_cap_reached');
  }

  const ordinal = world.production.nextEntryOrdinal[command.faction];
  const entry = {
    id: `${command.faction}-recruit-${ordinal}`,
    faction: command.faction,
    unitKind: command.unitKind,
    cost,
    capacityWeight: weight,
    queuedTick: world.tick,
  } as const;
  const crownPower = {
    ...world.economy.crownPower,
    [command.faction]: remainingCurrency - cost,
  };
  const queues = {
    ...world.production.queues,
    [command.faction]: [...world.production.queues[command.faction], entry],
  };
  const nextEntryOrdinal = {
    ...world.production.nextEntryOrdinal,
    [command.faction]: ordinal + 1,
  };
  const state: WorldState = {
    ...world,
    economy: { crownPower },
    production: { ...world.production, queues, nextEntryOrdinal },
  };

  return {
    state,
    events: [
      {
        type: 'crown.spent',
        tick: world.tick,
        faction: command.faction,
        amount: cost,
        resultingCrownPower: crownPower[command.faction],
        reason: 'recruitment',
      },
      {
        type: 'production.queued',
        tick: world.tick,
        faction: command.faction,
        queueEntryId: entry.id,
        unitKind: command.unitKind,
        cost,
      },
    ],
    receipt: {
      accepted: true,
      reason: null,
      unitKind: command.unitKind,
      cost,
      remainingCurrency: crownPower[command.faction],
      queued: true,
      placed: false,
      queueEntryId: entry.id,
    },
  };
}

function deploymentLegal(world: WorldState, entry: ProductionQueueEntry): boolean {
  if (!isRecruitUnlocked(world, entry.faction, entry.unitKind)) return false;
  if (capacityUsage(world, entry.faction) > commandCapacity(world, entry.faction)) return false;
  if (pieceCountWithQueue(world, entry.faction, entry.unitKind) > PIECE_CAP[entry.unitKind]) return false;
  return true;
}

function blockedReceipt(
  world: WorldState,
  entry: ProductionQueueEntry,
  reason: ProductionFeedbackReason,
): ProductionReceipt {
  return {
    accepted: false,
    reason,
    unitKind: entry.unitKind,
    cost: entry.cost,
    remainingCurrency: world.economy.crownPower[entry.faction],
    queued: true,
    placed: false,
    queueEntryId: entry.id,
  };
}

export function deployReinforcements(world: WorldState): DeploymentResult {
  let working = world;
  const events: SimEvent[] = [];
  const receipts: Record<Faction, ProductionReceipt | null> = {
    victoria: null,
    obsidian: null,
  };

  for (const faction of ['victoria', 'obsidian'] as const) {
    const head = working.production.queues[faction][0];
    if (!head) continue;

    const anchor = working.production.reinforcementAnchors[faction];
    const topology = topologyForWorld(working);
    if (!topology.isPlayableCell(anchor.x, anchor.y)) {
      receipts[faction] = blockedReceipt(
        working,
        head,
        'invalid_deployment_territory',
      );
      continue;
    }

    if (!deploymentLegal(working, head)) {
      receipts[faction] = blockedReceipt(working, head, 'deployment_relocked');
      continue;
    }

    const unitId = `unit:${head.id}`;
    if (working.units[unitId]) {
      receipts[faction] = {
        accepted: true,
        reason: null,
        unitKind: head.unitKind,
        cost: head.cost,
        remainingCurrency: working.economy.crownPower[faction],
        queued: false,
        placed: true,
        queueEntryId: head.id,
        unitId,
      };
      continue;
    }

    const position = findReinforcementSpawn(working, faction);
    if (!position) {
      receipts[faction] = blockedReceipt(working, head, 'blocked_spawn');
      continue;
    }

    const unit: UnitState = {
      id: unitId,
      faction,
      kind: head.unitKind,
      position,
    };
    working = placeUnit(working, unit);
    const queues = {
      ...working.production.queues,
      [faction]: working.production.queues[faction].slice(1),
    };
    working = {
      ...working,
      production: { ...working.production, queues },
    };
    events.push({
      type: 'reinforcement.deployed',
      tick: world.tick,
      faction,
      queueEntryId: head.id,
      unitId,
      unitKind: head.unitKind,
      position,
    });
    receipts[faction] = {
      accepted: true,
      reason: null,
      unitKind: head.unitKind,
      cost: head.cost,
      remainingCurrency: working.economy.crownPower[faction],
      queued: false,
      placed: true,
      queueEntryId: head.id,
      unitId,
    };
  }

  return { state: working, events, receipts };
}
