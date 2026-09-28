# Phase 5 Victoria Hero + Balanced AI Acceptance Receipt

**Status:** CONTAINER-VERIFIED / AUTHORITATIVE TERMUX VITEST PENDING

**Branch:** `agent/phase5-victoria-hero-ai`
**Immutable code/test verification target:** `3324535813a76c8d0cb24cb6baac25864c97670c`
**Spec:** `docs/superpowers/specs/2026-09-28-phase5-victoria-hero-balanced-ai-design.md`
**Plan:** `docs/superpowers/plans/2026-09-28-phase5-victoria-hero-balanced-ai.md`

## Verification boundary

The container has no installed `node_modules` and cannot run the project Vitest binary. The container therefore does **not** claim an authoritative `npm test` result. It does provide: strict source compilation using the available global TypeScript compiler, structural compilation of all Phase 5 test files with a minimal Vitest declaration shim, dependency-free Node behavioral harnesses for the integrated tick transaction/replay/determinism seams, and `git diff --check`. The exact final tree must still pass `npm install`, `npm test`, and `npm run typecheck` on Termux before Phase 5 is stamped VERIFIED.

## Acceptance matrix

| # | Executable evidence |
|---:|---|
| 1 | `phase5-state.test.ts — keeps heroes unbound and AI disabled by default` |
| 2 | `phase5-state.test.ts — binds only explicit same-faction queens` |
| 3 | `phase5-state.test.ts — explicit hero binding uses ordinary queen unit/combat state` |
| 4 | `phase5-state.test.ts — rejects non-queen/wrong-faction binding` |
| 5 | `hero-progression.test.ts — nearby death XP exact values` |
| 6 | `hero-progression.test.ts — out-of-range death excluded` |
| 7 | `hero-progression.test.ts — King XP excluded` |
| 8 | `hero-progression.test.ts — XP without last-hit` |
| 9 | `hero-progression.test.ts — same-resolution XP on hero death` |
| 10 | `hero-progression.test.ts — exact XP thresholds` |
| 11 | `hero-progression.test.ts — level-up preserves health/cooldowns` |
| 12 | `hero-progression.test.ts — ascending multi-level transitions` |
| 13 | `hero-abilities.test.ts — level unlock rejection` |
| 14 | `hero-abilities.test.ts — cooldown rejection` |
| 15 | `hero-abilities.test.ts — wrong/dead/unbound rejection` |
| 16 | `hero-abilities.test.ts — active ability exclusion` |
| 17 | `hero-abilities.test.ts — Sovereign Line formation gate` |
| 18 | `phase5-ordering.test.ts — combat precedes activation` |
| 19 | `hero-combat-effects.test.ts — Royal Decree level 1–3 exact derived values` |
| 20 | `hero-combat-effects.test.ts — Guard acquisition/leash +1` |
| 21 | `hero-combat-effects.test.ts — Level 4 Royal Decree upgrade` |
| 22 | `hero-abilities.test.ts + hero-combat-effects.test.ts — expiry removes derived effects` |
| 23 | `hero-combat-effects.test.ts + phase5-ordering.test.ts — Hold anchors movement, attack remains legal` |
| 24 | `hero-combat-effects.test.ts — hero incoming -50%` |
| 25 | `hero-combat-effects.test.ts — ally incoming -20/-25%` |
| 26 | `hero-combat-effects.test.ts — Hold Guard leash +2` |
| 27 | `hero-combat-effects.test.ts — non-zero hit floor` |
| 28 | `hero-abilities.test.ts — rank/file/diagonal formation qualifies` |
| 29 | `hero-combat-effects.test.ts — non-aligned units excluded` |
| 30 | `hero-combat-effects.test.ts — +1 range` |
| 31 | `hero-combat-effects.test.ts — +10/+15% damage` |
| 32 | `hero-combat-effects.test.ts — dynamic formation membership` |
| 33 | `hero-abilities.test.ts — Gambit locked until level 5` |
| 34 | `hero-abilities.test.ts — exact 35/300 counters` |
| 35 | `hero-combat-effects.test.ts — +30% allied damage` |
| 36 | `hero-combat-effects.test.ts — new reload floor(base*.75)` |
| 37 | `hero-combat-effects.test.ts — existing cooldown unchanged` |
| 38 | `hero-combat-effects.test.ts — hero +30% incoming` |
| 39 | `hero-progression.test.ts + hero-respawn.test.ts — normal 120-tick respawn after death` |
| 40 | `phase5-ordering.test.ts — unit.killed before hero.defeated` |
| 41 | `hero-progression.test.ts — hero death leaves match active` |
| 42 | `economy.test.ts + hero-progression.test.ts — Queen bounty uses existing kill reward once` |
| 43 | `hero-respawn.test.ts + phase5-ordering.test.ts — exact 120 ticks` |
| 44 | `hero-progression.test.ts + hero-respawn.test.ts — XP/level/cooldowns persist` |
| 45 | `hero-respawn.test.ts + hero-abilities.test.ts — cooldowns continue while absent` |
| 46 | `hero-progression.test.ts — active ability cancels on death` |
| 47 | `hero-respawn.test.ts — full-health deterministic spawn` |
| 48 | `hero-respawn.test.ts + phase5-determinism.test.ts — blocked ready state, no teleport` |
| 49 | `hero-respawn.test.ts + phase5-determinism.test.ts — ready/respawn receipts once` |
| 50 | `hero-respawn.test.ts — same hero ID` |
| 51 | `phase5-state.test.ts + ai-strategy.test.ts — AI off by default` |
| 52 | `ai-strategy.test.ts — 10-tick cadence` |
| 53 | `ai-strategy.test.ts — max 3 intentions` |
| 54 | `ai-tactics.test.ts — max 6 commands` |
| 55 | `ai-tactics.test.ts + phase5-ordering.test.ts — T+1 scheduling` |
| 56 | `phase5-determinism.test.ts — AI recruitment parity with external command` |
| 57 | `phase5-determinism.test.ts — stale AI command rejected by ordinary validator` |
| 58 | `ai-strategy.test.ts + phase5-determinism.test.ts — insertion-order determinism` |
| 59 | `ai-strategy.test.ts — 30-tick commitment persistence` |
| 60 | `phase5-determinism.test.ts — invalid objective replaced only at cadence` |
| 61 | `ai-strategy.test.ts — threatened King priority at cadence only` |
| 62 | `ai-strategy.test.ts acceptance channels — capture_node exposed` |
| 63 | `ai-strategy.test.ts acceptance channels — reinforce_front exposed` |
| 64 | `ai-strategy.test.ts acceptance channels — pressure_position exposed` |
| 65 | `ai-strategy.test.ts + ai-tactics.test.ts — attack_king through ordinary commands` |
| 66 | `ai-tactics.test.ts hero-use heuristics — Royal Decree requires offensive commitment + nearby allies` |
| 67 | `ai-tactics.test.ts hero-use heuristics — Hold for defend_king` |
| 68 | `ai-tactics.test.ts hero-use heuristics — Line requires valid formation` |
| 69 | `ai-tactics.test.ts hero-use heuristics — Gambit requires favourable local force + close sovereign` |
| 70 | `ai-tactics.test.ts — hero cast remains inside 6-command tactical budget / 3-intention strategy budget` |
| 71 | `phase5-ordering.test.ts — King outcome decisive short-circuit` |
| 72 | `phase5-ordering.test.ts + phase5-determinism.test.ts — terminal counters frozen` |
| 73 | `phase5-ordering.test.ts + phase5-determinism.test.ts — terminal AI frozen` |
| 74 | `phase5-ordering.test.ts — sovereign outcome precedes hero lifecycle` |
| 75 | `phase5-replay.test.ts — normalized hero state in canonical snapshot` |
| 76 | `phase5-replay.test.ts — normalized AI state in canonical snapshot` |
| 77 | `phase5-replay.test.ts + phase5-determinism.test.ts — byte-identical equivalent histories` |
| 78 | `phase5-replay.test.ts + phase5-determinism.test.ts — lifecycle/commitment/pending-command replay custody` |

## Container evidence

- Source TypeScript compile: PASS (`tsc` against `src/**/*.ts`, strict, no emit).
- Phase 5 test structural compile: PASS for 10 Phase 5 test files using a local Vitest type shim only.
- Integrated behavioral harnesses: PASS for Task 8 ordering, Task 9 replay normalization, Task 10 determinism/fairness, and acceptance-gap AI strategy/hero-use checks.
- `git diff --check`: required again on the final receipt commit.
- Test inventory at code/test target: 33 `*.test.ts` files in `tests/sim`; authoritative Vitest test count pending Termux execution.

## Authoritative Termux gate

Run on the exact packaged final tree:

```bash
npm install
npm test
npm run typecheck
```

Phase 5 graduates only after the observed Termux Vitest file/test counts and clean typecheck are recorded from that run.
