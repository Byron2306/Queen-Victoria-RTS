import { UNIT_COMBAT_PROFILES } from './combat';
import { validateMoveGeometry } from './geometry';
import { combatModifiersForRank, militaryRecordFor } from './rank';
import type {
  AttackOrder,
  AssaultOrder,
  ReinforceOrder,
  TacticalOrder,
} from './orders';
import type { WorldState } from './types';

export type SupportLink = Readonly<{
  orderId: string;
  unitId: string;
  supportedUnitId: string;
  depth: number;
  contributionBps: number;
}>;

export type SupportChain = Readonly<{
  rootOrderId: string;
  rootUnitId: string;
  targetUnitId: string;
  links: readonly SupportLink[];
}>;

export type SupportGraphResult =
  | Readonly<{
      valid: true;
      chains: Readonly<Record<string, SupportChain>>;
    }>
  | Readonly<{
      valid: false;
      reason: string;
      orderId?: string;
    }>;

const CONTRIBUTION_BY_DEPTH = [0, 10000, 7000, 4500, 2500] as const;

function combatRoots(
  orders: readonly TacticalOrder[],
): ReadonlyMap<string, AttackOrder | AssaultOrder> {
  return new Map(
    orders
      .filter(
        (order): order is AttackOrder | AssaultOrder =>
          order.kind === 'attack' || order.kind === 'assault',
      )
      .map(order => [order.orderId, order] as const),
  );
}

export function validateSupportGraph(
  world: WorldState,
  orders: readonly TacticalOrder[],
): SupportGraphResult {
  const roots = combatRoots(orders);
  const reinforceOrders = orders.filter(
    (order): order is ReinforceOrder => order.kind === 'reinforce',
  );

  const seenSupporters = new Set<string>();
  for (const order of reinforceOrders) {
    if (seenSupporters.has(order.unitId)) {
      return { valid: false, reason: 'duplicate_supporter', orderId: order.orderId };
    }
    seenSupporters.add(order.unitId);
  }

  const byRoot = new Map<string, ReinforceOrder[]>();
  for (const order of reinforceOrders) {
    const root = roots.get(order.rootOrderId);
    if (!root || root.faction !== order.faction) {
      return { valid: false, reason: 'missing_support_root', orderId: order.orderId };
    }
    const list = byRoot.get(order.rootOrderId) ?? [];
    list.push(order);
    byRoot.set(order.rootOrderId, list);
  }

  const chains: Record<string, SupportChain> = {};

  for (const [rootOrderId, rootOrders] of [...byRoot.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const root = roots.get(rootOrderId)!;
    const edgeBySupporter = new Map(rootOrders.map(order => [order.unitId, order] as const));

    for (const order of rootOrders) {
      const supporter = world.units[order.unitId];
      const supporterCombat = world.combat[order.unitId];
      if (!supporter || !supporterCombat || supporterCombat.health <= 0 || supporter.faction !== root.faction) {
        return { valid: false, reason: 'supporter_unavailable', orderId: order.orderId };
      }

      const receiver = world.units[order.supportedUnitId];
      const receiverCombat = world.combat[order.supportedUnitId];
      if (!receiver || !receiverCombat || receiverCombat.health <= 0 || receiver.faction !== root.faction) {
        return { valid: false, reason: 'supported_unit_unavailable', orderId: order.orderId };
      }

      const geometry = validateMoveGeometry(world, supporter, receiver.position);
      if (!geometry.legal) {
        return { valid: false, reason: 'support_link_blocked', orderId: order.orderId };
      }
    }

    const links: SupportLink[] = [];
    for (const order of rootOrders) {
      const visited = new Set<string>();
      let current = order;
      let depth = 1;

      while (current.supportedUnitId !== root.unitId) {
        if (visited.has(current.unitId) || visited.has(current.supportedUnitId)) {
          return { valid: false, reason: 'support_cycle', orderId: order.orderId };
        }
        visited.add(current.unitId);
        const parent = edgeBySupporter.get(current.supportedUnitId);
        if (!parent) {
          return { valid: false, reason: 'orphan_support_link', orderId: order.orderId };
        }
        current = parent;
        depth += 1;
        if (depth > 4) {
          return { valid: false, reason: 'support_chain_too_deep', orderId: order.orderId };
        }
      }

      links.push({
        orderId: order.orderId,
        unitId: order.unitId,
        supportedUnitId: order.supportedUnitId,
        depth,
        contributionBps: CONTRIBUTION_BY_DEPTH[depth]!,
      });
    }

    links.sort((a, b) => a.depth - b.depth || a.orderId.localeCompare(b.orderId));
    chains[rootOrderId] = {
      rootOrderId,
      rootUnitId: root.unitId,
      targetUnitId: root.targetUnitId,
      links,
    };
  }

  return { valid: true, chains };
}

export function supportPressureForChain(
  world: WorldState,
  chain: SupportChain,
): number {
  let total = 0;

  for (const link of chain.links) {
    const unit = world.units[link.unitId];
    if (!unit) continue;
    const base = UNIT_COMBAT_PROFILES[unit.kind].damage;
    const supportBps = combatModifiersForRank(
      militaryRecordFor(world, unit.id).rank,
    ).supportBps;
    const ranked = Math.floor((base * supportBps) / 10000);
    total += Math.floor((ranked * link.contributionBps) / 10000);
  }

  return total;
}
