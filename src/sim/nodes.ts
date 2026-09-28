import type { CaptureNodeState, TerritoryState } from './types';

export const DEFAULT_CAPTURE_NODES = {
  crown: { id: 'crown', kind: 'crown', center: { x: 7, y: 7 } },
  'minor-nw': { id: 'minor-nw', kind: 'minor', center: { x: 3, y: 3 } },
  'minor-ne': { id: 'minor-ne', kind: 'minor', center: { x: 12, y: 3 } },
  'minor-w': { id: 'minor-w', kind: 'minor', center: { x: 3, y: 8 } },
  'minor-e': { id: 'minor-e', kind: 'minor', center: { x: 12, y: 7 } },
  'minor-sw': { id: 'minor-sw', kind: 'minor', center: { x: 3, y: 12 } },
  'minor-se': { id: 'minor-se', kind: 'minor', center: { x: 12, y: 12 } },
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
    const factions = presentFactions(world, original);
    const nowContested = factions.length > 1;
    let node: CaptureNodeState = { ...original, contested: nowContested };
    if (nowContested) {
      if (!original.contested) events.push({ type: 'node.contested', tick: world.tick, nodeId });
      nodes[nodeId] = node;
      continue;
    }
    if (original.contested) events.push({ type: 'node.uncontested', tick: world.tick, nodeId });

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

  return { state: { ...world, territory: { nodes } }, events };
}
