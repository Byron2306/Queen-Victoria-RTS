# Phase 4 Economy, Territory & Reinforcements Design

**Date:** 2026-09-28
**Status:** APPROVED
**Repository:** `Byron2306/Queen-Victoria-RTS`

## Purpose

Phase 4 turns territorial control into the economic and production engine of the match while preserving the deterministic simulation contract from Phases 0–3.

> **Territory creates economy; economy creates production choices; production arrives through readable reinforcement pulses; hard capacity rules prevent spam.**

## Scope

Phase 4 adds seven fixed capture nodes, 3×3 capture zones, occupation-timer capture/contest/decay, annexed ownership state, Crown Power, territory-gated unlocks, Command Capacity, hard piece caps, one FIFO production queue per faction, fixed reinforcement pulses, deterministic base-adjacent spawn search, Pawn promotion, explicit receipts, and replay coverage.

It does not add Victoria hero abilities, strategic AI, Phaser UI, multiplayer, random drops, weighted capture strength, multiple production buildings, or faction-specific economy modifiers.

## Invariants

- Simulation truth is deterministic and renderer-independent.
- Existing combat and sovereign ordering remain authoritative.
- No Phase 4 action creates retroactive same-tick combat.
- Crown Power uses integer arithmetic only.
- Territory/production changes emit explicit events.
- Losing territory never deletes already-living units.
- Terminal matches remain frozen exactly as Phase 3 defines.

## Seven capture nodes

The 16×16 Royal Board contains exactly seven fixed map-configured nodes. One is the **Crown Node** and six are minor nodes. Coordinates are immutable map configuration, not procedural randomness.

```ts
export type CaptureNodeState = Readonly<{
  id: string;
  center: Coord;
  owner: Faction | null;
  capturingFaction: Faction | null;
  captureProgressTicks: number;
  contested: boolean;
}>;
```

### Capture zone

Each node owns the 3×3 square centered on its coordinate. A living unit contributes presence if its coordinate is inside that square. Kings do not capture. Phase 4 gives no bonus for multiple units or stronger pieces: factional presence is binary.

### Occupation timer

```ts
export const NODE_CAPTURE_TICKS = 30;
```

At the 100 ms simulation tick this is 3 seconds.

For a neutral node, sole eligible presence advances one tick per simulation tick and ownership changes after exactly 30 ticks.

For an enemy-owned node, capture is two-stage: one full timer neutralizes it, then continued uncontested occupation for another full timer captures it.

If both factions are present, capture pauses and the node is contested.

If a capturing faction leaves early, partial progress decays one tick per simulation tick toward the current ownership baseline. The opposite faction cannot inherit prior hostile progress: existing progress unwinds before the new faction begins its own progress.

Recommended transition events:

```ts
{ type: 'node.contested'; tick; nodeId }
{ type: 'node.uncontested'; tick; nodeId }
{ type: 'node.neutralized'; tick; nodeId; previousOwner; byFaction }
{ type: 'node.captured'; tick; nodeId; owner }
```

Progress itself remains state, not per-tick event spam.

## Crown Power

Each faction owns a non-negative integer Crown Power balance.

### Territory income

```ts
export const CROWN_INCOME_INTERVAL_TICKS = 30;
```

Every 30 ticks:

- each owned minor node yields **+1 Crown**;
- the owned Crown Node yields **+2 Crown**.

A freshly captured node contributes on the next income boundary and does not grant an instant bonus packet.

```ts
{
  type: 'crown.income';
  tick: number;
  faction: Faction;
  amount: number;
  resultingCrownPower: number;
  sourceNodeIds: readonly string[];
}
```

`sourceNodeIds` are sorted deterministically.

### Combat rewards

Base kill rewards:

- Pawn: **5**
- Knight: **10**
- Bishop: **10**
- Rook: **14**
- Queen: **25**
- King: **0**

King death ends the match, so it produces no ordinary Crown reward.

If the lethal outcome carries the combat layer's existing positional bonus classification, the Crown reward gets **+25%**, floored to an integer. Economy must consume combat-owned provenance rather than reimplement positional chess logic.

```ts
{
  type: 'crown.kill_reward';
  tick; faction; defeatedUnitId; amount;
  positionalBonusApplied; resultingCrownPower;
}
```

## Territory-gated unlocks

Recruitment availability is derived from current owned-node count:

- 0–1 nodes: Pawn
- 2 nodes: Knight unlocks
- 3 nodes: Bishop unlocks
- 4 nodes: Rook unlocks
- 5+ nodes: reserved future advanced-upgrade space only

Losing territory blocks newly relocked recruitment immediately but never removes existing pieces.

## Command Capacity

Derived faction capacity:

- base: **6**
- each owned minor node: **+2**
- owned Crown Node: **+1**
- hard maximum: **16**

Unit weights:

- Pawn 1
- Knight 2
- Bishop 2
- Rook 3
- King 0
- Victoria hero will remain outside normal capacity accounting in Phase 5

Capacity usage includes living production-counted units plus queued reservations, preventing queue oversubscription.

If territory loss makes a faction over-capacity, existing units stay alive. The faction simply cannot recruit more until usage becomes legal again.

## Hard piece caps

Per faction, counting living plus queued units:

- Pawn 6
- Knight 2
- Bishop 2
- Rook 2

## Recruitment costs

- Pawn **10 Crown**
- Knight **24**
- Bishop **24**
- Rook **38**

These are balance constants, not structural semantics.

## Production queue

Each faction owns one deterministic FIFO queue.

```ts
export type ProductionQueueEntry = Readonly<{
  id: string;
  faction: Faction;
  unitKind: 'pawn' | 'knight' | 'bishop' | 'rook';
  cost: number;
  capacityWeight: number;
  queuedTick: number;
}>;
```

IDs must be deterministic and never use wall-clock time or random UUIDs.

A recruit request validates, in order:

1. match active;
2. recruitable Phase 4 kind;
3. currently unlocked;
4. sufficient Crown Power;
5. reserved capacity remains legal;
6. living + queued piece count remains under hard cap.

On acceptance, Crown is spent immediately, the entry is appended FIFO, and capacity/piece reservations begin immediately. Rejection causes no mutation.

Recommended rejection reasons: `match_ended`, `locked`, `insufficient_crown`, `capacity_exceeded`, `piece_cap_reached`.

Recommended events:

```ts
{ type: 'production.queued'; tick; faction; queueEntryId; unitKind; cost }
{ type: 'production.rejected'; tick; faction; unitKind; reason }
{ type: 'crown.spent'; tick; faction; amount; resultingCrownPower; reason: 'recruitment' | 'promotion' }
```

## Reinforcement pulses

```ts
export const REINFORCEMENT_PULSE_TICKS = 50;
```

At 100 ms/tick this is every 5 seconds.

On each pulse, each faction examines the head of its queue. The head entry revalidates current unlock, effective capacity legality, piece cap, and spawn availability.

If blocked by territory loss, over-capacity state, piece-cap state, or spawn congestion, the entry stays queued. Crown is not refunded. Later entries do not leapfrog it in Phase 4.

This deliberately creates a readable Battle-Cats-like reinforcement rhythm without copying its specific mechanics: recruit at base, wait for the production rhythm, then watch units enter an already-moving battle.

## Reinforcement anchors and spawn search

Each faction has a fixed reinforcement anchor near its King/base.

Units spawn from that base-side anchor, never directly on arbitrary clicked squares or capture nodes. If the anchor is occupied, search outward deterministically by increasing Chebyshev radius, then a fixed coordinate order within the ring. If no legal tile exists, deployment remains queued.

A newly deployed unit cannot attack retroactively in its deployment tick because combat has already resolved.

```ts
{
  type: 'reinforcement.deployed';
  tick; faction; queueEntryId; unitId; unitKind; position;
}
```

## Pawn promotion

A Pawn becomes promotion-eligible on either of the opponent-side far two ranks.

Promotion is not immediate. It resolves on the Phase 4 economy/reinforcement boundary and:

- costs Crown;
- may target Knight, Bishop, or Rook;
- may never produce another Queen;
- rechecks unlocks;
- rechecks target hard cap;
- rechecks Command Capacity using the delta from Pawn weight 1;
- preserves the Pawn's coordinate and faction;
- atomically replaces Pawn state with promoted-unit state.

Promotion prices are the recruitment-cost deltas:

- Pawn → Knight: **14 Crown**
- Pawn → Bishop: **14 Crown**
- Pawn → Rook: **28 Crown**

Rejected promotion spends nothing. Promotion IDs must be deterministic.

Recommended events:

```ts
{ type: 'promotion.requested'; tick; faction; pawnId; targetKind }
{ type: 'promotion.rejected'; tick; faction; pawnId; targetKind; reason }
{ type: 'promotion.completed'; tick; faction; pawnId; promotedUnitId; targetKind; position }
```

## Phase 4 tick transaction

Required ordering:

```text
1. terminal-match guard
2. Guard target refresh
3. combat resolution
4. sovereign outcome interpretation
5. stop if terminal
6. ordered player commands
7. node capture / contest / decay evaluation
8. node ownership transitions
9. Crown income + combat kill rewards
10. production queue mutation
11. reinforcement pulse deployment
12. promotion resolution
13. sovereign threat evaluation
14. fixed tick advance
```

Consequences:

- combat remains primary;
- King death blocks later economy/production mutations in the decisive tick;
- capture changes feed deterministic later Phase 4 evaluations;
- spawned/promoted units cannot alter earlier same-tick combat;
- sovereign threat reflects final post-command/post-reinforcement/post-promotion board truth.

## Commands

Phase 4 extends `SimCommand` with explicit economy commands, likely:

```ts
export type RecruitCommand = Readonly<{
  type: 'recruit';
  sequence: number;
  issuedTick: number;
  faction: Faction;
  unitKind: RecruitableUnitKind;
}>;

export type PromoteCommand = Readonly<{
  type: 'promote';
  sequence: number;
  issuedTick: number;
  faction: Faction;
  pawnId: string;
  targetKind: PromotableUnitKind;
}>;
```

Because these commands do not necessarily carry `unitId`, the implementation plan must define a stable deterministic tie-break rule compatible with the existing sequence-first ordering.

## Replay truth

Canonical snapshots must include, in deterministic order:

- node state sorted by node ID;
- Crown Power by faction;
- production queues in FIFO order;
- pulse timing state;
- pending promotion state if represented explicitly;
- all Phase 4 event streams.

No wall-clock time, randomness, renderer state, or platform-dependent object iteration may enter canonical state.

## Acceptance matrix

Phase 4 is complete only when automated tests prove at least:

1. exactly seven configured nodes exist in a full-match fixture;
2. presence inside the 3×3 zone advances capture;
3. immediately-outside presence does not;
4. Kings cannot capture;
5. neutral capture completes at exactly 30 ticks;
6. opposing presence pauses progress and emits one contested transition;
7. abandoned partial progress decays deterministically;
8. opposite-faction presence cannot inherit prior progress;
9. enemy ownership requires neutralization then capture;
10. minor and Crown Node income are +1/+2 at 30-tick boundaries;
11. freshly captured nodes do not grant instant bonus income;
12. kill rewards are 5/10/10/14/25/0 for Pawn/Knight/Bishop/Rook/Queen/King;
13. positional kill reward adds floored +25% from combat-owned provenance;
14. unlock thresholds are 0/2/3/4 for Pawn/Knight/Bishop/Rook;
15. territory loss blocks relocked recruitment without deleting units;
16. Command Capacity derives correctly and caps at 16;
17. living + queued units reserve capacity;
18. piece caps include queued reservations;
19. insufficient Crown rejection mutates nothing;
20. legal recruitment spends immediately and queues FIFO;
21. nothing deploys before the 50-tick pulse;
22. head entry deploys to the deterministic nearest free spawn tile;
23. spawn blockage leaves the entry queued;
24. blocked queue head prevents leapfrogging;
25. deployed units cannot attack retroactively;
26. promotion resolves only on the configured boundary;
27. Queen promotion is impossible;
28. promotion rechecks unlock/cap/Crown/capacity;
29. promotion costs are 14/14/28;
30. promotion replacement is atomic at the same coordinate;
31. terminal state blocks capture, income, recruitment, deployment, and promotion;
32. Phase 3 sovereign tests remain green;
33. Phase 2 combat/Guard/replay tests remain green;
34. Phase 1 geometry/threat-map tests remain green;
35. Phase 0 kernel tests remain green;
36. a multi-tick Phase 4 replay through capture, income, recruitment, deployment, and promotion is byte-equivalent across runs.

## Suggested decomposition

```text
src/sim/nodes.ts
  capture configuration, zones, contest/capture/decay

src/sim/economy.ts
  Crown balances, income, kill rewards, unlock/capacity derivation

src/sim/production.ts
  recruitment validation, FIFO queues, pulse timing, spawn search

src/sim/promotion.ts
  eligibility, validation, atomic replacement

src/sim/step.ts
  orchestration only
```

`step.ts` must not become a second implementation of the subsystems above.

## Exit gate

Phase 4 is complete only when territorial occupation, Crown income/rewards, unlock progression, Command Capacity, piece caps, production queues, reinforcement pulses, deterministic spawn search, Pawn promotion, terminal freezing, and canonical replay are all covered by green tests and a clean typecheck, with all Phase 0–3 regression tests still green.

## Deferred boundary

Phase 5 remains Victoria hero progression through five levels, Royal Decree, Hold the Crown, Sovereign Line, Imperial Gambit, and the first balanced AI commander. Phase 4 must not pre-implement those systems.
