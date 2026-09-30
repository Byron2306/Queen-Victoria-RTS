import { CAPACITY_WEIGHT, PIECE_CAP, capacityUsage, commandCapacity, isRecruitUnlocked, pieceCountWithQueue } from './economy';
import type { PromoteCommand, PromotableUnitKind, SimEvent, WorldState } from './types';

export const PROMOTION_COST: Readonly<Record<PromotableUnitKind, number>> = {
  knight: 14, bishop: 14, rook: 28,
};

type PromotionRejectReason = Extract<SimEvent, { type: 'promotion.rejected' }>['reason'];

function inPromotionZone(world: WorldState, pawnId: string): boolean {
  const pawn = world.units[pawnId];
  if (!pawn) return false;
  return pawn.faction === 'victoria'
    ? pawn.position.x >= world.width - 2
    : pawn.position.x <= 1;
}

function rejection(world: WorldState, command: Pick<PromoteCommand, 'faction' | 'pawnId' | 'targetKind'>, reason: PromotionRejectReason) {
  return { type: 'promotion.rejected', tick: world.tick, faction: command.faction, pawnId: command.pawnId, targetKind: command.targetKind, reason } as const;
}

export function queuePromotionRequest(world: WorldState, command: PromoteCommand): { state: WorldState; events: readonly SimEvent[] } {
  if (world.match.status !== 'active') return { state: world, events: [rejection(world, command, 'match_ended')] };
  const unit = world.units[command.pawnId];
  if (!unit) return { state: world, events: [rejection(world, command, 'missing_pawn')] };
  if (unit.faction !== command.faction) return { state: world, events: [rejection(world, command, 'wrong_faction')] };
  if (unit.kind !== 'pawn') return { state: world, events: [rejection(world, command, 'not_pawn')] };
  if (!inPromotionZone(world, command.pawnId)) return { state: world, events: [rejection(world, command, 'not_in_zone')] };
  if (world.promotions.pending.some((pending) => pending.pawnId === command.pawnId)) return { state: world, events: [rejection(world, command, 'already_pending')] };
  const pending = [...world.promotions.pending, { faction: command.faction, pawnId: command.pawnId, targetKind: command.targetKind, sequence: command.sequence, requestedTick: world.tick }];
  return {
    state: { ...world, promotions: { pending } },
    events: [{ type: 'promotion.requested', tick: world.tick, faction: command.faction, pawnId: command.pawnId, targetKind: command.targetKind }],
  };
}

function boundaryReason(world: WorldState, command: PromoteCommand): PromotionRejectReason | null {
  const unit = world.units[command.pawnId];
  if (!unit) return 'missing_pawn';
  if (unit.faction !== command.faction) return 'wrong_faction';
  if (unit.kind !== 'pawn') return 'not_pawn';
  if (!inPromotionZone(world, command.pawnId)) return 'not_in_zone';
  if (!isRecruitUnlocked(world, command.faction, command.targetKind)) return 'locked';
  if (world.economy.crownPower[command.faction] < PROMOTION_COST[command.targetKind]) return 'insufficient_crown';
  const delta = CAPACITY_WEIGHT[command.targetKind] - CAPACITY_WEIGHT.pawn;
  if (capacityUsage(world, command.faction) + delta > commandCapacity(world, command.faction)) return 'capacity_exceeded';
  if (pieceCountWithQueue(world, command.faction, command.targetKind) >= PIECE_CAP[command.targetKind]) return 'piece_cap_reached';
  return null;
}

export function resolvePromotions(world: WorldState): { state: WorldState; events: readonly SimEvent[] } {
  if (world.promotions.pending.length === 0) return { state: world, events: [] };
  let working: WorldState = { ...world, promotions: { pending: [] } };
  const events: SimEvent[] = [];
  const ordered = [...world.promotions.pending].sort((a,b)=>a.sequence-b.sequence || a.pawnId.localeCompare(b.pawnId) || a.targetKind.localeCompare(b.targetKind));
  for (const pending of ordered) {
    const command: PromoteCommand = { type: 'promote', sequence: pending.sequence, issuedTick: pending.requestedTick, faction: pending.faction, pawnId: pending.pawnId, targetKind: pending.targetKind };
    const reason = boundaryReason(working, command);
    if (reason) {
      events.push(rejection(working, command, reason));
      continue;
    }
    const unit = working.units[command.pawnId]!;
    const cost = PROMOTION_COST[command.targetKind];
    const crownPower = { ...working.economy.crownPower, [command.faction]: working.economy.crownPower[command.faction] - cost };
    working = {
      ...working,
      economy: { crownPower },
      units: { ...working.units, [unit.id]: { ...unit, kind: command.targetKind } },
    };
    events.push({ type: 'crown.spent', tick: world.tick, faction: command.faction, amount: cost, resultingCrownPower: crownPower[command.faction], reason: 'promotion' });
    events.push({ type: 'promotion.completed', tick: world.tick, faction: command.faction, pawnId: command.pawnId, promotedUnitId: command.pawnId, targetKind: command.targetKind, position: { ...unit.position } });
  }
  return { state: working, events };
}
