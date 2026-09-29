# Queen Victoria Royal Tactical Game — The Royal War Triptych

**Date:** 2026-09-29  
**Status:** Design specification for review  
**Branch:** `phase12-playable-visual-integration`

## Thesis

Queen Victoria Royal Tactical Game is not chess with extra buttons and it is not an RTS wearing chess art.

It is a **mutable-territory war game expressed through chess-derived movement**, where players shape the battlefield itself across multiple strategic clocks.

Its central design principle is:

> **The strongest decision is often not the move that wins the immediate exchange, but the move that creates the battlefield you want to exist several rounds from now.**

The game deliberately attacks two forms of player autopilot:

- A chess veteran recognizes familiar movement skeletons, then discovers that attack is not capture, board polarity can change, territory matters, units persist and rank up, fortifications block lanes, and coordinated support can overpower nominal piece value.
- An RTS veteran recognizes economy, territory, infrastructure, fortification, veterancy and force composition, then discovers that all of those systems are constrained by forced chess geometry and a mutable black/white topology.

Neither audience gets to play entirely by inherited instinct. Both must think strategically.

---

# I. THE SHARED BATTLEFIELD SUBSTRATE

The Triptych rests on one battlefield model. The three doctrines later in this document are different ways of exploiting the same state.

## 1. Cross-shaped battlefield

The board is **not a perfect square**.

The battlefield should expand around the current unit scale, which is already considered correct. Tiles must remain large enough that pieces read as physical occupants of individual squares.

The map consists of:

- a broad central war theatre,
- lateral fighting lanes,
- a top sanctuary/nook containing the Shadow major node,
- a bottom sanctuary/nook containing the Victoria major node,
- minor nodes distributed through the contested central and flank spaces.

The major nodes should retain their current successful apparent scale and placement logic, but their source artwork must use real transparency rather than baked checkerboard backgrounds.

The board art and simulation geometry must become one system. Every playable tile must have a visible, physical board tile of the same logical identity. No hidden half-tiles or invisible sub-grid may remain.

## 2. Two independent tile-state layers

Every playable tile has two independent properties.

### A. Chess polarity

A tile is either:

- `black`
- `white`

This is not ownership.

### B. Faction control

A tile is either:

- `neutral`
- `victoria`
- `shadow`

Therefore all of the following are legitimate states:

- Victoria + black
- Victoria + white
- Shadow + black
- Shadow + white
- neutral + black
- neutral + white

Faction colouring must therefore be rendered as an overlay, trim, crest, illumination or other readable territorial treatment without erasing the underlying black/white identity.

## 3. Settlement and annexation

Passing over a tile does not annex it.

A piece creates territorial control by **settling**:

1. the piece ends the round on the tile,
2. the piece remains validly present through territorial resolution,
3. the tile becomes controlled by that piece's faction.

This creates a slow, visible creep of territorial control from both sides.

Faction control is a strategic logistics network, not merely a score colour.

## 4. Node supply rule

A node may only be captured if the capturing faction already owns at least one **orthogonally adjacent faction-controlled tile**.

Diagonal corner contact does not supply a node.

This forces players to build territorial approaches instead of parachuting a mobile piece onto an isolated objective and instantly claiming it.

Nodes therefore sit at the ends of supply-front geometry.

## 5. Fortifications

Fortifications are constructed battlefield objects.

Rules:

- a fortification may only be built on a tile controlled by the builder's faction,
- construction costs an action/order and an economic cost defined during balance tuning,
- the tile cannot already contain an incompatible blocking object,
- fortifications block movement through their occupied tile,
- fortifications are attackable,
- fortifications have discrete durability rather than disappearing after one hit,
- the first balance target is **3 durability**,
- each successful damaging attack removes durability according to the combat rules,
- at zero durability the fortification is destroyed and the tile becomes traversable again.

Faction territory therefore determines where infrastructure can exist.

## 6. Banner polarity warfare

Banners manipulate **chess polarity**, not faction ownership.

Any eligible deployed piece may spend an action/order to plant a banner on its current tile.

A banner:

- does not change faction control,
- has an owner faction,
- begins a two-round hold timer,
- can be contested by the enemy,
- if successfully defended for the required duration, flips the tile from black to white or white to black,
- completes its polarity mutation at the **next round boundary**, never midway through order resolution.

### Banner contest rule

A banner is not passively removed by proximity.

To contest it, an enemy piece must have a **legal move under the current authoritative movement graph** that lands on the banner's tile and successfully occupy that destination.

This means a player can use geometry and timing to make a banner difficult to contest.

A polarity change can therefore invalidate future movement routes.

Orders already legal and locked for the current round are not retroactively invalidated by a banner completing later in that same round. The changed board becomes authoritative for the next command phase.

## 7. Currency and army composition

The player does not receive an untouchable fixed classical chess army.

Currency, currently represented by Crown Power and related economy, is used to decide **what force to deploy**.

This means army composition is doctrine:

- numerous inexpensive units for territorial spread,
- mobile pieces for banner warfare,
- long-range pieces for support networks,
- expensive heavy pieces for siege and defense,
- mixed forces for resilience.

Deployment must become an explicit strategic purchase with readable costs, unlock requirements, valid deployment location, queue feedback and rejection reasons.

## 8. Military rank and persistent unit history

Every deployed piece accumulates combat history.

This is independent from chess-class promotion.

A unit stores at minimum:

- total kills,
- military rank,
- current combat modifiers derived from rank.

A pawn can therefore be a high-rank pawn. If later class-promoted, its military experience survives unless a specific rule explicitly says otherwise.

Initial rank ladder for balancing:

- Recruit: 0 kills
- Proven: 2 kills
- Veteran: 5 kills
- Elite: 9 kills
- Royal Guard / Dread Guard: 14 kills

Exact thresholds and bonuses are balance parameters, not immutable canon.

Rank may affect:

- attack effectiveness,
- survivability,
- fortification damage,
- reinforcement contribution,
- defensive support,
- selected special interactions.

Rank increases become authoritative at round boundaries.

If a ranked unit dies, its veterancy is lost. A newly deployed replacement begins fresh.

This turns unit survival into strategic capital.

---

# II. PANEL ONE — ASSAULT

**Doctrine:** temporary concentrated superiority through coordination, geometry and commitment.

Assault is not simply high damage. It is the deliberate concentration of multiple pieces into a single combat objective.

## 1. Attack is not capture

An `ATTACK` order means:

- the attacker remains on its current tile,
- combat resolves against the target,
- damage and other combat effects are applied,
- if the defender survives, it remains,
- if the defender dies, its tile becomes empty,
- the attacker does not automatically occupy the target tile.

This intentionally breaks the classical chess expectation that attacking and occupying are the same event.

The presentation must make the result unmistakable through damage feedback, health change, hit response, death removal and combat receipts.

## 2. Assault

An `ASSAULT` order means:

- the attacker commits to combat with intent to occupy,
- combat resolves first,
- if the defender survives, the attacker remains at origin,
- if the defender is destroyed and the destination remains legally occupiable, the attacker advances into the target tile,
- if occupancy becomes impossible because of a surviving blocker, fortification, rule or deterministic interruption, the attacker remains at origin.

Assault therefore exchanges positional safety for the chance to gain ground.

## 3. Reinforce

`REINFORCE` is battlefield support from an already-deployed friendly piece.

A unit may reinforce a friendly Attack or Assault when it has a legal attack relationship to the **same defender** under the current authoritative board state.

The supporting piece:

- spends its action/order,
- remains on its tile,
- does not perform an independent attack,
- contributes support pressure/effectiveness to the primary combat.

This is not an aura and not passive double-threat mathematics. The player explicitly commits the support unit.

## 4. Reinforcement chaining

Reinforcement may **chain**.

Example:

`Bishop -> Rook -> Knight -> ASSAULT -> target`

A support chain represents an operational network rather than every unit individually firing at the defender.

Every link must be legal under the support graph rules.

A chain can be disrupted before resolution if a required link becomes invalid through deterministic earlier actions, such as:

- displacement,
- death,
- line blockage,
- fortification,
- loss of required geometry,
- other defined interruption.

The assault may still resolve with whatever valid support remains.

## 5. Chain scaling

Reinforcement must not scale infinitely as raw additive damage.

Use a bounded support-pressure model with diminishing contribution by depth and/or a hard cap.

A starting conceptual curve is:

- direct support: 100% contribution value,
- second relay: 70%,
- third relay: 45%,
- fourth relay: 25%,
- deeper contribution: negligible or disallowed unless modified by an ability.

Veteran units may preserve support quality better than recruits.

The exact numbers belong to balancing tests.

## 6. Victoria ability interaction

Victoria's abilities should interact with reinforcement networks rather than sitting outside the strategic system.

Potential roles:

### Royal Decree

Amplifies coordination, such as increased reinforcement contribution or temporarily improved chain efficiency.

### Hold the Crown

Stabilizes a defensive/support network, fortification line or banner defense.

### Sovereign Line

Creates or strengthens a command conduit through aligned friendly pieces.

### Imperial Gambit

Allows exceptional offensive concentration at a meaningful cost or subsequent vulnerability.

The abilities should modify existing strategic verbs rather than inventing unrelated minigames.

## 7. Assault counterplay

Assault networks are powerful because they concentrate force, but fragile because they depend on connectivity.

The defender can answer by:

- breaking support links,
- changing movement topology through banners,
- blocking lanes with fortifications,
- killing high-rank support anchors,
- forcing support pieces to spend actions elsewhere,
- threatening nodes or economy outside the assault axis.

Assault power is therefore **temporary and coordinated**.

---

# III. PANEL TWO — BASTION

**Doctrine:** persistent accumulated superiority through preparation, veterancy, territory and denial.

Bastion is the answer to raw operational concentration.

## 1. The turtle is legitimate

A defensive player may intentionally:

- hold compact territory,
- create favorable kill zones,
- accumulate veteran ranks,
- place fortifications,
- protect banners,
- manipulate polarity around key pieces,
- force an attacker to spend multiple rounds and commands penetrating prepared ground.

This should be viable, not treated as bad play.

## 2. Persistent defensive value

Where Assault creates a temporary spike, Bastion accumulates value that persists across rounds:

- veteran units,
- controlled territory,
- fortifications,
- prepared movement geometry,
- defended nodes,
- favorable banner outcomes.

A max-rank defender on controlled terrain behind a fortification may therefore withstand an assault supported by multiple weaker units.

No single variable should guarantee the outcome. Combat derives from the combined strategic state.

## 3. Fortification as time purchase

A barricade is not merely extra HP.

Its real value is **time**.

If it requires several attacks to destroy, then each attacking order spent on the barricade is an order not spent on:

- annexing territory,
- contesting a banner,
- taking another node,
- repositioning a support chain,
- killing a veteran unit.

Fortifications therefore convert currency and territory into tempo denial.

## 4. Veterancy as deferred capital

A high-rank unit represents more than its original purchase price.

It embodies:

- currency originally spent,
- turns survived,
- kills earned,
- positions held,
- command opportunities invested.

Losing a veteran should hurt strategically even when the nominal chess piece values of an exchange look favorable.

This deliberately destroys simplistic classical material accounting.

## 5. Bastion counterplay

A turtle must not become an unbeatable solved state.

Its costs include:

- surrendered map tempo,
- potentially weaker node income,
- reduced territorial expansion,
- vulnerability to being surrounded,
- dependence on particular polarity geometry,
- concentration of value in veteran pieces and prepared positions.

The attacker may answer through:

- economic superiority,
- multiple fronts,
- banner-based topology attacks,
- siege-focused unit composition,
- cutting supply territory to nodes,
- forcing the defender to leave prepared ground.

Bastion power is therefore **persistent but geographically constrained**.

---

# IV. PANEL THREE — MANIPULATION

**Doctrine:** win by changing the future battlefield rather than overpowering the current one.

Manipulation is the most strategic doctrine because it attacks assumptions.

## 1. Territory manipulation

Settlement changes faction control.

Faction control determines at minimum:

- node capture eligibility,
- fortification construction eligibility,
- future deployment/reinforcement rules where adopted,
- visual front lines.

The player can therefore shape logistics without directly attacking.

## 2. Polarity manipulation

Banners change black/white identity after a defended delay.

This can alter future movement legality.

The important rule is that chess colour is **authoritative game state**, not decorative rendering.

If a movement rule depends on tile polarity, a completed banner flip may make a future route invalid.

This creates attacks on an opponent's **geometry**, not merely their units.

## 3. Banner timing

A banner is a delayed strategic threat.

When planted, it asks the opponent:

> Can you reach and contest this tile with a legal move before the next-round mutation becomes authoritative?

This creates battles before battles.

A well-placed banner may force:

- redeployment,
- a different unit purchase,
- abandonment of a support line,
- premature assault,
- diversion from a node.

## 4. Chess-piece consequences

The game should preserve recognizable movement skeletons while allowing the mutable board to influence legality according to explicit piece rules.

This must be designed carefully enough that players understand **why** a legal move disappeared.

Particularly interesting classes include:

- bishops, whose long diagonal identity naturally interacts with colour topology,
- knights, whose landing geometry can be strategically disrupted if destination polarity matters,
- rooks, whose corridor value interacts strongly with territory and fortification,
- pawns, which can become efficient annexation and creep-expansion units.

Any polarity-dependent movement restriction must be visible in the UI before the player commits an order.

## 5. Manipulation counterplay

Manipulation is slow.

It creates delayed advantage and can be answered before completion.

Counterplay includes:

- legally contesting banners,
- killing banner defenders,
- taking territory around the intended mutation,
- buying/deploying a piece class whose geometry can reach the threat,
- forcing combat before the topology change matures.

Manipulation power is therefore **delayed but structural**.

---

# V. THE EQUILIBRIUM

The game should not seek balance by making every option numerically equal.

It should seek a **dynamic equilibrium between doctrines**.

## Assault

Creates **temporary concentrated superiority**.

Strengths:

- coordinated breakthrough,
- tempo,
- force concentration,
- rapid node pressure.

Weaknesses:

- support-network fragility,
- command consumption,
- exposure after commitment,
- vulnerability to geometry disruption.

## Bastion

Creates **persistent accumulated superiority**.

Strengths:

- veteran power,
- prepared ground,
- fortification,
- attritional efficiency.

Weaknesses:

- surrendered map tempo,
- economic encirclement,
- expensive concentration,
- topology dependence.

## Manipulation

Creates **delayed structural superiority**.

Strengths:

- changes future movement possibilities,
- attacks logistics and geometry,
- can defeat stronger formations without direct confrontation.

Weaknesses:

- delayed payoff,
- visible setup,
- contestable banners,
- opportunity cost.

A strong game state may therefore contain all three at once:

- an Assault player building a reinforced chain,
- a Bastion player defending with elite ranked units and barricades,
- a Manipulation threat whose banner will flip a critical tile next round and invalidate part of the attack geometry.

The outcome emerges from preparation, timing and composition rather than one universal best tactic.

---

# VI. ROUND CLOCK AND AUTHORITY

All strategic mutations must resolve on a deterministic round clock.

Recommended authority order:

1. **Command phase**
   - choose movement,
   - attack,
   - assault,
   - reinforce,
   - build fortification,
   - plant banners,
   - use abilities,
   - queue deployment/promotion actions where legal.

2. **Order validation and lock**
   - legality is checked against the authoritative state for this round.

3. **Combat and movement resolution**
   - movement,
   - attacks,
   - assaults,
   - reinforcement-chain validation,
   - fortification damage,
   - deaths.

4. **Territorial resolution**
   - settlement/annexation,
   - node adjacency/capture,
   - banner contest state.

5. **Round-boundary mutation**
   - completed banners flip black/white polarity,
   - new tile topology becomes authoritative,
   - military rank thresholds are applied,
   - class promotions resolve where appropriate,
   - reinforcement/deployment queues resolve according to their rules,
   - economy/resources update.

6. **Next command phase**

Nothing should retroactively make a previously locked legal order illegal within the same round unless that order has an explicit deterministic interruption rule.

---

# VII. ATTACK, PROMOTION AND REINFORCEMENT REWORK

The current game needs clearer, more strategic versions of all three.

## Attack presentation requirements

Every resolved attack must visibly communicate:

- attacker,
- defender,
- attack type,
- support chain if any,
- damage dealt,
- remaining durability/health,
- death/destruction,
- whether an Assault advanced,
- interruption reason when an expected advance/support fails.

A red order line alone is insufficient.

## Promotion split

The game has two separate promotion concepts:

### Class promotion

Changes unit type/class under explicit game rules and cost/position prerequisites.

### Military rank

Changes the persistent experience/rank of the same unit based on kills and survival.

The UI must never conflate these.

## Reinforcement split

The word reinforcement can describe two very different systems and must remain unambiguous:

- **REINFORCE order:** deployed battlefield support for another unit's combat.
- **Deployment/replacement:** spending currency to add a new unit to the board.

The first is a combat relationship. The second is force generation.

---

# VIII. UI AND READABILITY CONTRACT

The game may deliberately surprise inherited chess/RTS expectations, but it must never hide its own rules.

The player should always be able to inspect:

- current tile polarity,
- current faction ownership,
- pending banner flip and turns remaining,
- legal movement under current topology,
- what will change next round,
- node supply eligibility,
- fortification durability,
- unit kills and rank,
- deployment price and reason for lock/refusal,
- Attack versus Assault distinction,
- reinforcement contributors and chain depth,
- projected combat outcome ranges where appropriate.

The game can be cruel. The interface cannot be dishonest.

Move highlights must cover the full physical tile geometry, not tiny decorative markers.

Pieces must be bound to the same board geometry used for movement, highlights, attacks, nodes and territorial state.

---

# IX. DESIGN GUARDRAILS

1. **No mechanic exists only because it sounds cool.** It must participate in the strategic ecosystem.
2. **No invisible strategic rule.** If polarity, supply, support or territory invalidates an action, the player must be able to see why.
3. **No unlimited reinforcement death stars.** Chaining is bounded through decay/caps and command cost.
4. **No unbeatable turtle.** Fortification and veterancy exchange map tempo and economy for persistent strength.
5. **No trivial banner spam.** Planting, defending and contesting must carry real opportunity cost.
6. **No free node teleport capture.** Territorial adjacency is mandatory.
7. **No retroactive topology traps.** Banner mutations become authoritative at round boundaries.
8. **No conflation of polarity and ownership.** Black/white and Victoria/Shadow remain separate state layers everywhere in simulation and UI.
9. **No automatic chess capture semantics.** Attack and Assault remain explicit separate verbs.
10. **No shrinking the pieces to solve geometry.** The battlefield expands to support proper full-size visible tiles.

---

# X. THE PLAYER QUESTION

The game should continuously move the player's thinking away from:

> What is the strongest move right now?

and toward:

> **What battlefield am I building for the next three rounds, and what battlefield is my opponent trying to force me to fight on?**

That is the Royal War Triptych:

**ASSAULT** concentrates power.  
**BASTION** accumulates power.  
**MANIPULATION** changes the conditions under which power can be used.

The player wins by knowing when to become each one.
