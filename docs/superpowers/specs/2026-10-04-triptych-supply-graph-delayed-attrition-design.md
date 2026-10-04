# Triptych Supply Graph and Delayed Attrition Design

**Date:** 2026-10-04

## Purpose

Add deterministic logistics to Royal War Triptych without creating a second territorial truth.

The completed claim-authority phase established the key prerequisite: territorial ownership is canonical in `BoardTile.factionControl`, while occupation, node ownership, banners and fortifications remain separate concepts. This phase derives supply from those truths and applies delayed attrition to units that remain disconnected.

The strategic doctrine is:

```text
ownership is truth
connectivity is logistics
occupation is pressure
```

Owned territory may remain owned while becoming unsupplied. Enemy occupation may sever a supply corridor without recolouring it.

## Design Outcome

Supply is split into two layers:

1. **Derived supply graph**: recomputed from authoritative world state at a strategic round boundary. It is never serialized as tile ownership or cached as a second map of territorial truth.
2. **Persistent unit exposure memory**: a minimal per-unit count of consecutive unsupplied strategic boundaries, used only to implement delayed attrition.

No tile receives a stored `supplied` boolean.

## Existing Strategic Truths

This phase consumes existing authorities rather than replacing them:

- territorial ownership: `BoardTile.factionControl`
- topology/playability: `BattlefieldTopologyAuthority`
- physical occupation: `world.units` + `world.occupancy`
- unit life/health: `world.combat`
- Crown-node ownership/contest: `CaptureNodeState.owner` + `contested`
- fortifications: existing fortification records
- banners/polarity: existing banner and polarity systems

Supply does not mutate any of those authorities merely by being calculated.

## Chosen Architecture

Create a focused simulation module, expected at:

```text
src/sim/supply.ts
```

The module owns supply derivation and the strategic-boundary attrition resolver.

### Public concepts

Expected interfaces:

```ts
type SupplyStatus =
  | 'supplied'
  | 'exposed'
  | 'strained'
  | 'attrition';

type SupplyState = Readonly<{
  exposureRoundsByUnit: Readonly<Record<string, number>>;
}>;

type FactionSupplySnapshot = Readonly<{
  faction: Faction;
  rootTileIds: readonly TileId[];
  suppliedTileIds: readonly TileId[];
}>;

deriveFactionSupply(
  world: WorldState,
  faction: Faction,
): FactionSupplySnapshot;

supplyStatusForUnit(
  world: WorldState,
  unitId: string,
  snapshot?: FactionSupplySnapshot,
): SupplyStatus;

resolveSupplyAttrition(
  world: WorldState,
): WorldState;
```

Exact helper names may vary during implementation if existing repository conventions demand it, but these responsibilities and boundaries are frozen.

## Supply Roots

A faction can inject supply into its controlled territory from two source classes.

### 1. Home-edge roots

Home supply is topology-derived, not stored as a second ownership marker.

For each faction:

- Victoria home edge is `x = 0`
- Obsidian home edge is `x = world.width - 1`

Every playable tile on that edge is a candidate root.

A candidate becomes an active root only when:

- `factionControl === faction`
- the tile is not occupied by a living enemy unit

This works for both historical V1 compatibility and live V2 without importing fixed V1 geometry into runtime policy.

### 2. Owned Crown-node roots

A Crown node may act as a strategic logistics source when:

- `node.kind === 'crown'`
- `node.owner === faction`
- `node.contested === false`

The node does **not** recolour territory and does not supply neutral/enemy tiles directly.

Instead, its root candidates are the node center plus its playable orthogonal neighbors. Only candidate cells already controlled by the faction and not occupied by a living enemy unit enter the supply graph.

Minor nodes are not supply roots in this phase.

This makes Crown control strategically valuable without collapsing node ownership into territorial ownership.

## Traversal Rule

Supply propagates by deterministic orthogonal flood-fill/BFS across tiles that satisfy all of:

1. playable in the selected topology;
2. `factionControl === faction`;
3. not occupied by a living enemy unit.

Traversal order must be deterministic. Neighbor expansion should use the topology authority's orthogonal neighbors and stable tile ordering.

### Enemy occupation

A living enemy unit occupying a faction-controlled tile blocks supply through that tile.

The tile remains owned by its original faction.

This is the core distinction created by the previous claim-authority phase:

```text
Victoria-owned tile
+ Obsidian occupation
= still Victoria-owned
+ not traversable by Victoria supply
```

A raider can therefore cut a narrow corridor without receiving magical territorial ownership.

Dead units do not block supply.

## Unit Supply Rule

A living unit is supplied only when its occupied cell is present in its faction's derived supplied-tile set.

Therefore:

- a unit on connected friendly territory is supplied;
- a unit on disconnected friendly territory is unsupplied;
- a unit raiding neutral territory is unsupplied;
- a unit occupying enemy territory is unsupplied;
- being merely adjacent to supplied territory does not count as supplied.

The delay before damage provides operational grace for short raids and temporary breakthroughs.

## Persistent Exposure State

The graph is derived, but delayed attrition requires memory across strategic boundaries.

Add one minimal persistent state object to `WorldState`:

```ts
type SupplyState = Readonly<{
  exposureRoundsByUnit: Readonly<Record<string, number>>;
}>;
```

`createWorld()` initializes it empty.

Missing unit entries are interpreted as zero prior unsupplied rounds.

This state records only unit exposure duration. It does not store supplied tiles, roots, ownership or connectivity.

## Exposure Progression

At each supply resolution boundary, every living unit is evaluated exactly once.

### Supplied unit

If supplied:

```text
exposureRoundsByUnit[unitId] = 0
status = supplied
```

Reconnection immediately resets accumulated exposure.

### Unsupplied unit

If unsupplied:

```text
previous 0 -> next 1 -> exposed
previous 1 -> next 2 -> strained
previous 2 -> next 3 -> attrition begins
previous 3 -> next 4 -> attrition continues
...
```

Status mapping:

- 0 = `supplied`
- 1 = `exposed`
- 2 = `strained`
- 3+ = `attrition`

No damage occurs at 1 or 2.

## Attrition Damage

Beginning when the new exposure count reaches 3, the unit takes exactly:

```text
10 HP per strategic boundary
```

This value is intentionally simple and bounded for the first logistics implementation.

Damage is deterministic and cannot occur on wall-clock/fixed ticks.

Attrition may reduce health to zero.

If attrition kills a unit, removal must preserve the same world invariants as combat death:

- remove the unit from `world.units`;
- remove its occupancy;
- remove its combat record;
- remove its military record;
- remove its supply-exposure entry;
- clear or otherwise preserve any dependent references using existing canonical cleanup behavior.

Implementation may extract a small shared casualty helper from combat if needed to avoid duplicating death cleanup. It must not create a second inconsistent death path.

All living unit kinds are subject to supply, including heroes and kings. No class exemption is introduced in this phase.

## Strategic Boundary Integration

Supply resolves during the reinforcement strategic boundary, not during real-time ticks.

The geography order becomes:

```text
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

The important ordering rules are:

1. settlement resolves first, so newly legal frontier claims can participate in logistics;
2. node control resolves second, so a newly captured uncontested Crown can become a supply source immediately;
3. supply and attrition resolve next;
4. Crown income remains independent;
5. deployment occurs later, so newly deployed units do not take attrition on the same boundary they appear;
6. sovereign truth remains late enough to observe a king removed by attrition.

The authoritative `TRIPTYCH_ROUND_STAGE_ORDER` must reflect this order.

## Crown Nodes and Contest

A Crown root is active only while its node is owned by the faction and not contested.

A contested Crown does not inject supply for that boundary.

Losing Crown supply does not change territorial ownership. Territory that remains connected to the faction's home edge remains supplied normally.

Minor nodes retain their existing capture/economy semantics and do not become supply roots here.

## Fortifications

Fortifications do not create supply roots and do not extend supply range.

They influence logistics indirectly because they already protect/deny movement and occupation. A fort guarding a corridor can therefore help keep a supply path open through existing battlefield rules.

No new `fortification -> supply` authority is introduced.

## Banners and Polarity

Banners and polarity do not generate or extend supply.

They retain their existing manipulation role.

Supply traversal depends on territorial ownership and hostile occupation, not tile polarity.

## Ownership Preservation

Supply never writes `factionControl`.

A disconnected tile remains owned.

An enemy-occupied tile remains owned.

A supplied/unsupplied transition never recolours territory.

The ownership tripwire created in the previous phase remains binding.

## Determinism

Supply derivation must be a pure function of the supplied `WorldState`.

Required deterministic practices:

- stable faction iteration;
- stable root ordering;
- stable neighbor traversal;
- stable unit-id ordering for exposure and attrition;
- no wall-clock reads;
- no randomness;
- no dependency on object insertion order;
- no mutation of input state.

Two identical worlds must derive identical supply snapshots and identical post-attrition worlds.

## Replay and Save Shape

Unlike claim coalescence, this phase intentionally adds one serialized state field for exposure memory.

The persistent addition is limited to:

```text
WorldState.supply.exposureRoundsByUnit
```

Derived root/supplied tile sets are not serialized.

Existing canonical snapshot/replay tests must be updated once for the new field and must prove deterministic round trips.

No migration framework is invented unless an existing persistence boundary requires one. Fixtures created through `createWorld()` receive the new state automatically.

## Failure and Edge Cases

The implementation must handle these cases explicitly:

- faction owns no active supply root -> supplied tile set is empty;
- disconnected owned island -> remains owned, but units there are unsupplied;
- enemy blocks the single bridge tile -> territory beyond the bridge becomes unsupplied;
- enemy leaves or dies -> connectivity is restored at the next strategic boundary;
- contested Crown -> no Crown-root supply for that boundary;
- same territory still connected to home -> remains supplied even if Crown is contested;
- unit removed before resolution -> no exposure entry retained;
- newly created/deployed unit -> starts with zero prior exposure;
- attrition death -> occupancy and dependent unit records remain consistent.

## Required Behavioral Proofs

The implementation must add deterministic tests proving at least:

1. V2 opening territory is supplied from each faction's home edge;
2. a connected owned corridor supplies its full reachable component;
3. a disconnected owned island remains owned but is not supplied;
4. a living enemy occupying a one-tile bridge cuts supply beyond that bridge without changing ownership;
5. removing that enemy restores supply on the next derivation;
6. an owned uncontested Crown can seed a disconnected controlled component;
7. a contested Crown cannot seed supply;
8. minor nodes do not seed supply;
9. remote neutral/enemy-territory raiders are unsupplied;
10. exposure progresses 0 -> 1 -> 2 -> 3 deterministically;
11. the first 10 HP attrition hit occurs only when exposure reaches 3;
12. continued unsupplied rounds continue at exactly 10 HP per boundary;
13. reconnection resets exposure to zero and stops damage immediately;
14. attrition death cleans unit/occupancy/combat/military/supply state consistently;
15. new deployments do not take same-boundary attrition;
16. supply resolution runs after node control and before Crown income in the declared stage order;
17. fixed ticks have no supply or attrition authority;
18. replaying the same strategic sequence produces identical snapshots and final state.

## Architectural Tripwires

Add focused tests that prevent:

- stored per-tile `supplied` flags from appearing in canonical territory state;
- supply code from mutating `factionControl`;
- real-time/fixed-tick runtime from invoking attrition resolution;
- client/presentation code from becoming authoritative for supply legality.

The prior territorial ownership tripwire remains unchanged.

## Non-Goals

This phase does not implement:

- enemy-territory conquest;
- territory decay or automatic loss from isolation;
- food/ammunition/resource quantities;
- supply range limits beyond graph connectivity;
- supply wagons or logistics units;
- minor-node supply generation;
- fortification-generated supply;
- banner-generated supply;
- AI supply-aware planning;
- READY deployment;
- supply visualization/final overlay;
- deterministic presentation timing.

Those remain later phases or future balancing work.

## Migration Strategy

Use strict TDD and preserve one source of truth.

Expected implementation sequence:

1. add pure supply-root and connectivity tests;
2. implement derived faction supply snapshots;
3. add hostile-occupation cut/restoration tests;
4. add Crown-root and contest tests;
5. add persistent exposure-state tests;
6. implement delayed exposure progression;
7. add attrition damage/death cleanup tests;
8. integrate supply into the strategic boundary stage order;
9. add deployment/fixed-tick/replay regression proofs;
10. add architecture tripwires;
11. run focused logistics, territory, nodes, combat and round-boundary suites;
12. run the full authoritative test/typecheck/build gate.

## Success Criteria

This phase is complete when:

- supply is derived from canonical ownership, topology, Crown state and hostile occupation;
- no second territorial ownership or per-tile supply truth exists;
- disconnected territory remains owned;
- enemy occupation can sever logistics without recolouring territory;
- Crown nodes can serve as separate strategic logistics roots under the frozen rules;
- unit exposure persists deterministically across strategic boundaries;
- damage begins only on the third consecutive unsupplied boundary;
- attrition applies exactly 10 HP per unsupplied boundary thereafter;
- reconnection resets exposure immediately;
- attrition death preserves world invariants;
- fixed ticks have no logistics authority;
- replay/save state is deterministic;
- full tests, typecheck and build pass.

## Relationship to Later Phases

This phase deliberately stops at logistics truth and consequences.

The next READY-deployment phase can use the resulting logistics model without redefining ownership. AI parity can later reason over the same derived supply snapshot. Final presentation can visualize supplied corridors and exposure states without owning any rule.

The intended strategic effect is:

```text
hold ground -> connect ground -> protect the corridor
cut the corridor -> isolate forces -> force a response
raid briefly -> survive
remain cut off -> bleed
```

That adds logistics pressure without turning the battlefield into an invisible timer or a second paint layer.
