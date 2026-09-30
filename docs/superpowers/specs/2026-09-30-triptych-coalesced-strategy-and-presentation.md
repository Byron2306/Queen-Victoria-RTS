# Triptych Coalesced Strategy and Presentation Architecture

**Date:** 2026-09-30  
**Status:** DESIGN FREEZE CANDIDATE  
**Branch:** `agent/royal-war-triptych`

## Purpose

Coalesce the latest Triptych systems into a single strategic authority rather than layering new mechanics beside primitive existing ones.

The intended game loop is:

> deploy -> annex -> scout -> establish supply -> fortify -> contest -> fight -> consolidate

The battlefield must punish unsupported rushing without making raiding impossible, make territory expansion physically meaningful, make recruitment spatial and visible, and make movement/combat readable through deliberate animation instead of instantaneous state jumps.

The guiding presentation rule is:

> Nothing consequential happens faster than the player can understand it.

The guiding strategic rule is:

> Boots on ground matter, but logistics still matter.

---

## 1. Disposition doctrine

Every existing subsystem touched by this programme receives exactly one disposition.

- **KEEP**: existing authority already matches the design.
- **EXTEND**: existing authority is correct but incomplete.
- **CONSOLIDATE**: overlapping primitive mechanisms become one shared authority.
- **RETIRE**: legacy behaviour contradicts the final design and must no longer own runtime truth.

No second annexation engine, second recruitment path, second spawn rule, or parallel presentation authority may be introduced.

---

## 2. Battlefield scale

### Design target

Increase the Triptych logical battlefield from 24x24 to **32x32** while preserving the Triptych cross identity and approximately preserving apparent tile/unit footprint through the existing free-roam camera.

The purpose is not simply more cells. The enlarged battlefield must increase **strategic time-to-contact** so that one scouting piece cannot reveal an entire enemy corridor in a handful of moves.

The final opening geography must preserve:

- western Victoria home realm,
- eastern Obsidian home realm,
- north and south royal corridors,
- central contested theatre,
- meaningful neutral frontier between the two factions,
- long enough approaches that vision, banners, territory and fortifications matter before full contact.

### Migration rule

Existing camera, projection, tile-center and sprite-grounding contracts remain authoritative where possible. Board dimension constants, topology, opening coordinates, node positions, fortifications, reinforcement/deployment zones, tests and presentation geometry must migrate together.

**Disposition:** current 24x24 topology = **EXTEND / MIGRATE**, not parallel support.

---

## 3. One faction-claim authority

The current territory system already contains contiguous annexation primitives and settlement-driven tile control. These must coalesce into one claim authority.

### Shared claim decision

All territorial claims must pass through one underlying decision equivalent to:

```ts
canFactionClaimTile(world, faction, cell, source)
```

where `source` is one of:

```text
annex_command
settlement
banner
fortification
```

The same topology and supply rules govern every source. Individual sources may add stricter requirements, but may not bypass the shared minimum rules.

### Base territorial rule

A faction may claim a neutral tile only when the tile is:

1. playable,
2. neutral or otherwise claimable by the specific source,
3. orthogonally adjacent to faction-controlled territory, **or** validly supplied by an explicitly-authorized strategic anchor,
4. not blocked by a stronger territorial rule.

Diagonal adjacency does not extend supply.

### Explicit ANNEX_TILE

The existing annex command remains a first-class Royal Command.

It may claim only a legal frontier tile under the shared claim authority.

**Disposition:** existing `annexTile()` adjacency logic = **KEEP + CONSOLIDATE**.

### Unit settlement annexation

Unit settlement remains a desired mechanic.

When a surviving unit finishes its authoritative movement/settlement on a neutral cell:

- if the cell is legally connected to its faction network, it may be annexed by settlement;
- if the cell is not connected, the unit occupies the cell but the cell remains neutral and the unit is unsupplied;
- simply reaching a remote neutral cell may never create an isolated faction island.

Enemy-controlled territory is not instantly converted merely because a unit occupies it. Enemy territory becomes occupied/contested according to the territorial conflict rules and requires legal conversion.

**Disposition:** current automatic `resolveSettlement()` painting = **CONSOLIDATE**, not removed. It must call the same faction-claim authority as explicit annexation.

---

## 4. Supply lattice and anti-rush attrition

Faction-controlled tiles form the primary supply lattice.

### Supplied unit

A unit is supplied when its current cell is part of its faction's connected supplied territory network, or is covered by an explicitly valid supply anchor.

### Unsupplied unit

A unit may deliberately move beyond supplied territory. Raids are legal. Unsupported movement does not immediately kill or forbid the unit.

Each unit tracks an `unsuppliedRounds` or equivalent deterministic state.

Recommended escalation:

- **0**: supplied, no penalty,
- **1**: exposed, warning only,
- **2**: strained, logistics penalties begin,
- **3+**: attrition state, escalating combat/mobility penalties and deterministic HP attrition.

Exact balance numbers belong in implementation tuning, not this architecture freeze. The contract is that attrition is progressive, deterministic, visible, and reversible when supply is restored.

### Supply consequences

At minimum, later attrition stages may affect:

- healing/recovery,
- movement allowance or command efficiency,
- attack/support efficiency,
- HP.

The player must receive visible status feedback before HP attrition begins.

### Cut-off territory

Territory can remain owned while disconnected from the faction's home supply network, but disconnected territory becomes **unsupplied territory** until connectivity is restored.

This permits encirclement and supply-line cutting without instant magical recolouring.

Units standing in disconnected owned territory are not automatically considered supplied.

### Strategic anchors

Banners, nodes and fortifications may influence supply, but no anchor may create arbitrary teleporting territory islands.

Their exact effects must be additive to the shared territorial authority.

**Disposition:** new supply/attrition layer = **EXTEND** existing territory, banner and fortification systems.

---

## 5. Banners and fortifications

Existing banner and fortification mechanics remain authoritative and are promoted into the supply/territory doctrine.

### Banners

Banners remain tactical orders with existing maturation/polarity behaviour.

Their final role may include:

- accelerating local territorial consolidation,
- stabilizing an exposed frontier,
- projecting a limited temporary supply influence,
- interacting with visibility/polarity.

A banner may not create an arbitrary disconnected permanent territorial island.

### Fortifications

Existing fortification legality, durability, repair and destruction are retained.

Fortifications may be extended to:

- anchor supplied territory,
- resist frontier loss,
- support nearby annexation,
- block strategic sight as already designed,
- visually communicate durable control.

**Disposition:** banners = **KEEP + EXTEND**; fortifications = **KEEP + EXTEND**.

---

## 6. Recruitment becomes READY -> PLACE

The existing Crown economy, recruitment legality and production queue remain authoritative.

The automatic nearest-spawn behaviour is retired for player-facing recruitment.

### Recruitment lifecycle

```text
PURCHASED
  -> QUEUED
  -> READY_TO_DEPLOY
  -> player drags unit
  -> legal 5x5 home deployment cell
  -> DEPLOYED
```

Crown is spent when the recruitment order is accepted under the existing economy rules.

A completed recruit does **not** automatically appear on the battlefield.

### 5x5 Home Deployment Zone

Each faction has a fixed world-grounded **5x5 deployment zone** around its Home Base.

The zone:

- is defined in logical board coordinates,
- remains attached to the world under pan/zoom,
- highlights when a ready unit is selected/dragged,
- accepts only legal empty deployment cells,
- rejects off-zone or occupied drops,
- never silently substitutes another cell.

If all 25 legal cells are blocked, the recruit remains READY until a valid tile becomes available.

### Drag/drop presentation

The ready unit appears in the deployment tray.

Dragging shows a unit ghost and legal/illegal tile feedback.

Valid drop commits a deterministic deployment command. Invalid drop returns the unit to the tray.

### AI deployment

AI recruitment obeys exactly the same 5x5 deployment legality. It may choose its own legal cell deterministically but receives no privileged auto-spawn outside the zone.

**Disposition:** recruitment queue/economy = **KEEP**; `findReinforcementSpawn()` player authority = **RETIRE**; reinforcement-anchor concept = **EXTEND into deployment-zone authority**.

---

## 7. One presentation clock

Simulation truth remains deterministic and may resolve atomically.

The visual client may not expose major state transitions as instantaneous teleports.

A single ordered presentation queue/clock translates authoritative outcomes into readable motion.

### Presentation event vocabulary

The client presentation layer must support, at minimum:

```text
MOVE_START
MOVE_TRAVEL
MOVE_ARRIVE
ATTACK_WINDUP
ATTACK_TRAVEL
MELEE_STRIKE
IMPACT
HIT_REACTION
DAMAGE_REVEAL
DEATH
ASSAULT_ADVANCE
RECOVER
DEPLOY_START
DEPLOY_COMPLETE
ANNEX_PULSE
```

Names may differ in implementation, but there must be one authority that sequences these effects.

### No presentation teleporting

Normal movement must visibly traverse its path.

Normal attacks may not translate the attacker between logical tiles.

Only movement-bearing mechanics such as move, assault, charge or knight leap may change the sprite's world anchor.

### Recommended pacing targets

These are presentation targets, not simulation timings:

- pawn movement: ~0.35-0.45 s/tile,
- heavy/regal movement: ~0.30-0.50 s/tile,
- knight leap/charge: ~0.60-0.80 s total,
- attack wind-up: ~0.35-0.60 s,
- projectile/effect travel: ~0.25-0.80 s depending on distance,
- impact hold: ~0.10-0.15 s,
- hit reaction: ~0.30-0.50 s,
- lethal death: ~0.80-1.20 s,
- recovery: ~0.20-0.30 s.

These may be tuned later without changing the architecture.

---

## 8. Movement presentation

### Sliding and walking pieces

Pawn, king, queen, rook and bishop moves must visibly travel instead of snapping to destination.

The path displayed must be consistent with the authoritative legal movement path.

### Knight

Knight preserves chess-legal L movement logically, but presentation uses a distinct wind-up -> leap/charge -> landing sequence.

The knight does not visibly walk through illegal intermediate cells.

### Progressive intelligence reveal

Where technically compatible with the deterministic outcome model, visibility presentation advances with the moving unit so unexplored terrain is revealed progressively rather than all at once at click time.

The underlying authoritative information state may already be resolved; the presentation layer reveals it at readable movement cadence without permitting illicit mid-resolution information exploitation.

**Disposition:** atomic sim movement = **KEEP**; instant sprite snapping = **RETIRE**; current camera-bound overlays = **KEEP + EXTEND**.

---

## 9. Combat presentation and the MOER contract

The current unreadable "attacker appears, target loses health, attacker disappears" presentation is explicitly rejected.

### Melee attack

A melee attack must visibly contain:

```text
idle
-> wind-up
-> short presentation-only lunge
-> MELEE_STRIKE / MOER frame
-> impact
-> target recoil/hit reaction
-> lethal death if required
-> attacker returns/recover
```

The lunge remains within presentation space and does not change the attacker's logical cell unless the order is an assault or other movement-bearing action.

### Ranged attack

Ranged pieces remain planted in their authoritative tile.

The projectile/effect travels from attacker to target, followed by impact and target reaction.

### Lethal attacks

Lethal hits receive enough impact hold and death presentation to make causality unmistakable.

The player should always be able to answer:

- who attacked,
- from where,
- what attack connected,
- who took damage,
- why the unit died.

### Assault

Assault may combine attack and logical advance. The visual advance happens only after the authoritative target defeat / assault condition is satisfied.

**Disposition:** existing attack/damage/death intent = **CONSOLIDATE into one presentation authority**.

---

## 10. AI strategic behaviour

The AI must use the same strategic rules as the player.

Required consequences:

- no remote annex islands,
- no privileged deployment outside the 5x5 home zone,
- supply-aware movement valuation,
- strong penalty for repeatedly extending units beyond supply,
- value assigned to connecting annex tiles, banners and fortifications,
- ability to conduct deliberate raids when reward justifies attrition risk,
- awareness of enemy supply corridors as strategic targets.

The existing pathological clumping/leftward pawn behaviour must be addressed during implementation by migrating AI objective/movement search to the final board dimensions and logical axes rather than presentation orientation.

Presentation rotation must never influence simulation direction semantics.

---

## 11. Territory and visual assets

Faction-control art is a dynamic strategic layer, not baked permanently into the neutral board texture.

Required tile states include at least:

- neutral,
- Victoria controlled,
- Obsidian controlled,
- contested/occupied,
- disconnected/unsupplied where useful for player readability,
- legal annex frontier highlight,
- deployment-zone highlight.

Persistent faction territory should be visually legible without overwhelming units and nodes.

The final ornate board art is postponed until the 32x32 topology/projection is frozen. Decorative environment must conform to the grid. The grid never bends to art.

---

## 12. Coalescence matrix

| Existing mechanism | Final disposition | Final authority |
|---|---|---|
| 24x24 Triptych topology | EXTEND/MIGRATE | 32x32 Triptych topology |
| free-roam camera | KEEP | battlefield camera |
| tile-center / unit grounding | KEEP | projection geometry |
| `annexTile()` adjacency | KEEP + CONSOLIDATE | shared faction-claim authority |
| automatic `resolveSettlement()` painting | CONSOLIDATE | shared faction-claim authority |
| banner state/orders | KEEP + EXTEND | territory/supply doctrine |
| fortification state/build/repair | KEEP + EXTEND | territory/supply doctrine |
| Crown recruitment economy | KEEP | production authority |
| production queue | KEEP | production authority |
| automatic nearest reinforcement spawn | RETIRE | 5x5 home deployment command |
| reinforcement anchor concept | EXTEND | home deployment-zone definition |
| deterministic sim movement | KEEP | simulation authority |
| instantaneous sprite movement | RETIRE | presentation clock |
| attack state resolution | KEEP | simulation authority |
| attack teleport/fly-in presentation | RETIRE | presentation clock |
| existing animation ambitions | CONSOLIDATE | movement/combat presentation system |
| camera-bound strategic overlays | KEEP + EXTEND | projection-aware presentation |

---

## 13. Invariants

The implementation plan must preserve these invariants:

1. No territory claim bypasses the shared faction-claim authority.
2. Settlement annexation remains legal and meaningful, but cannot create disconnected permanent islands.
3. Supply connectivity is orthogonal unless an explicit strategic rule states otherwise.
4. Unsupported units may raid, but progressive attrition makes sustained unsupported rushing costly.
5. Recruitment never silently chooses a battlefield spawn for the human player.
6. A READY recruit remains READY until legally deployed.
7. Both factions obey the same deployment and supply rules.
8. Presentation rotation never changes logical movement direction.
9. Simulation remains deterministic and authoritative.
10. Presentation may interpolate, animate and sequence but may not invent gameplay outcomes.
11. Normal attacks do not move the attacker's logical tile.
12. Only explicit movement-bearing actions may change logical position.
13. Camera movement never detaches overlays, deployment zones, attack effects or territory art from the world projection.
14. Final ornate board art is authored only after topology/projection freeze.

---

## 14. Acceptance vision

A successful round should be readable as a physical campaign:

- a recruit completes and waits visibly in the deployment tray;
- the player drags it into a legal 5x5 home cell;
- units march at deliberate readable speed;
- fog peels back as scouts advance;
- a frontier unit settles an adjacent neutral tile and visibly annexes it;
- unsupported raiders display worsening supply state instead of receiving invisible arbitrary punishment;
- faction territory visibly creeps across the board one connected claim at a time;
- banners and fortifications strengthen the front rather than acting as detached decorations;
- attacks visibly originate, travel or lunge, impact and recover;
- a melee attacker visibly MOERS its target;
- a killed unit has an unmistakable cause and death presentation;
- no piece teleports across the battlefield unless a future mechanic explicitly and visibly grants teleportation.

The result should feel like a deliberate royal campaign, not a fast state debugger with sprites.
