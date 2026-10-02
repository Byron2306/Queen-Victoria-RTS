# Triptych Ideal System Restoration Design

**Date:** 2026-10-02  
**Status:** Design specification for review  
**Branch:** `agent/triptych-ideal-system-restoration`  
**Baseline:** `agent/triptych-32x32-rebuild`

## Purpose

Restore the previously agreed Royal War Triptych as one coherent game authority without discarding the current verified 32x32 rebuild or reintroducing failed legacy migration state.

The restoration begins from the current green V2 branch. Older branches are treated as evidence mines, not merge sources. Proven behaviors may be ported surgically when they still match the frozen design, but no wholesale merge is permitted.

The target game is the Sept 30 coalesced Royal War Triptych: a large cross-shaped battlefield where geometry, incomplete information, territory, logistics, deployment, fortification, manipulation and readable presentation work as one system.

## Success Criteria

The restoration is complete when:

1. every live spatial subsystem resolves the selected battlefield topology rather than assuming the historical 24x24 board;
2. territory claiming has one authoritative legality path shared by settlement and explicit annexation;
3. connected faction territory determines supply state, while raids remain legal and unsupported operations accrue delayed attrition rather than being hard-blocked;
4. recruitment follows `PURCHASED -> QUEUED -> READY -> DEPLOYED`, using the frozen 5x5 home deployment zones and no ordinary silent reinforcement spawn;
5. Victoria and Obsidian AI obey the same topology, intelligence, supply and deployment authorities as the human player;
6. movement, attacks, deaths, assault advances, deployment and annexation are presented through one deterministic presentation clock that never mutates simulation truth;
7. the full restored system remains deterministic, replay-safe and regression-tested;
8. final ornate board art and animation integration happen only after game-state authority and projection are frozen.

## Non-Goals

This programme does not redesign the game from scratch, introduce a new fog doctrine, rebalance all combat values, replace mature hero/economy systems, or merge the old Triptych branch into the rebuild.

The following mature systems are preserved unless a restoration test proves a direct contradiction with the frozen design:

- deterministic simulation and round authority;
- Crown economy and purchase costs;
- recruitment queue economics and capacity rules;
- Victoria hero progression, abilities and respawn;
- attack versus assault semantics;
- explicit reinforcement/support chains;
- veterancy/rank;
- banners and polarity mutation;
- fortifications;
- intelligence memory model;
- free-roam camera;
- V2 32x32 topology and 496-cell playable mask.

## Canonical Game Doctrine

The restored game loop is:

`deploy -> annex -> scout -> establish supply -> fortify -> contest -> fight -> consolidate`

Two doctrine constraints govern every later implementation decision:

- Nothing consequential should happen faster than the player can understand it.
- Boots on ground matter, but logistics still matter.

The battlefield remains large. Pacing is achieved through information, logistics, commitment and delayed consequences rather than by shrinking the map or making units artificially slow.

## Battlefield Authority

### V2 topology

The live battlefield remains the frozen 32x32 world:

- playable iff `x in 12..19 OR y in 11..20`;
- 496 playable cells;
- four corner quadrants are void/non-playable;
- Victoria home is west;
- Obsidian home is east.

Historical V1 topology may remain available only for explicit compatibility tests, fixtures or migration code.

### Spatial authority rule

Any live subsystem with a `WorldState` must derive spatial truth from the selected world topology.

No live V2 behavior may directly rely on historical constants or geometry helpers for:

- playability;
- bounds;
- cell enumeration;
- neighbors;
- path/ray termination;
- LOS;
- territory;
- intelligence;
- targeting;
- deployment;
- spawning;
- AI planning;
- rendering/projection.

Shared type helpers such as `TileId`, coordinate serialization or explicit V1 compatibility fixtures may remain in historical modules.

## Intelligence and Fog Doctrine

The existing battlefield intelligence model remains canonical.

The board itself is visible, but truth is faction-relative.

A faction may know a cell as:

- **Observed**: current authoritative information is visible now;
- **Remembered**: previously observed information persists as last-known truth;
- **Unknown**: no current reliable knowledge exists.

Enemy units lost from observation remain as stale ghost contacts at their last confirmed positions until updated by later observation.

Hidden banner/polarity changes, unit movement and infrastructure changes are not magically propagated through fog.

LOS remains geometric and piece-derived. Fortifications/nodes may contribute observation according to existing doctrine. Controlled territory and special observers retain their intended sight roles.

AI must consume faction-safe intelligence and must not read omniscient world truth for tactical decisions that the human player could not make.

The V2 restoration must preserve this doctrine while migrating every spatial query to selected-world topology authority.

## Territory Claim Authority

The restored system shall expose one territorial claim legality core.

Both settlement-based claiming and explicit `ANNEX` orders must pass through the same underlying checks for:

- playable topology;
- faction eligibility;
- occupation/settlement conditions;
- adjacency/supply prerequisites where applicable;
- incompatible blockers or node rules;
- deterministic resolution ordering.

Settlement and explicit annexation remain distinct player verbs, but they must not maintain contradictory ownership rules.

Faction control and chess polarity remain independent state layers.

A tile may therefore combine any legal faction ownership with either black or white polarity.

## Supply and Logistics

Faction-controlled territory forms the basis of connected supply.

Supply is not a hard movement leash. Units may raid or penetrate disconnected territory.

The initial restored attrition progression is:

- `unsuppliedRounds = 0`: supplied;
- `unsuppliedRounds = 1`: exposed;
- `unsuppliedRounds = 2`: strained;
- `unsuppliedRounds >= 3`: attrition applies.

The first implementation target remains approximately 10 HP attrition after sustained disconnection, subject to existing combat-state constraints and later balance tuning.

Disconnected territory remains owned. Loss of supply does not automatically transfer ownership.

Supply state should influence strategic presentation and AI planning, but the first restoration goal is authoritative connectivity and delayed attrition, not broad economic rebalance.

## Home Deployment and Recruitment

The frozen home deployment geometry is authoritative:

### Victoria

- centre: `(3,16)`;
- zone: `x=1..5, y=14..18`;
- 25 logical zone cells before legality filtering.

### Obsidian

- centre: `(28,15)`;
- zone: `x=26..30, y=13..17`;
- 25 logical zone cells before legality filtering.

Recruitment lifecycle becomes:

`PURCHASED -> QUEUED -> READY -> DEPLOYED`

Purchase economics remain unchanged. Crown/capacity commitment occurs at purchase.

At the reinforcement boundary, an eligible queue head becomes READY rather than silently spawning.

A READY recruit remains reserved against capacity and piece caps until deployed.

Deployment requires an explicit legal home-zone cell. Invalid deployment preserves the READY entry. A blocked zone does not teleport, refund or destroy the recruit.

Human deployment does not consume an additional Royal Command.

AI obeys the same deployment legality and cannot use a privileged spawn path.

Historical reinforcement anchors may remain only as home-zone centres or compatibility data. They are not ordinary placement authority.

## AI Parity

The Obsidian AI must obey the same game truth as the player.

AI planning must use:

- selected V2 topology;
- faction-safe intelligence;
- shared territorial claim rules;
- supply state;
- legal READY deployment cells;
- ordinary movement/combat/order validators.

No AI-only omniscient path, spawn rule, topology bypass or hidden-state shortcut is permitted.

Deterministic tie-breaking remains required.

## Presentation Authority

Simulation resolves strategic truth atomically and deterministically. Presentation never changes outcomes.

A deterministic resolution transcript is converted into ordered presentation cues.

The restored cue family includes at minimum:

- move start / travel / arrive;
- attack windup;
- ranged travel or melee strike;
- impact;
- hit reaction;
- damage reveal;
- death;
- assault advance;
- recovery;
- deploy start / complete;
- annex pulse.

Normal attacks never change attacker logical position.

Melee lunges are visual only and return to origin unless authoritative assault resolution moves the attacker.

Ranged attackers remain planted.

Knight movement is presented as a leap rather than fake intermediate chess movement.

Camera changes during cues reproject visual anchors without changing logical endpoints.

Intelligence reveal may peel progressively during movement presentation, but the post-resolution authoritative information state remains fixed underneath.

## Art and Projection Boundary

Final board art is downstream of restored game authority.

The neutral battlefield texture is decorative substrate only.

The final board must preserve:

- exact V2 cross topology;
- clear cell readability;
- void corners;
- west Victoria atmosphere;
- east Obsidian atmosphere;
- prestigious but mechanically neutral north/south corridors;
- no baked units, nodes, banners, forts, ownership, deployment highlights or UI authority.

Doctrine: **Art conforms to grid. Grid never bends to art.**

The 5x5 deployment zones remain dynamic overlays and are only shown when relevant.

Board, units, nodes, banners, forts, territory, supply, intelligence, movement and combat effects must share one current camera projection.

## Restoration Sequence

The restoration order is intentionally dependency-driven:

1. **Topology Closure**
   - eliminate live V1 spatial authority leaks;
   - add architectural tests preventing recurrence.

2. **Claim Authority Coalescence**
   - unify settlement and explicit annex legality;
   - retain their distinct player-facing verbs.

3. **Supply Graph and Delayed Attrition**
   - derive connected supplied territory;
   - track unsupported duration;
   - apply deterministic attrition only after sustained disconnection.

4. **READY Deployment**
   - introduce READY production state;
   - implement exact 5x5 deployment zones;
   - retire silent ordinary auto-spawn.

5. **AI Parity**
   - move AI deployment, supply reasoning and remaining spatial logic onto shared authorities.

6. **Deterministic Presentation Clock**
   - capture resolution transcript;
   - create pure presentation plan;
   - drive all movement/combat/deployment/annex visuals through one clock.

7. **Ideal-System Gauntlet**
   - end-to-end proof across recruitment, deployment, intelligence, annexation, supply loss, fortification, banners, combat, assault and AI fairness;
   - replay/determinism regression;
   - full test, typecheck and build gates.

8. **Final Art and Animation**
   - freeze projection contract;
   - produce/promote ornate cross-shaped board;
   - integrate final Victoria and unit animation assets without changing simulation authority.

## Migration Safety Rules

- The current green V2 baseline is preserved.
- No wholesale branch merge from `agent/royal-war-triptych` or historical migration branches.
- Old branches are consulted for behavior, tests, intent and isolated reusable code only.
- Every behavioral restoration begins with a RED characterization/regression test.
- Each stage must return the repository to green before the next stage begins.
- Compatibility behavior is explicit. Historical defaults must never silently govern V2 worlds.
- No art change may be used to compensate for logical geometry drift.
- No presentation code may mutate authoritative world state.

## Verification Contract

Each restoration stage requires focused tests plus the relevant existing regression suite.

Before declaring the full restoration complete, the authoritative gate is:

```bash
npm test -- --maxWorkers=1
npm run typecheck
npm run build
```

The existing verified V2 baseline was 134 test files / 537 tests. The restored total must increase as new regressions and system gauntlets are added; the historical count is a floor, not a target.

The final acceptance gauntlet must prove at minimum:

- V2 LOS and remembered ghosts outside historical V1 bounds;
- no interaction with void corners;
- explicit 5x5 READY deployment;
- connected/disconnected supply transitions;
- delayed unsupplied attrition;
- settlement and ANNEX consistency;
- banner/polarity deception under fog;
- fortification interaction with territory/supply;
- AI obeying faction-safe intelligence and legal deployment;
- readable movement, melee, ranged, lethal combat and assault advance;
- camera movement without projection drift;
- deterministic replay equivalence.

## Final Authority Statement

The restored Royal War Triptych is not defined by whichever historical branch contains the most code.

It is defined by the frozen coalesced design, the mature systems that already satisfy that design, the verified V2 topology baseline, and new executable evidence that closes the remaining gaps without reviving superseded assumptions.
