# Triptych AI Parity Implementation Plan

> **Execution mode:** strict TDD, task-by-task. No production mutation before an observed failing test.

**Goal:** Collapse the current split-brain AI into one deterministic Royal Tactical Shadow-turn authority that shares the same knowledge boundary, command budget, tactical legality, READY deployment authority, and turn timing as the human side.

**Architecture:** Retire fixed-tick strategic AI creation from `stepWorld()`, preserve deterministic scoring/intention helpers, and make `planShadowTurn()` the canonical costed-order planner. Free READY deployment remains explicit and canonical during `shadow_command`. Any retained recruitment/promotion AI decisions must be created only during Shadow-turn authority, never because a fixed tick elapsed.

**Spec:** `docs/superpowers/specs/2026-10-06-triptych-ai-parity-design.md`

## Global Constraints

- Fixed ticks do not create strategic AI actions.
- `stepWorld()` must not call `evaluateBalancedAI()` in the canonical path.
- Canonical Shadow AI uses faction-bounded intelligence and planning views.
- Hidden enemy positions are not direct AI truth.
- Remembered contacts may guide pressure/movement, but cannot be attacked unless currently observed.
- Obsidian costed TacticalOrders are capped by the same Royal Command budget as Victoria.
- READY deployment remains zero Royal Command cost and uses canonical deployment legality.
- No fallback READY placement.
- No direct AI mutation of `production.ready`.
- No AI `placeUnit()` call for READY.
- Deterministic tie-breaking is explicit.
- Human-side turn and legality semantics must not change.
- No new combat, economy, visibility, or presentation rules.

## Review Focus

1. Fixed ticks alone cannot create AI strategic actions, pending strategic commands, purchases, promotions, or READY deployment.
2. A hidden enemy changing position does not change an attack decision until that information becomes visible.
3. A remembered but unobserved enemy may influence movement pressure but cannot be targeted by attack.
4. Shadow planning produces at most four costed TacticalOrders and deterministic order ids.
5. READY deployment is free, canonical, deterministic, and blocked-zone safe.
6. AI recruitment/promotion decisions, if retained, occur only inside Shadow-turn strategic authority.
7. Removing legacy fixed-tick AI scheduling must not break replay determinism or existing human-side behavior.

---

### Task 1: Fixed-Tick Strategic AI Authority Cut

**Files:**
- Modify: `src/sim/step.ts`
- Modify: `src/sim/ai.ts` only if required by tests
- Create: `tests/sim/ai-fixed-tick-authority.test.ts`
- Create: `tests/sim/ai-authority-imports.test.ts`

**Interfaces:**
- Consumes: current `stepWorld()`, `evaluateBalancedAI()`, `ai.pendingCommands`
- Produces: a fixed-tick boundary where no new strategic AI action is created or consumed by wall-clock simulation

- [ ] **Step 1: Write failing authority tests**

Tests must assert:
- calling `stepWorld(world, [])` does not create new AI commitments;
- calling `stepWorld(world, [])` does not append `ai.pendingCommands`;
- repeated fixed ticks alone cannot spend Crown, queue recruitment, queue promotion, or deploy READY;
- a pending strategic AI command is not consumed by canonical fixed-tick simulation if that command belongs to retired strategic authority;
- source tripwire proves `stepWorld.ts` does not reference `evaluateBalancedAI`.

- [ ] **Step 2: Run RED**

Run:
```bash
npx vitest run \
  tests/sim/ai-fixed-tick-authority.test.ts \
  tests/sim/ai-authority-imports.test.ts
```

Expected: FAIL because `stepWorld()` still evaluates AI and consumes scheduled AI commands.

- [ ] **Step 3: Remove fixed-tick strategic AI creation/consumption**

Delete canonical `stepWorld()` dependence on:
- `evaluateBalancedAI()`;
- strategic `ai.pendingCommands` consumption.

Retain low-level simulation behavior unrelated to strategic authority.

Do not delete compatibility helpers yet unless tests prove they are unreachable and safe to remove.

- [ ] **Step 4: Run GREEN plus fixed-tick regressions**

Run the new tests plus:
```bash
npx vitest run \
  tests/sim/royal-tactical-round-gauntlet.test.ts \
  tests/sim/phase4-ordering.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message:
```
feat: remove fixed-tick strategic AI authority
```

---

### Task 2: Shadow Planning Knowledge Boundary

**Files:**
- Modify: `src/sim/ai.ts`
- Modify/Create: focused knowledge-boundary AI tests
- Create: `tests/sim/ai-shadow-knowledge.test.ts`

**Interfaces:**
- Consumes:
  - `refreshFactionIntelligence()`
  - `createFactionKnowledgeView()`
  - `createFactionPlanningWorld()`
  - `targetIsObserved()`
  - `validateMoveKnowledge()`
- Produces: one knowledge-safe Shadow planner

- [ ] **Step 1: Write failing knowledge tests**

Tests must prove:
- hidden enemy relocation does not change direct attack selection;
- hidden enemy direct world position cannot become an attack target;
- remembered contact can influence `pressure_position` movement;
- remembered-but-not-observed contact cannot produce attack order;
- observed King danger deterministically outranks lower-value objectives;
- insertion order of hidden world units does not alter Shadow orders.

- [ ] **Step 2: Run RED**

Run:
```bash
npx vitest run tests/sim/ai-shadow-knowledge.test.ts
```

Expected: any hidden-world leakage in `planShadowTurn()` or reused helpers is exposed.

- [ ] **Step 3: Route enemy-specific planning through faction-bounded truth**

Refactor only the helpers necessary to make `planShadowTurn()` consume planning/intelligence views for enemy-specific decisions.

Do not change visibility rules themselves.

- [ ] **Step 4: Run GREEN plus intelligence regressions**

Run the new suite plus existing intelligence/knowledge legality tests.

- [ ] **Step 5: Commit**

Commit message:
```
feat: bind Shadow AI to faction intelligence
```

---

### Task 3: Canonical Four-Command Shadow Budget

**Files:**
- Modify: `src/sim/ai.ts`
- Modify: `src/sim/orders.ts` only if shared budget API needs exposure
- Create: `tests/sim/ai-shadow-budget.test.ts`

**Interfaces:**
- Consumes: `planShadowTurn()`, canonical TacticalOrder command costs
- Produces: deterministic Shadow costed-order list within canonical Royal Command budget

- [ ] **Step 1: Write failing budget tests**

Tests must assert:
- Shadow planner emits no more than four costed TacticalOrders;
- total `commandCost` never exceeds available Obsidian Royal Commands;
- deterministic order ids are `obsidian-r<round>-o<ordinal>`;
- insufficient remaining Royal Commands truncates/refuses additional plans deterministically;
- hero ability orders, if represented as TacticalOrders, obey the same budget;
- no legacy six-command allowance influences `planShadowTurn()`.

- [ ] **Step 2: Run RED**

Run:
```bash
npx vitest run tests/sim/ai-shadow-budget.test.ts
```

- [ ] **Step 3: Implement minimal shared budget compliance**

Use canonical Royal Command truth from `world.turn.royalCommandsRemaining.obsidian`.

Do not invent a second AI budget constant.

- [ ] **Step 4: Run GREEN plus tactical-order regressions**

Run the new suite plus order queue/resolution tests.

- [ ] **Step 5: Commit**

Commit message:
```
feat: enforce canonical Shadow AI command budget
```

---

### Task 4: Shadow-Turn READY Deployment Authority

**Files:**
- Modify: `src/sim/ai.ts`
- Modify: canonical Shadow-turn orchestration module if one exists
- Create: `tests/sim/ai-shadow-ready-deployment.test.ts`

**Interfaces:**
- Consumes:
  - `legalDeploymentCells()`
  - `selectAIReadyDeploymentCell()`
  - `deployReadyUnit()`
- Produces: free deterministic READY deployment during Shadow command authority only

- [ ] **Step 1: Write failing READY timing tests**

Tests must prove:
- AI READY deployment occurs only in `shadow_command`;
- it costs zero Royal Commands;
- fully blocked zone preserves READY;
- freeing one canonical cell restores deployment;
- no fallback cell is invented;
- AI uses canonical legality;
- AI never directly mutates `production.ready`;
- AI never directly calls `placeUnit()` for READY;
- identical worlds choose identical cells.

- [ ] **Step 2: Run RED**

Run:
```bash
npx vitest run tests/sim/ai-shadow-ready-deployment.test.ts
```

Expected: current helper can choose cells, but no canonical Shadow-turn free-action orchestration exists.

- [ ] **Step 3: Add explicit Shadow READY free-action stage**

Add one deterministic free-action step before costed Shadow TacticalOrders are committed.

This stage must call canonical deployment authority and preserve zero Royal Command cost.

- [ ] **Step 4: Run GREEN plus READY regressions**

Run new tests plus:
```bash
npx vitest run \
  tests/sim/ai-ready-deployment.test.ts \
  tests/sim/ready-deployment-command.test.ts \
  tests/sim/triptych-ready-deployment-gauntlet.test.ts
```

- [ ] **Step 5: Commit**

Commit message:
```
feat: deploy READY units through Shadow turn authority
```

---

### Task 5: Shadow Strategic Economy Decisions

**Files:**
- Modify: `src/sim/ai.ts`
- Modify: strategic Shadow orchestration as required
- Create: `tests/sim/ai-shadow-economy.test.ts`

**Interfaces:**
- Consumes:
  - `queueRecruitment()`
  - `queuePromotionRequest()`
  - existing deterministic recruit/promotion heuristics
- Produces: recruitment/promotion decisions that occur only during Shadow command authority

- [ ] **Step 1: Write failing economy timing tests**

Tests must assert:
- AI recruitment can only be created during `shadow_command`;
- AI promotion requests can only be created during `shadow_command`;
- Victoria command, both resolve phases, reinforcement, and fixed ticks cannot create them;
- Crown is spent only when the canonical queue authority accepts recruitment;
- failed recruitment/promotion leaves state unchanged except typed evidence;
- deterministic worlds produce deterministic strategic economy decisions.

- [ ] **Step 2: Run RED**

Run:
```bash
npx vitest run tests/sim/ai-shadow-economy.test.ts
```

- [ ] **Step 3: Move retained recruit/promotion heuristics into Shadow strategic authority**

Reuse existing legality helpers. Do not duplicate economy rules in AI.

- [ ] **Step 4: Run GREEN plus production/promotion regressions**

Run new tests plus production, promotion, READY, and round-boundary suites.

- [ ] **Step 5: Commit**

Commit message:
```
feat: move AI economy decisions into Shadow turn
```

---

### Task 6: Legacy Scheduler Quarantine and Architecture Tripwires

**Files:**
- Modify: `src/sim/ai.ts`
- Modify: `src/sim/types.ts` only if stale scheduler state can be safely retired
- Modify: `src/sim/replay.ts` if canonical snapshot shape changes
- Expand: `tests/sim/ai-authority-imports.test.ts`
- Create/Modify: replay compatibility tests

**Interfaces:**
- Consumes: legacy `pendingCommands`, `scheduleAICommands()`, `evaluateBalancedAI()`
- Produces: canonical path with no strategic dependence on legacy scheduler

- [ ] **Step 1: Write failing quarantine tests**

Tripwires must prove:
- canonical session path does not call `scheduleAICommands()`;
- canonical session path does not consume `ai.pendingCommands`;
- `stepWorld()` does not evaluate strategic AI;
- canonical Shadow planner does not reference a six-command limit;
- AI READY code references canonical deployment legality;
- AI source contains no direct `production.ready =` mutation;
- AI source contains no `placeUnit(` READY path.

- [ ] **Step 2: Decide compatibility shape**

If legacy scheduler APIs remain required by unrelated tests/tools, keep them inert and clearly compatibility-scoped.

If no legitimate consumers remain, retire them under test.

- [ ] **Step 3: Run GREEN plus replay**

Ensure canonical snapshots remain deterministic whether stale scheduler fields remain or are removed.

- [ ] **Step 4: Commit**

Commit message:
```
refactor: quarantine legacy AI scheduler
```

---

### Task 7: Integrated Shadow AI Parity Gauntlet

**Files:**
- Create: `tests/sim/triptych-ai-parity-gauntlet.test.ts`

**Interfaces:**
- Consumes: Tasks 1-6
- Produces: one deterministic end-to-end proof of Shadow AI parity

- [ ] **Step 1: Write integrated scenario**

The gauntlet must prove in one deterministic V2 scenario:
- fixed ticks alone create no strategic AI action;
- Shadow command phase refreshes bounded intelligence;
- hidden enemy cannot be attacked;
- observed King danger overrides lower priority;
- READY deployment occurs through canonical free authority;
- blocked READY remains READY;
- costed orders stay within four Royal Commands;
- order ids are deterministic;
- recruitment/promotion, if chosen, occur only during Shadow command authority;
- Shadow resolve uses canonical order resolution;
- reinforcement remains the only round-boundary strategic mutation stage;
- replay from identical initial truth yields identical final state and receipts.

- [ ] **Step 2: Run gauntlet**

Run:
```bash
npx vitest run tests/sim/triptych-ai-parity-gauntlet.test.ts
```

Expected: PASS if Tasks 1-6 are complete.

- [ ] **Step 3: Run focused AI parity cluster**

Run:
```bash
npx vitest run \
  tests/sim/ai-fixed-tick-authority.test.ts \
  tests/sim/ai-shadow-knowledge.test.ts \
  tests/sim/ai-shadow-budget.test.ts \
  tests/sim/ai-shadow-ready-deployment.test.ts \
  tests/sim/ai-shadow-economy.test.ts \
  tests/sim/ai-authority-imports.test.ts \
  tests/sim/ai-strategy.test.ts \
  tests/sim/ai-tactics.test.ts \
  tests/sim/ai-ready-deployment.test.ts \
  tests/sim/royal-tactical-round-gauntlet.test.ts \
  tests/sim/triptych-ai-parity-gauntlet.test.ts
```

- [ ] **Step 4: Commit**

Commit message:
```
test: prove triptych Shadow AI parity
```

---

### Task 8: Full Repository Verification and Scope Audit

**Files:**
- No feature files unless verification exposes a real regression
- Test-only stale fixture migration permitted when it reflects the approved AI authority model

- [ ] **Step 1: Run focused AI parity suite**

All Task 1-7 suites plus existing intelligence/order/READY regressions must pass.

- [ ] **Step 2: Run authoritative full suite**

Run:
```bash
npm test -- --maxWorkers=1
```

Expected: more than 662 tests, zero failures.

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
- no fixed-tick strategic AI creation remains in canonical session;
- no strategic consumption of legacy pending commands remains;
- Shadow AI knowledge is faction-bounded;
- remembered contacts cannot be attacked while hidden;
- costed Shadow orders obey canonical Royal Command budget;
- READY deployment remains free/canonical/no-fallback;
- AI economy actions occur only in Shadow command authority;
- replay is deterministic;
- human-side semantics unchanged;
- no new visibility/combat/economy/presentation rules leaked in.

- [ ] **Step 6: Final whole-branch review**

Review against this plan and the approved spec. Critical/Important findings get one TDD fix pass. Minor cleanup is ledgered rather than expanding scope.
