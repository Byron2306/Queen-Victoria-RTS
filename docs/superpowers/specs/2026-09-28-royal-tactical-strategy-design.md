# Queen Victoria RTS → Royal Tactical Strategy

**Date:** 2026-09-28  
**Status:** APPROVED DESIGN  
**Working branch:** `phase6-runnable-battlefield-client`

## 1. Product identity

Queen Victoria is no longer primarily a real-time strategy game.

Its canonical genre is:

> **Royal Tactical Strategy**

In conventional genre terms, it is a **turn-based tactical strategy / tactical RPG hybrid** built around chess geometry, positional tactics, sovereign command, territory, reinforcement planning and hero abilities.

The player does not win by out-clicking the enemy.

The player wins by **out-commanding them**.

---

## 2. Visual authority

The existing GOD mockup remains the canonical visual authority.

The battlefield should read as a deliberate royal war tableau:

- Victoria's army advances visually from left toward right.
- The Shadow army faces and advances visually from right toward left.
- Units remain readable as opposing formations.
- The bottom HUD is a command deck, not part of the battlefield.
- Battlefield units must never disappear behind the bottom HUD.
- Command previews, highlights, lanes and tactical geometry should be legible before resolution.
- The UI should encourage inspection, planning and sequencing rather than rapid reaction.

The current ornate battlefield, status panels, ability rail and production panel remain valid assets and should be preserved where possible.

---

## 3. Canonical turn structure

The game runs in rounds.

Each round follows:

```text
ROUND N
│
├─ VICTORIA_COMMAND
│    ├─ inspect battlefield
│    ├─ select unit or hero
│    ├─ preview legal action
│    ├─ issue order
│    ├─ spend Royal Command
│    └─ optionally revise pending orders
│
├─ VICTORIA_RESOLVE
│    └─ resolve submitted orders deterministically
│
├─ SHADOW_COMMAND
│    └─ AI constructs its own bounded order sequence
│
├─ SHADOW_RESOLVE
│    └─ resolve through the same authoritative resolver
│
├─ REINFORCEMENT
│    ├─ Crown income
│    ├─ node income/control updates
│    ├─ production queue progression
│    ├─ reinforcement arrival
│    ├─ ability cooldown progression
│    ├─ status cleanup
│    └─ sovereign/victory checks
│
└─ ROUND N+1
```

The initial tuning target is:

> **4 Royal Commands per side per round**

This is a tuning value, not a permanent balance guarantee.

The purpose is to support tactical combinations without creating long, overloaded turns.

---

## 4. Royal Commands vs Command Capacity

These are separate concepts.

### Command Capacity

Existing Command Capacity remains an **army-size / fielding constraint**.

Example:

```text
Command Capacity: 12 / 16
```

It limits the amount of army strength that may be fielded or queued according to existing capacity weights and caps.

### Royal Commands

Royal Commands are the **per-turn action budget**.

Example:

```text
Royal Commands: 4 / 4
```

They determine how many meaningful tactical orders may be committed during a command phase.

These concepts must never be conflated in simulation or UI.

---

## 5. Order model

Player and AI actions become typed tactical orders.

Canonical family:

```ts
type TacticalOrder =
  | MoveOrder
  | AttackOrder
  | GuardOrder
  | AbilityOrder
  | RecruitOrder;
```

Each order must carry enough information to validate and resolve deterministically.

Typical shared fields may include:

```ts
interface TacticalOrderBase {
  orderId: string;
  faction: Faction;
  unitId?: string;
  issuedRound: number;
  commandCost: number;
}
```

Specific orders add their own target or payload.

Examples:

```ts
interface MoveOrder extends TacticalOrderBase {
  kind: 'move';
  unitId: string;
  destination: BoardPosition;
}

interface AttackOrder extends TacticalOrderBase {
  kind: 'attack';
  unitId: string;
  targetUnitId: string;
}

interface GuardOrder extends TacticalOrderBase {
  kind: 'guard';
  unitId: string;
  anchor: BoardPosition;
}

interface AbilityOrder extends TacticalOrderBase {
  kind: 'ability';
  unitId: string;
  abilityId: HeroAbilityId;
  target?: BoardPosition | string;
}

interface RecruitOrder extends TacticalOrderBase {
  kind: 'recruit';
  unitKind: RecruitableUnitKind;
}
```

The exact type shapes may evolve during implementation, but the architectural boundary is fixed:

> **Command phases create pending orders. Resolution mutates authoritative world state.**

---

## 6. Pending orders and authority boundary

During a command phase, choosing an order must not immediately mutate authoritative battlefield state.

Instead:

```text
input
  ↓
legality preview
  ↓
pending order
  ↓
pending sequence
  ↓
END TURN / COMMIT
  ↓
authoritative resolver
  ↓
new world state
```

This boundary gives the game:

- cancel before commit,
- order revision,
- deterministic replay,
- AI/player symmetry,
- clearer testing,
- safer UI previews,
- cleaner save/replay semantics.

Preview rendering must never become authoritative.

---

## 7. Resolution semantics

All committed orders resolve through one deterministic resolver.

The resolver owns:

- execution order,
- legality re-check,
- movement,
- occupancy,
- attacks,
- damage,
- deaths,
- guard reactions,
- hero ability effects,
- node interaction,
- sovereign consequences.

A submitted order may become invalid before it resolves.

Example:

- Unit A kills Unit B.
- A later order attempted to move Unit B.
- The later order is refused/skipped because the unit no longer exists.

The resolver must produce explicit resolution outcomes rather than silently corrupting state.

Typical result states:

```text
RESOLVED
REFUSED
SKIPPED
INTERRUPTED
```

Every outcome should be deterministic from the same starting world and order sequence.

---

## 8. Resolution order

Initial implementation should use a simple deterministic order sequence rather than initiative complexity.

Default rule:

> Orders resolve in the sequence in which they were committed.

This is easy to understand, replay and test.

If later balance work introduces speed, initiative or simultaneous classes of action, that must be an explicit future design change.

---

## 9. Movement and occupancy

Existing board geometry remains authoritative.

The existing exclusive occupancy rule remains:

> **One unit per logical cell.**

Movement legality must continue to use simulation geometry, not renderer coordinates.

Turn-based migration must not weaken:

- occupancy checks,
- legal destination generation,
- board bounds,
- faction ownership,
- unit movement semantics.

The renderer may animate resolved movement, but rendering cannot change legality.

---

## 10. Combat

Combat becomes resolution-driven rather than continuously ticking.

A unit attacks because an accepted tactical order or reaction permits it.

Existing combat profiles remain useful:

- health,
- range,
- damage,
- cooldown-related values where still relevant,
- stance information.

Real-time cooldown semantics should be migrated into round/turn semantics instead of deleted blindly.

Where a concept no longer makes sense in turn-based play, it should be mapped explicitly.

---

## 11. Guard

Guard remains a core order.

Turn-based Guard should behave as a defensive or reaction stance rather than a passive real-time leash.

Canonical intent:

- unit takes/maintains a guard anchor,
- threatens a defined nearby area,
- may react to enemy movement or attack according to deterministic rules,
- reaction behavior occurs during resolution,
- reaction limits must prevent infinite chains.

Exact reaction count and trigger geometry are balance parameters to establish during implementation.

---

## 12. Victoria

Victoria remains the battlefield hero and sovereign commander.

Her existing level/progression state remains:

- level,
- XP,
- alive/respawning state,
- health,
- ability state.

Her four canonical abilities remain:

1. **Royal Decree**
2. **Hold the Crown**
3. **Sovereign Line**
4. **Imperial Gambit**

They become turn-based tactical actions.

Abilities may consume:

- a Royal Command,
- Crown Power,
- or both,

depending on their final balance.

Ability use must remain deterministic and evidence-bound through the same order/resolution path as other actions.

---

## 13. Chess-derived tactical language

Chess concepts become actual gameplay mechanics rather than decorative labels.

### Knight Fork

A Knight creates a fork when, after resolution, it threatens two qualifying enemy targets.

Possible rewards may include tactical bonuses, Crown gain, or UI recognition.

### Open File

A Rook benefits when a relevant orthogonal lane is unobstructed according to board geometry.

### Royal Alignment

Friendly pieces gain a positional benefit when configured in a qualifying formation involving Victoria, sovereign lanes or controlled geometry.

### Sovereign Line

Victoria exploits or projects power through a valid friendly line or formation.

These mechanics must be derived from authoritative geometry.

The renderer may visualize them, but must not decide whether they exist.

---

## 14. Crown Power

Crown Power remains a strategic resource.

Sources may include:

- kills,
- positional kill bonuses,
- node ownership,
- round income,
- tactical achievements.

Uses may include:

- hero abilities,
- recruitment,
- special tactical actions.

Current economy values should be preserved initially unless the turn model requires mechanical remapping.

Balance tuning comes after the turn architecture is verified.

---

## 15. Territory and nodes

The seven-node royal-cross board structure remains canonical.

Node control continues to influence:

- economy,
- unlocks,
- battlefield advantage,
- command capacity where currently defined.

Existing unlock progression remains conceptually valid:

```text
0–1 nodes → Pawns
2 nodes   → Knights
3 nodes   → Bishops
4 nodes   → Rooks
5+ nodes  → advanced access
```

Exact advanced-unit progression remains subject to later product design.

Node state should update during the reinforcement/end-of-round phase unless a specific tactical ability explicitly changes ownership earlier.

---

## 16. Production and reinforcement

Production is no longer a continuous real-time background process.

Recruitment becomes a strategic order/queue decision.

The existing production queue remains useful.

The reinforcement phase advances or resolves:

- queued recruitment,
- Crown costs,
- caps,
- command capacity,
- spawn legality,
- reinforcement timing.

Existing `REINFORCEMENT_PULSE_TICKS` must not simply survive unchanged.

Its meaning must be converted from real-time ticks into a round-based concept.

No silent five-second timer semantics should remain after the migration.

---

## 17. Shadow AI

The Shadow side uses the same tactical-order interfaces as the player.

AI must not directly mutate the world.

Architecture:

```text
world snapshot
   ↓
Shadow planner
   ↓
candidate legal orders
   ↓
bounded sequence within Royal Commands
   ↓
authoritative resolver
```

Initial AI may be simple and deterministic.

Priority should be correctness and tactical legibility before sophistication.

Potential initial priorities:

1. sovereign survival,
2. immediate attacks,
3. node capture/defense,
4. tactical bonuses,
5. reinforcement,
6. positional improvement.

---

## 18. Rendering and animation

The simulation remains renderer-independent.

The existing fixed-tick runtime may remain useful for:

- animation timing,
- interpolation,
- visual effects,
- UI transitions.

It must no longer define strategic game authority.

Turn resolution produces authoritative state changes.

The renderer then animates those results.

Conceptually:

```text
turn resolver
   ↓
authoritative resolution events
   ↓
animation queue
   ↓
Phaser presentation
```

Animation must never modify the authoritative result.

---

## 19. Unit facing

Faction orientation is visual only.

Canonical orientation:

```text
Victoria  →     ←  Shadow
```

Victoria-side units use their normal/right-facing presentation.

Shadow units are horizontally mirrored so they visually face left.

This must not modify:

- position,
- movement rules,
- collision,
- occupancy,
- selection geometry,
- combat range,
- attack legality.

Only presentation changes.

---

## 20. HUD exclusion band

The bottom HUD is not traversable visual space.

The GOD mockup establishes a clear lower command deck.

Units must remain visually readable above it.

The implementation should preserve logical simulation coordinates while reserving a presentation-safe lower band.

Requirements:

- lower battlefield unit silhouettes must not be hidden behind HUD panels,
- units move visibly across the battle lane,
- projection remains deterministic,
- interaction mapping still resolves correctly to logical cells,
- no simulation rule should depend on HUD pixel coordinates.

The preferred solution is a render/projection boundary rather than changing the logical board purely for UI reasons.

---

## 21. HUD semantics

### Top left

Victoria status:

- portrait,
- name,
- level,
- XP,
- health,
- status / respawn state.

### Top center

Strategic information:

- Crown Power,
- Nodes,
- Command Capacity,
- Royal Commands,
- Round / phase.

The old real-time `Wave` timer should be retired or reinterpreted once the reinforcement model becomes round-based.

### Top right

Shadow sovereign:

- portrait,
- Shadow King health,
- threatened/secure status,
- pause/settings.

### Bottom left

Selected unit or Victoria detail:

- unit name/type,
- health,
- stance,
- relevant combat stats,
- tactical state.

### Bottom center

Victoria abilities:

- Royal Decree,
- Hold the Crown,
- Sovereign Line,
- Imperial Gambit,
- readiness/cost/cooldown state.

### Bottom right

Deployment:

- costs,
- unlock status,
- cap,
- current fielded count,
- queue.

### Turn controls

The HUD must gain:

- Royal Commands remaining,
- pending-order sequence visibility,
- cancel/revise support,
- **End Turn / Commit Orders** action.

---

## 22. Input model

Touch-first input remains canonical.

Turn-based interaction simplifies input:

- tap/select unit,
- tap legal destination/target,
- preview order,
- confirm/order added,
- inspect pending orders,
- cancel/revise before commit.

Double-tap gestures may remain for centering or selection convenience, but tactical correctness must not require rapid gesture timing.

Mouse uses the same abstraction.

---

## 23. Save and replay

Turn-based architecture should strengthen deterministic persistence.

A save should contain enough information to restore:

- world state,
- current round,
- current phase,
- Royal Commands remaining,
- pending orders if saved mid-command phase,
- production queues,
- hero state,
- territory,
- economy,
- AI-relevant deterministic state.

Resolution sequences should be replayable from:

```text
starting world + committed order sequence
```

where practical.

---

## 24. Victory

Sovereign victory remains central.

King/base semantics remain authoritative.

The turn conversion must preserve:

- King identity,
- sovereign threat,
- defeat conditions,
- victory state.

Victory should be checked at deterministic phase boundaries and when a resolving action creates an immediate terminal condition.

No further orders should mutate a terminal match.

---

## 25. Migration strategy

The migration must not bulldoze the current working game.

### T0 — Turn-state foundation

Add:

- round number,
- phase enum,
- Royal Commands,
- pending order storage,
- phase transition rules.

No renderer behavior needs to change yet.

### T1 — Order queue

Introduce typed tactical orders and pending sequence management.

Add command-budget enforcement.

### T2 — Resolver

Create deterministic order resolution and explicit outcomes.

### T3 — Core actions

Convert:

- movement,
- attack,
- Guard

to tactical orders.

### T4 — Victoria and Crown

Convert hero abilities and Crown spending to order/resolution semantics.

### T5 — Shadow AI

Replace continuous AI authority with command-phase planning.

### T6 — Reinforcement phase

Convert:

- income,
- node processing,
- production,
- reinforcement,
- cooldown progression

to round-based semantics.

### T7 — Command HUD

Add:

- phase display,
- Royal Commands,
- pending orders,
- End Turn,
- tactical previews,
- turn-aware status text.

### T8 — GOD composition

Implement:

- HUD exclusion band,
- left-to-right Victoria presentation,
- right-to-left Shadow presentation,
- mirrored Shadow sprites,
- readable tactical battle lane.

### T9 — Chess tactics and balance

Implement and tune:

- Knight Fork,
- Open File,
- Royal Alignment,
- Sovereign Line interactions,
- command counts,
- Crown economy,
- production pacing,
- AI behavior.

---

## 26. Testing strategy

The migration remains test-driven.

Required test families include:

### Turn machine

- legal phase transitions,
- illegal transition refusal,
- round increment,
- command reset.

### Royal Commands

- budget decrements,
- no negative budget,
- rejected order does not silently consume budget unless intentionally designed,
- side-specific authority.

### Orders

- creation,
- validation,
- cancellation,
- ordering,
- commit behavior.

### Resolution

- deterministic results,
- occupancy conflicts,
- stale/dead unit orders,
- combat sequencing,
- terminal victory.

### AI

- uses same order path,
- respects budget,
- does not mutate world during planning.

### Reinforcement

- round-based income,
- production queue progression,
- caps,
- unlock requirements,
- spawn legality.

### Rendering

- authoritative state unchanged by animation,
- Shadow sprites face left,
- Victoria sprites face right,
- HUD exclusion band prevents unit/HUD overlap,
- resize preserves safe composition.

### Regression

Existing geometry, combat, sovereign, economy and client tests should be retained where their semantics still apply.

Tests that encode obsolete real-time behavior should be deliberately migrated, not silently weakened.

---

## 27. Non-goals for the first turn-based migration

Do not add during the architectural conversion:

- multiplayer,
- online matchmaking,
- procedural campaigns,
- fog of war,
- complex initiative systems,
- simultaneous hidden orders,
- new unit classes,
- elaborate cutscenes,
- networking authority,
- monetization systems.

The objective is to make the existing game a coherent, verified Royal Tactical Strategy game first.

---

## 28. Success criteria

The migration is successful when:

1. The player can complete a full Victoria turn using a bounded Royal Command budget.
2. Orders remain revisable before commit.
3. Committed orders resolve deterministically.
4. Shadow AI plans and resolves through the same order system.
5. Reinforcement, economy, nodes and abilities progress through explicit round phases.
6. The game no longer depends on real-time strategic ticking.
7. Existing board legality remains authoritative.
8. The GOD mockup composition is respected.
9. Units never disappear behind the bottom command deck.
10. Victoria and Shadow armies visibly face each other.
11. Tactical chess concepts become actual geometry-derived mechanics.
12. Save/replay state remains deterministic and testable.

---

## 29. Canonical statement

> **Queen Victoria is a Royal Tactical Strategy game where the player commands a sovereign army through short, deliberate turn sequences, combining chess-derived geometry, territorial control, Crown economy, reinforcement planning and Victoria's hero abilities to out-command the Shadow King.**
