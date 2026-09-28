# Queen Victoria RTS — Canonical Design Specification

**Date:** 2026-09-27  
**Status:** APPROVED / LOCKED  
**Repository:** `Byron2306/Queen-Victoria-RTS`

## Vision

A touch-first web **real-time chess RTS** with Warcraft III-style hero mechanics. Queen Victoria is the controllable hero/commander; the King is the fixed sovereign base/objective. The defining rule is:

> **The player does not win by producing the largest army. They win by constructing the strongest position.**

Chess geometry is battlefield power. Files, ranks, diagonals, forks, pawn structure and territory shape combat, economy and deployment.

## Core match loop

**Capture → earn → unlock → reinforce → construct geometry → win positional fights → annex more territory → break the enemy King.**

Units automatically defend through Guard/acquisition behaviour. The player concentrates on deployment, positioning, timing, hero control and strategic pushes rather than constant attack orders.

## The Royal Board

MVP uses one **16×16** battlefield with **7 capture nodes** in a symmetric royal-cross layout. The centre node is the **Crown Node**. Each King occupies a recessed **3×3 fortified home zone**. The back/far **two ranks** are home/promotion territory.

Node roles:
- two flank nodes per half create alternate approaches;
- one staging node per half supports central deployment;
- the Crown Node is the strategic heart and grants **+1 Command Capacity while held**.

Captured territory visibly annexes into faction colour. Victoria uses **ivory, deep crimson and antique gold** with crown banners. The enemy uses **obsidian, deep violet and cold silver**. Neutral nodes have no banner; capture unfurls a standard; contested nodes visibly signal contention; loss replaces the standard and colour treatment.

Active chess geometry is subtly traced on the board: rook files/ranks, bishop diagonals, knight fork targets and Victoria's Royal Alignment. It must read as heraldic/strategic illumination, not a neon laser grid.

## Units and chess identity

- **Pawn:** cheap infantry and primary territory troop. Adjacent pawn structures gain formation value. Reaching enemy promotion territory may promote to Knight, Bishop or Rook for reduced Crown cost, while respecting unlocks and caps. Never promotes to Queen.
- **Knight:** raider/disruptor. L-shaped leap ignores conventional blockers. Fork opportunities are mechanically rewarded.
- **Bishop:** ranged diagonal specialist. Controlled/unbroken diagonals empower its attacks.
- **Rook:** heavy defender/siege piece. Controlled straight files/ranks extend and strengthen its battlefield pressure.
- **Queen Victoria:** unique hero/commander. Uses rook and bishop geometry, command abilities and hero progression.
- **King:** fixed sovereign objective/base. Provides defensive presence but is not a front-line hero and is never produced.

Normal units use readable RTS auto-attacks. Chess identity modifies positioning, mobility and empowered attacks rather than turning every attack into a literal chess capture.

## Combat feel

Reference feel: **Warcraft III**, not turn-based chess.

Units have health, attack cadence, attack range, acquisition range and chase leash. Guard is the default defensive behaviour: units automatically acquire valid nearby threats but do not chase absurd distances away from assigned positions.

Positionally correct attacks receive combat and economic bonuses. Examples include Rook Open File, Bishop Line, Knight Fork, Pawn Chain and Victoria's Royal Alignment.

## Queen Victoria hero

Victoria is unique, directly controllable and outside normal production spam. MVP progression is fixed at **5 levels**.

1. **Level 1:** Royal Presence passive + Royal Decree.
2. **Level 2:** Hold the Crown.
3. **Level 3:** Royal Presence improves.
4. **Level 4:** Sovereign Line.
5. **Level 5:** Imperial Gambit ultimate.

XP comes from nearby kills, positional kills, node captures, defending the King and capturing the Crown Node.

Abilities:
- **Royal Presence:** nearby allied morale/defence aura, strengthened by useful chess geometry.
- **Royal Decree:** temporary nearby ally attack-speed/movement/capture-speed buff.
- **Hold the Crown:** defensive burst improving armour/position-holding/Guard behaviour.
- **Sovereign Line:** channels power through a valid straight or diagonal chess line.
- **Imperial Gambit:** temporarily amplifies active friendly chess geometry around Victoria.

If defeated, Victoria returns through a meaningful cooldown plus Crown cost. Exact balance values remain tuning data.

## Crown Power economy

There is no conventional worker/resource-harvesting economy.

Crown Power comes from:
- enemy kills;
- **bonus rewards for positional kills**;
- steady ticks from controlled nodes.

Node income is the stable backbone; kills accelerate the economy. This prevents passive kill-farming from replacing territorial play.

Initial balance anchors, explicitly tunable:
- Pawn kill: 5 Crown;
- Knight/Bishop kill: 10;
- Rook kill: 14;
- major/hero target: 25;
- positional bonus: approximately +25% to +50%;
- minor node: 1 Crown / 3 sec;
- major/Crown economic tuning may be higher if playtesting requires it.

## Territory progression

Territory is also the technology tree.

- **0–1 nodes:** Pawns.
- **2 nodes:** Knights unlock.
- **3 nodes:** Bishops unlock.
- **4 nodes:** Rooks unlock.
- **5+ nodes:** advanced upgrades / stronger Queen capability space.

Losing nodes removes the ability to recruit now-locked advanced pieces but never deletes pieces already fielded. MVP unlocks depend on **node count**, not node type.

## Production and reinforcement

The King/base is the primary production point. The player chooses units to queue with Crown Power. Production resolves on a **reinforcement pulse**, initially targeted at roughly **15 seconds** and tuned through playtesting.

Initial cost/timing anchors:
- Pawn: 20 Crown / 3 sec production weight;
- Knight: 45 / 6 sec;
- Bishop: 50 / 7 sec;
- Rook: 70 / 10 sec;
- Victoria return: roughly 100 Crown + 20 sec cooldown.

Owned nodes may become forward reinforcement anchors subject to unit restrictions. Pawns may use ordinary owned anchors; higher pieces require stronger/major anchors; Rooks remain deliberately constrained.

A wave containing multiple units may receive a brief **Muster Bonus**. This rewards timed reinforcement composition rather than spam.

A losing player at 0–1 nodes may receive a modest emergency Pawn defence mechanism, tuned so it prevents trivial snowballing without winning the match automatically.

## Command Capacity and anti-spam

Crown limits affordability; territory limits unlocks; **Command Capacity limits fielded army size**.

Initial hard caps:
- Pawns: max 6;
- Knights: max 2;
- Bishops: max 2;
- Rooks: max 2;
- Queen Victoria: exactly 1;
- King: exactly 1 fixed.

Capacity weights:
- Pawn 1;
- Knight 2;
- Bishop 2;
- Rook 3;
- Victoria is a fixed hero outside ordinary capacity accounting.

Territory expands available command capacity up to the hard ceiling; the Crown Node grants +1 while held. Death immediately frees capacity, but replacement still waits for reinforcement rules. The game must not permit a late-game mass-heavy-unit rush.

## AI commanders

MVP ships one balanced commander using three strategic priorities: **Expand, Exploit, Protect**. It should contest weak nodes, recognise chess geometry opportunities, protect its King and important territory, and coordinate pushes without cheating.

Four personality archetypes are canonical for subsequent implementation:
- **The Tactician:** geometry-heavy, patient positional play.
- **The Raider:** Knight-heavy disruption and weak-node attacks.
- **The Fortress:** defensive Rook/node control.
- **The Gambler:** aggressive Queen pressure and material-for-momentum play.

## Information and victory

MVP uses **full-board visibility**. Fog of war is deferred unless testing proves it improves the game.

Primary victory is breaking/defeating the enemy King. Real-time sovereign threat/check semantics may be layered into later simulation phases, but the King remains the non-negotiable objective.

## Touch-first web controls

- **Double tap** selects units/group intent.
- **Single tap** on valid ground issues movement for the active selection.
- Unit/hero actions use touch-sized controls.
- Victoria portrait: tap selects her; double tap centres camera on her.
- King/base receives a similar quick-access affordance.

Mouse input maps through the same input abstraction.

## HUD

Battlefield remains dominant.

- **Top-left:** Victoria portrait, level, XP, health/respawn.
- **Top-centre:** Crown Power, Command Capacity, node count, reinforcement pulse timer.
- **Top-right:** enemy King health, tactical overview/minimap toggle, pause/settings.
- **Bottom-left:** selected unit panel, health, stance, cap information.
- **Bottom-centre:** Victoria/selected-unit abilities and Guard control.
- **Bottom-right:** production queue and reinforcement controls.

Small contextual ribbons communicate positional state, e.g. `OPEN FILE +25%`, `BISHOP LINE ACTIVE`, `KNIGHT FORK`, `ROYAL ALIGNMENT x2`. Reinforcement pulse has a visible royal bell/marching-drum countdown.

## Visual asset bible

Pixel art, integer scaled.

- terrain tiles: 32×32;
- Pawn: 32×32;
- Knight/Bishop/Rook: up to 48×48 frame;
- Victoria: 48×48;
- King/base composite: approximately 96×96;
- portraits: 128×128;
- ability icons: 32×32 or 48×48;
- FX: 32×32 / 64×64 as appropriate.

Normal animation targets: idle 4, move 6, attack 6, hit 2, death 6 frames. Victoria receives a larger animation budget: idle 6, move 8, attack 6, cast 8, hit 3, death 8, victory 8, named ability animations 8 frames, Imperial Gambit 10–12.

First art batch is deliberately small: Victoria portrait/idle, Pawn idle+move, Rook idle, light/dark/annexed tiles, crown banner, selection ring, Crown icon, one hit FX and one HUD mock. Assemble a fake gameplay screenshot before mass-producing spritesheets.

## Web technology

MVP stack is **Phaser 3 + TypeScript + Vite**, rendered through browser Canvas/WebGL.

The game simulation is independent of Phaser. Simulation entities own state such as position, health, stance, target, cooldowns and geometry bonuses; Phaser sprites only display authoritative state. Unit stats, costs, unlocks, abilities and AI personalities are data-driven JSON/configuration.

Use deterministic/fixed simulation ticks. Pathfinding is simple grid A* where appropriate, but Phase 1 chess geometry may impose piece-specific movement semantics. Local settings/save only for v1. No backend required.

## MVP scope

Version 1 contains:
- one Royal Board map;
- seven capture nodes;
- Victoria faction vs one enemy faction;
- Queen Victoria hero;
- Pawn, Knight, Bishop and Rook combat units;
- King fixed base/objective;
- one balanced AI commander;
- Crown economy;
- territory unlock progression;
- positional combat bonuses;
- Guard behaviour;
- reinforcement pulses;
- Command Capacity and per-piece caps;
- Pawn promotion;
- Victoria 5-level progression;
- victory/defeat presentation;
- touch-first browser controls.

No multiplayer, campaign, accounts, server backend or procedural maps in v1.

## Simulation architecture invariants

1. The **16×16** grid/cell truth is owned by the simulation.
2. Rendering interpolates authoritative state and never determines legality.
3. Orders are explicit immutable-ish data records/events.
4. Fixed simulation ticks make game speed independent of render frame rate.
5. Equivalent initial state plus equivalent ordered commands must produce equivalent state/event output.
6. Occupancy cannot silently contain two exclusive units in one cell.
7. Out-of-bounds and invalid orders are rejected deterministically rather than partially applied.
8. Piece geometry, combat, economy and UI are layered above the Phase 0 kernel rather than embedded into it.

## Development sequence

- **Phase 0:** simulation kernel: 16×16 grid, fixed clock, entity state, deterministic order queue, authoritative occupancy/movement, event stream and replay/determinism tests.
- **Phase 1:** chess geometry, blockers and threat maps.
- **Phase 2:** real-time combat, Guard/acquisition and positional bonuses.
- **Phase 3:** King/sovereign victory rules.
- **Phase 4:** Crown economy, nodes, annexation, progression, production, reinforcement and Command Capacity.
- **Phase 5:** Victoria hero progression/abilities and balanced AI commander.
- **Phase 6:** Phaser touch UI, HUD, board rendering and playable vertical slice.
- **Phase 7:** polish, four AI personalities, asset expansion and balance.

## Design invariant

Every substantial feature must answer yes to:

> **Does this deepen the experience of constructing and exploiting a chess position in a real-time battlefield?**

If not, redesign, defer or remove it.
