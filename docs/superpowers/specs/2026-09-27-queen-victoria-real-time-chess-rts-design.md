# Queen Victoria RTS — Canonical Design Specification

**Date:** 2026-09-27  
**Status:** Approved design baseline  
**Repository:** `Byron2306/Queen-Victoria-RTS`

## 1. Product vision

Queen Victoria RTS is a real-time strategy game built from the logic and visual grammar of chess, expanded into a living battlefield. The board is not a sequence of alternating turns. It is contested continuously: pieces move, threaten, screen, reinforce, withdraw, and collide under real-time command.

The design goal is not to make ordinary chess faster. It is to preserve chess's immediately legible unit identities and positional language while replacing turn order with time, manoeuvre, command pressure, terrain, formations, and battlefield-scale tactical decision making.

The player should be able to look at the field and think in recognisably chess-like concepts — files, ranks, diagonals, forks, pins, screens, king safety, pawn structure and sacrifice — while commanding an army that behaves like an RTS force.

## 2. Core design pillars

### 2.1 Chess identity remains readable

Every major unit derives from a chess piece. Its battlefield behaviour should express the strategic personality of that piece rather than merely borrowing its silhouette.

- **Pawn:** inexpensive line infantry, formation mass, screening, territorial occupation and promotion potential.
- **Knight:** mobile shock/cavalry unit able to bypass conventional blocking relationships and create sudden local threats.
- **Bishop:** diagonal specialist with long attack lanes and strong positional control.
- **Rook:** heavy straight-line power, defensive anchor and siege-oriented battlefield presence.
- **Queen:** exceptionally powerful mobile command/combat asset whose flexibility makes commitment consequential.
- **King:** sovereign command objective. The King is strategically indispensable rather than simply another high-stat unit.

### 2.2 Real time changes the grammar

There are no alternating chess turns. Orders, movement, attacks and reactions unfold concurrently.

The design must therefore make time itself strategically meaningful through concepts such as movement duration, attack cadence, recovery, formation changes, command latency where appropriate, interception and reinforcement timing.

### 2.3 Position matters more than frantic clicking

The game should reward anticipation, geometry, force concentration and timing rather than raw actions-per-minute. Controls may support rapid expert play, but the strategic layer should remain comprehensible to a player who thinks before issuing orders.

### 2.4 The battlefield grows beyond 8×8 without losing chess

The world may use a larger tiled battlefield, sectors, objectives and terrain, but chess geometry remains visible and mechanically relevant. Straight lines, diagonals, adjacency, files and ranks should continue to matter.

### 2.5 The Victorian theme is structural, not decorative

The setting draws from the Victorian era's visual and technological vocabulary: ceremonial authority, industrial machinery, rail logistics, telegraphy, smoke, fortifications and the tension between old military forms and mechanised modernity.

Historical inspiration does not require a literal simulation of the British Empire. The game can inhabit a stylised alternate-Victorian world that supports the chess abstraction cleanly.

## 3. Core match loop

A match follows this strategic rhythm:

1. **Establish** — deploy the sovereign force, inspect terrain and establish an opening structure.
2. **Probe** — use pawns and mobile pieces to reveal weaknesses, threaten lanes and contest objectives.
3. **Develop** — bring specialised pieces into useful geometry and create mutually supporting formations.
4. **Contest** — fight for positional anchors, supply/command infrastructure and battlefield sectors.
5. **Break** — manufacture tactical overloads using forks, pins, discovered attacks, sacrifices, flanking pressure or concentrated force.
6. **Exploit** — convert a local positional advantage into territory, material, promotion opportunities or access to the enemy sovereign.
7. **Decide** — force checkmate-like sovereign defeat or satisfy another explicitly configured scenario victory condition.

## 4. Battlefield model

### 4.1 Grid

The battlefield uses discrete chess-derived cells even though units animate and move continuously between them. This preserves deterministic geometry and makes tactical state inspectable.

The initial prototype should favour a rectangular grid substantially larger than 8×8. Exact dimensions are a balance parameter rather than a foundational rule.

### 4.2 Occupancy

Cells may contain units or terrain according to explicit occupancy rules. The simulation must own authoritative cell state so visual interpolation cannot change tactical truth.

### 4.3 Terrain

Terrain can alter movement, visibility, defence or line-of-effect while respecting piece identity. Candidate terrain includes:

- open ground;
- roads;
- rail lines;
- woods;
- ridges;
- urban blocks;
- trenches or fortifications;
- bridges and rivers;
- industrial structures.

Terrain should create meaningful geometry rather than random statistical noise.

## 5. Piece behaviour

### Pawns

Pawns form the army's structural fabric. They occupy ground, screen valuable pieces and create fronts. Their weakness individually should be offset by formation utility and numbers.

Promotion is retained as a major strategic mechanism. A pawn reaching an eligible promotion zone can transform into a higher-order piece subject to scenario and economy rules.

### Knights

Knights specialise in discontinuous manoeuvre. Their defining property is the ability to bypass ordinary blocking geometry. In real time this makes them natural raiders, interceptors and flank attackers.

Their movement must remain visibly derived from the chess knight rather than becoming generic cavalry pathfinding.

### Bishops

Bishops dominate diagonal geometry. Their effectiveness depends on establishing and preserving lanes. Terrain and friendly formations can therefore create powerful or poor bishop positions.

### Rooks

Rooks dominate orthogonal lanes and act as heavy anchors. They are natural candidates for fortification interaction, siege pressure and strong defensive zones.

### Queen

The Queen combines orthogonal and diagonal power and should be the most tactically flexible conventional piece. Her strength is balanced by scarcity, commitment risk and the strategic cost of losing her.

### King

The King represents sovereign command. King safety is a central strategic concern. A King may provide a command influence or morale/coordination function, but such systems must never make the King an optimal front-line damage sponge.

## 6. Combat and threat

Combat should be deterministic enough that the player can understand why an engagement was won or lost.

The engine distinguishes at minimum:

- movement legality;
- attack eligibility;
- line of effect;
- attack timing;
- damage or capture resolution;
- interruption/death state;
- sovereign threat state.

Traditional instantaneous chess capture may be adapted into short real-time combat resolution, but the tactical relationship must remain crisp. A player should not need to decipher opaque RPG stat soup to understand a bishop threatening a diagonal.

## 7. Check and checkmate in real time

The game retains the conceptual heart of check.

A **check** occurs when the King is under a legally resolvable enemy sovereign threat according to the current authoritative simulation state.

Because movement is simultaneous, the engine must continuously evaluate King threat rather than waiting for turn boundaries.

A **mate** occurs when the King is under decisive threat and no valid defensive resolution remains within the game's response model. Defensive resolutions can include moving the King, removing the attacker, blocking a blockable line, or another explicitly legal intervention.

The exact grace/timing model for real-time mate is a prototype question and must be tested carefully. The system should avoid both instantaneous unreadable defeat and exploitable indefinite escape windows.

## 8. Orders and control

The player selects one or more pieces and issues orders using familiar RTS interactions.

Initial order vocabulary:

- move;
- attack;
- attack-move;
- hold;
- stop;
- guard/protect;
- formation move where applicable.

Queued orders may be supported, but excessive automation should not erase tactical commitment.

Multi-selection must respect heterogeneous movement. A formation containing pawns, bishops and knights should not silently turn every piece into a generic pathfinding blob.

## 9. Formations

Formations are a bridge between chess structure and RTS army control.

Candidate formation concepts include pawn walls, files, diagonal screens, rook-backed lines, royal defensive shells and marching columns.

Formation logic should preserve relative tactical roles rather than merely arranging units prettily. When terrain or combat breaks a formation, the system must have explicit rules for whether pieces maintain, reform or abandon it.

## 10. Economy and reinforcement

The first playable prototype should avoid a sprawling conventional RTS economy. The core game must prove that real-time chess combat is compelling before adding economic complexity.

A limited reinforcement/resource system may later support:

- pawn recruitment;
- replacement forces;
- promotion costs;
- fortification;
- logistics infrastructure;
- scenario-specific technology.

Any economy must reinforce positional warfare rather than becoming a separate base-building game glued onto chess.

## 11. Command, logistics and Victorian systems

Victorian-era systems provide expansion space after the combat core is proven.

Potential systems include telegraph command nodes, railway reinforcement, industrial production, field fortification and reconnaissance. These should create strategic networks on the battlefield without obscuring the piece geometry.

For example, rail may accelerate reinforcement along controlled corridors while telegraph infrastructure may extend command capabilities. These are design candidates, not mandatory MVP mechanics.

## 12. Information model

The prototype may begin with complete battlefield information so the geometry can be balanced cleanly.

Fog of war can be introduced later if it materially improves play. If used, visibility should interact with piece roles and terrain without making chess-derived threat relationships impossible to reason about.

## 13. Victory conditions

The canonical primary victory condition is sovereign defeat through the real-time equivalent of checkmate.

Scenario variants may add territorial control, timed defence, convoy/escort, fortress assault or objective capture, but these must be labelled variants rather than quietly replacing the game's chess identity.

## 14. UX and visual language

The interface must make tactical truth legible at a glance.

Important visual layers include:

- selected-piece state;
- valid movement geometry;
- attack/threat lanes;
- King danger;
- queued orders;
- formation membership;
- terrain effects;
- objective control;
- promotion readiness.

The aesthetic target is an elegant Victorian war table brought to life: carved or cast-metal chess identities, regimented battlefield readability, restrained industrial ornament, smoke and machinery where useful, and strong silhouettes at normal play zoom.

Visual spectacle must never conceal tactical state.

## 15. Simulation architecture principles

The simulation should be authoritative, deterministic where practical and separated from rendering.

Core principles:

1. Grid/cell truth is owned by the simulation.
2. Rendering interpolates authoritative movement but does not determine legality.
3. Orders are explicit data structures.
4. Piece capabilities are data-driven rather than scattered through UI code.
5. Threat calculation is a first-class subsystem.
6. Match outcomes should be reproducible from equivalent initial state and command/event streams wherever practical.
7. Game speed and frame rate must not change tactical rules.

## 16. Prototype scope

The first serious vertical slice should prove one question:

> Is chess strategically interesting when its pieces obey recognisable chess geometry but all players command them simultaneously in real time?

The prototype therefore includes:

- one battlefield;
- two opposing armies;
- all six chess-derived piece classes;
- authoritative grid movement;
- simultaneous orders;
- blocking and threat geometry;
- combat/capture resolution;
- King threat detection;
- a playable mate/victory rule;
- basic selection and RTS orders;
- enough UI overlays to understand tactical state;
- restartable local matches.

It explicitly does **not** require campaign progression, elaborate economy, multiplayer matchmaking, technology trees, cinematic narrative, dozens of maps or production-grade art.

## 17. Prototype validation questions

The vertical slice should answer these before the project expands:

1. Can players predict piece movement and threat without constantly consulting UI help?
2. Does simultaneous movement create interesting tactical timing rather than chaos?
3. Do traditional chess concepts such as forks, pins, screens and sacrifices survive meaningfully?
4. Is King threat readable and fair in real time?
5. Are pawns strategically useful rather than disposable clutter?
6. Are knights distinctive without becoming impossible to counter?
7. Does controlling groups remain manageable while preserving individual piece identity?
8. Does a larger battlefield improve chess strategy rather than merely lengthen travel time?
9. Is there enough decision depth before adding an economy or technology layer?

## 18. Non-goals for the initial implementation

The initial implementation is not:

- a conventional chess client with a timer;
- a historical simulator of Victorian Britain;
- a generic RTS with chess-shaped unit skins;
- an RPG stat system;
- an economy-first base builder;
- a requirement to model every historical weapon or institution.

## 19. Development sequence

The recommended implementation sequence is:

**Phase 0 — Simulation kernel**  
Grid, clock, piece state, deterministic orders and authoritative movement.

**Phase 1 — Chess geometry**  
Piece-specific movement, blocking, attack geometry and threat maps.

**Phase 2 — Real-time combat**  
Concurrent movement/attacks, timing, interruption and capture/death resolution.

**Phase 3 — Sovereign rules**  
Check detection, legal defensive responses and real-time mate/victory semantics.

**Phase 4 — Player controls**  
Selection, commands, overlays, camera and readable feedback.

**Phase 5 — Tactical vertical slice**  
One polished battlefield with complete armies and repeatable matches.

**Phase 6 — Formation and battlefield depth**  
Formation commands, terrain and objective experiments.

**Phase 7 — Victorian strategic layer experiments**  
Telegraph, rail, reinforcement, fortification and limited economy, admitted only when playtests show they improve the core.

## 20. Design invariant

Every substantial feature should pass this test:

> Does this deepen the experience of commanding chess pieces in a simultaneous real-time battlefield, or does it merely make the game resemble another RTS?

If a feature weakens the former in favour of the latter, it should be redesigned, isolated as a scenario variant, or removed.

---

This document is the canonical approved design baseline. Implementation plans may refine numerical values and technical choices, but changes to the product's core identity, real-time chess geometry, sovereign victory model or prototype scope should be made explicitly rather than by implementation drift.
