# Phase 1 Chess Geometry Acceptance

**Status:** VERIFIED

**Branch:** `agent/phase1-chess-geometry`  
**Verified head before this receipt:** `ac573079968b3d0f40641413538acdc3be1d98c9`  
**GitHub Actions run:** `36351749973` / run #28  
**Verification job:** `108711641956`

## Verification evidence

GitHub Actions completed successfully on the Phase 1 head with:

```text
npm install       PASS
npm test          PASS
npm run typecheck PASS
```

Vitest result:

```text
Test Files  2 passed (2)
Tests      26 passed (26)
```

Coverage exercised by the acceptance suite includes:

- 16×16 board and 100 ms fixed-tick invariants;
- authoritative immutable occupancy;
- Victoria and Obsidian one-cell forward Pawn geometry;
- Knight L-shaped movement and blocker jumping;
- Bishop diagonal rays and intermediate blockers;
- Rook file/rank rays and intermediate blockers;
- Queen diagonal/file/rank rays and intermediate blockers;
- King one-cell eight-direction adjacency;
- zero-distance and wrong-geometry rejection;
- occupied destinations remaining non-capturing;
- deterministic same-cell conflict ordering by command sequence;
- blocked/illegal commands remaining atomic apart from the fixed tick advance;
- mixed six-piece replay producing byte-equivalent canonical snapshots and event streams.

## Phase boundary

Phase 1 deliberately does **not** implement:

- damage, health, attack cadence or attack ranges;
- captures as movement semantics;
- Guard/acquisition or chase behaviour;
- positional combat bonuses;
- check/checkmate or King threat safety;
- Pawn double-step, diagonal capture, en passant or promotion;
- Crown economy, nodes, reinforcement, production or Command Capacity;
- Queen Victoria hero progression/abilities;
- AI or Phaser rendering/input.

These remain layered above the deterministic geometry kernel.

## Exit decision

Phase 1 meets its exit gate: all six chess-derived unit kinds have deterministic movement geometry, blockers and Knight jumps behave correctly, faction-oriented Pawn movement is enforced, rejected orders are inspectable and atomic, and replay equivalence remains intact.

## Non-blocking observations

The CI install reported two moderate npm audit findings in development dependencies. They did not affect tests or typechecking and are not treated as a Phase 1 simulation correctness failure. Dependency hygiene should be addressed separately without using forced breaking upgrades blindly.
