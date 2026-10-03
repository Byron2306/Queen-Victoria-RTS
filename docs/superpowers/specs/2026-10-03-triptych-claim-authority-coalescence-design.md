# Triptych Claim Authority Coalescence Design

**Date:** 2026-10-03

## Purpose

Coalesce Royal War Triptych territorial ownership behind one authoritative mutation path without collapsing distinct strategic concepts into one over-generalized state object.

The topology-restoration phase has already established the 32x32 V2 battlefield, 496-cell playable mask, V2-aware intelligence/presentation, and strict V2 geometry. This phase addresses the next architectural seam: territorial ownership can currently be mutated through multiple gameplay paths with different legality rules.

## Design Outcome

`BoardTile.factionControl` is the sole canonical truth for territorial tile ownership.

Other strategic concepts remain distinct:

- node ownership: `CaptureNodeState.owner`
- banner ownership/state: `BannerState.faction`, `roundsHeld`, `mature`, `contestedBy`
- fortification ownership: fortification `faction`
- physical occupation: `world.units` + `world.occupancy`
- contest state: derived from occupation and/or strategic-object rules
- supply: derived in the later supply phase

No one of those fields is permitted to masquerade as territorial ownership.

## Existing Problem

### Multiple territorial mutation paths

`territory.ts` currently exposes `annexTile()` with explicit legality:

- target must be playable
- target must be neutral
- target must be adjacent to friendly territory

But `resolveSettlement()` currently paints every living unit's occupied playable tile directly to that unit's faction. That means a unit can:

- claim remote neutral territory without adjacency
- overwrite enemy-controlled territory merely by standing on it

This creates a split authority between explicit annexation and settlement.

### Client-side legality duplication

`src/client/input/strategic-targeting.ts` independently recreates annex legality by checking:

- tile is neutral
- tile has adjacent friendly territory

That duplicates simulation policy in the client and can drift from the authoritative sim.

### Strategic objects are already distinct

Nodes and banners already own different concepts and should remain separate:

- nodes model strategic capture clocks, ownership and contest
- banners model polarity manipulation and contest
- fortifications require/occupy controlled ground

The problem is not that these concepts are separate. The problem is that territorial ownership mutation itself has more than one gameplay authority.

## Chosen Architecture

Use a single faction-claim authority in `src/sim/territory.ts`.

### Public interface

```ts
type ClaimSource =
  | 'annex_command'
  | 'settlement'
  | 'banner'
  | 'fortification';

type ClaimRejectReason =
  | 'off_board'
  | 'already_controlled'
  | 'enemy_controlled'
  | 'not_adjacent_to_friendly_territory';

type ClaimDecision = Readonly<{
  allowed: boolean;
  reason?: ClaimRejectReason;
}>;

type ClaimResult = Readonly<{
  state: WorldState;
  accepted: boolean;
  reason?: ClaimRejectReason;
}>;

canFactionClaimTile(
  world: WorldState,
  faction: Faction,
  cell: Coord,
  source: ClaimSource,
): ClaimDecision;

claimFactionTile(
  world: WorldState,
  faction: Faction,
  cell: Coord,
  source: ClaimSource,
): ClaimResult;
```

`annexTile()` becomes a thin compatibility wrapper around this authority.

## Frozen Rules

### Territorial ownership

A tile's `factionControl` is the only authoritative territorial-ownership field.

Gameplay mutation of `factionControl` must flow through `claimFactionTile()` unless the mutation is explicit world initialization/migration code.

### Explicit annex

`annex_command` may claim a tile only when:

1. the cell is playable in the selected topology;
2. the cell is neutral;
3. the cell is orthogonally adjacent to territory already controlled by the faction.

A same-faction tile is rejected as `already_controlled`.

Enemy-controlled territory is rejected as `enemy_controlled`.

### Settlement

`settlement` uses the same claim legality as explicit annexation.

Therefore:

- a unit standing on an adjacent neutral frontier may cause that tile to become controlled;
- a remote raider may occupy a neutral tile without magically claiming it;
- a unit occupying enemy-controlled territory does not flip ownership merely by standing there.

Occupation and ownership are intentionally decoupled.

### Enemy territory

Enemy-controlled territory remains owned by its current faction until a future explicit conquest mechanic changes that rule.

This phase does not invent capture-by-occupation, siege transfer, or timed enemy annexation.

### Nodes

`CaptureNodeState.owner` remains authoritative only for node ownership.

Node ownership may influence economy, objectives, supply roots or later conquest rules, but it does not directly redefine surrounding tile ownership.

Node capture must not write `factionControl` unless a future rule explicitly calls `claimFactionTile()`.

### Banners

Banners remain polarity/control instruments.

Banner state is not territorial ownership.

Current mature-banner behavior may continue to mutate tile polarity. It must not directly mutate tile `factionControl`.

If a later design allows banners to create territorial claims, the banner system must request that mutation through `claimFactionTile(..., 'banner')`.

### Fortifications

Fortifications remain owned strategic objects that require legal friendly placement.

Building or occupying a fortification does not itself create territorial ownership.

If any future fortification mechanic extends territory, it must use `claimFactionTile(..., 'fortification')`.

### Opening territory

`applyTriptychOpeningTerritory()` is world-construction/initialization code and may seed `factionControl` directly.

This is an explicit exception because it establishes the initial state rather than resolving a gameplay claim.

## Source-Specific Policy

The first implementation keeps all gameplay claim sources on the same conservative legality:

```text
playable + neutral + adjacent-to-friendly
```

The `ClaimSource` argument is retained now so future source-specific policy can be added without creating new mutation paths.

No source receives special bypass authority in this phase.

## Derived Contest State

Do not add `contested` as a third territorial ownership value.

A Victoria-controlled tile may be occupied by an Obsidian unit while remaining Victoria-controlled.

This distinction is required by the later supply phase:

- ownership can persist;
- supply can be severed or degraded;
- occupation/contest can be derived independently.

The model therefore remains:

```text
tile ownership   = factionControl
node ownership   = node.owner
banner ownership = banner.faction
fort ownership   = fortification.faction
occupation       = units / occupancy
contest          = derived
supply           = derived later
```

## Client Boundary

`src/client/input/strategic-targeting.ts` must stop reproducing annex policy.

For `annex_tile`, it calls `canFactionClaimTile(world, faction, cell, 'annex_command')`.

The client may use the decision to highlight legal targets, but simulation policy remains owned by the sim.

This removes the possibility that the UI paints a cell as legal while the command resolver refuses it, or vice versa.

## Resolver Boundary

Any annex order resolution should call the shared claim authority.

`resolveSettlement()` should iterate living units deterministically and request `settlement` claims one by one.

Rejected settlement claims leave unit position/occupation untouched and leave territorial ownership unchanged.

The iteration order must remain deterministic. If multiple settlement attempts could affect the same tile, existing unit-order determinism must be preserved or made explicit in tests.

## Replay and Save Compatibility

This phase does not change the serialized shape of `WorldState` merely to introduce the authority API.

`factionControl`, nodes, banners and forts remain in their existing records.

Replay/save determinism should therefore change only where prior illegal settlement painting previously altered state.

Any existing fixtures that intentionally relied on remote or enemy settlement recolouring must be updated to the new frozen rule rather than given a compatibility bypass.

## Architectural Tripwire

Add a focused architecture test that prevents gameplay modules from directly mutating territorial `factionControl` outside approved files.

Approved direct-write locations should be narrowly limited to:

- `src/sim/territory.ts` for the canonical claim authority;
- `src/sim/triptych-territory.ts` for opening-state initialization;
- narrowly documented migration/persistence code if such a need is actually discovered.

The test should not ban reading `factionControl`.

It should target direct mutation/assignment patterns or imports of lower-level mutation helpers where practical, with behavior tests remaining the primary proof.

## Required Behavioral Proofs

The implementation must add deterministic tests proving:

1. explicit annex and settlement both claim the same adjacent neutral frontier cell;
2. remote neutral settlement leaves the unit in place while the tile remains neutral;
3. occupying enemy-controlled territory does not flip ownership;
4. same-faction and off-board rejection reasons remain stable;
5. client `legalStrategicTargets(..., 'annex_tile')` exactly matches `canFactionClaimTile()` decisions;
6. opening territory still seeds correctly for V1/V2 compatibility as applicable;
7. nodes, banners and fortifications retain their independent ownership/state semantics;
8. replay/save determinism remains intact after the claim coalescence.

## Non-Goals

This phase does not implement:

- connected supply;
- attrition;
- conquest of enemy territory;
- READY deployment;
- AI supply-aware strategy;
- banner-based territory spread;
- node-derived tile recolouring;
- fortification-derived territory spread;
- final strategic overlay presentation.

Those remain downstream phases.

## Migration Strategy

Use TDD and keep every slice independently green.

Expected sequence:

1. add claim-authority behavior tests and prove RED against current split settlement behavior;
2. add `canFactionClaimTile()` / `claimFactionTile()`;
3. convert `annexTile()` to a wrapper;
4. convert `resolveSettlement()` to shared authority;
5. convert client annex targeting to shared legality;
6. add the architectural tripwire;
7. run focused claim, settlement, targeting, node/banner/fortification regressions;
8. run the authoritative full test/typecheck/build gate.

## Success Criteria

This phase is complete when:

- every gameplay territorial claim goes through one sim authority;
- settlement cannot bypass adjacency or overwrite enemy control;
- client annex targeting uses the same legality decision as the sim;
- direct territorial mutation is constrained to canonical authority or explicit initialization;
- all existing strategic-object semantics remain distinct and deterministic;
- full tests, typecheck and build pass.

## Relationship to Later Supply Work

This design deliberately separates ownership from occupation and future supply.

The next supply phase can therefore compute an orthogonally connected supplied subset of already-owned territory without rewriting ownership whenever a raider crosses a border.

That gives the game the desired strategic behavior:

```text
owned territory may remain owned
while disconnected territory becomes unsupplied
while enemy occupation can contest or threaten it
without instant recolouring
```

This claim-authority phase is the prerequisite that makes that later graph well-defined.
