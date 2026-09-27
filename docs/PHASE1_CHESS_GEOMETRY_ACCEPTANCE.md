# Phase 1 Chess Geometry Acceptance

**Status:** VERIFIED

**Branch:** `agent/phase1-chess-geometry`  
**Verified code head:** `a302ffe9d3fd75665b4c8eab17e20745f664a9de`  
**GitHub Actions run:** `36351996507` / run #40  
**Verification job:** `108712327352`

## Verification evidence

GitHub Actions completed successfully on the Phase 1 code head with:

```text
npm install       PASS
npm test          PASS
npm run typecheck PASS
```

Vitest result:

```text
Test Files  3 passed (3)
Tests      32 passed (32)
```

The threat-map work also has an explicit RED→GREEN trail:

```text
RED run  36351851073
6 threat-map tests failed because projectThreatCells/buildThreatMap did not exist.
Existing 26 tests remained green.

GREEN run 36351996507
32 tests passed.
TypeScript strict typecheck passed.
```

## Accepted Phase 1 capabilities

- 16×16 board and 100 ms fixed-tick invariants remain intact;
- authoritative immutable occupancy remains simulation-owned;
- Victoria and Obsidian Pawns move one cell forward in faction-correct directions;
- Pawn threat geometry is diagonal-forward and deliberately separate from Pawn movement;
- Knights use L-shaped movement/threat geometry and jump blockers;
- Bishops project diagonal movement rays and blocker-aware threat rays;
- Rooks project file/rank movement rays and blocker-aware threat rays;
- Queens combine diagonal/file/rank geometry;
- Kings use one-cell eight-direction movement/threat geometry;
- sliding movement rejects intermediate blockers;
- sliding threat projection includes the first occupied cell and stops beyond it;
- threat maps are deterministic per faction and preserve sorted source-unit provenance for overlapping pressure;
- zero-distance and wrong-geometry movement reject explicitly;
- occupied movement destinations remain non-capturing;
- same-cell command races remain deterministic by `(sequence, unitId)` ordering;
- rejected blocked/illegal orders remain atomic apart from the fixed tick advance;
- mixed six-piece replay produces byte-equivalent canonical snapshots and event streams.

## Phase boundary

Phase 1 deliberately does **not** implement:

- damage, health, attack cadence or attack ranges;
- captures as movement semantics;
- Guard/acquisition or chase behaviour;
- positional combat bonuses;
- check/checkmate or King threat safety;
- Pawn double-step, diagonal movement-capture, en passant or promotion;
- Crown economy, nodes, reinforcement, production or Command Capacity;
- Queen Victoria hero progression/abilities;
- AI or Phaser rendering/input.

Threat maps are geometry facts only. They do not yet cause damage, targeting, check, Guard acquisition or victory consequences. Those consumers begin in later phases.

## Exit decision

Phase 1 meets the canonical specification's full exit intent: **chess geometry, blockers and threat maps** are implemented as deterministic renderer-independent simulation primitives. All six chess-derived unit kinds have defined movement/threat geometry, blocker semantics are explicit, threat provenance is deterministic, rejected movement stays atomic, and replay equivalence remains intact.

## Non-blocking observations

The CI install reports two moderate npm audit findings in development dependencies. They did not affect tests or typechecking and are not treated as a Phase 1 simulation-correctness failure. Dependency hygiene should be addressed separately without blindly forcing breaking upgrades.
