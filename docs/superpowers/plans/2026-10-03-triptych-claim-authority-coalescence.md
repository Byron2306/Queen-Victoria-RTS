# Triptych Claim Authority Coalescence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `BoardTile.factionControl` the sole authoritative territorial-ownership truth and route all gameplay tile claims through one deterministic simulation authority.

**Architecture:** `src/sim/territory.ts` owns `canFactionClaimTile()` and `claimFactionTile()`. Explicit annex commands, settlement, and client annex targeting consume that authority; nodes, banners, forts, occupation, contest, and future supply remain separate state concepts. Direct gameplay writes to `factionControl` are prohibited outside the claim authority, while opening-state initialization remains an explicit exception.

**Tech Stack:** TypeScript, Vitest, immutable deterministic simulation state, Phaser client targeting.

**Spec:** `docs/superpowers/specs/2026-10-03-triptych-claim-authority-coalescence-design.md`

## Global Constraints

- `BoardTile.factionControl` is the sole authoritative territorial tile-ownership field.
- `ClaimSource` is exactly `'annex_command' | 'settlement' | 'banner' | 'fortification'`.
- First implementation legality is conservative and source-independent: playable + neutral + orthogonally adjacent to friendly territory.
- Same-faction claims reject as `already_controlled`.
- Enemy-controlled claims reject as `enemy_controlled`.
- Remote neutral occupation may remain occupied without becoming owned.
- Enemy occupation never directly flips territorial ownership.
- Opening territory initialization may seed `factionControl` directly.
- Node, banner and fortification ownership remain distinct from territorial ownership.
- No supply, attrition, enemy-territory conquest, READY deployment, AI supply logic, or strategic-overlay work in this phase.
- Preserve deterministic iteration, replay shape and save compatibility.

## Review Focus

- Multiple living units requesting settlement claims in one pass must resolve deterministically and never depend on object insertion order.
- A legal client annex highlight must exactly match sim legality, including off-board, already-controlled, enemy-controlled and non-adjacent cells.
- Existing banner polarity flips must remain polarity-only and must not change `factionControl`.
- Existing node capture must remain node ownership only and must not recolour territorial tiles.
- V1 compatibility and V2 32x32 topology must both preserve their existing opening-territory initialization semantics.

---

### Task 1: Introduce the Faction-Claim Decision API

**Files:**
- Modify: `src/sim/territory.ts`
- Create: `tests/sim/territory-claims.test.ts`

**Interfaces:**
- Consumes: `topologyForWorld(world)`, `getTileFactionControl(world, cell)`, `hasAdjacentFactionTile(world, cell, faction)`.
- Produces:
  - `ClaimSource`
  - `ClaimRejectReason`
  - `ClaimDecision`
  - `ClaimResult`
  - `canFactionClaimTile(world, faction, cell, source): ClaimDecision`
  - `claimFactionTile(world, faction, cell, source): ClaimResult`

- [ ] **Step 1: Write failing decision tests**

Add `tests/sim/territory-claims.test.ts` with focused tests that assert:

```ts
expect(canFactionClaimTile(world, 'victoria', adjacentNeutral, 'annex_command'))
  .toEqual({ allowed: true });
expect(canFactionClaimTile(world, 'victoria', sameFaction, 'annex_command'))
  .toEqual({ allowed: false, reason: 'already_controlled' });
expect(canFactionClaimTile(world, 'victoria', enemyControlled, 'annex_command'))
  .toEqual({ allowed: false, reason: 'enemy_controlled' });
expect(canFactionClaimTile(world, 'victoria', remoteNeutral, 'annex_command'))
  .toEqual({ allowed: false, reason: 'not_adjacent_to_friendly_territory' });
expect(canFactionClaimTile(v2World, 'victoria', { x: 2, y: 2 }, 'annex_command'))
  .toEqual({ allowed: false, reason: 'off_board' });
```

Run:

```bash
npx vitest run tests/sim/territory-claims.test.ts
```

Expected: RED because the claim API does not exist.

- [ ] **Step 2: Add the claim types and decision function**

In `src/sim/territory.ts`, add exactly:

```ts
export type ClaimSource =
  | 'annex_command'
  | 'settlement'
  | 'banner'
  | 'fortification';

export type ClaimRejectReason =
  | 'off_board'
  | 'already_controlled'
  | 'enemy_controlled'
  | 'not_adjacent_to_friendly_territory';

export type ClaimDecision = Readonly<{
  allowed: boolean;
  reason?: ClaimRejectReason;
}>;

export type ClaimResult = Readonly<{
  state: WorldState;
  accepted: boolean;
  reason?: ClaimRejectReason;
}>;
```

Add:

```ts
export function canFactionClaimTile(
  world: WorldState,
  faction: Faction,
  cell: Coord,
  source: ClaimSource,
): ClaimDecision
```

`source` is intentionally policy-neutral in this phase but must remain part of the signature.

- [ ] **Step 3: Run the decision tests**

Run the Step 1 command.

Expected: PASS for decision-only assertions.

- [ ] **Step 4: Write failing mutation tests**

Extend `tests/sim/territory-claims.test.ts` to assert that `claimFactionTile()`:

- changes exactly one adjacent neutral tile to the requesting faction;
- preserves polarity and all unrelated strategic state;
- returns the unchanged world and stable reason on rejection.

Run the same file.

Expected: RED because `claimFactionTile()` does not exist.

- [ ] **Step 5: Implement `claimFactionTile()`**

Add exactly:

```ts
export function claimFactionTile(
  world: WorldState,
  faction: Faction,
  cell: Coord,
  source: ClaimSource,
): ClaimResult
```

It must call `canFactionClaimTile()` first, clone only the strategic tile record on success, and preserve all non-ownership tile fields.

- [ ] **Step 6: Run GREEN and commit**

```bash
npx vitest run tests/sim/territory-claims.test.ts
```

Expected: PASS.

Commit:

```bash
git add src/sim/territory.ts tests/sim/territory-claims.test.ts
git commit -m "feat: add canonical faction claim authority"
```

---

### Task 2: Make Annex and Settlement Share the Claim Authority

**Files:**
- Modify: `src/sim/territory.ts`
- Modify: `tests/sim/annex-orders.test.ts`
- Modify: `tests/sim/territory-claims.test.ts`
- Modify as needed if settlement behavior is owned elsewhere: the existing focused settlement/round test file only.

**Interfaces:**
- Consumes: Task 1 `canFactionClaimTile()` and `claimFactionTile()`.
- Produces: `annexTile()` as a compatibility wrapper and `resolveSettlement()` as a deterministic sequence of `settlement` claims.

- [ ] **Step 1: Write failing coalescence regressions**

Add tests proving:

```ts
// Same adjacent neutral frontier:
expect(annexTile(world, 'victoria', frontier).accepted).toBe(true);
expect(resolveSettlement(worldWithVictoriaUnitOn(frontier))
  |> getTileFactionControl(%, frontier)).toBe('victoria');
```

Use normal TypeScript syntax in the actual test rather than pipeline syntax.

Also pin:

- a remote Victoria unit on neutral ground remains in place but leaves the tile neutral after settlement;
- a Victoria unit standing on Obsidian-controlled territory leaves that tile Obsidian-controlled;
- dead units do not claim;
- two settlement candidates are processed in deterministic unit-id order so object insertion order cannot change final territory.

Run:

```bash
npx vitest run tests/sim/territory-claims.test.ts tests/sim/annex-orders.test.ts
```

Expected: RED because current `resolveSettlement()` paints occupied cells directly.

- [ ] **Step 2: Convert `annexTile()` to a wrapper**

`annexTile(world, faction, cell)` must return the result of:

```ts
claimFactionTile(world, faction, cell, 'annex_command')
```

Preserve the exported `AnnexResult` compatibility surface or alias it to `ClaimResult` if type-compatible.

- [ ] **Step 3: Convert settlement to canonical claims**

In `resolveSettlement(world)`:

- consider living units only;
- sort unit IDs lexicographically before processing;
- for each unit call `claimFactionTile(state, unit.faction, unit.position, 'settlement')`;
- accept successful claims;
- ignore rejected claim mutation while preserving unit occupation and position.

Do not special-case remote raiders or enemy territory outside the shared authority.

- [ ] **Step 4: Run focused GREEN**

Run the Step 1 command.

Expected: PASS.

- [ ] **Step 5: Run settlement-sensitive regressions**

Run:

```bash
npx vitest run \
  tests/sim/annex-orders.test.ts \
  tests/sim/nodes.test.ts \
  tests/sim/fortifications.test.ts \
  tests/sim/polarity.test.ts \
  tests/sim/royal-tactical-round-gauntlet.test.ts
```

Expected: PASS, or a focused RED revealing an old fixture that depended on illegal settlement recolouring.

- [ ] **Step 6: Commit**

```bash
git add src/sim/territory.ts tests/sim/territory-claims.test.ts tests/sim/annex-orders.test.ts
git commit -m "feat: coalesce annex and settlement claims"
```

---

### Task 3: Bind Client Annex Targeting to Simulation Legality

**Files:**
- Modify: `src/client/input/strategic-targeting.ts`
- Modify: `tests/client/strategic-targeting.test.ts`

**Interfaces:**
- Consumes: Task 1 `canFactionClaimTile(world, faction, cell, 'annex_command')`.
- Produces: `legalStrategicTargets(..., 'annex_tile')` and `stageStrategicTarget(..., 'annex_tile', ...)` with no duplicated annex policy.

- [ ] **Step 1: Add failing parity tests**

In `tests/client/strategic-targeting.test.ts`, create a world containing representative cells for all claim decisions and assert:

```ts
for (const cell of topologyForWorld(world).allPlayableCells()) {
  expect(legalTargetIds.has(tileId(cell))).toBe(
    canFactionClaimTile(world, 'victoria', cell, 'annex_command').allowed,
  );
}
```

Also test `stageStrategicTarget()` rejects a non-adjacent neutral cell even when it is playable.

Run:

```bash
npx vitest run tests/client/strategic-targeting.test.ts
```

Expected: parity test may initially pass for common cases, but the architectural expectation remains RED if the client still directly imports/reimplements `getTileFactionControl` + `hasAdjacentFactionTile` for annex policy. If behavior alone does not fail, add a narrow source-architecture assertion in this test file before changing production.

- [ ] **Step 2: Replace duplicated annex policy**

For `mode === 'annex_tile'`, use only:

```ts
canFactionClaimTile(world, faction, cell, 'annex_command').allowed
```

Retain existing banner and fortification targeting logic unchanged.

- [ ] **Step 3: Run GREEN and commit**

```bash
npx vitest run tests/client/strategic-targeting.test.ts
```

Expected: PASS.

Commit:

```bash
git add src/client/input/strategic-targeting.ts tests/client/strategic-targeting.test.ts
git commit -m "refactor: bind annex targeting to sim claim authority"
```

---

### Task 4: Add a Territorial-Ownership Architecture Tripwire

**Files:**
- Create: `tests/sim/territory-claim-authority-imports.test.ts`
- Modify only if violations are discovered: the specific violating gameplay modules.

**Interfaces:**
- Consumes: Task 1 canonical claim authority.
- Produces: an executable architecture rule preventing future direct gameplay mutation of `factionControl`.

- [ ] **Step 1: Write the architecture test and verify RED if violations remain**

Recursively scan `src/**/*.ts` and detect direct `factionControl:` writes or equivalent assignment patterns.

Allow only:

- `src/sim/territory.ts`
- `src/sim/triptych-territory.ts`
- explicit persistence/migration code only if a currently existing file is proven to require direct state reconstruction, and document that exact path in the allowlist comment.

The test must not flag reads of `.factionControl`.

Run:

```bash
npx vitest run tests/sim/territory-claim-authority-imports.test.ts
```

Expected: RED if any gameplay module still writes ownership directly outside the approved boundary, otherwise PASS after proving the test catches a deliberate fixture string inside the test itself.

- [ ] **Step 2: Remove only confirmed direct-write leaks**

For each live violation, route gameplay mutation through `claimFactionTile()` or remove the mutation if the subsystem should never own territorial control.

Do not change node/banner/fort semantics unless the tripwire exposes an actual direct territorial write.

- [ ] **Step 3: Run strategic-object regressions**

```bash
npx vitest run \
  tests/sim/territory-claim-authority-imports.test.ts \
  tests/sim/territory-claims.test.ts \
  tests/sim/nodes.test.ts \
  tests/sim/polarity.test.ts \
  tests/sim/fortifications.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src tests/sim/territory-claim-authority-imports.test.ts
git commit -m "test: guard canonical territorial ownership authority"
```

---

### Task 5: Claim-Authority Closure Gauntlet and Repository Verification

**Files:**
- Create: `tests/sim/triptych-claim-authority-gauntlet.test.ts`
- Modify only if a final focused defect is exposed by the gauntlet: the owning source/test file.

**Interfaces:**
- Consumes: Tasks 1-4.
- Produces: one high-level executable receipt proving ownership, occupation, client legality and strategic-object separation coexist correctly.

- [ ] **Step 1: Write the end-to-end claim gauntlet**

In one deterministic V2 scenario prove:

- Victoria can claim one adjacent neutral frontier by explicit annex;
- settlement on the same kind of adjacent neutral frontier yields the same ownership result;
- a remote neutral raider remains physically present while the remote tile stays neutral;
- a Victoria unit on Obsidian-controlled ground does not recolour it;
- node ownership remains independent of surrounding tile ownership;
- a mature banner may flip polarity without changing `factionControl`;
- a fortification remains an owned object on friendly territory without creating extra territorial ownership;
- client legal annex targets exactly equal sim claim decisions for all playable cells.

- [ ] **Step 2: Run the gauntlet**

```bash
npx vitest run tests/sim/triptych-claim-authority-gauntlet.test.ts
```

Expected: PASS after Tasks 1-4. If it fails, first add a focused RED regression in the owning task area before changing production.

- [ ] **Step 3: Run the focused claim-authority suite**

```bash
npx vitest run \
  tests/sim/territory-claims.test.ts \
  tests/sim/annex-orders.test.ts \
  tests/sim/territory-claim-authority-imports.test.ts \
  tests/sim/triptych-claim-authority-gauntlet.test.ts \
  tests/client/strategic-targeting.test.ts \
  tests/sim/nodes.test.ts \
  tests/sim/polarity.test.ts \
  tests/sim/fortifications.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run authoritative repository gates**

```bash
npm test -- --maxWorkers=1
npm run typecheck
npm run build
```

Expected:

- all tests PASS with count greater than or equal to the current 557-test baseline because this plan adds new regressions;
- TypeScript typecheck exits 0;
- Vite build exits 0; the existing large-Phaser-chunk warning is non-fatal.

- [ ] **Step 5: Final branch review**

Compare the branch against the pre-claim-authority head and verify:

- no supply/attrition/READY/AI/presentation-clock work entered the diff;
- no new serialized ownership field was added;
- gameplay tile ownership mutation is constrained to the canonical authority;
- opening territory remains the explicit initialization exception.

Commit any final test-only correction separately, then stop.
