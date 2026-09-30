import { resolveAbilityOrder } from './turn-abilities';
import { canUnitAttackTarget, UNIT_COMBAT_PROFILES } from './combat';
import {
  effectiveAttackRange,
  incomingHeroDamageBps,
  outgoingHeroDamageBps,
} from './abilities';
import { evaluatePositionalAttack } from './position';
import { validateMoveGeometry } from './geometry';
import { refreshAllIntelligence } from './intelligence';
import { targetIsObserved, validateMoveKnowledge } from './knowledge-legality';
import {
  detectKnightFork,
  detectOpenFile,
  detectRoyalAlignment,
  detectSovereignLine,
  type TacticalBonus,
} from './tactical-bonuses';
import { interpretSovereignDefeats } from './sovereign';
import { coordKey, isInBounds } from './world';
import {
  supportPressureForChain,
  validateSupportGraph,
  type SupportChain,
} from './support';
import { combatModifiersForRank, militaryRecordFor } from './rank';
import {
  getBannerAt,
  queueBanner,
} from './polarity';
import {
  getTileFactionControl,
} from './territory';
import {
  isPlayableCell,
} from './board-topology';
import type {
  AssaultOrder,
  AttackOrder,
  MoveOrder,
  ReinforceOrder,
  TacticalOrder,
} from './orders';
import type {
  SimEvent,
  UnitMilitaryRecord,
  WorldState,
} from './types';

export type OrderResolutionStatus =
  | 'RESOLVED'
  | 'REFUSED'
  | 'SKIPPED'
  | 'INTERRUPTED';

export type OrderResolutionOutcome = Readonly<{
  orderId: string;
  status: OrderResolutionStatus;
  reason?: string;
}>;

export type OrderResolutionResult = Readonly<{
  world: WorldState;
  outcomes: readonly OrderResolutionOutcome[];
  events: readonly SimEvent[];
}>;

type SingleResolution = Readonly<{
  world: WorldState;
  outcome: OrderResolutionOutcome;
  events: readonly SimEvent[];
}>;

function refused(world: WorldState, orderId: string, reason: string): SingleResolution {
  return { world, outcome: { orderId, status: 'REFUSED', reason }, events: [] };
}

function skipped(world: WorldState, orderId: string, reason: string): SingleResolution {
  return { world, outcome: { orderId, status: 'SKIPPED', reason }, events: [] };
}

function resolvedWithoutMutation(world: WorldState, orderId: string): SingleResolution {
  return { world, outcome: { orderId, status: 'RESOLVED' }, events: [] };
}

function resolveMove(world: WorldState, order: MoveOrder): SingleResolution {
  const actor = world.units[order.unitId];
  if (!actor) return skipped(world, order.orderId, 'actor_missing');
  const actorCombat = world.combat[order.unitId];
  if (!actorCombat || actorCombat.health <= 0) return skipped(world, order.orderId, 'actor_dead');
  if (actor.faction !== order.faction) return refused(world, order.orderId, 'wrong_faction');
  if (!isInBounds(order.destination)) return refused(world, order.orderId, 'out_of_bounds');

  const destinationKey = coordKey(order.destination);
  if (world.occupancy[destinationKey]) return refused(world, order.orderId, 'occupied');

  const geometry = validateMoveGeometry(world, actor, order.destination);
  if (!geometry.legal) return refused(world, order.orderId, geometry.reason);

  const knowledge = validateMoveKnowledge(
    world,
    actor.faction,
    actor.position,
    order.destination,
    actor.kind,
  );
  if (!knowledge.legal) return refused(world, order.orderId, knowledge.reason);

  const oldKey = coordKey(actor.position);
  const units = {
    ...world.units,
    [actor.id]: { ...actor, position: { ...order.destination } },
  };
  const occupancy = { ...world.occupancy };
  delete occupancy[oldKey];
  occupancy[destinationKey] = actor.id;

  return {
    world: {
      ...world,
      units,
      occupancy,
      combat: {
        ...world.combat,
        [actor.id]: { ...actorCombat, guardAnchor: { ...order.destination } },
      },
    },
    outcome: { orderId: order.orderId, status: 'RESOLVED' },
    events: [],
  };
}

function resolveDeployBanner(
  world: WorldState,
  order: Extract<TacticalOrder, { kind: 'deploy_banner' }>,
): SingleResolution {
  if (!isPlayableCell(order.cell.x, order.cell.y)) {
    return refused(world, order.orderId, 'illegal_banner_cell');
  }
  if (getTileFactionControl(world, order.cell) !== order.faction) {
    return refused(world, order.orderId, 'not_friendly_territory');
  }
  if (getBannerAt(world, order.cell)) {
    return refused(world, order.orderId, 'banner_present');
  }

  const result = queueBanner(world, {
    bannerId: order.bannerId,
    faction: order.faction,
    cell: order.cell,
  });
  if (!result.accepted) {
    return refused(world, order.orderId, 'illegal_banner_cell');
  }
  return {
    world: result.state,
    outcome: { orderId: order.orderId, status: 'RESOLVED' },
    events: [],
  };
}

function rootDamage(
  world: WorldState,
  attackerId: string,
  targetId: string,
): Readonly<{ damage: number; positionalTags: readonly string[] }> {
  const attacker = world.units[attackerId]!;
  const profile = UNIT_COMBAT_PROFILES[attacker.kind];
  const positional = evaluatePositionalAttack(world, attackerId, targetId);
  const positionalDamage = Math.floor((profile.damage * positional.multiplierBps) / 10000);
  const heroOutgoing = Math.floor((positionalDamage * outgoingHeroDamageBps(world, attackerId)) / 10000);
  const ranked = Math.floor(
    (heroOutgoing * combatModifiersForRank(militaryRecordFor(world, attackerId).rank).damageBps) /
      10000,
  );
  const heroIncoming = Math.floor((ranked * incomingHeroDamageBps(world, targetId)) / 10000);
  const defended = Math.floor(
    (heroIncoming * combatModifiersForRank(militaryRecordFor(world, targetId).rank).defenseBps) /
      10000,
  );
  return {
    damage: Math.max(1, defended),
    positionalTags: [...positional.tags].sort(),
  };
}

function combatOrderTargetIsLegal(
  world: WorldState,
  order: AttackOrder | AssaultOrder,
): boolean {
  if (order.kind === 'attack') {
    return canUnitAttackTarget(world, order.unitId, order.targetUnitId);
  }

  const attacker = world.units[order.unitId];
  const target = world.units[order.targetUnitId];
  if (!attacker || !target) return false;
  return validateMoveGeometry(world, attacker, target.position).legal;
}

function resolveCombatOrder(
  world: WorldState,
  order: AttackOrder | AssaultOrder,
  supportChain?: SupportChain,
): SingleResolution {
  const attacker = world.units[order.unitId];
  if (!attacker) return skipped(world, order.orderId, 'actor_missing');
  const attackerCombat = world.combat[order.unitId];
  if (!attackerCombat || attackerCombat.health <= 0) return skipped(world, order.orderId, 'actor_dead');
  if (attacker.faction !== order.faction) return refused(world, order.orderId, 'wrong_faction');

  const target = world.units[order.targetUnitId];
  const targetCombat = world.combat[order.targetUnitId];
  if (!target || !targetCombat || targetCombat.health <= 0) {
    return refused(world, order.orderId, 'target_missing');
  }
  if (attacker.faction === target.faction) return refused(world, order.orderId, 'friendly_target');
  if (!targetIsObserved(world, order.faction, target.id)) {
    return refused(world, order.orderId, 'target_not_observed');
  }
  if (!combatOrderTargetIsLegal(world, order)) {
    void effectiveAttackRange(world, attacker.id);
    return refused(world, order.orderId, 'illegal_attack');
  }

  const root = rootDamage(world, attacker.id, target.id);
  const supportPressure = supportChain ? supportPressureForChain(world, supportChain) : 0;
  const damage = Math.max(1, root.damage + supportPressure);
  const healthAfter = Math.max(0, targetCombat.health - damage);
  const supportIds = supportChain?.links.map(link => link.unitId) ?? [];

  const events: SimEvent[] = [
    {
      type: 'attack.fired',
      tick: world.tick,
      unitId: attacker.id,
      targetId: target.id,
      damage,
      positionalTags: root.positionalTags,
    },
    {
      type: 'unit.damaged',
      tick: world.tick,
      unitId: target.id,
      damage,
      healthBefore: targetCombat.health,
      healthAfter,
    },
  ];

  let afterAttack: WorldState = {
    ...world,
    combat: {
      ...world.combat,
      [target.id]: { ...targetCombat, health: healthAfter },
    },
  };

  if (healthAfter === 0) {
    events.push({
      type: 'unit.killed',
      tick: world.tick,
      unitId: target.id,
      byUnitIds: [attacker.id, ...supportIds].sort(),
      positionalBonusApplied: root.positionalTags.length > 0,
    });

    const units = { ...afterAttack.units };
    const occupancy = { ...afterAttack.occupancy };
    const combat = { ...afterAttack.combat };
    const military: Record<string, UnitMilitaryRecord> = { ...afterAttack.military };

    delete occupancy[coordKey(target.position)];
    delete units[target.id];
    delete combat[target.id];
    delete military[target.id];

    const record = militaryRecordFor(afterAttack, attacker.id);
    military[attacker.id] = { ...record, kills: record.kills + 1 };

    for (const id of Object.keys(combat)) {
      const state = combat[id];
      if (state?.targetId === target.id) combat[id] = { ...state, targetId: null };
    }

    afterAttack = { ...afterAttack, units, occupancy, combat, military };

    if (order.kind === 'assault') {
      const survivingAttacker = afterAttack.units[attacker.id];
      const survivingCombat = afterAttack.combat[attacker.id];
      const destinationKey = coordKey(target.position);
      if (
        survivingAttacker &&
        survivingCombat &&
        !afterAttack.occupancy[destinationKey]
      ) {
        const geometry = validateMoveGeometry(afterAttack, survivingAttacker, target.position);
        if (geometry.legal) {
          const advanceUnits = {
            ...afterAttack.units,
            [attacker.id]: { ...survivingAttacker, position: { ...target.position } },
          };
          const advanceOccupancy = { ...afterAttack.occupancy };
          delete advanceOccupancy[coordKey(survivingAttacker.position)];
          advanceOccupancy[destinationKey] = attacker.id;
          afterAttack = {
            ...afterAttack,
            units: advanceUnits,
            occupancy: advanceOccupancy,
            combat: {
              ...afterAttack.combat,
              [attacker.id]: { ...survivingCombat, guardAnchor: { ...target.position } },
            },
          };
        }
      }
    }
  }

  const sovereign = interpretSovereignDefeats(world, afterAttack, events);
  return {
    world: sovereign.state,
    outcome: { orderId: order.orderId, status: 'RESOLVED' },
    events: [...events, ...sovereign.events],
  };
}

function resolveGuard(
  world: WorldState,
  order: Extract<TacticalOrder, { kind: 'guard' }>,
): SingleResolution {
  const unit = world.units[order.unitId];
  if (!unit) return skipped(world, order.orderId, 'actor_missing');
  const combat = world.combat[order.unitId];
  if (!combat || combat.health <= 0) return skipped(world, order.orderId, 'actor_dead');
  if (unit.faction !== order.faction) return refused(world, order.orderId, 'wrong_faction');
  return {
    world: {
      ...world,
      combat: {
        ...world.combat,
        [unit.id]: {
          ...combat,
          stance: 'guard',
          guardAnchor: { ...order.anchor },
          targetId: null,
        },
      },
    },
    outcome: { orderId: order.orderId, status: 'RESOLVED' },
    events: [],
  };
}

function resolveAbility(
  world: WorldState,
  order: Extract<TacticalOrder, { kind: 'ability' }>,
): SingleResolution {
  const result = resolveAbilityOrder(world, order);
  if (result.status === 'REFUSED') {
    return {
      world: result.world,
      outcome: { orderId: order.orderId, status: 'REFUSED', reason: result.reason },
      events: result.events,
    };
  }
  return {
    world: result.world,
    outcome: { orderId: order.orderId, status: 'RESOLVED' },
    events: result.events,
  };
}

function resolveReinforceReceipt(
  world: WorldState,
  order: ReinforceOrder,
  usedSupportOrderIds: ReadonlySet<string>,
): SingleResolution {
  if (usedSupportOrderIds.has(order.orderId)) {
    return resolvedWithoutMutation(world, order.orderId);
  }
  return {
    world,
    outcome: { orderId: order.orderId, status: 'INTERRUPTED', reason: 'support_link_invalidated' },
    events: [],
  };
}

function tacticalBonusesForResolvedOrder(
  current: WorldState,
  order: TacticalOrder,
): TacticalBonus[] {
  const bonuses: TacticalBonus[] = [];
  if ('unitId' in order) {
    const knightFork = detectKnightFork(current, order.unitId);
    if (knightFork) bonuses.push(knightFork);
    const openFile = detectOpenFile(current, order.unitId);
    if (openFile) bonuses.push(openFile);
  }
  bonuses.push(...detectRoyalAlignment(current, order.faction));
  bonuses.push(...detectSovereignLine(current, order.faction));
  return bonuses;
}

export function resolveCommittedOrders(
  world: WorldState,
  orders: readonly TacticalOrder[],
): OrderResolutionResult {
  let current = refreshAllIntelligence(world);
  const outcomes: OrderResolutionOutcome[] = [];
  const events: SimEvent[] = [];
  const usedSupportOrderIds = new Set<string>();

  for (const order of orders) {
    if (current.match.status !== 'active') {
      outcomes.push({ orderId: order.orderId, status: 'INTERRUPTED', reason: 'match_ended' });
      continue;
    }

    let result: SingleResolution;

    if (order.kind === 'reinforce') {
      result = resolveReinforceReceipt(current, order, usedSupportOrderIds);
    } else if (order.kind === 'attack' || order.kind === 'assault') {
      const graph = validateSupportGraph(current, orders);
      const chain = graph.valid ? graph.chains[order.orderId] : undefined;
      for (const link of chain?.links ?? []) usedSupportOrderIds.add(link.orderId);
      result = resolveCombatOrder(current, order, chain);
    } else if (order.kind === 'move') {
      result = resolveMove(current, order);
    } else if (order.kind === 'guard') {
      result = resolveGuard(current, order);
    } else if (order.kind === 'ability') {
      result = resolveAbility(current, order);
    } else if (order.kind === 'deploy_banner') {
      result = resolveDeployBanner(current, order);
    } else {
      result = refused(current, order.orderId, 'unsupported_order_kind');
    }

    current = result.outcome.status === 'RESOLVED'
      ? refreshAllIntelligence(result.world)
      : result.world;
    outcomes.push(result.outcome);
    events.push(...result.events);

    if (result.outcome.status === 'RESOLVED') {
      for (const bonus of tacticalBonusesForResolvedOrder(current, order)) {
        events.push({
          type: 'tactical.bonus',
          tick: current.tick,
          kind: bonus.kind,
          faction: bonus.faction,
          sourceUnitIds: bonus.sourceUnitIds,
          targetUnitIds: bonus.targetUnitIds,
        });
      }
    }
  }

  return { world: current, outcomes, events };
}
