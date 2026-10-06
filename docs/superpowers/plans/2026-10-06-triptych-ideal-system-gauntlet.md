# Triptych Ideal-System Gauntlet Implementation Plan

**Spec:** `docs/superpowers/specs/2026-10-06-triptych-ideal-system-gauntlet-design.md`  
**Branch:** `agent/triptych-ideal-system-restoration`

## Objective

Prove that the restored Royal Tactical system behaves coherently across one complete,
deterministic Triptych V2 round without introducing any new gameplay authority.

This phase is proof-first.

It must compose existing canonical authorities rather than re-implement them.

## Execution discipline

Use strict RED -> GREEN.

No production code may change unless an observed failing test proves a real integration
defect.

Classify every failure before patching:

1. real production regression;
2. stale compatibility expectation;
3. gauntlet fixture defect;
4. performance-only failure.

Do not weaken architecture boundaries.

Do not restore legacy strategic shortcuts.

Do not change balancing, topology, supply doctrine, READY zones, AI budget, or turn
semantics.

---

## Task 1: Build the Integrated Gauntlet Fixture

### RED

Create:

`tests/sim/triptych-ideal-system-gauntlet.test.ts`

Build one explicit Triptych V2 scenario from canonical constructors/helpers.

The fixture must include:

- active Victoria and Obsidian sovereigns;
- at least one Victoria tactical unit;
- at least one Obsidian tactical unit;
- one observed Shadow-relevant enemy contact;
- one hidden or remembered enemy contact;
- one READY reinforcement;
- one queued reinforcement/economy opportunity;
- one supplied unit;
- one unsupplied unit;
- one relevant strategic objective/node;
- sufficient Royal Command to stage legal Victoria orders.

Initial assertions must prove every used board position is legal under Triptych V2.

### Expected RED

If fixture construction reveals no defect, this task may be GREEN immediately.

If any helper still encodes stale V1 geometry, classify that as a real production
regression before changing production.

### Verification

Run only the new gauntlet file.

---

## Task 2: Presentation Clock Inertness Inside the Integrated Scenario

### RED

At the beginning of the gauntlet:

- capture the world object identity;
- capture turn phase;
- capture Crown;
- capture production queues;
- capture READY;
- capture supply;
- capture unit positions;
- capture staged tactical state;
- capture legacy strategic pending state if exposed by public compatibility APIs.

Advance presentation time by a large finite amount.

Assert all strategic truth is unchanged.

Also assert presentation clock state advances.

### GREEN

No production patch expected.

If strategic truth changes, patch only the leaking authority.

### Verification

Run the integrated gauntlet plus the presentation strategic-authority tests.

---

## Task 3: Victoria Canonical Order Budget and Resolution

### RED

Stage legal Victoria TacticalOrders through `ClientCommandBridge`.

Pin:

- accepted orders use deterministic IDs;
- costed orders never exceed canonical Royal Command;
- attempts beyond the budget are refused or remain unstaged according to current
  canonical behavior;
- READY deployment is not charged as a TacticalOrder;
- staged orders remain staged until explicit commit.

Then transition through:

```
victoria_command
-> victoria_resolve
```

using canonical turn and committed-order authorities.

Resolve Victoria through `resolveCommittedOrders`.

Do not directly mutate unit positions, health, or pending orders.

### GREEN

Patch production only if canonical budget or resolution behavior contradicts the frozen
Royal Tactical rules.

### Verification

Run the gauntlet plus tactical-order / turn-resolution suites.

---

## Task 4: Shadow Live Authority Composition

### RED

Enter `shadow_command` and run the live authority sequence exactly:

```
executeShadowReadyDeployments
executeShadowStrategicEconomy
planShadowTurn
enqueueTacticalOrder
```

Pin:

- existing READY units deploy only through canonical legal deployment;
- blocked READY units remain READY;
- READY deployment consumes zero Royal Command;
- strategic economy decisions occur only during `shadow_command`;
- Shadow costed TacticalOrders are <= 4;
- order IDs are deterministic;
- observed targets may be attacked if otherwise legal;
- hidden/remembered-only contacts do not become direct attack targets.

### GREEN

If failure is caused by fixture legality, fix the fixture.

Patch production only for a real authority regression.

### Verification

Run the gauntlet plus AI parity, READY deployment, and intelligence tests.

---

## Task 5: Shared Shadow Resolution

### RED

Transition to `shadow_resolve`.

Resolve Shadow through the same `resolveCommittedOrders` authority used by Victoria.

Assert:

- no Shadow-only direct mutation path appears;
- pending orders are cleared canonically;
- strategic world truth reflects the canonical resolver only.

### GREEN

No production patch expected.

### Verification

Run gauntlet plus committed-order resolver tests.

---

## Task 6: Reinforcement Boundary Composition

### RED

Transition to `reinforcement`.

Before resolution, capture:

- supply exposure counters;
- unit HP;
- queue contents;
- READY contents;
- Crown;
- node/territory truth;
- round and phase.

Call only `resolveReinforcementPhase`.

Assert the integrated boundary preserves the frozen ordering:

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

Required observable proof:

- unsupplied exposure advances only here;
- attrition occurs only when the delayed threshold is reached;
- queued production matures only here;
- matured production becomes READY, not board-present;
- READY identity is preserved;
- no same-boundary retroactive supply exposure is applied to newly READY units;
- no deployment fallback is used;
- round increments exactly once;
- phase returns to `victoria_command`;
- Royal Command resets canonically.

### GREEN

Patch production only for a real cross-system boundary defect.

### Verification

Run gauntlet plus supply, production, READY, and turn suites.

---

## Task 7: Deterministic Replay and Insertion-Order Resistance

### RED

Extract the gauntlet execution into a small test helper that runs entirely through
canonical APIs.

Run it twice from equivalent initial state.

Compare:

- Victoria accepted order IDs;
- Shadow order IDs;
- Shadow planned targets;
- READY deployment results;
- strategic events;
- final canonical world snapshot.

Then repeat with insertion order reversed for suitable record-like fixture state, such as
unit record construction.

Canonical final truth must remain equivalent.

### GREEN

If insertion order changes semantics, classify whether the bug is:

- planner nondeterminism;
- resolver nondeterminism;
- fixture construction error.

Patch only the demonstrated source.

### Verification

Run the gauntlet twice in isolation.

---

## Task 8: Integrated Architecture Tripwires

### RED

Create:

`tests/sim/triptych-ideal-system-authority.test.ts`

Use raw-source architecture assertions where appropriate.

Pin that the restored live path does not:

- use `stepWorld` to advance strategic phases;
- invoke `scheduleAICommands`;
- consume `ai.pendingCommands`;
- call legacy `findReinforcementSpawn` for ordinary READY deployment;
- directly mutate `production.ready` in client gameplay code;
- directly mutate `factionControl` outside canonical claim-authority exceptions;
- use presentation time to decide AI/economy/reinforcement/combat/turn truth.

Prefer narrow function/source slices over brittle whole-file string checks.

### GREEN

No production patch unless a real forbidden path exists.

### Verification

Run the authority test plus existing ownership, AI, deployment, and presentation
architecture tests.

---

## Task 9: Cross-System Regression Cluster

Run a focused cluster covering:

- topology;
- claim authority;
- supply;
- READY;
- AI parity;
- turn resolution;
- presentation clock;
- integrated gauntlet;
- integrated architecture tripwires.

If failures occur:

1. classify first;
2. patch only the responsible authority;
3. rerun the focused cluster.

Do not proceed to full verification while any focused system remains red.

---

## Task 10: Full Repository Verification

Run:

```bash
npm test -- --maxWorkers=1
npm run typecheck
npm run build
```

Acceptance requires:

- every test file green;
- every test green;
- typecheck green;
- production build green.

The existing Phaser >500 kB chunk warning is non-fatal unless it changes into a build
error.

---

## Task 11: Final Live-Path Scope Audit

Audit the final diff and live battlefield path.

Confirm:

- Triptych V2 remains the live map authority;
- `BoardTile.factionControl` remains the sole canonical territory owner;
- supply changes only at reinforcement;
- queue -> READY does not auto-deploy;
- READY placement uses exact canonical deployment legality;
- Shadow READY/economy/planning run only in `shadow_command`;
- both factions use shared committed-order resolution;
- presentation time has zero strategic authority;
- no legacy strategic scheduler has been reactivated;
- no integration test helper has leaked into production architecture.

## Completion evidence

The phase is complete only with:

- integrated gauntlet green;
- deterministic replay green;
- insertion-order resistance green;
- integrated authority tripwires green;
- focused cross-system cluster green;
- full repository green;
- typecheck green;
- build green;
- final scope audit clean.

At that point, Royal Tactical ruleset restoration is complete.

The next phase is visual/art/animation integration only.
