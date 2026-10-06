# Triptych Ideal-System Gauntlet Design

**Phase:** Ideal-System Restoration — Integrated Gauntlet  
**Status:** Design specification  
**Scope:** Cross-system proof of the restored Royal Tactical ruleset.

## Goal

Prove that the restored Triptych system behaves coherently when topology, ownership,
supply, READY deployment, Shadow AI, turn resolution, and presentation timing all
interact in one deterministic scenario.

This phase is not a new feature phase.

It is the point where the separate restored authorities are forced to share one room.

```
Triptych V2 topology
      ↓
territory / node control / banners
      ↓
supply connectivity + delayed attrition
      ↓
QUEUED -> READY -> explicit deployment
      ↓
Victoria orders / Shadow AI orders
      ↓
shared resolution
      ↓
reinforcement boundary
      ↓
next round
      ↓
presentation clock remains non-authoritative
```

## Doctrine

```
one world
one authority per truth
many systems
zero hidden shortcuts
```

The gauntlet must prove composition, not merely local correctness.

## Frozen authorities under test

### Topology

Triptych V2 is 32x32.

A cell is playable iff:

```
x = 12..19 OR y = 11..20
```

The live skirmish uses Triptych V2 geometry and the frozen Crown/minor-node locations.

No integrated system may reintroduce V1 fixed geometry into ordinary V2 behavior.

### Claim authority

`BoardTile.factionControl` is canonical territory ownership.

Node ownership, occupation, fortification presence, banner pressure, and unit presence
remain distinct facts.

No integrated subsystem may mutate territory ownership through a parallel path.

### Supply

Supply follows owned connected territory from faction home roots.

Hostile control breaks connectivity.

Exposure increments only at the strategic reinforcement boundary.

The delayed attrition contract remains:

```
0 -> 1 exposed
1 -> 2 strained
2 -> 3 attrition begins
>=3 -> 10 HP attrition each strategic boundary
```

All unit kinds, including king and hero, remain subject to the same supply truth.

### Production and READY

Purchased reinforcements follow:

```
PURCHASED -> QUEUED -> READY -> DEPLOYED
```

Purchase spends Crown immediately.

Queue maturation creates READY state only.

READY units have no board, occupancy, combat, military, capture, supply, or targetability
truth until explicitly deployed.

Human and Shadow deployment use the same canonical legality.

No expanding/nearest fallback is permitted.

### Turn and Royal Command

The round lifecycle remains:

```
victoria_command
victoria_resolve
shadow_command
shadow_resolve
reinforcement
next round
```

Costed TacticalOrders are constrained by canonical Royal Command truth.

The maximum per faction per round remains four.

READY deployment is free.

### Shadow AI

Shadow strategy runs only in `shadow_command`.

The live Shadow command path is:

```
refresh bounded intelligence
-> deploy legal READY units
-> make strategic economy decisions
-> plan <= 4 costed TacticalOrders
-> enqueue through canonical order authority
-> resolve through shared order authority
```

Hidden enemy truth must not become direct targeting authority.

Remembered contacts may influence movement/pressure but cannot become attacks unless
observed and otherwise legal.

Fixed presentation ticks have zero strategic AI authority.

### Presentation clock

Presentation time is owned by `FixedTickRuntime`.

Equal accepted elapsed presentation time yields equal clock state.

Presentation advancement cannot:
- change `WorldState.tick`;
- advance turns;
- spend Crown;
- mature production;
- deploy READY;
- resolve combat;
- evaluate Shadow strategy;
- change supply;
- change territory;
- drain staged commands.

## Integrated scenario

The canonical gauntlet should construct one Triptych V2 world containing:

- both sovereigns;
- at least one Victoria tactical unit;
- at least one Obsidian tactical unit;
- one visible enemy contact relevant to Shadow planning;
- one hidden or remembered enemy contact;
- at least one READY reinforcement;
- at least one queued reinforcement/economy opportunity;
- territory that creates both supplied and unsupplied units;
- at least one strategic objective/node;
- enough Royal Command to exercise deterministic ordering.

The scenario then runs one complete Royal Tactical round through explicit authorities.

## Required proof points

### 1. V2 geometry remains canonical

All tested unit positions, deployment cells, objectives, and nodes used by the scenario
must be playable under Triptych V2.

The gauntlet must not rely on V1-only anchors.

### 2. Presentation time is inert before strategic execution

Advance the presentation clock substantially before any strategic action.

Assert that:
- world identity remains unchanged;
- turn phase remains `victoria_command`;
- Crown unchanged;
- READY unchanged;
- queue unchanged;
- supply unchanged;
- unit positions unchanged;
- no Shadow commitments or pending legacy strategic commands appear.

### 3. Victoria costed orders use canonical budget

Stage legal Victoria TacticalOrders.

Assert:
- no more than four costed orders can be committed;
- canonical remaining Royal Command reflects accepted cost;
- order IDs are deterministic.

### 4. Shared Victoria resolution

Resolve Victoria orders through canonical committed-order authority.

No direct unit mutation is allowed in the gauntlet.

### 5. Live Shadow strategic authority

Enter `shadow_command`.

Run the same live Shadow authority order used by the battlefield controller:

```
executeShadowReadyDeployments
executeShadowStrategicEconomy
planShadowTurn
enqueueTacticalOrder
```

Assert:
- READY deployment uses legal exact cells;
- blocked READY remains READY;
- economy changes occur only here;
- Shadow costed orders <= 4;
- hidden remembered contacts do not become illegal attacks;
- deterministic order IDs are stable.

### 6. Shared Shadow resolution

Resolve Shadow costed orders through the same canonical committed-order authority used by
Victoria.

### 7. Strategic reinforcement boundary

Enter reinforcement and call the canonical reinforcement authority.

Assert the documented boundary ordering remains intact:

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

The gauntlet need not re-test every subsystem exhaustively, but it must prove that supply
exposure/attrition, production maturation, and round transition occur only at this
boundary.

### 8. READY identity and non-retroactivity

A queue entry that matures at the reinforcement boundary becomes READY with preserved
identity.

It must not:
- appear on the board automatically;
- gain same-boundary retroactive supply exposure;
- consume Royal Command;
- use a fallback deployment cell.

### 9. Next-round reset

After reinforcement:

- round increments exactly once;
- phase returns to `victoria_command`;
- Royal Commands reset canonically;
- world remains active unless sovereign truth ended the match.

### 10. Deterministic replay

Run the entire integrated scenario twice from equivalent initial state.

Compare:
- accepted order IDs;
- Shadow planned targets;
- READY deployment receipts;
- strategic events;
- final canonical snapshot.

They must be identical.

### 11. Insertion-order resistance

Where practical, repeat with record insertion order reversed for units or other map-like
state.

Final canonical truth must remain equivalent.

### 12. No forbidden authority leaks

Architecture tripwires must confirm the integrated path does not:
- call `stepWorld` to advance strategic phases;
- invoke legacy `scheduleAICommands` or consume `ai.pendingCommands`;
- call `findReinforcementSpawn` for ordinary READY deployment;
- directly mutate READY arrays in client code;
- directly mutate `factionControl` outside claim authority;
- use presentation time for strategic decisions.

## Gauntlet shape

Prefer one principal integrated test plus small architecture tripwires.

Do not create a giant test that re-implements the game.

The gauntlet must call public/canonical authorities and assert externally visible truth.

## Failure classification

A failure must be classified before fixing:

1. **real production regression**  
   The restored authorities disagree or a forbidden path is active.

2. **stale compatibility expectation**  
   A legacy test assumes pre-restoration behavior.

3. **gauntlet fixture defect**  
   The scenario violates current canonical legality.

4. **performance-only failure**  
   Semantics pass but test timeout is unrealistic under full-suite contention.

Never mutate production to satisfy a bad fixture.

Never weaken an architecture boundary to preserve a legacy shortcut.

## Non-goals

This phase does not:
- add new rules;
- rebalance units;
- improve AI intelligence;
- change deployment zones;
- change supply doctrine;
- redesign UI;
- add animation art;
- add audio behavior;
- optimize Phaser bundle size.

## Completion rule

The Ideal-System Gauntlet phase is complete only when:

- the integrated cross-system gauntlet is green;
- architecture tripwires are green;
- full repository tests are green;
- typecheck is green;
- production build is green;
- no restored authority is bypassed in the live gameplay path.

After this phase, the remaining restoration work is visual/art/animation integration,
not ruleset reconstruction.


## Completion evidence

Status: **COMPLETE**

The ideal-system gauntlet was completed under strict test-first execution and final live-path audit.

Verified evidence:

- Integrated V2 fixture is legal under canonical capacity, supply, production, intelligence, and topology rules.
- Presentation time advanced 25,037 ms without mutating strategic WorldState.
- Victoria staged exactly four deterministic Royal Command orders, refused a fifth at the staging budget, then resolved through shared committed-order authority.
- Shadow executed the live authority composition in canonical order: free READY deployment, strategic economy, bounded planning, canonical enqueue.
- Shadow remembered-only contacts were not used as direct attack targets.
- Shadow orders resolved through the same committed-order authority as Victoria.
- Reinforcement boundary preserved the frozen stage order and proved supply exposure, 10 HP attrition at exposure round 3, queue-to-READY maturation, no automatic READY placement, no retroactive supply exposure, and next-round 4/4 Royal Command reset.
- Deterministic replay produced identical order IDs, targets, READY events, event history, canonical snapshots, and final state across repeated runs.
- Equivalent worlds with reversed insertion order for units, occupancy, combat, and military produced the same canonical outcome.
- Architecture tripwires confirmed no strategic stepWorld authority in the live battlefield path, no legacy Shadow scheduler use, no READY fallback spawn, no client READY mutation, no stray territory ownership authority, and no presentation-time strategic dependency.
- Focused cross-system regression cluster: 12 files, 65 tests PASS.
- Full repository verification: 167 files, 735 tests PASS.
- TypeScript typecheck PASS.
- Vite production build PASS. The Phaser chunk-size notice is a non-failing bundling warning.
- Final live-path audit confirmed the canonical sequence:
  `Victoria enqueue -> Victoria resolve -> Shadow READY -> Shadow economy -> Shadow plan/enqueue -> Shadow resolve -> reinforcement -> next round`.

With these checks complete, the rules/system restoration is complete. Remaining work belongs to the art, animation, audiovisual, and presentation-polish phase rather than strategic authority restoration.
