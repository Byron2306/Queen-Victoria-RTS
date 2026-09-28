# Phase 4 Economy, Territory & Reinforcements Acceptance

Status: **CONTAINER IMPLEMENTATION VERIFIED; AUTHORITATIVE VITEST/TERMUX RUN PENDING**

Implementation branch: `agent/phase4-economy-territory-reinforcements`
Verified implementation/test tree before the final docs-only receipt update: `c31a251c893f7fb30bd91e036cb9df2778631bdc`
Container environment: Node v22.16.0; global TypeScript 5.8.3. The repository declares TypeScript ^5.9.2; the authoritative Termux run uses the repository-installed toolchain.
Authoritative repository test runner: Vitest 3.2.7 on Termux.

## Container verification

The container cannot install the repository's npm dependencies from the network, so this receipt deliberately does **not** claim a local Vitest run. Verification performed against the implementation tree:

- strict TypeScript production-source compilation: PASS;
- structural TypeScript compilation of all Phase 4 tests plus touched Phase 2/3 regression tests using a local declaration-only Vitest stub: PASS;
- Tasks 1–8 dependency-free behavior harnesses: PASS;
- consolidated Phase 4 acceptance behavior harness: PASS;
- replay byte-equivalence harness: PASS.

The previously verified Phase 0–3 Termux baseline was 15 files / 72 tests. Phase 4 adds 34 new Vitest cases, so the expected full Termux result is **106 tests**. This number remains expected, not certified, until the real `npm test` run reports it.

## Acceptance matrix mapping

1. Exactly seven configured nodes: `phase4-state.test.ts`, "creates the fixed seven-node map and empty economy/production/promotion state".
2. 3x3-zone presence advances capture: `nodes.test.ts`, "uses a 3x3 zone and ignores Kings".
3. Immediately outside does not advance: same test.
4. Kings cannot capture: same test.
5. Neutral capture completes at 30 ticks: `nodes.test.ts`, "captures neutral on tick 30 and pauses contest with transition receipts".
6. Contest pauses and emits one transition: same test; relief is pinned by "emits one uncontested transition when a contest clears".
7. Abandoned progress decays: `nodes.test.ts`, "decays and fully neutralizes before enemy capture".
8. Opposite faction cannot inherit progress: `nodes.test.ts`, "unwinds previous faction progress before switching".
9. Enemy ownership requires neutralize then capture: `nodes.test.ts`, "decays and fully neutralizes before enemy capture".
10. Minor/Crown income +1/+2 on 30-tick boundaries: `economy.test.ts`, "pays node income only on the 30-tick boundary".
11. Fresh capture gives no instant bonus: `economy.test.ts`, "does not pay a freshly captured node outside an income boundary".
12. Kill rewards 5/10/10/14/25/0: `economy.test.ts`, "pins every kill reward, unlock threshold, and the capacity ceiling".
13. Positional reward adds floored +25% from combat provenance: `economy.test.ts`, "pays exactly one positional reward from live focus-fire combat provenance", plus the focused synthetic reward-table test and `combat-resolution.test.ts` provenance assertions.
14. Unlock thresholds 0/2/3/4: `economy.test.ts`, "pins every kill reward, unlock threshold, and the capacity ceiling".
15. Territory loss blocks relocked recruitment without deletion: `production-queue.test.ts`, "relocks recruitment after territory loss without deleting living units or queues".
16. Command Capacity derives correctly and caps at 16: `economy.test.ts`, "derives unlocks, capacity and queued reservations" and "pins every kill reward, unlock threshold, and the capacity ceiling".
17. Living + queued units reserve capacity: `economy.test.ts`, "derives unlocks, capacity and queued reservations".
18. Piece caps include queued reservations: `production-queue.test.ts`, "enforces unlock, Crown, capacity and hard caps without mutation".
19. Insufficient Crown rejects without mutation: same test.
20. Legal recruitment spends immediately and queues FIFO: `production-queue.test.ts`, "accepts Pawn, spends immediately, reserves FIFO and increments ordinal".
21. No deployment before 50-tick pulse: `reinforcements.test.ts`, "deploys only at tick 49 and uses anchor first".
22. Deterministic nearest free spawn: `reinforcements.test.ts`, "searches nearest legal cell deterministically and skips node centers".
23. Spawn blockage leaves queue intact: `reinforcements.test.ts`, "keeps blocked head and prevents leapfrog".
24. Blocked head prevents leapfrog: same test.
25. Deployed units cannot attack retroactively: `phase4-ordering.test.ts`, "deploys after combat so a new unit cannot attack until a later tick".
26. Promotion resolves only on pulse: `promotion.test.ts`, "resolves only on pulse and preserves tactical/combat state while changing kind".
27. Queen promotion impossible: `PromotableUnitKind` in `src/sim/types.ts` admits only Knight/Bishop/Rook; compile-time contract is exercised by promotion tests.
28. Promotion rechecks unlock/cap/Crown/capacity: `promotion.test.ts`, "rechecks unlock and Crown..." and "pins promotion prices and rechecks Crown, target cap, and capacity at the pulse".
29. Promotion prices 14/14/28: latter promotion test.
30. Promotion replacement remains atomic at same coordinate and preserves tactical state: `promotion.test.ts`, "resolves only on pulse and preserves tactical/combat state while changing kind".
31. Terminal state blocks Phase 4 mutations: `phase4-ordering.test.ts`, "stops Phase 4 mutation after decisive King combat", and `terminal-match.test.ts`, "freezes state and rejects later commands in deterministic order".
32. Phase 3 sovereign regressions: existing sovereign outcome/transition/threat/terminal tests; authoritative rerun pending Termux.
33. Phase 2 combat/Guard/replay regressions: existing combat/Guard/Phase 2 replay tests; authoritative rerun pending Termux.
34. Phase 1 geometry/threat regressions: existing geometry/threat tests; authoritative rerun pending Termux.
35. Phase 0 kernel regressions: existing kernel tests; authoritative rerun pending Termux.
36. Multi-tick Phase 4 replay byte equivalence: `phase4-replay.test.ts`, "is byte-stable through capture, income, kill reward, recruitment, deployment and promotion".

## Additional ordering proofs

`phase4-ordering.test.ts` also pins movement-before-node-control, income-before-recruitment, kill-reward-before-recruitment, deployment-after-combat, promotion-before tick-end sovereign threat, and decisive sovereign combat stopping every later Phase 4 stage. `reinforcements.test.ts` additionally pins the review-focus case where territory loss leaves a faction over capacity: the queue head stays blocked, living units remain, and Crown is not refunded.

## External gate

Phase 4 becomes **VERIFIED** only after the exact packaged tree passes both:

`npm test`

`npm run typecheck`

GitHub CI remains a separate final receipt if/when this branch is pushed and opened as a pull request.
