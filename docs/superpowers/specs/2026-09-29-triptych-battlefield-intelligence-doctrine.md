# Royal War Triptych — Battlefield Intelligence Doctrine

**Date:** 2026-09-29  
**Status:** LOCKED DESIGN ADDENDUM — user-approved concepts captured for preservation  
**Branch:** `agent/royal-war-triptych`

## Thesis

The Royal War Triptych does not use traditional perfect-information chess and does not use conventional black-screen RTS fog of war.

It uses **geometrically bounded battlefield intelligence**.

The player may always inspect and pan across the physical battlefield, but the truth occupying that battlefield is constrained by faction knowledge, piece geometry, controlled territory, nodes and fortifications.

The central principle is:

> **The board is always visible. The truth is not.**

This creates a deliberate equilibrium between chess omniscience and opaque RTS fog of war.

---

# I. CAMERA AND BATTLEFIELD NAVIGATION

The battlefield is intentionally too large to require the entire cross to fit on screen at once.

The current unit apparent scale remains authoritative. The board expands around that scale rather than shrinking units to fit the whole battlefield into one viewport.

The camera is free-roaming across the cross-shaped battlefield.

Expected controls may include:

- mouse or touch drag to pan,
- keyboard or directional controls to pan,
- optional edge pan,
- wheel or pinch zoom,
- single click/tap to select,
- center-on-selected convenience action,
- center-on-Victoria convenience action.

The camera may visit any part of the physical board regardless of faction vision. Camera reach is not information authority.

---

# II. FOUR INDEPENDENT TILE LAYERS

Every playable tile participates in four distinct battlefield layers.

## 1. Polarity

- `black`
- `white`

Polarity governs chess-derived topology and may be changed by successful banner operations.

## 2. Faction control

- `neutral`
- `victoria`
- `shadow`

Faction control represents territorial authority, settlement, infrastructure eligibility and supply relationships.

## 3. Visibility / intelligence

- `observed`
- `remembered`
- `unknown`

Visibility determines how current the player's information is.

## 4. Occupancy

Possible occupiers include:

- units,
- fortifications,
- banners,
- nodes,
- other future blocking or objective objects.

These layers are independent.

A tile may legitimately be:

`white + victoria-controlled + observed + occupied by a Royal Bastion`

or:

`black + neutral + remembered + containing a last-known Shadow Knight ghost`.

---

# III. INTELLIGENCE STATES

## 1. Observed

A tile is currently observed when faction intelligence is actively supplied by at least one valid source.

Observed tiles show current authoritative information, including where applicable:

- current polarity,
- current faction control,
- current enemy units,
- current banners,
- current fortifications and their visible damage state,
- current node state,
- current tactical effects that are meant to be public.

## 2. Remembered

A tile becomes remembered when it was previously observed but is no longer currently observed.

Remembered tiles retain **last-known information**, not current truth.

Stored last-known information may include:

- polarity,
- faction control,
- banner state,
- fortification state,
- node state,
- last-known enemy occupant,
- last-seen round.

Remembered information may become stale.

The UI should make stale intelligence readable without revealing whether it is still true.

## 3. Unknown

A tile is unknown when it has never been observed by that faction and is not covered by a permanent faction-control visibility rule.

The physical board remains visible.

Current hidden battlefield truth is not revealed.

Unknown terrain is not eligible for ordinary movement commitment unless a specific rule explicitly grants discovery/entry.

---

# IV. FACTION-CONTROLLED TERRITORY IS PERMANENTLY OBSERVED

A faction has full current visibility across its own controlled territory.

This is a core doctrine:

> **Your controlled universe is known to you.**

Faction-controlled tiles therefore provide persistent battlefield intelligence even when no mobile unit is nearby.

Consequences:

- settlement advances both territorial control and the permanent intelligence frontier,
- territorial creep is also information creep,
- infrastructure inside friendly territory remains visible to its owner,
- hostile infiltration into controlled territory cannot hide merely because no unit is standing beside it,
- banner-driven polarity changes do not remove territorial visibility because polarity and control are independent layers.

---

# V. LAST-KNOWN GHOSTS

When an enemy unit leaves current observation, its last-known position remains as a non-authoritative ghost marker.

A ghost stores at minimum:

- last-known unit identity/class where previously known,
- last-known position,
- last-seen round.

Ghosts are **information only**.

They do not:

- block movement,
- count as occupants,
- satisfy targeting rules,
- participate in combat,
- provide reinforcement links,
- prove that a unit is still present.

A remembered ghost may be completely obsolete.

The UI should visually distinguish ghosts from live observed units, for example through translucency, desaturation and a small `last seen: Round N` treatment.

---

# VI. GEOMETRIC LINE OF SIGHT

Piece vision should inherit the piece's tactical identity rather than defaulting to identical circular RTS vision radii.

Initial balancing targets:

## Pawn

- sees one tile in every direction around itself,
- represents short-range local awareness,
- cannot project deep reconnaissance alone.

## Knight

- reveals its legal L-shaped destination cells as isolated reconnaissance windows,
- does not need to observe intervening cells because Knight movement does not traverse them,
- creates characteristic frontier `hop holes` of information,
- becomes the natural mobile reconnaissance / raiding piece.

## Rook

- initially sees up to approximately three tiles orthogonally,
- vision follows cardinal lanes,
- blocking rules apply according to authoritative sight obstruction.

## Bishop

- initially sees up to approximately three tiles diagonally,
- functions as a diagonal observation and support-line piece.

## Queen

- initially sees up to approximately three tiles along orthogonal and diagonal rays,
- powerful but not omniscient,
- cannot legally commit a move through undiscovered space merely because raw chess geometry would otherwise permit the path.

## King

- initially sees approximately two tiles around itself,
- represents local sovereign awareness rather than long-range reconnaissance.

## Victoria

- begins from Queen-like or bespoke royal awareness geometry,
- may later modify intelligence through existing ability interactions,
- ability-driven sight should modify established systems rather than invent a separate minigame.

Exact ranges are balancing parameters, not immutable canon. The **geometry identity** is the locked principle.

---

# VII. MOVEMENT IS BOUNDED BY KNOWLEDGE

Raw chess movement geometry is necessary but not sufficient for a legal long-range move.

A normal move may not be committed into genuinely undiscovered terrain.

This prevents first-move kamikaze traversal across a huge battlefield and makes reconnaissance strategically necessary.

For ray/sliding pieces:

- movement may extend through legal observed/known geometry,
- commitment terminates at the currently valid intelligence frontier,
- unknown terrain beyond that frontier cannot be selected as an ordinary destination.

For Knights:

- a legal L-destination revealed as a Knight reconnaissance window may be considered known even when intervening cells are not,
- the Knight may therefore scout via discontinuous geometric pockets.

## Remembered terrain

Remembered terrain remains known geography and may normally be traversed if movement geometry permits.

However, current hidden state may have changed.

A move into remembered terrain therefore carries uncertainty.

Examples:

- a previously empty remembered tile may now contain a newly built Bastion,
- a remembered white tile may now be black,
- a remembered route may now be invalid because a hidden banner matured,
- a remembered quiet node may now be defended.

The authoritative resolver always uses current hidden truth.

---

# VIII. DIRECT COMBAT REQUIRES CURRENT OBSERVATION

A direct hostile target must be currently observed to receive an Attack or Assault order.

A ghost is never a valid direct target.

The player may use a ghost to reason about where the enemy might be, but must reacquire live intelligence before committing direct combat against that target.

Reinforcement likewise relies on currently valid tactical relationships and cannot use stale ghosts as authoritative links.

---

# IX. FORTIFICATIONS AS WATCHTOWERS

Fortifications are not merely blockers or extra durability.

They also project battlefield intelligence.

This creates three simultaneous values:

1. movement / lane denial,
2. time purchased through durability,
3. observation / warning coverage.

Initial vision targets:

## Bastion

- moderate local observation zone,
- initial tuning around three tiles.

## Royal Redoubt / Dread Redoubt

- stronger local observation zone,
- initial tuning around four tiles,
- may later receive limited additional cardinal sight if balance requires.

Fortifications may block sight beyond themselves according to the authoritative LOS obstruction rules while simultaneously providing their own observation coverage.

Destroying a fortification may therefore remove:

- a blocker,
- a defensive anchor,
- a watchtower,
- current vision into the area beyond.

A breach can open both a movement lane and an intelligence lane.

---

# X. NODES AS INTELLIGENCE INFRASTRUCTURE

Nodes may project faction vision while controlled.

Initial concept:

## Minor node

- modest local observation footprint,
- useful for frontier awareness and corridor monitoring.

## Major node

- stronger sanctuary/corridor vision,
- strategically important as an intelligence anchor as well as an economic/objective asset.

Losing a node removes current node-derived vision but does not erase remembered information.

The result is a natural transition from live intelligence to stale memory.

---

# XI. DECEPTION THROUGH STALE TRUTH

The game does not require fake units to support deception.

The player may manipulate the enemy's **outdated mental model** by changing hidden battlefield state after observation is lost.

This is a core strategic doctrine.

Examples include:

## Polarity trap

The enemy last observed a tile as white.

After sight is lost, a banner is planted, defended and matured.

The tile becomes black while the enemy's remembered state remains white until rediscovered.

The enemy may therefore plan around a route that no longer exists.

## Hidden Bastion trap

A fortification is constructed in remembered territory while outside enemy LOS.

A later advance encounters the newly authoritative blocker.

## Banner trap

A banner is planted and progresses outside enemy observation, changing future topology without immediately updating the enemy's remembered map.

## Vacated ghost trap

A dangerous unit leaves a previously observed position.

Its ghost remains while the real unit relocates to another theatre.

The opponent may waste attention or resources accounting for a threat that is no longer there.

## False weakness

A defensive position is visibly abandoned before LOS is lost.

The enemy remembers the weak position while hidden redeployment creates a counterattack elsewhere.

## Node ambush

A node is remembered as quiet or lightly defended while forces assemble nearby outside current sight.

The deception system must remain grounded in legitimate hidden state transitions. It should not fabricate authoritative entities merely to trick the player.

> **The enemy is deceived by stale intelligence, not by cheating.**

Internal nickname: **the Doakes Doctrine** — the board can look familiar right up until the moment the player realizes something is very wrong.

---

# XII. STARTING DEFENSIVE BELTS AND ANTI-KAMIKAZE OPENING

The central battlefield begins with prepared defensive infrastructure.

Locked concept:

Per faction:

- one heavier central Redoubt,
- two lighter flanking Bastions,
- a broad neutral no-man's-land between the two defensive belts.

The north and south corridors remain open flanking theatres.

The defensive belts serve to:

- interrupt direct Queen/Rook/Bishop rays,
- prevent move-one sovereign kamikaze attacks,
- create early sight boundaries,
- establish a readable front,
- make breaching tactically meaningful,
- encourage northern and southern manoeuvre rather than a single central rush.

No arbitrary first-turn Queen restriction is required if board geometry, visibility and infrastructure already prevent the exploit.

Internal anti-exploit nickname: **the anti-LEEEROOOY rule**.

---

# XIII. PLAYER DOCTRINES THAT SHOULD EMERGE NATURALLY

These are not rigid classes or pre-match perk trees. They are examples of player identities that should emerge from shared rules.

## Turtle Fortifier

- compact controlled territory,
- layered Bastions/Redoubts,
- veteran defenders,
- dense local vision,
- slow safe territorial expansion.

## Reinforcement Lattice Lord

- formation-heavy play,
- carefully maintained support chains,
- Rook/Bishop/Queen geometry,
- temporary concentrated force through explicit Reinforce commitments.

## Frontier Knight Raider

- Knight-heavy scouting,
- L-shaped reconnaissance pockets,
- attacks isolated targets,
- withdraws before heavier enemy geometry can close,
- preserves successful Knights until they become elite veterans.

Internal nickname: **SUPER SAIYAN HORSIE ARMY**.

## Court Illusionist / Deception Player

- hides banner operations outside LOS,
- weaponizes remembered polarity,
- relocates units after creating intimidating ghosts,
- constructs hidden blockers,
- manipulates the opponent's belief about where routes and threats still exist.

## Bishop Inquisitor

- diagonal sight and support control,
- polarity manipulation to create or destroy diagonals,
- long-term geometric preparation.

## Rook Railway Baron

- orthogonal territorial lanes,
- fortification infrastructure,
- open-file sight and fire corridors,
- methodical expansion of controlled intelligence territory.

These archetypes should emerge from the same underlying rules rather than receiving arbitrary class-specific bonuses.

---

# XIV. PACING CONSEQUENCE

Geometrically bounded intelligence intentionally slows **decision velocity** without reducing strategic density.

A player should frequently reason about sequences such as:

- which piece can reveal the next useful space,
- whether a ghost is trustworthy enough to plan around,
- whether a remembered polarity route may have changed,
- whether to risk a veteran Knight to acquire intelligence,
- whether destroying a Bastion is valuable for sight as well as passage,
- whether to push the permanent territorial visibility frontier,
- whether to create a hidden topology trap instead of taking an immediate exchange.

The game rewards thinking several rounds ahead about both **battlefield state and battlefield knowledge**.

---

# XV. PRESENTATION PRINCIPLES

The visibility system should avoid conventional total-black fog.

Suggested presentation:

## Observed

- full colour,
- crisp current units and structures,
- authoritative current state.

## Remembered

- subtly desaturated or softened,
- last-known units rendered as translucent ghosts,
- last-seen round available on hover/inspection,
- remembered terrain/polarity shown as last known, not silently updated.

## Unknown

- physical terrain remains visible,
- hidden occupants/state omitted,
- subtle haze or low-confidence treatment may indicate lack of intelligence,
- unknown terrain must remain visually distinct enough that movement restrictions are understandable.

When selecting a unit, its geometric observation footprint may be previewed procedurally.

This should use renderer geometry rather than bespoke fog artwork wherever possible.

---

# XVI. OPEN BALANCE QUESTIONS — NOT YET LOCKED

The following remain tuning questions rather than canon:

- exact Rook/Bishop/Queen sight distance,
- exact King/Victoria sight distance,
- exact Bastion/Redoubt radius,
- exact Minor/Major node sight footprint,
- whether ordinary units block sight or only fortifications/major opaque objects do,
- whether any abilities temporarily reveal remembered or unknown tiles,
- how hidden blockers interrupt a committed move into remembered terrain,
- whether the UI exposes confidence labels beyond `last seen: Round N`.

The current instinct is that **fortifications should block strategic LOS while ordinary units should not**, to avoid crowded formations becoming nonsensically blind. This remains to be explicitly approved and tested.

---

# XVII. CANONICAL STATEMENT

> **Royal War Triptych uses geometrically bounded battlefield intelligence: territory, pieces, nodes and fortifications determine what is currently known; stale ghosts preserve what was last believed; hidden banners and infrastructure can rewrite the battlefield outside enemy sight; and movement itself is constrained by the frontier of knowledge. The player fights both the enemy army and the uncertainty of whether the battlefield they remember still exists.**
