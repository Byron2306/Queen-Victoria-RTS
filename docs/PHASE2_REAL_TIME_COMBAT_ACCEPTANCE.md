# Phase 2 Real-Time Combat Acceptance

**Status:** VERIFIED

**Branch:** `agent/phase2-real-time-combat`  
**Verified code head before this receipt:** `5fc8faaaf58725349d41dc7330578d1fbe4aeec7`  
**GitHub Actions run:** `36353226042` / run #100  
**Verification job:** `108715776073`

## Verification evidence

GitHub Actions completed successfully with:

```text
npm install       PASS
npm test          PASS
npm run typecheck PASS
```

Vitest result:

```text
Test Files  9 passed (9)
Tests      55 passed (55)
```

## Accepted combat slice

Phase 2 now verifies:

- deterministic combat profiles for Pawn, Knight, Bishop, Rook, Queen and King;
- per-unit health, cooldown, target, Guard stance and immutable guard anchor state;
- explicit attack orders with deterministic missing/self/friendly/dead target rejection;
- Chebyshev RTS attack-range gating independent of chess movement geometry;
- fixed-tick attack cooldown countdown and reload;
- simultaneous attack intent collection from a pre-damage snapshot;
- reciprocal lethal attacks where both ready attackers fire before deaths are applied;
- deterministic focus-fire aggregation before damage/death mutation;
- atomic death removal from unit registry, occupancy and combat registry;
- deterministic Guard acquisition by nearest living enemy with enemy-id tie-breaking;
- Guard target retention within the acquisition-plus-leash pursuit envelope;
- deterministic target clearing/reacquisition when a retained target becomes invalid;
- Pawn Chain, Knight Fork, Bishop Line and Rook Open File positional classifications;
- one non-stacking +25% positional damage multiplier using integer floor arithmetic;
- multi-tick replay equivalence across movement, Guard acquisition, explicit targeting, cooldown state, positional damage and death;
- Phase 1 threat maps remaining unchanged when combat changes health without changing board occupancy.

## Important Phase 2 rulings

### Combat before new commands in each tick

At each simulation tick, existing Guard/target state resolves combat before newly submitted commands are applied. An accepted attack command therefore changes target intent for subsequent combat rather than retroactively creating damage earlier in the same tick. This preserves a clean fixed-tick transaction boundary.

### Simultaneous damage

All ready attack intents are determined from the same pre-damage world snapshot. Damage is aggregated by target and applied only after every ready attacker has had the opportunity to fire. Unit iteration order therefore cannot suppress a reciprocal attack merely because that attacker was killed by another ready attack in the same tick.

### Guard leash meaning

The Phase 2 Guard pursuit envelope is `acquisitionRange + leashRange`, measured from the immutable guard anchor to the retained target. The acquisition range defines the initial awareness zone; leash range defines allowed additional pursuit beyond that zone. Autonomous chase movement itself remains deferred.

### Positional damage

A qualifying named positional condition yields 12500 basis points, or +25% damage. Multiple positional tags do not stack in Phase 2. Damage is calculated with integer floor arithmetic.

## Deferred boundary

Phase 2 deliberately does **not** implement:

- autonomous chase/pathfinding movement;
- armour, damage types, projectiles, splash or status effects;
- King defeat/check/checkmate or sovereign victory rules;
- Crown Power economy, nodes or annexation;
- territory unlocks, production, reinforcement pulses or Command Capacity;
- Pawn promotion;
- Queen Victoria levels, abilities, death/return loop or XP;
- strategic AI commander behavior;
- Phaser rendering, animation, HUD or touch input.

Those systems remain layered above the deterministic combat simulation.

## Exit decision

Phase 2 meets its exit gate. Health/cadence/range, explicit targeting, simultaneous deterministic damage and death, Guard acquisition/leash, positional attack bonuses and replay determinism are verified while Phase 0/1 geometry and threat-map invariants remain intact.

## Non-blocking observations

The CI install continues to report two moderate npm audit findings in development dependencies, and GitHub Actions warns that `actions/checkout@v4` / `actions/setup-node@v4` target deprecated Node.js 20 internals while the runner forces Node.js 24 for those actions. Neither affected simulation tests or typechecking. Dependency/workflow hygiene should be handled as a separate maintenance change rather than mixed into combat semantics.
