# Triptych READY Deployment Design

**Date:** 2026-10-05  
**Branch:** `agent/triptych-ideal-system-restoration`  
**Status:** Approved design, awaiting implementation plan

## Purpose

Replace ordinary reinforcement auto-placement with a deterministic, explicit deployment lifecycle:

```
PURCHASED -> QUEUED -> READY -> DEPLOYED
```

The system must stop silently searching outward for a spawn cell. Recruitment purchases create queued production. At the reinforcement boundary, one queued entry per faction may mature into READY. READY units remain off-board until an explicit legal deployment cell is chosen.

The design preserves the existing economy and production throughput while making deployment a tactical choice with one canonical legality authority shared by human and AI actors.

## Doctrine

- Purchasing a unit spends Crown Power immediately.
- QUEUED and READY are both purchased production commitments.
- READY is persistent canonical state, not a transient flag.
- READY units are not board units and therefore have no position, occupancy, combat state, military record, supply status, capture presence, or targetability.
- Explicit human deployment is always required, even if only one legal cell exists.
- Deployment is a free production-resolution action and does not consume a Royal Command.
- AI uses the same deployment legality as the human.
- No ordinary recruit may silently fall back to a nearest-cell or expanding-radius spawn search.

## Canonical State Model

Extend `ProductionState` with persistent READY state:

```ts
export type ReadyDeployment = Readonly<{
  id: string;
  faction: Faction;
  unitKind: RecruitableUnitKind;
  cost: number;
  capacityWeight: number;
  queuedTick: number;
  readyRound: number;
}>;

export type ProductionState = Readonly<{
  queues: Readonly<Record<Faction, readonly ProductionQueueEntry[]>>;
  ready: Readonly<Record<Faction, readonly ReadyDeployment[]>>;
  nextEntryOrdinal: Readonly<Record<Faction, number>>;
  reinforcementAnchors: Readonly<Record<Faction, Coord>>;
}>;
```

The existing queue entry identity must be preserved when it becomes READY. No replacement identity is generated. The eventual board unit id remains deterministic:

```
unit:<ready-entry-id>
```

Example:

```
victoria-recruit-1 -> unit:victoria-recruit-1
```

`createWorld()` initializes:

```ts
ready: {
  victoria: [],
  obsidian: [],
}
```

## Capacity and Piece-Cap Accounting

Capacity and piece-cap checks count all purchased force commitments:

```
board units + QUEUED + READY
```

Moving an entry from QUEUED to READY must not change capacity usage or piece-cap usage.

Deploying a READY entry removes that entry from `production.ready[faction]` and places the corresponding unit on the board. Because the purchased commitment merely changes representation, deployment itself does not re-charge currency or re-check a purchase that has already been paid for.

If an entry was legal when purchased but later strategic changes make the faction exceed a current derived capacity/unlock rule, the READY entry remains READY. It is not deleted or refunded. Deployment legality concerns placement, not re-purchasing.

## Queue-to-READY Maturation

At each reinforcement boundary:

- process factions in stable order: `victoria`, then `obsidian`;
- at most one queue-head entry per faction may mature;
- remove that entry from `production.queues[faction]`;
- append it to `production.ready[faction]`;
- preserve entry identity, unit kind, cost, capacity weight, and queued tick;
- record the current strategic round as `readyRound`;
- do not place a board unit;
- do not create occupancy, combat, military, supply, hero, or intelligence side effects.

This preserves current production throughput while preventing auto-spawn.

A faction may accumulate multiple READY entries across rounds.

## Deployment Zones

### Triptych V2

Victoria deployment zone center:

```
(3,16)
```

Raw zone:

```
x = 1..5
y = 14..18
```

Obsidian deployment zone center:

```
(28,15)
```

Raw zone:

```
x = 26..30
y = 13..17
```

Each raw V2 zone contains exactly 25 candidate coordinates before legality filtering.

### Compatibility Topologies

Generic deployment code must derive a 5x5 zone around the topology's configured reinforcement anchor.

For Triptych V1 compatibility, use the existing anchors already stored in `production.reinforcementAnchors`. The V2 live game therefore uses the exact frozen coordinates above because its anchors are already `(1,16)` and `(30,15)` only as legacy spawn anchors and must not be used as the V2 5x5 zone centers.

To avoid ambiguity, the canonical deployment-zone center must be provided by one explicit authority rather than inferred from the legacy spawn anchor for V2. A focused helper may map topology/faction to the frozen centers.

## Canonical Deployment Authority

Introduce one authoritative deployment API, preferably in a focused `src/sim/deployment.ts` module so production purchasing and board-placement legality remain separate concerns.

Expected responsibilities:

```ts
export type DeploymentRejectReason =
  | 'match_ended'
  | 'missing_ready_entry'
  | 'wrong_faction'
  | 'outside_deployment_zone'
  | 'unplayable_cell'
  | 'occupied_cell';

export type DeploymentDecision = Readonly<{
  allowed: boolean;
  reason?: DeploymentRejectReason;
}>;

export function deploymentZoneForFaction(
  world: WorldState,
  faction: Faction,
): readonly Coord[];

export function legalDeploymentCells(
  world: WorldState,
  faction: Faction,
  readyId: string,
): readonly Coord[];

export function canDeployReadyUnit(
  world: WorldState,
  faction: Faction,
  readyId: string,
  cell: Coord,
): DeploymentDecision;

export function deployReadyUnit(
  world: WorldState,
  faction: Faction,
  readyId: string,
  cell: Coord,
): DeploymentResult;
```

Exact helper names may follow existing repo conventions, but the responsibilities and authority boundary are frozen.

## Cell Legality

A READY unit may deploy only when all of the following are true:

1. the match is active;
2. the READY entry exists;
3. the READY entry belongs to the requesting faction;
4. the cell lies inside that faction's exact raw 5x5 deployment zone;
5. the selected topology says the cell is playable;
6. the cell is unoccupied.

The following do not independently alter deployment legality in this phase:

- territorial ownership;
- tile polarity;
- supply connectivity;
- banner presence;
- fortification ownership;
- node ownership;
- node contest state.

If an existing canonical placement invariant makes a cell impossible for every unit, that invariant may still apply through `placeUnit()`, but no new hidden deployment rule may be invented.

There is no nearest-cell fallback.

There is no expanding search radius.

If all legal cells are blocked, the READY entry remains READY.

If one cell later becomes available, that cell becomes legal immediately.

## Human Deployment Command

Add a typed sim command:

```ts
export type DeployReadyCommand = Readonly<{
  type: 'deploy_ready';
  sequence: number;
  issuedTick: number;
  faction: Faction;
  readyId: string;
  to: Coord;
}>;
```

Add it to `SimCommand` and deterministic command ordering.

The command is an explicit strategic action but costs zero Royal Commands.

It may only be issued during that faction's command phase:

- Victoria may deploy during `victoria_command`;
- Obsidian may deploy during `shadow_command`.

A human must explicitly choose the cell even when only one legal cell exists.

Illegal commands return a typed rejection and leave the READY entry unchanged.

Successful deployment:

- removes the READY entry;
- creates the deterministic unit id;
- calls canonical `placeUnit()`;
- creates occupancy, combat, and military state through existing authority;
- emits deployment evidence;
- does not create same-boundary supply exposure retroactively.

## Client Targeting

Extend strategic targeting with a READY deployment mode or a focused deployment-targeting helper.

The client must not duplicate legality.

Target highlights are obtained by asking canonical sim deployment legality across the raw zone.

Client-side responsibilities are limited to:

- presenting READY entries;
- presenting legal cells;
- staging the typed `deploy_ready` command.

The client may not:

- pick a fallback cell;
- mutate READY state;
- call `placeUnit()` directly;
- invent broader legality.

## AI Parity

AI must deploy READY entries through the same `canDeployReadyUnit()` / `deployReadyUnit()` authority.

AI receives no privileged spawn function.

For this phase, AI cell choice is deterministic and intentionally modest:

1. enumerate canonical legal deployment cells;
2. score them using existing strategic information already available to the AI;
3. break ties stably by coordinate;
4. issue the same typed deployment command or call the same canonical deployment action used by command resolution.

This phase does not introduce a full supply-aware deployment strategist.

AI parity means equal legality and deterministic choice, not perfect strategic intelligence.

## Strategic Boundary Ordering

The strategic boundary remains:

```
settlement
node_control
supply_attrition
crown_income
banner_progress
polarity_flip
promotion
deployment
military_rank
hero_round_state
hero_respawn
sovereign_truth
```

The meaning of the existing `deployment` stage changes.

It no longer places ordinary recruits on the board. It matures queue-head entries into READY.

Therefore:

- supply attrition occurs before new entries become READY;
- READY entries are not board units;
- explicit placement occurs later during a faction command phase;
- a newly deployed unit cannot receive retroactive attrition for a boundary that already happened.

`TRIPTYCH_ROUND_STAGE_ORDER` may retain the label `deployment` for compatibility, but tests and comments must define it as queue-to-READY maturation, not auto-placement.

## Events and Receipts

Introduce or adapt typed events so lifecycle evidence is unambiguous.

Required semantic events:

```
production.queued
reinforcement.ready
reinforcement.deployed
reinforcement.deployment_rejected
```

`reinforcement.ready` records the queue-to-READY transition.

`reinforcement.deployed` records successful board placement.

`reinforcement.deployment_rejected` records an attempted illegal READY placement and its reason.

A rejected deployment:

- does not remove READY state;
- does not create a unit;
- does not change Crown Power;
- does not consume a Royal Command.

Existing production receipts may be reshaped if needed, but they must distinguish queued, ready, and placed truth rather than overloading `queued` and `placed` booleans ambiguously.

## Legacy Spawn Search

`findReinforcementSpawn()` is retired from ordinary recruitment.

`src/sim/production.ts` must not call it for standard purchased units.

The helper may remain temporarily only for unrelated compatibility consumers that still require it. If no legitimate consumers remain after implementation, it may be removed in a later cleanup or as part of this phase if removal is mechanically safe.

No architecture test should require deleting the helper merely for aesthetic reasons. The required rule is that ordinary READY deployment cannot use it.

## Determinism

All READY and deployment behavior must be deterministic:

- faction processing order stable;
- queue head selection stable;
- READY append order stable;
- zone enumeration stable;
- legal-cell ordering stable;
- AI tie-breaking stable;
- unit identity stable;
- input world immutable;
- identical worlds plus identical commands produce identical output worlds.

No wall-clock time or random source may affect maturation or deployment.

## Persistence and Replay

`production.ready` is canonical persistent state.

`canonicalSnapshot()` must serialize READY entries in deterministic faction and entry order.

Derived deployment zones and legal-cell lists are not serialized.

Replay equality must include READY state and successful deployment state.

No new migration framework is required unless existing persistence code already enforces versioned migrations.

## Supply Interaction

READY entries are not units and therefore do not appear in `supply.exposureRoundsByUnit`.

After successful deployment, the unit starts with no exposure entry.

Its first supply evaluation occurs at the next reinforcement boundary.

Deployment legality itself does not require the chosen cell to be supplied.

Supply strategy for AI placement is explicitly out of scope.

## Architecture Guardrails

Add source-level tests proving:

- ordinary recruitment no longer calls `findReinforcementSpawn()`;
- no client module directly mutates `production.ready`;
- no client module calls `placeUnit()` for READY deployment;
- human and AI paths consume canonical deployment legality;
- fixed-tick runtime cannot mature READY entries or deploy units;
- deployment code does not mutate territorial ownership;
- READY state does not create per-tile deployment truth.

Existing topology, ownership, supply, and fixed-tick architecture tests remain unchanged unless a true false-positive requires a test-only detector correction.

## Required Behavioral Proofs

The implementation must prove at least the following:

1. V2 Victoria raw deployment zone contains exactly 25 coordinates.
2. V2 Obsidian raw deployment zone contains exactly 25 coordinates.
3. Victoria raw zone is exactly `x=1..5, y=14..18`.
4. Obsidian raw zone is exactly `x=26..30, y=13..17`.
5. Unplayable cells are filtered by topology.
6. Occupied cells are filtered.
7. Queue head matures to READY at reinforcement.
8. Queue-to-READY creates no board unit.
9. At most one queued entry per faction matures per boundary.
10. READY entries persist across later boundaries.
11. Multiple READY entries preserve deterministic order.
12. Human must explicitly choose a deployment cell.
13. Human deployment consumes zero Royal Commands.
14. Outside-zone deployment is rejected.
15. Occupied-cell deployment is rejected.
16. Unplayable-cell deployment is rejected.
17. Wrong-faction READY deployment is rejected.
18. Missing READY id is rejected.
19. Rejection preserves the READY entry unchanged.
20. Fully blocked 5x5 zone causes no fallback.
21. A later-freed legal cell becomes deployable.
22. Successful deployment removes exactly one READY entry.
23. Successful deployment preserves deterministic unit id.
24. Successful deployment initializes canonical occupancy, combat, and military state.
25. READY entries count toward command capacity.
26. READY entries count toward piece caps.
27. Moving QUEUED to READY does not change capacity usage.
28. Newly deployed unit has no same-boundary supply exposure.
29. AI uses the same canonical legality as human deployment.
30. AI deployment choice is deterministic under identical state.
31. Fixed ticks cannot mature or deploy READY entries.
32. Replay/canonical snapshot includes READY state deterministically.
33. Ordinary recruitment does not call `findReinforcementSpawn()`.
34. No READY action mutates `factionControl`.

## Non-Goals

This phase does not implement:

- supply-aware deployment scoring;
- deployment costs beyond the existing purchase price;
- Royal Command cost for deployment;
- territory ownership requirements for placement;
- fort-based deployment;
- Crown-node deployment extensions;
- mobile spawn points;
- logistics wagons;
- deployment-zone expansion;
- emergency fallback placement;
- final deployment UI art;
- deterministic presentation timing;
- the later ideal-system gauntlet beyond READY-specific acceptance;
- general AI strategic redesign.

## Compatibility Notes

Existing tests that currently expect reinforcement to auto-place ordinary recruits will become stale by design.

Those tests must be updated to assert queue-to-READY maturation and explicit deployment. This is a semantic migration, not a reason to preserve automatic placement.

Compatibility code may retain `reinforcementAnchors` until all legitimate consumers are migrated. V2 deployment-zone centers must not be inferred from those legacy spawn anchors because the frozen centers are `(3,16)` and `(28,15)`.

## Completion Standard

The READY Deployment phase is complete only when:

- all required behavioral proofs are green;
- existing production, turn, AI, replay, supply, topology, ownership, and fixed-tick regressions are green;
- full repository tests pass;
- TypeScript typecheck passes;
- production build passes;
- ordinary recruit auto-spawn is absent;
- human deployment is explicit;
- AI deployment uses the same legality;
- READY state is persistent and replay-stable;
- no forbidden fallback spawn path remains for ordinary recruitment.
