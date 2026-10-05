# Triptych READY Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ordinary reinforcement auto-spawn with a persistent `PURCHASED -> QUEUED -> READY -> DEPLOYED` lifecycle using exact 5x5 faction deployment zones and one canonical legality authority shared by human and AI deployment.

**Architecture:** Extend `ProductionState` with persistent READY entries, move queue-head maturation to the reinforcement boundary, and put cell legality plus deployment mutation in a focused `src/sim/deployment.ts` authority. Human placement is an explicit zero-Royal-Command command during the faction command phase; AI consumes the same legality and deployment path. Replay serializes READY state, while ordinary recruitment no longer uses `findReinforcementSpawn()`.

**Tech Stack:** TypeScript 5.9, Vitest 3.2, Phaser 4, Vite 7

**Spec:** `docs/superpowers/specs/2026-10-05-triptych-ready-deployment-design.md`

## Global Constraints

- Lifecycle is exactly `PURCHASED -> QUEUED -> READY -> DEPLOYED`.
- READY is persistent canonical production state.
- Human deployment is always explicit, even when only one legal cell exists.
- Deployment consumes zero Royal Commands.
- V2 Victoria raw zone is exactly `x=1..5, y=14..18`.
- V2 Obsidian raw zone is exactly `x=26..30, y=13..17`.
- Each V2 raw zone contains exactly 25 coordinates before filtering.
- Legal deployment requires active match, matching READY entry, correct faction, in-zone, playable, unoccupied.
- No territorial ownership, polarity, supply, banner, fort, or node rule is added to deployment legality.
- No nearest-cell or expanding-radius fallback.
- At most one queue-head entry per faction matures to READY per reinforcement boundary.
- READY counts toward capacity and piece caps.
- READY is not a board unit and has no occupancy/combat/military/supply presence.
- AI uses the same canonical deployment legality as human deployment.
- Ordinary recruitment must not call `findReinforcementSpawn()`.
- Fixed ticks have no READY maturation or deployment authority.
- Replay/canonical snapshot must include READY state deterministically.

## Review Focus

- A READY entry whose original unlock/capacity conditions later change must remain READY and still be placeable if cell legality is satisfied; purchased commitments are not silently revoked.
- Multiple READY entries of the same unit kind must preserve stable identity and order; deploying one must not consume another.
- A fully blocked zone must preserve READY indefinitely; freeing one cell later must make only canonical legal cells deployable, with no fallback.
- Deployment during the wrong command phase must reject without consuming READY or Royal Commands.
- AI with multiple equally scored legal cells must choose deterministically by stable coordinate tie-break.

---

### Task 1: READY State and Exact Deployment-Zone Authority

**Files:**
- Create: `src/sim/deployment.ts`
- Modify: `src/sim/types.ts`
- Modify: `src/sim/world.ts`
- Modify: `src/sim/index.ts`
- Modify: `src/sim/economy.ts`
- Create: `tests/sim/ready-deployment-zone.test.ts`

**Interfaces:**
- Consumes: `topologyForWorld(world)`, `WorldState.production.reinforcementAnchors`
- Produces:
  - `ReadyDeployment`
  - `ProductionState.ready`
  - `deploymentZoneForFaction(world, faction): readonly Coord[]`
  - `legalDeploymentCells(world, faction, readyId): readonly Coord[]`
  - `canDeployReadyUnit(world, faction, readyId, cell): DeploymentDecision`

- [ ] **Step 1: Write the failing zone/state tests**

Tests must assert:
- `createWorld().production.ready` is `{ victoria: [], obsidian: [] }`;
- V2 Victoria raw zone is exactly 25 cells spanning `x=1..5, y=14..18`;
- V2 Obsidian raw zone is exactly 25 cells spanning `x=26..30, y=13..17`;
- legal-cell enumeration excludes occupied and unplayable cells;
- ownership, polarity, node, fort, banner, and supply facts do not independently exclude an otherwise legal cell;
- READY entries contribute to `capacityUsage()` and `pieceCountWithQueue()`.

- [ ] **Step 2: Run RED**

Run:
```bash
npx vitest run tests/sim/ready-deployment-zone.test.ts
```

Expected: FAIL because READY state and deployment-zone APIs do not exist.

- [ ] **Step 3: Implement minimal state and zone legality**

Add `ReadyDeployment`, initialize empty READY state, count READY commitments in economy helpers, and implement deterministic raw-zone plus playable/occupancy filtering in `deployment.ts`.

For V2, use explicit frozen centers `(3,16)` and `(28,15)`; do not derive them from legacy reinforcement anchors.

- [ ] **Step 4: Run GREEN**

Run:
```bash
npx vitest run tests/sim/ready-deployment-zone.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/deployment.ts src/sim/types.ts src/sim/world.ts src/sim/index.ts src/sim/economy.ts tests/sim/ready-deployment-zone.test.ts
git commit -m "feat: add READY deployment state and zones"
```

### Task 2: Queue-to-READY Maturation at Reinforcement

**Files:**
- Modify: `src/sim/production.ts`
- Modify: `src/sim/turns.ts`
- Modify: `src/sim/types.ts`
- Modify: `tests/sim/strategic-round-boundary.test.ts`
- Create: `tests/sim/ready-maturation.test.ts`

**Interfaces:**
- Consumes: `ProductionState.ready` from Task 1
- Produces:
  - queue-head maturation function, preferably `matureQueuedReinforcements(world): DeploymentResult`
  - semantic `reinforcement.ready` event
  - reinforcement-stage behavior where ordinary recruits do not auto-place

- [ ] **Step 1: Write failing maturation tests**

Tests must assert:
- queue head becomes READY at reinforcement;
- no board unit, occupancy, combat, military, or supply entry is created;
- at most one entry per faction matures per boundary;
- multiple READY entries accumulate in stable order across boundaries;
- READY persists unchanged if no deployment occurs;
- moving QUEUED to READY does not change capacity usage or piece-cap usage;
- an entry stays READY even if later unlock/capacity conditions would fail.

- [ ] **Step 2: Run RED**

Run:
```bash
npx vitest run tests/sim/ready-maturation.test.ts tests/sim/strategic-round-boundary.test.ts
```

Expected: FAIL because reinforcement still auto-places recruits.

- [ ] **Step 3: Implement queue-to-READY maturation**

Replace ordinary `deployReinforcements()` auto-placement behavior with queue-head maturation. Preserve identity, cost, capacity weight, queued tick, and set `readyRound` from the current strategic round.

Keep the existing stage label `deployment`, but update comments/tests to define it as queue-to-READY maturation.

- [ ] **Step 4: Run GREEN plus production regressions**

Run:
```bash
npx vitest run tests/sim/ready-maturation.test.ts tests/sim/strategic-round-boundary.test.ts tests/sim/production.test.ts
```

If the production test filename differs, locate the current production suite and run it.

Expected: PASS after stale auto-spawn assertions are migrated to READY semantics.

- [ ] **Step 5: Commit**

```bash
git add src/sim/production.ts src/sim/turns.ts src/sim/types.ts tests/sim/ready-maturation.test.ts tests/sim/strategic-round-boundary.test.ts
git commit -m "feat: mature queued recruits into READY state"
```

### Task 3: Explicit Human READY Deployment Command

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/commands.ts`
- Modify: `src/sim/deployment.ts`
- Modify: whichever command-resolution module currently handles strategic/sim commands
- Create: `tests/sim/ready-deployment-command.test.ts`

**Interfaces:**
- Consumes: `canDeployReadyUnit()`, READY state
- Produces:
  - `DeployReadyCommand`
  - `deployReadyUnit(world, faction, readyId, cell): DeploymentResult`
  - typed rejection reasons
  - `reinforcement.deployed` and `reinforcement.deployment_rejected` evidence

- [ ] **Step 1: Write failing command tests**

Tests must assert:
- successful explicit deployment removes exactly one READY entry;
- deterministic unit id is `unit:<ready-id>`;
- `placeUnit()` initializes occupancy, combat, and military state;
- deployment costs zero Royal Commands;
- Victoria is legal only in `victoria_command`, Obsidian only in `shadow_command`;
- outside-zone, occupied, unplayable, wrong-faction, missing READY id, inactive match, and wrong-phase attempts reject;
- every rejection preserves READY and Crown Power unchanged;
- with two same-kind READY entries, deploying one leaves the other untouched.

- [ ] **Step 2: Run RED**

Run:
```bash
npx vitest run tests/sim/ready-deployment-command.test.ts
```

Expected: FAIL because typed deploy command/action does not exist.

- [ ] **Step 3: Implement minimal deployment command path**

Add `deploy_ready` to `SimCommand` and deterministic ordering. Route command resolution through canonical deployment authority. Use `placeUnit()` only after legality passes. Do not re-run purchase unlock/capacity checks at deployment time.

- [ ] **Step 4: Run GREEN**

Run:
```bash
npx vitest run tests/sim/ready-deployment-command.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/types.ts src/sim/commands.ts src/sim/deployment.ts tests/sim/ready-deployment-command.test.ts <resolved-command-file>
git commit -m "feat: add explicit READY deployment command"
```

### Task 4: Client Targeting Uses Canonical Deployment Legality

**Files:**
- Modify: `src/client/input/strategic-targeting.ts` or create a focused deployment-targeting module if that keeps the existing file single-purpose
- Modify: `src/client/runtime/command-bridge.ts`
- Create: `tests/client/ready-deployment-targeting.test.ts` or the repo's established client-input test location

**Interfaces:**
- Consumes: `legalDeploymentCells()`, `DeployReadyCommand`
- Produces: client READY-target highlighting/staging with no duplicated legality

- [ ] **Step 1: Write failing targeting tests**

Tests must assert:
- highlighted deployment cells equal canonical `legalDeploymentCells()`;
- blocked cells disappear;
- no fallback target appears outside the 5x5 zone;
- staging an illegal cell refuses locally without mutating world;
- staging a legal cell emits/stages the typed `deploy_ready` command;
- the client never spends a Royal Command for staging deployment.

- [ ] **Step 2: Run RED**

Run the focused client targeting test file.

Expected: FAIL because READY deployment is not exposed through the client bridge/targeting path.

- [ ] **Step 3: Implement minimal client adapter**

The client may enumerate/present targets and stage the canonical command only. It must not duplicate cell legality, mutate READY state, or call `placeUnit()`.

- [ ] **Step 4: Run GREEN plus existing strategic-targeting regressions**

Run the new targeting test and existing strategic-targeting tests.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/input/strategic-targeting.ts src/client/runtime/command-bridge.ts tests/client/ready-deployment-targeting.test.ts
git commit -m "feat: expose canonical READY deployment targeting"
```

### Task 5: Deterministic AI READY Deployment Parity

**Files:**
- Modify: `src/sim/ai.ts`
- Modify: AI command-generation/resolution tests
- Create: `tests/sim/ai-ready-deployment.test.ts`

**Interfaces:**
- Consumes: `legalDeploymentCells()`, `DeployReadyCommand`
- Produces: deterministic AI selection and deployment through identical legality

- [ ] **Step 1: Write failing AI tests**

Tests must assert:
- AI never deploys outside canonical legal cells;
- AI cannot deploy through occupied/unplayable cells;
- AI uses the same canonical legality result as human deployment for every candidate in the raw zone;
- identical worlds produce identical chosen cells;
- equal-scored candidates use stable coordinate tie-break;
- no legal cell means READY persists and AI emits no fallback deployment;
- AI deployment consumes no Royal Command beyond existing tactical command accounting.

- [ ] **Step 2: Run RED**

Run:
```bash
npx vitest run tests/sim/ai-ready-deployment.test.ts
```

Expected: FAIL because AI has no READY deployment path.

- [ ] **Step 3: Implement minimal deterministic AI choice**

Enumerate canonical legal cells, score only with existing AI-accessible strategic information, and use a stable coordinate tie-break. Route the result through the same typed command/deployment authority as human placement.

Do not add supply-aware deployment strategy.

- [ ] **Step 4: Run GREEN plus AI regressions**

Run the new READY AI suite and existing AI suites.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/ai.ts tests/sim/ai-ready-deployment.test.ts
git commit -m "feat: give AI canonical READY deployment parity"
```

### Task 6: Replay, Supply Timing, and Architecture Guardrails

**Files:**
- Modify: `src/sim/replay.ts`
- Modify: `tests/sim/royal-tactical-round-gauntlet.test.ts`
- Create: `tests/sim/ready-deployment-authority-imports.test.ts`
- Create or modify replay/supply tests as needed

**Interfaces:**
- Consumes: persistent `production.ready`, explicit deployment path
- Produces: deterministic snapshot support and source-level authority tripwires

- [ ] **Step 1: Write failing replay/timing tests**

Tests must assert:
- `canonicalSnapshot()` includes READY entries deterministically;
- READY entries have no supply exposure;
- a unit deployed during a command phase has no exposure entry immediately;
- its first possible supply evaluation occurs at the next reinforcement boundary;
- identical READY/deployment command sequences produce byte-identical snapshots.

- [ ] **Step 2: Write self-proving architecture detectors**

Use Vite raw-source imports, not Node `fs/path`.

Tripwires must prove:
- `src/sim/production.ts` ordinary recruitment does not import/call `findReinforcementSpawn()`;
- client modules do not mutate `production.ready`;
- client modules do not call `placeUnit()` for READY deployment;
- fixed-tick runtime imports/calls neither READY maturation nor deployment mutation;
- deployment authority contains no direct `factionControl` writes;
- AI and client code reference canonical deployment legality rather than defining independent zone rules.

- [ ] **Step 3: Run RED/guardrail suite**

Run:
```bash
npx vitest run   tests/sim/ready-deployment-authority-imports.test.ts   tests/sim/royal-tactical-round-gauntlet.test.ts   tests/sim/phase2-replay.test.ts
```

Expected: replay tests may fail until snapshot READY serialization is added; architecture detectors should either pass immediately or expose forbidden legacy imports.

- [ ] **Step 4: Implement minimal replay support and remove ordinary fallback dependency**

Serialize `production.ready` in stable order. Remove ordinary production dependence on `findReinforcementSpawn()`; retain the helper only if unrelated legitimate consumers remain.

- [ ] **Step 5: Run GREEN**

Run the same command plus existing supply authority and territory ownership tripwires.

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sim/replay.ts src/sim/production.ts tests/sim/ready-deployment-authority-imports.test.ts tests/sim/royal-tactical-round-gauntlet.test.ts <replay-tests>
git commit -m "test: guard READY deployment authority and replay"
```

### Task 7: Integrated READY Deployment Gauntlet

**Files:**
- Create: `tests/sim/triptych-ready-deployment-gauntlet.test.ts`
- Modify stale literal fixtures only if the new canonical READY field requires it

**Interfaces:**
- Consumes: all Tasks 1-6
- Produces: one integrated acceptance proof for the full READY lifecycle

- [ ] **Step 1: Write integrated V2 gauntlet**

The gauntlet must prove in one deterministic scenario:
- purchase creates QUEUED;
- reinforcement matures to READY, not board placement;
- exact V2 5x5 target zone;
- human explicit legal deployment;
- zero Royal Command cost;
- deterministic unit identity;
- occupancy/combat/military initialized;
- no immediate supply exposure;
- blocked zone preserves READY with no fallback;
- freeing a cell restores deployability;
- multiple READY entries preserve identity/order;
- AI uses canonical legality and chooses deterministically;
- replay snapshots before and after deployment are byte-stable.

- [ ] **Step 2: Run gauntlet**

Run:
```bash
npx vitest run tests/sim/triptych-ready-deployment-gauntlet.test.ts
```

Expected: PASS if Tasks 1-6 are complete. If RED, use systematic debugging; do not weaken earlier architecture tests.

- [ ] **Step 3: Run focused regression cluster**

Run:
```bash
npx vitest run   tests/sim/ready-deployment-zone.test.ts   tests/sim/ready-maturation.test.ts   tests/sim/ready-deployment-command.test.ts   tests/sim/ai-ready-deployment.test.ts   tests/sim/strategic-round-boundary.test.ts   tests/sim/supply-exposure.test.ts   tests/sim/supply-attrition.test.ts   tests/sim/royal-tactical-round-gauntlet.test.ts   tests/sim/triptych-ready-deployment-gauntlet.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/sim/triptych-ready-deployment-gauntlet.test.ts <fixture-files-if-any>
git commit -m "test: prove triptych READY deployment gauntlet"
```

### Task 8: Full Repository Verification

**Files:**
- No feature files unless verification exposes a real regression
- Test-only stale fixture corrections are permitted when they reflect the approved semantic migration

**Interfaces:**
- Consumes: completed READY deployment implementation
- Produces: authoritative completion evidence

- [ ] **Step 1: Run focused READY suite**

Run:
```bash
npx vitest run   tests/sim/ready-deployment-zone.test.ts   tests/sim/ready-maturation.test.ts   tests/sim/ready-deployment-command.test.ts   tests/sim/ai-ready-deployment.test.ts   tests/sim/ready-deployment-authority-imports.test.ts   tests/sim/strategic-round-boundary.test.ts   tests/sim/royal-tactical-round-gauntlet.test.ts   tests/sim/triptych-ready-deployment-gauntlet.test.ts
```

Expected: all pass.

- [ ] **Step 2: Run authoritative full test suite**

Run:
```bash
npm test -- --maxWorkers=1
```

Expected: more than 626 tests, zero failures.

- [ ] **Step 3: Run typecheck**

Run:
```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Run production build**

Run:
```bash
npm run build
```

Expected: exit 0. Existing Phaser chunk-size warning is non-fatal.

- [ ] **Step 5: Final scope audit**

Confirm:
- no ordinary recruit auto-spawn remains;
- no READY deployment fallback search exists;
- explicit human choice remains mandatory;
- READY deployment costs zero Royal Commands;
- AI uses canonical legality;
- READY persists and serializes;
- no deployment action mutates territorial ownership;
- no supply-aware AI scoring or later presentation-clock work leaked into this phase.

- [ ] **Step 6: Final whole-branch review**

Use the executing-plans final review workflow against this plan and spec. Critical/Important findings get one TDD fix pass; Minor findings are ledgered.

