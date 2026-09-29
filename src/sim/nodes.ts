import type { CaptureNodeState, TerritoryState } from './types';
import { hasAdjacentFactionTile } from './territory';

export const DEFAULT_CAPTURE_NODES = {
  // Major-node sanctums live in the narrow north/south arms of the cross.
  crown: { id: 'crown', kind: 'crown', center: { x: 7, y: 1 } },
  'crown-south': { id: 'crown-south', kind: 'crown', center: { x: 8, y: 14 } },

  // Minor nodes form a contested lattice through the central theatre/flanks.
  'minor-nw': { id: 'minor-nw', kind: 'minor', center: { x: 5, y: 5 } },
  'minor-ne': { id: 'minor-ne', kind: 'minor', center: { x: 10, y: 5 } },
  'minor-w': { id: 'minor-w', kind: 'minor', center: { x: 2, y: 7 } },
  'minor-e': { id: 'minor-e', kind: 'minor', center: { x: 13, y: 8 } },
  'minor-sw': { id: 'minor-sw', kind: 'minor', center: { x: 5, y: 10 } },
  'minor-se': { id: 'minor-se', kind: 'minor', center: { x: 10, y: 10 } },
} as const;

export function createInitialTerritoryState(): TerritoryState {
  const nodes: Record<string, CaptureNodeState> = {};
  for (const id of Object.keys(DEFAULT_CAPTURE_NODES).sort()) {
    const node = DEFAULT_CAPTURE_NODES[id as keyof typeof DEFAULT_CAPTURE_NODES];
    nodes[id] = {
      id: node.id,
      kind: node.kind,
      center: { ...node.center },
      owner: null,
      capturingFaction: null,
      captureProgressTicks: 0,
      contested: false,
    };
  }
  return { nodes };
}

import type { Coord, Faction, SimEvent, WorldState } from './types';

export const NODE_CAPTURE_TICKS = 30;

export function isInsideCaptureZone(coord: Coord, node: CaptureNodeState): boolean {
  return Math.abs(coord.x - node.center.x) <= 1 && Math.abs(coord.y - node.center.y) <= 1;
}

function presentFactions(world: WorldState, node: CaptureNodeState): readonly Faction[] {
  const found = new Set<Faction>();
  for (const unit of Object.values(world.units)) {
    if (unit.kind === 'king' || !isInsideCaptureZone(unit.position, node)) continue;
    const combat = world.combat[unit.id];
    if (combat && combat.health > 0) found.add(unit.faction);
  }
  return (['victoria', 'obsidian'] as const).filter((faction) => found.has(faction));
}

function hasStrategicTileState(world: WorldState): boolean {
  return Object.prototype.hasOwnProperty.call(world.territory, 'tiles');
}

function suppliedFactions(
  world: WorldState,
  node: CaptureNodeState,
  factions: readonly Faction[],
): readonly Faction[] {
  // Legacy low-level fixtures without Triptych tile state keep exercising the
  // capture clock in isolation. In real round resolution settlement creates
  // tile state before this reducer, at which point supply is mandatory.
  if (!hasStrategicTileState(world)) return factions;

  return factions.filter((faction) =>
    hasAdjacentFactionTile(world, node.center, faction),
  );
}

function decayProgress(node: CaptureNodeState): CaptureNodeState {
  if (node.captureProgressTicks <= 0) return { ...node, capturingFaction: null, captureProgressTicks: 0 };
  const next = node.captureProgressTicks - 1;
  return { ...node, captureProgressTicks: next, capturingFaction: next === 0 ? null : node.capturingFaction };
}

export function evaluateNodeControl(world: WorldState): { state: WorldState; events: readonly SimEvent[] } {
  const nodes: Record<string, CaptureNodeState> = { ...world.territory.nodes };
  const events: SimEvent[] = [];

  for (const nodeId of Object.keys(nodes).sort()) {
    const original = nodes[nodeId]!;
    const present = presentFactions(world, original);
    const nowContested = present.length > 1;
    let node: CaptureNodeState = { ...original, contested: nowContested };
    if (nowContested) {
      if (!original.contested) events.push({ type: 'node.contested', tick: world.tick, nodeId });
      nodes[nodeId] = node;
      continue;
    }
    if (original.contested) events.push({ type: 'node.uncontested', tick: world.tick, nodeId });

    const factions = suppliedFactions(world, original, present);
    const faction = factions[0];
    if (!faction) {
      node = decayProgress(node);
      nodes[nodeId] = node;
      continue;
    }

    if (node.owner === faction && node.captureProgressTicks === 0) {
      nodes[nodeId] = { ...node, capturingFaction: null };
      continue;
    }

    if (node.captureProgressTicks > 0 && node.capturingFaction !== faction) {
      nodes[nodeId] = decayProgress(node);
      continue;
    }

    const nextProgress = node.captureProgressTicks + 1;
    if (nextProgress < NODE_CAPTURE_TICKS) {
      nodes[nodeId] = { ...node, capturingFaction: faction, captureProgressTicks: nextProgress };
      continue;
    }

    if (node.owner && node.owner !== faction) {
      events.push({ type: 'node.neutralized', tick: world.tick, nodeId, previousOwner: node.owner, byFaction: faction });
      nodes[nodeId] = { ...node, owner: null, capturingFaction: faction, captureProgressTicks: 0 };
      continue;
    }

    events.push({ type: 'node.captured', tick: world.tick, nodeId, owner: faction });
    nodes[nodeId] = { ...node, owner: faction, capturingFaction: null, captureProgressTicks: 0 };
  }

  return {
    state: {
      ...world,
      territory: {
        ...world.territory,
        nodes,
      },
    },
    events,
  };
}

/**
 * Royal Tactical resolves strategic territory once per round rather than from
 * wall-clock presentation ticks. One reinforcement boundary advances a full
 * legacy capture window. We retain progress=1 as a round-boundary receipt so
 * existing save/debug surfaces can distinguish a freshly captured node.
 */
export function evaluateNodeControlForRound(world: WorldState): { state: WorldState; events: readonly SimEvent[] } {
  let state = world;
  const events: SimEvent[] = [];

  for (let step = 0; step < NODE_CAPTURE_TICKS; step += 1) {
    const result = evaluateNodeControl(state);
    state = result.state;
    events.push(...result.events);
  }

  const freshlyCaptured = new Set(
    events
      .filter((event): event is Extract<SimEvent, { type: 'node.captured' }> => event.type === 'node.captured')
      .map((event) => event.nodeId),
  );

  if (freshlyCaptured.size > 0) {
    const nodes = { ...state.territory.nodes };
    for (const nodeId of freshlyCaptured) {
      const node = nodes[nodeId];
      if (node) nodes[nodeId] = { ...node, captureProgressTicks: 1 };
    }
    state = {
      ...state,
      territory: {
        ...state.territory,
        nodes,
      },
    };
  }

  return { state, events };
}
