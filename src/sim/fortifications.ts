import { tileId } from './board-topology';
import { strategicAbilityModifiers } from './strategic-ability-hooks';
import {
  getTileFactionControl,
  topologyForWorld,
  type TriptychTerritoryState,
} from './territory';
import type { Coord, Faction, WorldState } from './types';

export type FortificationRejectReason =
  | 'off_board'
  | 'not_friendly_territory'
  | 'already_fortified';

export type FortificationKind = 'bastion' | 'redoubt';

export type FortificationState = Readonly<{
  id: string;
  faction: Faction;
  kind: FortificationKind;
  cell: Coord;
  durability: number;
}>;

export type FortificationDecision =
  | Readonly<{ allowed: true }>
  | Readonly<{ allowed: false; reason: FortificationRejectReason }>;

export type FortificationBuildOrder = Readonly<{
  id: string;
  faction: Faction;
  cell: Coord;
  kind?: FortificationKind;
}>;

export type FortificationResult = Readonly<{
  state: WorldState;
  accepted: boolean;
  reason?: FortificationRejectReason;
}>;

type TerritoryWithFortifications = TriptychTerritoryState & Readonly<{
  fortifications?: Readonly<Record<string, FortificationState>>;
}>;

export function fortificationsFor(world: WorldState): Readonly<Record<string, FortificationState>> {
  return (world.territory as TerritoryWithFortifications).fortifications ?? {};
}

export function getFortificationAt(
  world: WorldState,
  cell: Coord,
): FortificationState | null {
  const key = tileId(cell);
  return Object.values(fortificationsFor(world)).find(
    (fortification) => tileId(fortification.cell) === key,
  ) ?? null;
}

export function canBuildFortification(
  world: WorldState,
  faction: Faction,
  cell: Coord,
): FortificationDecision {
  const topology = topologyForWorld(world);
  if (!topology.isPlayableCell(cell.x, cell.y)) {
    return { allowed: false, reason: 'off_board' };
  }

  if (getTileFactionControl(world, cell) !== faction) {
    return { allowed: false, reason: 'not_friendly_territory' };
  }

  if (getFortificationAt(world, cell)) {
    return { allowed: false, reason: 'already_fortified' };
  }

  return { allowed: true };
}

export function buildFortification(
  world: WorldState,
  order: FortificationBuildOrder,
): FortificationResult {
  const decision = canBuildFortification(world, order.faction, order.cell);
  if (!decision.allowed) {
    return {
      state: world,
      accepted: false,
      reason: decision.reason,
    };
  }

  const fortifications: Record<string, FortificationState> = {
    ...fortificationsFor(world),
    [order.id]: {
      id: order.id,
      faction: order.faction,
      kind: order.kind ?? 'bastion',
      cell: { ...order.cell },
      durability:
        3 + strategicAbilityModifiers(world, order.faction).fortificationDurabilityBonus,
    },
  };

  return {
    state: {
      ...world,
      territory: {
        ...world.territory,
        fortifications,
      } as TerritoryWithFortifications,
    },
    accepted: true,
  };
}

export function repairFortification(
  world: WorldState,
  fortificationId: string,
): FortificationResult {
  const current = fortificationsFor(world)[fortificationId];
  if (!current) return { state: world, accepted: false };

  const maxDurability =
    3 + strategicAbilityModifiers(world, current.faction).fortificationDurabilityBonus;
  const durability = Math.min(maxDurability, current.durability + 1);
  if (durability === current.durability) {
    return { state: world, accepted: true };
  }

  return {
    accepted: true,
    state: {
      ...world,
      territory: {
        ...world.territory,
        fortifications: {
          ...fortificationsFor(world),
          [fortificationId]: {
            ...current,
            durability,
          },
        },
      } as TerritoryWithFortifications,
    },
  };
}

export function damageFortification(
  world: WorldState,
  fortificationId: string,
  amount: number,
): WorldState {
  const current = fortificationsFor(world)[fortificationId];
  if (!current || amount <= 0) return world;

  const fortifications: Record<string, FortificationState> = {
    ...fortificationsFor(world),
  };
  const durability = Math.max(0, current.durability - amount);

  if (durability === 0) {
    delete fortifications[fortificationId];
  } else {
    fortifications[fortificationId] = {
      ...current,
      durability,
    };
  }

  return {
    ...world,
    territory: {
      ...world.territory,
      fortifications,
    } as TerritoryWithFortifications,
  };
}

export function isFortificationBlockingCell(
  world: WorldState,
  cell: Coord,
): boolean {
  return getFortificationAt(world, cell) !== null;
}
