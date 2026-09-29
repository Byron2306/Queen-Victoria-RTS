# SDD ledger — plan: docs/superpowers/plans/2026-09-28-royal-tactical-strategy-implementation-plan.md
Baseline: 47 test files, 230 tests PASS
Task 1: in progress
Task 1: complete
Evidence: tests/sim/turns.test.ts 5 PASS; full suite 48 files / 235 tests PASS; typecheck PASS; git diff --check clean
Task 2: Ruling: WorldState.pendingOrders stores immutable TacticalOrder payloads while turn.pendingOrderIds preserves canonical queue order — Task 2 requires authoritative order payload storage without changing Task 1's approved TurnState shape — cost if wrong: persistence/HUD may need a storage migration later.
Task 2: complete
Evidence: orders + turns 11 PASS; typecheck PASS; full suite PASS; git diff --check clean
Task 3: Ruling: tactical attack resolution reuses existing combat legality, profile damage, positional multipliers, hero modifiers, and sovereign defeat interpretation; move resolution reuses existing geometry and occupancy authority.
Task 3: complete
Evidence: resolve-orders 5 PASS; typecheck PASS; full suite PASS; git diff --check clean
Task 4: Ruling: Move, Attack, and Guard are now tactical orders. Fixed ticks may ingest them into WorldState.pendingOrders but may not resolve them. Recruit, hero ability, and promotion remain temporarily on the legacy SimCommand path for later tasks.
Task 4: complete
Evidence: focused tactical migration 27 PASS; typecheck PASS; full suite PASS; git diff --check clean
Task 5: Ruling: ability Crown costs were unspecified by the approved spec. Use a provisional flat migration cost of 1 Crown for all four abilities to establish deterministic spend/refusal semantics without asserting final balance.
Task 5: Ruling: hero ability duration/cooldown authority moves from fixed ticks to advanceHeroRoundState(); fixed ticks no longer decrement tactical ability lifecycle.
Task 5: complete
Evidence: turn ability + hero regression 22 PASS; resolver/bridge focused tests PASS; typecheck PASS; full suite PASS; git diff --check clean
Task 6: Ruling: Shadow turn planning reuses the existing deterministic strategic scoring, target selection, movement geometry, and sovereign-threat truth, but emits at most four TacticalOrder values and does not mutate the supplied world.
Task 6: complete
Evidence: turn-ai + existing AI regression 18 PASS; typecheck PASS; full suite PASS; git diff --check clean
Task 7: Ruling: Crown income, node control, reinforcement deployment, promotion resolution, hero ability lifecycle, hero respawn lifecycle, and sovereign-threat refresh are reinforcement-phase authority, not fixed-tick authority.
Task 7: Ruling: legacy helper functions remain explicit operations without internal tick gates; exactly-once-per-round authority is enforced by resolveReinforcementPhase().
Task 7: Ruling: Phase 4 replay/order tests were migrated from obsolete tick-29/tick-49 contracts to explicit reinforcement-phase contracts while preserving determinism and legality invariants.
Task 7: complete
Evidence: 53 test files PASS; 277 tests PASS; typecheck PASS; git diff --check clean
Task 8: Ruling: save schema advances to version 2 for explicit tactical turn state and pending tactical orders; version-1 saves migrate by initializing a clean initial turn and empty pending-order queue only when those fields are absent.
Task 8: Ruling: canonical replay truth now includes turn state and pending tactical orders so committed-order sequence is part of deterministic replay identity.
Task 8: complete
Evidence: focused turn persistence/replay 7 PASS; replay/persistence regressions PASS; typecheck PASS; full suite PASS; git diff --check clean
Task 9: Ruling: client input is authoritative only during victoria_command; outside that phase selection and tactical queuing are refused.
Task 9: Ruling: End Turn is a client conductor over simulation authority only: Victoria resolve -> Shadow plan -> Shadow resolve -> reinforcement -> next-round Victoria command.
Task 9: Ruling: bridge-held tactical orders are flushed before End Turn resolution so committing does not depend on a fixed-tick boundary.
Task 9: Ruling: HUD turn text is derived live from authoritative world state and exposes round, phase, Royal Commands, and pending-order preview.
Task 9: complete
Evidence: focused HUD/input/phaser surface 25 PASS; typecheck PASS; full suite PASS; git diff --check clean
Task 10: Ruling: the stale planned responsive-battlefield/scene-rendering paths were translated onto the live architecture: board/projection.ts and render/battlefield-model.ts.
Task 10: Ruling: HUD exclusion is presentation-only. The logical 16x16 board remains unchanged; safe projection clamps only the render quadrilateral below the HUD top.
Task 10: Ruling: faction facing is presentation metadata only: Victoria scaleX positive, Obsidian scaleX negative. Simulation coordinates, selection, occupancy, and world state are unchanged.
Task 10: Ruling: resize/orientation safety is preserved by the same deterministic projection and inverse-mapping math across differently shaped render quadrilaterals.
Task 10: complete
Evidence: Task 10 surface 22 PASS; typecheck PASS; full suite PASS; git diff --check clean
Task 11: Ruling: Knight Fork requires at least two living enemy targets in knight threat geometry and at least one major/royal target; target selection is deterministic.
Task 11: Ruling: Open File means at least one unobstructed orthogonal rook ray to the board edge.
Task 11: Ruling: Royal Alignment is an unobstructed rank/file/diagonal between Victoria's hero and a friendly living non-pawn, non-king piece.
Task 11: Ruling: Sovereign Line is an unobstructed rank/file/diagonal between Victoria's hero and her sovereign; this is distinct from the active ability of the same name.
Task 11: Ruling: tactical bonuses emit explicit deterministic tactical.bonus evidence events after successful order resolution. No Crown reward is assigned yet.
Task 11: complete
Evidence: tactical bonus surface 13 PASS; resolve-orders/economy regressions PASS; typecheck PASS; full suite PASS; git diff --check clean
