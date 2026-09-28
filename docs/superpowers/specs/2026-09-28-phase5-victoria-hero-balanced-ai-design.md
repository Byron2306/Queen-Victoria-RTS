# Phase 5 Victoria Hero + Balanced AI Design Specification

**Status:** APPROVED

**Date:** 2026-09-28

**Repository:** `Byron2306/Queen-Victoria-RTS`

**Phase:** 5

## Purpose

Phase 5 gives the simulation its first true commander layer.

It introduces two tightly related systems:

1. **Queen Victoria as a persistent Warcraft III-style hero/commander** with levels, XP, four named abilities, death/respawn state, and replay-stable lifecycle truth.
2. **One fair deterministic balanced AI commander** that understands sovereign danger, territory, economy, formations, pressure, recruitment, and hero abilities without hidden information or cheating.

The design goal is not to create a raid-boss hero or a search-heavy chess engine. Victoria should amplify good army play and positional decisions. The AI should look intentional, not omniscient.

The player still wins by constructing the strongest position.

## Authority and compatibility

Phase 5 sits on the verified Phase 0-4 simulation:

- Phase 2 remains authoritative for simultaneous combat, damage, kills, Guard, cooldowns, and positional combat provenance.
- Phase 3 remains authoritative for King defeat, sovereign outcome, terminal freezing, and threat truth.
- Phase 4 remains authoritative for nodes, Crown Power, recruitment, reinforcement pulses, Command Capacity, piece caps, promotion, and economy receipts.
- Hero and AI state are deterministic simulation state and therefore replay-visible.
- Existing lower-phase fixtures remain valid. A world with no explicitly bound hero or no enabled AI commander must behave exactly as before apart from carrying inert Phase 5 state.

Where this spec conflicts with older Phase 0-7 tuning anchors in the canonical game design, **this approved Phase 5 spec wins for Phase 5 behavior**. In particular:

- Victoria respawns after **120 ticks** with **no Crown Power cost**, rather than the older 100 Crown / 20-second anchor.
- XP is earned from **nearby enemy deaths only** in Phase 5, not nodes, Crown Node capture, or King defence.
- Sovereign Line unlocks at **Level 3** and Level 4 improves ability values.
- Hero abilities are **cooldown-only** in Phase 5 and do not spend Crown Power.

Those rulings are deliberate simplifications for the first playable hero/AI layer.

---

# Part I: Hero model

## Explicit hero binding

A `queen` unit is not automatically a hero merely because it exists. Existing tests and lower-layer fixtures may use queen pieces without wanting hero lifecycle semantics.

Phase 5 therefore introduces explicit hero binding per faction.

A full match binds exactly one hero per participating faction:

- Victoria faction hero: Queen Victoria.
- Obsidian faction hero: a mechanically mirrored commander for balance. Name, art, and personality identity are deferred to later presentation/persona work.

The model must support an unbound hero state so lower-phase fixtures remain valid.

Recommended construction surface:

```ts
createWorld(units, {
  heroIds?: Partial<Record<Faction, string>>,
  aiFactions?: readonly Faction[],
})
```

The options argument is optional. Existing `createWorld(units)` callers remain unchanged.

## HeroState

Each faction owns authoritative hero metadata independent of the transient unit/combat registries.

Conceptually:

```ts
type HeroStatus = 'unbound' | 'alive' | 'respawning' | 'ready_to_respawn';

type HeroAbilityId =
  | 'royal_decree'
  | 'hold_the_crown'
  | 'sovereign_line'
  | 'imperial_gambit';

type HeroAbilityState = Readonly<{
  cooldownTicksRemaining: number;
  activeTicksRemaining: number;
}>;

type HeroState = Readonly<{
  heroUnitId: string | null;
  status: HeroStatus;
  level: 1 | 2 | 3 | 4 | 5;
  xp: number;
  respawnTicksRemaining: number;
  activeAbility: HeroAbilityId | null;
  abilities: Readonly<Record<HeroAbilityId, HeroAbilityState>>;
}>;
```

`WorldState` gains:

```ts
heroes: Readonly<Record<Faction, HeroState>>;
```

## Hero unit identity

The bound hero remains a normal `UnitState` with `kind: 'queen'` while alive.

That means:

- normal combat can target and damage the hero;
- normal occupancy and movement rules apply;
- normal `unit.damaged` and `unit.killed` events remain authoritative;
- hero-specific state does not fork or replace the combat system.

When dead, the hero's unit/combat entries are absent, but the `HeroState` retains identity, XP, level, respawn state, and cooldowns.

On respawn, the **same unit ID** returns.

## Initial combat profile

Phase 5 does not create a separate base combat stat table for heroes.

A bound hero uses the existing Phase 2 `queen` combat profile as its base profile:

- max health 180;
- damage 16;
- base cooldown 10 ticks;
- range 4;
- acquisition range 6;
- leash range 6.

Hero abilities derive temporary modifiers from this profile rather than mutating the canonical profile table.

---

# Part II: Hero progression

## Levels

Victoria and the mirrored enemy hero have exactly **5 levels**.

Initial total-XP thresholds are:

| Level | Total XP required |
|---|---:|
| 1 | 0 |
| 2 | 40 |
| 3 | 100 |
| 4 | 180 |
| 5 | 280 |

These are tuning constants but are authoritative for the Phase 5 implementation.

Level-ups do not heal the hero and do not reset cooldowns.

## XP radius

A living hero gains XP from enemy deaths within a **Chebyshev radius of 5 tiles** from the hero's pre-combat position.

This is commander XP, not last-hit XP:

- the hero does not need to deal damage;
- the hero does not need to be the killer;
- XP is awarded once per defeated enemy;
- only combat-authoritative `unit.killed` events create XP.

## XP values

Initial XP values:

| Defeated unit | XP |
|---|---:|
| Pawn | 10 |
| Knight | 18 |
| Bishop | 18 |
| Rook | 28 |
| Queen / hero | 40 |
| King | 0 |

King death ends the match and produces no hero XP.

## Simultaneous hero death and XP

Combat is simultaneous. Therefore a hero that dies in the same combat resolution as nearby enemies still receives XP for those deaths if it was alive at the start of that combat resolution and was within radius 5 of the defeated units' pre-removal positions.

This is not posthumous farming. It represents outcomes from the same battlefield instant.

## Ability unlock progression

Approved unlock schedule:

- **Level 1:** Royal Decree.
- **Level 2:** Hold the Crown.
- **Level 3:** Sovereign Line.
- **Level 4:** improved values for the three unlocked abilities.
- **Level 5:** Imperial Gambit.

---

# Part III: Ability command model

## Ability commands

Hero ability use enters the deterministic command stream through a typed command such as:

```ts
type HeroAbilityCommand = Readonly<{
  type: 'hero_ability';
  sequence: number;
  issuedTick: number;
  faction: Faction;
  heroId: string;
  ability: HeroAbilityId;
}>;
```

Hero abilities spend **no Crown Power** in Phase 5.

They are controlled by:

- level unlock;
- cooldown;
- hero alive state;
- formation requirements where applicable;
- the one-active-ability rule below.

## One active ability at a time

To keep Phase 5 readable and avoid first-pass modifier explosion, a hero may have only **one timed active ability at a time**.

Attempting to activate another timed ability while one is active is rejected.

This is a deliberate MVP simplification. Later balancing may allow combos, but Phase 5 does not require stacking rules between named hero abilities.

## Common rejection reasons

Ability activation can reject for deterministic reasons including:

- `match_ended`;
- `hero_unbound`;
- `hero_not_alive`;
- `wrong_hero`;
- `locked_level`;
- `cooldown_active`;
- `ability_active`;
- `formation_missing` for Sovereign Line.

Rejected ability commands do not mutate state.

## Ability timing

Hero ability commands are processed **after combat/hero-death interpretation and before ordinary move/attack/recruit/promote commands**.

Therefore an ability cast on tick `T` cannot change combat that already resolved on tick `T`.

Its first combat effect is on tick `T + 1`.

Newly activated duration/cooldown counters are written at their full configured values on tick `T`; the hero lifecycle step must **not** decrement a counter that was created on that same tick. Their first decrement occurs on tick `T + 1`. This prevents a 40-tick effect from silently becoming a 39-tick effect.

This preserves the established Phase 2 rule that combat resolves before newly issued commands.

---

# Part IV: Victoria ability kit

## 1. Royal Decree

**Role:** offensive command aura.

### Level 1-3 values

- duration: **40 ticks**;
- cooldown: **120 ticks**;
- radius: **4 tiles Chebyshev** around the hero;
- allied outgoing damage: **+15%**;
- Guard acquisition range: **+1** while affected;
- Guard leash range: **+1** while affected.

The approved phrase "movement/combat responsiveness" is represented in the current simulation by increased Guard acquisition/leash responsiveness. Phase 0-4 have no movement-speed scheduler, so Phase 5 does not invent one solely for this buff.

### Level 4 improvement

At Level 4:

- radius increases to **5**;
- allied outgoing damage becomes **+20%**;
- Guard acquisition/leash bonuses remain +1.

Damage uses deterministic integer arithmetic and follows the existing positional-damage convention: apply the percentage modifier and floor to an integer.

Royal Decree can affect the hero itself if it is within its own aura, as well as other friendly living combat units.

## 2. Hold the Crown

**Role:** defensive anchor.

### Level 2-3 values

- duration: **30 ticks**;
- cooldown: **140 ticks**;
- radius: **4 tiles Chebyshev**;
- hero incoming damage: **-50%**;
- nearby allied incoming damage: **-20%**;
- affected Guard units receive **+2 leash range**;
- the hero cannot move while the ability is active.

A move command for the anchored hero rejects with a dedicated reason such as `hero_anchored`.

The hero may continue attacking and receiving attack orders while anchored.

Damage reduction uses deterministic integer arithmetic with a minimum of 1 damage for any non-zero incoming attack.

### Level 4 improvement

At Level 4:

- nearby allied incoming damage reduction becomes **-25%**;
- hero self-reduction remains -50%;
- duration/radius/cooldown remain unchanged.

## 3. Sovereign Line

**Role:** formation and chess-geometry amplifier.

### Unlock and activation requirement

Unlocked at **Level 3**.

Activation requires at least **two other friendly living units** within 5 tiles that are already aligned with the hero along a valid chess line:

- same rank;
- same file;
- same diagonal.

If no qualifying formation exists, activation rejects with `formation_missing`.

### Level 3 values

- duration: **50 ticks**;
- cooldown: **160 ticks**;
- maximum line distance from hero: **5 tiles**;
- qualifying allied units gain **+1 attack range**;
- qualifying allied units gain **+10% outgoing damage**.

The formation is evaluated dynamically while active. A unit that leaves all qualifying lines loses the bonus; a unit that enters a qualifying line gains it.

No new projectile line-of-sight subsystem is introduced. "Line" means chess alignment with the hero, not raycast visibility.

### Level 4 improvement

At Level 4:

- outgoing damage becomes **+15%**;
- +1 attack range remains unchanged.

## 4. Imperial Gambit

**Role:** high-risk Level 5 all-in ultimate.

Unlocked at **Level 5**.

- duration: **35 ticks**;
- cooldown: **300 ticks**;
- radius: **5 tiles Chebyshev**;
- nearby allied outgoing damage: **+30%**;
- affected attack cooldown reload is **25% shorter**;
- hero incoming damage is **+30%** while active.

Cooldown reduction applies when a new attack cooldown is loaded during the effect. Existing remaining cooldown is not retroactively rescaled.

Reload calculation uses deterministic integer arithmetic:

```text
max(1, floor(baseCooldownTicks * 0.75))
```

The offensive aura includes the hero.

Imperial Gambit does not change the hero respawn duration if the hero dies.

---

# Part V: Hero effect composition

## Interaction with positional damage

Hero modifiers do not replace positional combat bonuses.

The combat layer remains authoritative and applies deterministic modifiers in a fixed order:

1. base unit damage;
2. existing Phase 2 positional bonus;
3. active hero outgoing modifier;
4. defender-side hero damage reduction or Imperial Gambit vulnerability;
5. floor/minimum integer normalization.

The one-active-ability rule means a single hero cannot stack Royal Decree, Sovereign Line, and Imperial Gambit on its own army at once.

Opposing hero effects may still interact because each faction has independent hero state.

## Derived effects, not profile mutation

Named ability effects are derived from authoritative hero/world state at combat evaluation time.

Do not permanently mutate `UNIT_COMBAT_PROFILES` or stored base unit statistics.

This is necessary for deterministic expiry, replay truth, and clean death/respawn behavior.

---

# Part VI: Hero death and respawn

## Defeat

When a bound hero dies:

1. Phase 2 combat emits ordinary `attack.fired`, `unit.damaged`, and `unit.killed` truth first.
2. Phase 5 emits `hero.defeated` after those combat events.
3. hero unit/combat entries remain removed as normal.
4. hero state transitions to `respawning`.
5. `respawnTicksRemaining` becomes **120**.
6. any active timed ability ends immediately.
7. level and XP persist.
8. ability cooldown values persist and continue counting down.

Hero death does **not** end the match.

The existing Phase 4 Queen kill Crown reward is the hero bounty. Do not create a second bonus payout for the same death.

## Cooldowns while dead

Ability cooldowns decrement once per active simulation tick while the hero is:

- alive;
- respawning;
- ready to respawn.

They do not advance after the match is terminal because terminal worlds remain frozen under Phase 3.

## Respawn countdown

The 120-tick timer decreases after combat and command/economy resolution as part of the hero lifecycle step. A timer created by `hero.defeated` on the current tick is not decremented on that same tick; its first decrement occurs on the following active tick.

When it reaches zero, the hero becomes eligible to return.

## Respawn location

Respawn uses the same deterministic faction reinforcement anchor and ring-search policy established in Phase 4.

The hero does not teleport into occupied space and does not displace another unit.

If no legal spawn tile is available when the timer reaches zero:

- state becomes `ready_to_respawn`;
- the timer remains zero;
- the sim retries on each subsequent active tick.

## Respawn state

On successful respawn:

- same hero unit ID;
- same faction;
- kind remains `queen`;
- full base queen health;
- normal default Guard stance;
- target is null;
- guard anchor equals respawn position;
- XP and level unchanged;
- ability cooldowns unchanged from their naturally elapsed values;
- active ability is null.

Respawn emits `hero.respawned`.

---

# Part VII: Hero lifecycle events

Phase 5 adds replay-visible event contracts conceptually equivalent to:

```ts
{ type: 'hero.xp_gained'; tick; faction; heroId; amount; defeatedUnitId; resultingXp }
{ type: 'hero.leveled'; tick; faction; heroId; fromLevel; toLevel; resultingXp }
{ type: 'hero.ability.activated'; tick; faction; heroId; ability; activeTicks; cooldownTicks }
{ type: 'hero.ability.rejected'; tick; faction; heroId; ability; reason }
{ type: 'hero.ability.expired'; tick; faction; heroId; ability }
{ type: 'hero.defeated'; tick; faction; heroId; respawnTicks }
{ type: 'hero.respawn.ready'; tick; faction; heroId }
{ type: 'hero.respawned'; tick; faction; heroId; position }
```

Transition events emit once per transition, not once per tick.

If a hero gains enough XP to cross multiple thresholds in one combat resolution, emit deterministic level transitions in ascending order or one deterministic summarized transition. The implementation plan must pick exactly one representation and test it. The recommended implementation is one `hero.leveled` event per crossed level in ascending order because it is easier to inspect and replay.

---

# Part VIII: Balanced AI commander

## Design principle

Phase 5 ships **one balanced AI brain**, not five AIs.

The four canonical archetypes remain future personality overlays on this shared brain:

- The Tactician;
- The Raider;
- The Fortress;
- The Gambler.

Phase 5 builds the common evaluator, legal-command generator, commitment model, and deterministic state they will later parameterize.

## Fair information

The AI uses only authoritative board state available under the MVP full-board-visibility rules.

It receives no:

- hidden Crown information unavailable to the player;
- future combat result;
- random prediction oracle;
- bonus Crown Power;
- reduced production costs;
- faster reinforcement pulses;
- extra Command Capacity;
- faster hero cooldowns;
- out-of-band command timing.

It uses the same legal command types and validators as human-issued simulation commands.

## Enablement

AI control is explicit per faction and disabled by default in generic lower-layer worlds.

A full single-player match enables the balanced commander for the Obsidian faction.

This prevents Phase 5 from silently changing Phase 0-4 fixtures.

---

# Part IX: AI cadence and commitment

## Evaluation cadence

The balanced AI evaluates strategic state every **10 simulation ticks**.

It does not continuously reconsider on every tick.

## Intention budget

At each evaluation, the AI may select at most **3 high-level intentions**.

Intentions are selected from:

- `defend_king`;
- `capture_node`;
- `reinforce_front`;
- `pressure_position`;
- `attack_king`.

Hero ability use competes within the same decision budget. It is not a free extra reaction channel.

## Low-level command budget

A single evaluation may schedule at most **6 concrete simulation commands** for the next tick.

This hard cap prevents the AI from behaving like a frame-perfect multi-handed operator even when one intention touches many units.

## Commitment window

Selected strategic intentions remain committed for **30 ticks** unless:

- the AI's King becomes threatened;
- the objective becomes invalid (for example, node already safely owned, target dead, or target no longer exists);
- the match ends.

A threatened King may interrupt any ordinary commitment immediately at the next AI evaluation point.

The AI still does not evaluate between cadence ticks.

This commitment window prevents oscillation and makes AI behavior legible to the player.

---

# Part X: AI strategic model

## Shared utility channels

The balanced commander reasons through explicit utility channels that later persona profiles can reweight:

- `kingSafety`;
- `nodeControl`;
- `formationValue`;
- `mobilityPressure`;
- `materialRisk`;
- `attackOpportunity`;
- `heroThreat`.

The common brain maps these into the five high-level intentions.

## Strategic priorities

The older canonical summary of **Expand, Exploit, Protect** remains valid:

- **Expand:** capture neutral/weak enemy nodes and improve territory.
- **Exploit:** pressure exposed enemy pieces, weak fronts, geometry opportunities, and sovereign openings.
- **Protect:** defend King, Crown Node, important territory, and vulnerable hero/fronts.

The five concrete intention types are the executable form of those three priorities.

## Emergency sovereign defence

If the AI King is currently threatened, `defend_king` receives emergency priority at the next evaluation.

Emergency priority does not grant an out-of-cadence reaction.

The AI may:

- attack threatening units;
- move defenders toward relevant positions;
- use Hold the Crown if the hero is alive and the conditions fit;
- recruit appropriate legal units if economy/queue rules allow.

It may not violate chess movement, occupancy, production, or combat timing to save the King.

## Node value

The AI values nodes using public deterministic facts including:

- Crown Node vs minor node;
- neutral, friendly, or enemy ownership;
- contested state;
- capture progress;
- distance from available units;
- local friendly/enemy force;
- whether control changes an unlock or capacity breakpoint.

No random preference is required in Phase 5.

## Material and local force

The AI may estimate local material using fixed public weights derived from unit class/capacity cost.

It should avoid suicidal pressure when local risk clearly exceeds expected positional gain, but the balanced profile is allowed to attack when local force advantage or enemy sovereign exposure creates a real opening.

Later archetypes will alter this risk tolerance.

---

# Part XI: AI tactical execution

## Two-layer model

The AI uses:

1. **Strategic layer:** choose up to three intentions.
2. **Tactical layer:** convert those intentions into ordinary legal commands.

No minimax, Monte Carlo tree search, neural planner, or deep search tree is required for Phase 5.

## Movement

For a unit assigned to an objective, the tactical layer considers currently legal chess-geometry destinations and scores them deterministically by useful progress toward that objective.

Useful factors may include:

- distance improvement toward objective;
- node-zone entry/retention;
- avoiding clearly dominated local squares;
- maintaining or creating current positional geometry;
- keeping defenders near a threatened sovereign.

Tie breaks must be deterministic, ultimately ending in coordinate order and unit ID rather than randomness.

## Attack selection

When multiple legal enemies are attractive, initial deterministic target priority is:

1. threatened enemy King opportunity;
2. enemy hero;
3. Rook;
4. Bishop/Knight;
5. Pawn;

Within the same class, prefer:

1. lower current health;
2. shorter distance;
3. lexicographically smaller unit ID.

This is a tactical preference, not permission to attack outside the Phase 2 combat rules.

## Recruitment

The balanced AI uses the same Crown Power, unlocks, Command Capacity, piece caps, FIFO queue, and reinforcement pulse rules as the player.

The initial balanced profile aims for a mixed army rather than a hard-coded persona composition.

It should prefer filling missing tactical roles over repeatedly queueing the same legal unit simply because it can afford it.

## Promotion

The AI may issue ordinary promotion commands when a Pawn is promotion-eligible and the resulting piece is legal under unlock/capacity/cap rules.

Balanced preference is contextual rather than fixed:

- Rook for durable file pressure/defence;
- Bishop for line pressure;
- Knight for mobility/disruption.

Deterministic tie-breaking is required.

---

# Part XII: AI hero use

The balanced AI uses the same hero ability command and cooldown rules as the player.

It does not search every possible cast combination.

Initial deterministic cast heuristics:

## Royal Decree

Consider when:

- committing an attack or node contest;
- at least two useful nearby allies will benefit;
- hero is alive and ability legal.

## Hold the Crown

Consider when:

- defending a threatened King;
- defending a contested/important node;
- hero is under concentrated local pressure.

## Sovereign Line

Consider only when:

- a qualifying line formation already exists;
- enough units benefit to justify spending the cooldown.

The AI does not rearrange an entire army solely to make the ability technically castable in the current evaluation.

## Imperial Gambit

Consider only when both are true:

- local offensive advantage is already favourable;
- enemy sovereign exposure or decisive territorial pressure justifies the increased hero risk.

The AI must not cast Imperial Gambit merely because it is off cooldown.

---

# Part XIII: AI delayed action semantics

AI evaluation happens late in the tick after the board has resolved combat, commands, economy, reinforcement, and hero respawn for that tick.

The AI-generated concrete commands are stored in authoritative AI state and become eligible for execution on the **next simulation tick**.

This prevents the AI from seeing post-resolution truth and acting inside the same tick before a human could reasonably react.

Conceptually:

```ts
type AICommanderState = Readonly<{
  enabled: boolean;
  profile: 'balanced';
  nextEvaluationTick: number;
  commitments: readonly StrategicCommitment[];
  pendingCommands: readonly SimCommand[];
  nextCommandOrdinal: number;
}>;
```

`WorldState` gains deterministic AI state for both factions, with generic fixtures disabled by default.

AI commands use the same validators and event receipts as external commands when they execute.

---

# Part XIV: Phase 5 tick order

For an active match, Phase 5 orchestration is:

1. terminal guard;
2. merge AI commands scheduled on the previous tick with current external commands;
3. Guard refresh;
4. combat resolution;
5. sovereign outcome interpretation;
6. if terminal, stop;
7. hero defeat interpretation and nearby-death XP/level transitions;
8. process hero ability activation commands;
9. process ordinary move/attack commands;
10. evaluate node control;
11. apply Crown income;
12. apply kill rewards;
13. process recruitment commands;
14. process promotion requests;
15. reinforcement deployment;
16. promotion resolution;
17. hero cooldown/active-duration/respawn lifecycle;
18. hero respawn attempt;
19. AI evaluation if this is a cadence tick, scheduling commands for the next tick only;
20. sovereign threat evaluation;
21. advance simulation tick.

Important consequences:

- newly activated abilities cannot affect combat that already happened;
- newly respawned heroes cannot attack retroactively;
- newly generated AI commands cannot execute until the next tick;
- a King death still short-circuits all later Phase 5 systems on the decisive tick;
- terminal worlds remain frozen exactly as Phase 3 requires.

---

# Part XV: Ordering details and edge cases

## Hero dies while an ability is active

Event order:

```text
attack.fired
unit.damaged
unit.killed
hero.defeated
[hero XP/level events from same combat resolution, if any]
```

The active ability ends as part of the hero defeat state transition. Defeat-caused cancellation does **not** emit `hero.ability.expired`; `hero.defeated` is the single transition receipt. Ordinary natural duration expiry emits `hero.ability.expired`.

## Hero dies and King dies in same combat resolution

The King outcome remains authoritative.

If King defeat makes the match terminal, Phase 5 must not schedule a future hero respawn or continue AI/economy processing after the sovereign outcome gate.

Combat events still remain intact.

## Both heroes die simultaneously

Both hero defeats may be recorded deterministically in fixed faction order after combat, provided the match remains active.

Each keeps independent XP/cooldown/respawn state.

## Hero reaches multiple levels from one combat resolution

Apply XP once per qualifying killed unit in deterministic killed-event order, then emit resulting level transitions in ascending level order.

No level-up heal occurs.

## Respawn blocked for many ticks

`hero.respawn.ready` emits once when the timer first reaches zero and no legal tile exists.

Repeated blocked retries do not repeat that event.

`hero.respawned` emits once when a tile finally becomes available.

## Ability expires while hero is dead

Active abilities are cancelled immediately on defeat, so active-duration countdown never persists through death.

Cooldown countdown does persist.

## AI objective invalidates before 30 ticks

At the next 10-tick evaluation, invalid commitments may be replaced.

The AI does not perform an out-of-cadence emergency rethink merely because a node changed ownership.

The sole urgency override is increased priority at the next cadence point when its King is threatened.

---

# Part XVI: Replay and canonical truth

`canonicalSnapshot()` must include normalized Phase 5 state:

## Hero truth

For each faction:

- bound hero ID;
- status;
- level;
- XP;
- respawn ticks remaining;
- active ability;
- every ability cooldown;
- every ability active duration.

## AI truth

For each faction:

- enabled/profile;
- next evaluation tick;
- current commitments in deterministic order;
- pending commands in deterministic command order;
- next command ordinal.

Collections and provenance arrays must be explicitly sorted where order is not otherwise semantically meaningful.

No wall-clock, renderer, animation, random seed, browser timing, or UI state belongs in the canonical simulation snapshot.

Two equivalent command histories must serialize byte-identically.

---

# Part XVII: Events and observability

Phase 5 should expose enough typed receipts to explain why a hero or AI action happened without logging private internal thought traces.

Recommended AI observability events:

```ts
{ type: 'ai.evaluated'; tick; faction; selectedIntentions }
{ type: 'ai.commitment.started'; tick; faction; intention; objectiveId }
{ type: 'ai.commitment.ended'; tick; faction; intention; reason }
{ type: 'ai.command.scheduled'; tick; faction; commandType; executeTick; actorId }
```

These are operational receipts, not verbose reasoning dumps.

The AI does not need to persist every rejected candidate score in `WorldState`.

---

# Part XVIII: Four later AI archetypes

The following are **canonical but deferred from Phase 5 implementation**:

- **The Tactician:** increases formation/geometry value, patience, and trade efficiency.
- **The Raider:** increases mobility pressure, Knight preference, and weak-node harassment.
- **The Fortress:** increases King/node defence, Rook preference, and risk aversion.
- **The Gambler:** increases attack opportunity, Queen pressure, and willingness to trade material for tempo.

Phase 5 must not hard-code behavior in a way that prevents these from becoming profile-weight changes over the shared evaluator.

Phase 5 implements only the **balanced** profile.

---

# Part XIX: Out of scope

Phase 5 does **not** implement:

- Phaser rendering or HUD;
- animations;
- sound;
- named/art-directed enemy hero identity;
- all four persona profiles;
- difficulty levels;
- fog of war;
- hidden information;
- AI cheating;
- deep search/minimax/MCTS;
- random personality variance;
- online multiplayer;
- hero items/inventory;
- multiple heroes per faction;
- Crown-cost hero abilities;
- hero resurrection purchases;
- ability combo/stacking system;
- new movement-speed scheduler;
- Phase 6 UI/input surfaces.

---

# Part XX: Acceptance matrix

Phase 5 is complete only when the implementation proves all of the following.

## Hero binding/state

1. Generic worlds with no hero configuration remain valid and inert.
2. Explicit Victoria/Obsidian hero IDs bind deterministically.
3. Bound heroes use ordinary queen unit/combat state while alive.
4. Lower-phase queen fixtures are not silently converted into respawning heroes.

## XP and levels

5. Nearby enemy death within Chebyshev 5 grants the exact unit XP value.
6. Death outside radius grants no XP.
7. King death grants no XP.
8. XP does not require hero last hit.
9. A hero dying in the same combat resolution still receives qualifying same-resolution XP.
10. Level thresholds 40/100/180/280 resolve deterministically.
11. Level-up does not heal or reset cooldowns.
12. Multiple level crossings emit deterministic ascending transitions.

## Ability legality

13. Locked abilities reject before required level.
14. Cooldown-active ability rejects.
15. Dead/unbound/wrong hero rejects.
16. A second timed ability rejects while another is active.
17. Sovereign Line rejects without at least two qualifying aligned allies.
18. Ability activation never changes combat earlier in the same tick.

## Royal Decree

19. Level 1-3 Royal Decree lasts 40 ticks, cooldown 120, radius 4, +15% damage.
20. Guard acquisition/leash receive +1 while affected.
21. Level 4 upgrades radius to 5 and damage to +20%.
22. Expiry removes all derived Royal Decree effects without mutating base profiles.

## Hold the Crown

23. Hero cannot move while active but may attack.
24. Hero receives 50% incoming reduction.
25. Nearby allies receive 20% incoming reduction before Level 4 and 25% at Level 4+.
26. Guard leash bonus is +2 while affected.
27. Damage never rounds a non-zero hit below 1.

## Sovereign Line

28. Same rank, file, and diagonal formations qualify.
29. Non-aligned nearby units receive no Line bonus.
30. Qualifying units gain +1 range.
31. Damage is +10% at Level 3 and +15% at Level 4+.
32. Formation membership updates dynamically as units move.

## Imperial Gambit

33. Locked until Level 5.
34. Duration 35 and cooldown 300 are exact.
35. Nearby allies receive +30% outgoing damage.
36. New attack cooldown reload is `max(1, floor(base * .75))`.
37. Existing cooldown is not retroactively shortened.
38. Hero incoming damage increases by 30%.
39. Hero death during Gambit still uses the normal 120-tick respawn.

## Death/respawn

40. Ordinary combat kill receipts precede `hero.defeated`.
41. Hero death does not end an otherwise active match.
42. Existing Phase 4 Queen kill reward pays once, not twice.
43. Respawn timer is exactly 120 ticks.
44. XP/level/cooldowns persist through death.
45. Cooldowns continue while respawning.
46. Active ability cancels on death.
47. Hero returns at full queen health using deterministic Phase 4 spawn search.
48. Blocked respawn becomes `ready_to_respawn` and retries without teleporting.
49. `hero.respawn.ready` emits once and `hero.respawned` emits once.
50. Respawned hero keeps the same ID.

## AI fairness/cadence

51. AI is disabled by default in generic worlds.
52. Enabled balanced AI evaluates only every 10 ticks.
53. It chooses no more than 3 high-level intentions per evaluation.
54. It schedules no more than 6 concrete commands per evaluation.
55. Scheduled commands cannot execute until the next tick.
56. AI receives no resource/cap/cooldown/rule advantages.
57. AI commands pass through the same move/attack/recruit/promote/ability validators as player commands.
58. Deterministic ties produce the same command schedule under reversed object insertion order.

## AI commitment/strategy

59. Valid commitment persists for 30 ticks rather than oscillating every evaluation.
60. Invalid objective may be replaced at the next evaluation.
61. Threatened King causes `defend_king` emergency priority at the next evaluation, not instantly between cadence ticks.
62. Balanced AI can select capture-node behavior.
63. Balanced AI can select reinforce-front behavior using ordinary economy/queue truth.
64. Balanced AI can pressure an exposed position when local advantage exists.
65. Balanced AI can schedule an enemy-King attack only through ordinary legal commands.

## AI hero use

66. Royal Decree requires useful nearby allied commitment.
67. Hold the Crown can be selected for sovereign/node defence.
68. Sovereign Line requires an already-valid formation.
69. Imperial Gambit requires favourable local pressure plus meaningful sovereign/territorial opportunity.
70. Hero ability use consumes the same 3-intention budget rather than bypassing cadence.

## Sovereign/terminal compatibility

71. King death still stops all later hero/AI/economy processing on the decisive tick.
72. Terminal worlds do not decrement hero cooldowns or respawn timers.
73. Terminal worlds do not perform AI evaluation or schedule new AI commands.
74. Hero death and King death in the same combat resolution do not weaken Phase 3 sovereign outcome semantics.

## Replay

75. Canonical snapshot includes complete normalized hero state.
76. Canonical snapshot includes complete normalized AI state.
77. Equivalent hero/AI histories produce byte-identical canonical snapshots and event streams.
78. Respawn, ability expiry, AI commitment, and pending-command state survive deterministic replay.

---

# Exit gate

Phase 5 is ready to graduate only when:

- all Phase 0-4 tests remain green;
- all Phase 5 hero tests are green;
- all Phase 5 balanced-AI tests are green;
- replay equivalence covers hero death/respawn, ability timing, AI cadence, and scheduled commands;
- deterministic reversed-insertion tests cover AI ties and simultaneous hero outcomes;
- TypeScript typecheck is clean;
- an acceptance receipt maps the 78 cases above to executable tests;
- an authoritative Termux/Vitest run verifies the final tree.

At that point Phase 6 may build the Phaser rendering/input/HUD vertical slice over a simulation that already knows how Victoria and the AI commander actually behave.
