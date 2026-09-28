# Phase 3 Sovereign Rules Acceptance

**Status:** CONTAINER_VERIFIED / GITHUB_CI_PENDING

**Branch:** `agent/phase3-sovereign-rules`

## Implemented slice

Phase 3 adds deterministic sovereign and terminal-match semantics over the existing combat kernel:

- simulation-owned `MatchState` and per-faction `SovereignState`;
- explicit unbound sovereigns for partial lower-phase fixtures;
- shared RTS attack-capability helper for sovereign threat derivation;
- lexicographically sorted sovereign threat provenance;
- transition-only `sovereign.threatened` and `sovereign.relief` events;
- deterministic `sovereign.defeated`, `match.victory`, and `match.draw` outcomes;
- simultaneous King death resolves as draw independent of insertion order;
- decisive combat prevents later same-tick commands from executing;
- terminal worlds freeze without tick advance, Guard/combat mutation, or command execution;
- post-match commands reject as `command.rejected` / `match_ended` in deterministic order;
- post-command sovereign evaluation creates/removes threat without retroactive combat;
- canonical replay snapshots include normalized sovereign/match truth.

## Container verification

The uploaded Phase 3 branch snapshot was developed in an isolated container workspace. The sandbox could not reach npm, so project Vitest could not be installed locally. Verification therefore used:

- the globally available TypeScript compiler against all production source;
- TypeScript structural checking of all new Phase 3 Vitest files using a local declaration shim only for the unavailable `vitest` module;
- dependency-free Node assertion harnesses covering Tasks 1 through 7 and the same sovereign behaviors as the committed Phase 3 tests.

All container checks passed on the final local tree.

## Authoritative CI gate

GitHub Actions remains the authoritative Phase 3 exit gate because it installs the repository's real Vitest dependency and runs the complete Phase 0-3 suite plus the repository typecheck.

This receipt must be updated to **VERIFIED** only after the synced branch head passes:

```text
npm install
npm test
npm run typecheck
```

## Deferred boundary

Phase 4 remains Crown Power, seven capture nodes, annexation, node-count progression, production queues, reinforcement pulses, Command Capacity, hard caps, and Pawn promotion. No Phase 4 mechanics are introduced here.
