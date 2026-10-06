# Triptych AI Parity Design

## Status

Proposed restoration phase following completion of exact 5x5 READY deployment.

## Goal

Make the Obsidian AI a true Royal Tactical participant rather than a parallel fixed-tick authority.

The AI must plan and act through the same strategic turn structure, knowledge boundaries, legality rules, command budget, and explicit deployment authority as a human player.

The result should be one deterministic AI authority for the Shadow turn.

## Current split-brain

The repository currently contains two overlapping AI execution paths:

1. `planShadowTurn(world)`
   - produces Royal Tactical `TacticalOrder[]`;
   - runs in `shadow_command`;
   - uses the same order queue and resolution path as the human side;
   - respects the four-order Royal Command budget.

2. `evaluateBalancedAI(world, faction)` + `scheduleAICommands()`
   - evaluates on fixed-tick cadence;
   - schedules legacy `SimCommand` work for T+1;
   - is consumed by `stepWorld()`;
   - can therefore create strategic AI activity outside the Shadow strategic turn.

The second path is incompatible with the restored ideal-system rule that wall-clock/fixed simulation ticks are presentation-only for strategic authority.

## Core doctrine

```
knowledge is bounded
intent is strategic
orders are canonical
resolution is shared
time is not authority
```

AI may think differently from a human, but it may not act through a different rules engine.

## Canonical AI lifecycle

The canonical Obsidian lifecycle is:

```
shadow_command
  -> refresh faction intelligence
  -> create faction-bounded planning view
  -> score strategic intentions
  -> choose deterministic actions
  -> stage free READY deployments if legal
  -> emit <= 4 TacticalOrders
  -> enqueue through canonical order authority
shadow_resolve
  -> resolve through canonical committed-order authority
reinforcement
  -> shared strategic boundary
```

No strategic AI command may be born or executed merely because a fixed tick elapsed.

## Information boundary

The AI may consume:

- its own units and own combat truth;
- its own hero state;
- its own READY/queue/economy truth;
- canonical faction intelligence;
- currently observed enemy units;
- remembered enemy contacts;
- public strategic facts that the existing game intentionally exposes to both sides, such as canonical node/control state where already treated as public.

The AI must not consume hidden enemy unit positions directly from `world.units` when choosing enemy-specific actions.

All enemy-specific targeting and movement decisions must flow through the existing knowledge layer:

- `refreshFactionIntelligence()`
- `createFactionKnowledgeView()`
- `createFactionPlanningWorld()`
- `targetIsObserved()`
- `validateMoveKnowledge()`

A remembered contact may influence pressure/movement intent but may not become an attack target unless currently observed and otherwise legal.

## Strategic intentions

The existing intention vocabulary remains authoritative:

- `defend_king`
- `attack_king`
- `capture_node`
- `pressure_position`
- `reinforce_front`

The existing deterministic scoring channels and weights may be retained unless a failing acceptance test proves they violate parity.

This phase is not an AI personality or difficulty redesign.

## Command budget parity

Obsidian receives the same Royal Command budget as Victoria.

Canonical rule:

- maximum four costed TacticalOrders per Shadow command phase;
- every staged TacticalOrder uses the canonical `commandCost`;
- order acceptance/refusal is decided by the same queue authority used for Victoria;
- hero abilities that are represented as TacticalOrders consume the same budget rules as equivalent costed actions;
- READY deployment remains a free explicit strategic action and consumes zero Royal Commands.

The AI must not receive six legacy ordinary commands in addition to four Royal Tactical orders.

## READY deployment parity

READY deployment remains governed by the completed deployment authority.

The AI:

- enumerates `legalDeploymentCells()`;
- uses deterministic scoring and stable coordinate tie-breaks;
- deploys only during `shadow_command`;
- uses `deployReadyUnit()` or an equivalent canonical free-action route;
- never invents fallback cells;
- never mutates `production.ready` directly;
- never calls `placeUnit()` directly for READY placement;
- spends zero Royal Commands.

Free READY deployment happens before costed Shadow orders are committed so the newly deployed unit is part of the current Shadow command-state truth only if the canonical turn rules permit it.

This phase must explicitly test that timing rather than assume it.

## Tactical order generation

`planShadowTurn()` becomes the canonical costed-order planner.

It may reuse existing deterministic helpers for:

- sovereign defence;
- immediate legal attacks;
- strategic intention scoring;
- objective-progress movement;
- hero ability choice;
- recruitment;
- promotion.

But every action that belongs to the Royal Tactical order system must emerge as a canonical order, not a legacy fixed-tick `SimCommand`.

Where recruitment/promotion are still represented as legacy strategic commands in the current architecture, this phase must either:

1. route them through an explicit Shadow-turn free/strategic action authority, or
2. leave them outside costed TacticalOrders but prove they can only be created during `shadow_command`.

They may not remain fixed-tick autonomous actions.

## Determinism

Identical world + intelligence state must yield byte-equivalent AI decisions.

Stable tie-break order must be explicit for every candidate family.

At minimum:

- unit ids: lexical;
- node/objective ids: lexical after score ties;
- coordinates: stable `y`, then `x`;
- READY entries: stable stored order, then id if required;
- order ids: deterministic from round + ordinal.

Insertion order of object maps must not alter AI decisions.

## Fixed-tick boundary

`stepWorld()` may still resolve low-level combat/presentation simulation where required by existing architecture, but it must not:

- evaluate strategic AI intentions;
- schedule new strategic AI commands;
- mature production;
- deploy READY automatically;
- spend Crown for autonomous AI recruitment;
- queue promotion autonomously;
- create Shadow TacticalOrders.

The fixed-tick runtime remains presentation-only for strategic truth.

Any compatibility APIs retained for older tests/tools must be inert in the canonical Royal Tactical session path.

## Events and evidence

The phase should preserve useful AI evidence without creating a second authority.

Recommended semantic events:

- `ai.evaluated`
- `ai.commitment.started`
- `ai.commitment.ended`

These may be emitted during Shadow planning if still useful.

Existing `ai.command.scheduled` should not be emitted by the canonical Royal Tactical path after restoration.

No event is allowed to substitute for actual canonical order/deployment receipts.

## Architecture tripwires

Source-level guardrails must prove:

- `stepWorld()` does not call `evaluateBalancedAI()`;
- canonical session code does not consume `ai.pendingCommands` for strategic actions;
- `planShadowTurn()` uses faction-bounded intelligence/planning views;
- AI enemy-specific attacks require observed targets;
- AI movement uses `validateMoveKnowledge()`;
- AI READY placement uses `legalDeploymentCells()` and canonical deployment authority;
- AI does not directly mutate `production.ready`;
- AI does not directly call `placeUnit()` for READY;
- Shadow costed orders are capped by canonical Royal Command budget;
- no legacy six-command allowance is active in the canonical Royal Tactical path.

## Acceptance scenarios

The phase is complete only when deterministic tests prove all of the following:

1. Hidden enemy movement does not change AI attack decisions until observed or remembered according to intelligence rules.
2. A remembered-but-not-observed enemy can influence pressure movement but cannot be attacked.
3. Immediate observed King danger overrides lower-value intentions deterministically.
4. Obsidian produces no more than four costed TacticalOrders in a Shadow turn.
5. The same candidate set always produces the same order sequence and order ids.
6. AI cannot act during Victoria command, Victoria resolve, Shadow resolve, or reinforcement.
7. Fixed ticks alone cannot create new AI strategic actions.
8. READY deployment uses canonical legality, costs zero Royal Commands, and has no fallback.
9. A fully blocked READY zone leaves the entry READY.
10. Recruitment/promotion decisions, if retained, occur only through Shadow-turn strategic authority.
11. Identical worlds replay to identical Shadow planning and resolution outcomes.
12. Existing human-side legality and turn semantics remain unchanged.

## Non-goals

This phase does not add:

- Monte Carlo search;
- minimax;
- neural policies;
- adaptive difficulty;
- supply-aware deployment scoring beyond already approved READY behavior;
- deception/ghost inference;
- personality profiles beyond the current balanced profile;
- presentation timing or animation work;
- new combat rules;
- new economy rules;
- new visibility rules.

## Completion gate

Required evidence:

- focused AI parity tests green;
- architecture tripwires green;
- existing AI, intelligence, tactical-order, READY, and Royal Tactical gauntlets green;
- full repository test suite green;
- typecheck green;
- production build green;
- final scope audit finds no fixed-tick strategic AI authority remaining in the canonical session path.
