# Phase 3 Sovereign Rules Design

**Date:** 2026-09-28  
**Status:** APPROVED / LOCKED  
**Repository:** `Byron2306/Queen-Victoria-RTS`  
**Branch:** `agent/phase3-sovereign-rules`

## Purpose

Phase 3 makes the King a true simulation-owned sovereign objective without turning the real-time RTS into turn-based orthodox chess.

The match ends when a King is defeated. Separately, each living King exposes deterministic sovereign-threat state so the renderer, future AI, audio, HUD and Victoria abilities can react to danger in a replay-stable way.

The key ruling is:

> **King death determines victory; sovereign threat communicates real-time danger; orthodox check/checkmate legality is not introduced.**

## Scope

Phase 3 adds:

- authoritative match state to `WorldState`;
- one sovereign record per faction;
- deterministic real-time threat derivation for each living King;
- transition events for threatened/safe state changes;
- deterministic King defeat, victory and simultaneous-King draw semantics;
- terminal match freezing;
- deterministic rejection of post-match commands;
- replay/canonical snapshot coverage for match and sovereign state.

Phase 3 deliberately does **not** add:

- turn-based check or checkmate;
- movement illegality caused by exposing the King;
- castling, stalemate, repetition or fifty-move rules;
- economy, nodes, annexation, production or reinforcement;
- Victoria progression or abilities;
- strategic AI commander logic;
- Phaser rendering, HUD or input.

## Design invariant

The sovereign layer observes and interprets authoritative movement/combat truth. It does not fork the combat engine into special royal rules.

The King remains a normal combat participant in the deterministic combat kernel. Phase 3 gives King death special match meaning.

## Match state model

`WorldState` gains a `match` field.

Recommended contract:

```ts
export type MatchStatus = 'active' | 'victoria_won' | 'obsidian_won' | 'draw';

export type SovereignState = Readonly<{
  kingId: string;
  threatened: boolean;
  threateningUnitIds: readonly string[];
}>;

export type MatchState = Readonly<{
  status: MatchStatus;
  victor: Faction | null;
  endedTick: number | null;
  sovereigns: Readonly<Record<Faction, SovereignState>>;
}>;
```

The exact implementation may refine field names, but the semantics are fixed by this spec.

## Sovereign discovery

Each faction must have exactly one sovereign King for normal playable match state.

World construction should derive King identity from existing units rather than requiring the renderer or caller to maintain separate hidden truth.

If a faction has no King at world construction time for a test fixture or partial simulation, the sovereign subsystem must remain deterministic and explicit rather than inventing a King. Tests may use helper constructors where required.

Production match setup should provide exactly one Victoria King and one Obsidian King.

## Real-time sovereign threat

`threatened` means:

> At the derived sovereign-evaluation point, at least one living enemy unit is currently capable of attacking that King under the real-time combat model.

This is **not** orthodox chess check.

Threat uses current simulation truth:

- attacker exists and is alive;
- target King exists and is alive;
- attacker belongs to the opposing faction;
- attacker satisfies its current combat attack-range requirement against the King;
- any attack capability constraints already owned by combat remain authoritative;
- threatening unit IDs are sorted lexicographically for deterministic provenance.

Raw chess geometry alone is insufficient. For example, a Bishop may line up geometrically with a King but remain outside its configured RTS attack range and therefore not produce sovereign threat.

Phase 3 should not duplicate combat legality. Where possible, shared pure helpers should express whether a living attacker could presently attack a target.

## Evaluation point within the tick

Phase 2 established that existing combat resolves before newly submitted commands are applied in a tick.

Phase 3 preserves that transaction boundary.

Recommended tick sequence:

1. if match is already terminal, reject submitted commands deterministically and return frozen world;
2. refresh existing Guard target state;
3. resolve combat intents and simultaneous damage/death;
4. interpret any King deaths and transition match outcome if required;
5. if the match remains active, process ordered commands;
6. derive post-command sovereign threat from the resulting board/combat state;
7. emit sovereign threat-transition events;
8. advance the fixed simulation tick.

If King death makes the match terminal during step 4, no later movement, targeting, Guard or other commands in that tick execute.

This ensures the decisive combat result cannot be overwritten by later same-tick orders.

## Sovereign transition events

Threat events are transition-based, not emitted every tick.

### `sovereign.threatened`

Emitted when a previously safe living King becomes threatened.

Minimum payload:

```ts
{
  type: 'sovereign.threatened';
  tick: number;
  faction: Faction;
  kingId: string;
  threateningUnitIds: readonly string[];
}
```

### `sovereign.relief`

Emitted when a previously threatened living King becomes safe.

Minimum payload:

```ts
{
  type: 'sovereign.relief';
  tick: number;
  faction: Faction;
  kingId: string;
}
```

No duplicate warning event is emitted while threat remains continuously active.

If the threatening-unit set changes while the King remains threatened, the authoritative `match.sovereigns` provenance updates, but Phase 3 does not require a new event unless threat changes from false to true or true to false.

A future UI/AI phase may add a dedicated provenance-change event if it proves useful.

## Sovereign defeat and match-ending events

### `sovereign.defeated`

Emitted exactly once for each King killed in the decisive combat tick.

Minimum payload:

```ts
{
  type: 'sovereign.defeated';
  tick: number;
  faction: Faction;
  kingId: string;
  byUnitIds: readonly string[];
}
```

`byUnitIds` should reuse or derive from the deterministic sorted kill provenance already available from combat resolution.

### `match.victory`

If exactly one King dies in a tick, the opposing faction wins.

Minimum payload:

```ts
{
  type: 'match.victory';
  tick: number;
  victor: Faction;
  defeatedFaction: Faction;
}
```

### `match.draw`

If both Kings die in the same simultaneous combat resolution, the match ends in a draw.

Minimum payload:

```ts
{
  type: 'match.draw';
  tick: number;
  defeatedKingIds: readonly string[];
}
```

The draw rule prevents object iteration order, event order or faction ordering from inventing a winner.

## Event ordering in the decisive tick

Combat truth remains primary.

For a lethal King tick, event ordering must preserve:

```text
attack.fired
unit.damaged
unit.killed
sovereign.defeated
match.victory | match.draw
```

Within an event category, existing deterministic ordering rules remain in force.

If both Kings die, both `sovereign.defeated` events are emitted before the single `match.draw` event.

## Same-tick edge cases

### King dies while already threatened

No `sovereign.relief` is emitted. Death supersedes threat state.

### Threatening unit dies while the King survives

If all valid threats disappear during combat, the post-combat/post-command sovereign evaluation may transition the King to safe and emit `sovereign.relief`.

### New command creates threat

A successful move or other command may place a unit into current attack capability against the opposing King.

The King becomes threatened in the tick-end sovereign state and `sovereign.threatened` is emitted, but that attacker cannot retroactively attack earlier in the same tick because Phase 2 combat already resolved.

### New command removes threat

A successful command that removes the last current attack capability against the King causes tick-end `sovereign.relief`.

## Terminal match semantics

Once `match.status !== 'active'`, the simulation world is terminal.

The decisive tick finishes with the terminal match state recorded. After that:

- combat does not resolve;
- Guard does not retarget;
- movement does not execute;
- attack orders do not alter targets;
- no future game-state mutation occurs;
- the fixed tick does not advance;
- the terminal world remains byte-stable across repeated post-match calls.

If commands are submitted after match end, each is rejected deterministically with reason `match_ended`.

A generic command rejection event is preferred so all current/future command kinds can share terminal behavior, for example:

```ts
{
  type: 'command.rejected';
  tick: number;
  sequence: number;
  unitId: string;
  commandType: SimCommand['type'];
  reason: 'match_ended';
}
```

Post-match rejection events do not mutate the frozen world.

Commands should retain the existing deterministic ordering by `(sequence, unitId)`.

## Replay and canonical snapshots

Canonical snapshots must include `match` state.

Equivalent initial worlds and equivalent ordered command histories must produce byte-equivalent:

- unit state;
- occupancy;
- combat state;
- match status;
- victor;
- `endedTick`;
- sovereign threat booleans;
- sorted sovereign threatening-unit provenance;
- ordered event streams.

Replaying beyond terminal state must preserve the same final world snapshot.

## World construction and compatibility

Phase 0/1/2 tests often build small worlds without both Kings. The Phase 3 implementation must avoid unnecessarily destroying those focused lower-layer fixtures.

Recommended approach:

- `createWorld` derives sovereign records for Kings that are present;
- full match fixtures use both Kings and activate normal victory semantics;
- focused unit tests without a complete sovereign pair may remain simulation-valid for geometry/combat helpers;
- `stepWorld` match-ending behavior should only apply where sovereign identity exists for the relevant faction.

If implementation simplicity strongly favors a complete `match` record in every world, missing Kings should be represented explicitly as absent/unbound sovereigns rather than incorrectly treated as already defeated.

The implementation plan must choose one typed representation and test it.

## Interaction with existing Phase 2 combat

Phase 3 must preserve:

- simultaneous intent collection;
- reciprocal lethal attacks;
- focus-fire aggregation;
- atomic death removal;
- Guard acquisition/leash behavior;
- movement-reassigned Guard anchors;
- positional damage modifiers;
- combat-before-new-commands transaction semantics.

The sovereign layer interprets `unit.killed` outcomes rather than replacing combat resolution.

## Threat helper architecture

Threat computation should be a pure renderer-independent simulation helper.

A likely decomposition is:

```text
combat.ts
  owns attack capability / range helpers

sovereign.ts
  discovers Kings
  derives threateningUnitIds
  derives next MatchState
  emits transition/outcome events

step.ts
  orchestrates the existing tick transaction
```

Do not import Phaser or UI concerns into this layer.

## Acceptance test matrix

Phase 3 is not complete until automated tests prove at least the following.

1. Safe King becomes threatened and emits exactly one `sovereign.threatened`.
2. Continuously threatened King emits no duplicate threat event.
3. Threatened King becomes safe and emits exactly one `sovereign.relief`.
4. Threat provenance contains sorted deterministic enemy IDs.
5. A geometrically aligned but out-of-combat-range enemy does not create sovereign threat.
6. A command-created attack capability appears in tick-end sovereign state without same-tick retroactive damage.
7. A dead threatening unit is absent from tick-end provenance.
8. Single King death emits `unit.killed`, then `sovereign.defeated`, then one `match.victory` in deterministic order.
9. Victory records `victor` and `endedTick` correctly.
10. Simultaneous King deaths emit two sovereign defeats and exactly one draw.
11. Simultaneous King death result is independent of unit insertion/iteration order.
12. No `sovereign.relief` is emitted for a King that dies while threatened.
13. Commands submitted in the decisive tick after terminal combat do not execute.
14. Post-match movement is rejected with `match_ended`.
15. Post-match attack orders are rejected with `match_ended`.
16. Terminal world does not advance ticks.
17. Repeated post-match stepping does not mutate terminal state.
18. Decisive multi-tick replay is byte-equivalent across two runs.
19. Phase 2 reciprocal combat tests remain green.
20. Phase 1 movement geometry and threat-map tests remain green.

## Phase 3 exit gate

Phase 3 is complete only when:

- King death has deterministic match meaning;
- simultaneous King death cannot produce an ordering-dependent winner;
- real-time sovereign threat is authoritative and provenance-bearing;
- threat events are transition-based;
- decisive event ordering is stable;
- terminal match state freezes simulation truth;
- post-match commands reject deterministically;
- replay snapshots include sovereign/match truth;
- all lower-phase tests remain green;
- CI test and typecheck verification pass on the final head.

## Deferred boundary

The next canonical phase remains Phase 4:

- Crown Power economy;
- seven capture nodes;
- annexation;
- node-count unit unlock progression;
- production queues;
- reinforcement pulses;
- Command Capacity and hard caps;
- Pawn promotion where appropriate to progression rules.

Phase 3 must not pre-implement those systems.
