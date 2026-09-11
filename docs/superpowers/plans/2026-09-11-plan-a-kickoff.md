# Plan A Kickoff — Admin Authorization & Regional Isolation

Date: 2026-09-11 · Plan: `docs/superpowers/plans/2026-09-11-admin-authz-isolation-plan.md` · Branch: `feat/admin-platform-upgrade` · Audience: the developer (or controller session) executing Plan A

This is the execution order. Read it once, then work from the plan file and the ledger. Do not re-audit: the audit, the design and the program roadmap are done and are the record.

## 1. Decision: execution mode

**Subagent-driven development is the chosen mode.** Use `superpowers:subagent-driven-development`: one fresh implementer subagent per task, a task review (spec compliance + code quality) after every task, a whole-branch review at the end. Reasons: the nine tasks are independent enough to review one at a time, every task carries its own spec and test cycle, and the controller's context must stay free for coordination across gateway, four module backends and a live fleet.

**Inline execution is the fallback only.** If the executing session cannot spawn subagents (a plain terminal, a human developer working alone), use `superpowers:executing-plans` on the same branch with the same ledger, one task at a time, and request a review with `superpowers:requesting-code-review` after A2, A4 and A9 at minimum. Do not mix modes mid-plan.

**Start with Task A1.** It is the P0 (any signed-in customer can ban IPs) and the smallest task; landing it first also proves the toolchain (vitest, `nest build`, live probe, commit) before the larger tasks.

## 2. Branch and workspace

The five planning documents are untracked on `fix/system-check-2026-09-06` at `9e310a3`. Commit them first so the branch carries its own plan, then branch:

```bash
git add docs/audits/2026-09-11-admin-platform-audit.md docs/superpowers/specs/2026-09-11-admin-platform-design.md docs/superpowers/plans/2026-09-11-admin-platform-program.md docs/superpowers/plans/2026-09-11-admin-authz-isolation-plan.md docs/superpowers/plans/2026-09-11-admin-identity-rbac-audit-plan.md docs/superpowers/plans/2026-09-11-plan-a-kickoff.md
git commit -m "docs(admin): current-state audit, platform design, program roadmap and Plans A/B for the admin upgrade" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git checkout -b feat/admin-platform-upgrade
```

**Work in place in `C:\KARTSEEKAPP` on that branch; do not create a git worktree for this plan.** Two facts decide it: 21 environment files the fleet depends on are git-ignored and exist only in this checkout (`.env`, `apps/api/.env`, `apps/web/.env.local`, and a `.env` / `.env.local` pair under every `modules/<name>/backend|frontend`), and the dev fleet binds fixed ports, so only one checkout can run it anyway. The audit found a P0 caused by exactly one missing zone `.env`; a fresh worktree would recreate that for every module. (`.worktrees/` is also not git-ignored in this repo.) The branch is the isolation; the working tree is clean at the start, so nothing else is at risk. If a worktree is used regardless, copy all 21 files and run `npm install` from the repository root only — never inside a workspace, and never delete the lock file.

Baseline before Task A1, recorded as the first ledger entries:

```bash
cd apps/api && npx vitest run            # expected green (18/18 suites on 2026-09-06)
cd apps/api && npx nest build --all       # expected exit 0
```

## 3. Ledger and bookkeeping

- Resolve the workspace with the skill's script: `scripts/sdd-workspace docs/superpowers/plans/2026-09-11-admin-authz-isolation-plan.md` (from the skill directory `…/superpowers/6.2.0/skills/subagent-driven-development/`). It prints `.superpowers/sdd/2026-09-11-admin-authz-isolation-plan/`; the ledger is `progress.md` there, first line `# SDD ledger — plan: docs/superpowers/plans/2026-09-11-admin-authz-isolation-plan.md`. That directory is git-ignored; the git history is the durable record.
- Task briefs: `scripts/task-brief <plan> <N>`; review packages: `scripts/review-package <plan> <BASE> <HEAD>` with the BASE recorded before each dispatch (never `HEAD~1`; every task here makes two commits).
- After each task also update `docs/superpowers/plans/2026-09-11-admin-platform-program.md`: the Plan A checklist row to **Complete** when the review is clean, to **Tested** when the task's live probe has passed on the running fleet, and the bug register rows it closes (A1 → BUG-001; A2 → BUG-023; A3 → BUG-002; A4 → BUG-003, 011, 012, 024; A5 → BUG-004; A6 → BUG-005) with Root cause / Fix / Test / Result / Regression filled in. Those edits are part of the task's commit.

## 4. Task order, dependencies and model choice

| Task                      | Depends on      | Implementer model | Reviewer model                 | Why                                                                                                                 |
| ------------------------- | --------------- | ----------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| A1                        | —               | haiku             | sonnet                         | two files, code given verbatim                                                                                      |
| A2                        | A1              | sonnet            | sonnet                         | new library module, two specs, three deletions, one delegation edit                                                 |
| A3                        | A2              | sonnet            | sonnet                         | gateway + admin-service; one conditional step (revenue)                                                             |
| A4                        | A2              | opus              | opus                           | largest task: gateway + three backend files + a fifteen-row route table; needs judgment on record→market resolution |
| A5                        | A2              | sonnet            | sonnet                         | many handlers, code given; backend service signatures must be read first                                            |
| A6                        | A2              | sonnet            | sonnet                         | grocery gateway + backend + spec                                                                                    |
| A7                        | A2              | sonnet            | sonnet                         | four small controllers; entity field names looked up per module                                                     |
| A8                        | A3–A7           | haiku             | sonnet                         | code given; it will list any route the earlier tasks missed                                                         |
| A9                        | A1–A8, fleet up | sonnet            | sonnet                         | code given, but the run needs fleet troubleshooting                                                                 |
| Final whole-branch review | all             | —                 | fable (or opus if unavailable) | the most capable model, per the skill                                                                               |

Never dispatch two implementers at once. A3–A7 are independent of each other but touch the same gateway module registrations; run them in the order listed. Fix-loop rounds 4–5 escalate one tier (haiku → sonnet → opus → fable). Always pass the model explicitly.

## 5. Pre-flight scan — resolved before Task A1

The subagent-driven skill asks the controller to scan the plan for contradictions before the first dispatch. The plan author did that scan; these are the rulings. Put the relevant one into the dispatch of the task it concerns; do not present them again as open questions unless implementation contradicts them.

1. **Helper name is load-bearing.** Every gateway controller must name its private helper exactly `scopeOf(req, requested?, what)` and call `resolveMarket` / `marketScopeOf` / `assertRecordInScope` inside the route handler's own body. The A8 regression spec detects scope by the literal text `this.scopeOf(` or one of those three calls in the route block. A differently named helper, or a helper that hides the call one level deeper, makes A8 fail on every route that used it. This is a global constraint for A3–A7.
2. **A3 revenue report.** Step 7 is conditional on a grep. If `getRevenueReport` synthesises its series, the `NotImplementedException` branch is the correct outcome and the console's revenue widget will show an error state until Plan C1; record `Task 3: revenue report → 501 pending C1` in the ledger and the program doc. This is not a regression.
3. **A4 fail-closed rows.** In Step 7, any record route whose market cannot be resolved from the row (no market column, no one-join owner) answers 403 to a locked admin with the message given in the plan. A reviewer may flag this as "regional admins lose access to reviews/complaints". Plan owner's ruling: fail closed is the intent; the columns arrive in Plan C. Park such a finding with that ruling; it does not enter the fix loop.
4. **A4 table path.** The product query joins `sellers`. The marketplace schema has `public.*` decoys shadowing the real `marketplace.*` tables (memory `project_marketplace_schema_decoys`): use the entity's schema-qualified name (`tablePath`) or `getRepository(Seller).metadata.tablePath`, never a bare string. Confirm with `grep -n "@Entity" modules/marketplace/backend/src/entities/seller.entity.ts` before writing the join. Put the resolved table path into the A4 dispatch.
5. **A4 constructor order.** The spec's `build()` helper lists the controller's constructor arguments in the order read on 2026-09-11; re-check lines 40–60 of `admin-marketplace.controller.ts` and fix the spec, not the constructor.
6. **A5 backend signatures.** Before dispatching A5, run `grep -n -E "async (upsertRateCard|upsertConfig|getPayouts|getPayoutSummary|findNearbyDrivers|reviewDocument)\(" modules/taxi/backend/src/services/*.ts` and paste the signatures into the dispatch's interfaces block. The `assertInMarket` lines are non-negotiable; the call shapes must match what exists.
7. **A7 field names.** Before dispatching A7, run the entity greps the plan names (hotel, restaurant, pharmacy-store, clinic) and put the exact market property per entity into the dispatch. A7 is the one task written from prose; the implementer must not guess a column.
8. **Builds.** `npx nest build --all` from `apps/api` covers only the gateway and core services. Tasks that touch a module backend also run that backend's own build (`npm run build` in `modules/<name>/backend`) before committing. Both are the gate; `tsc` alone is not.
9. **Commits.** Two commits per task where the plan says so (gateway, then module). lint-staged fails when one commit mixes `apps/api` with zone or module files.
10. **Live probes and `DEV_AUTH_BYPASS`.** Every curl and every script request carries an `Authorization` header; an anonymous local request is a super-admin and proves nothing. The global-admin account for A9 is `admin@kartseek.com` (an unlocked `ADMIN`, which `resolveMarket` treats as global; there is no seeded `SUPER_ADMIN` until Plan B3). The fleet must be up for the probe steps of A1, A3, A4, A5, A6 and A9 (`npm run dev:all` in `apps/api` plus each module backend's `dev`). If the fleet cannot run in the executing environment, the task may be marked **Complete** on green specs and build, but not **Tested**; the ledger says which probes are outstanding.

## 6. Per-task definition of done

A task is complete when all of the following hold; the reviewer checks the first three, the controller the rest:

1. Every step's spec in the plan is present and green (`npx vitest run <file>` from `apps/api`, or the module's runner).
2. `npx nest build --all` exits 0; the touched module backend builds.
3. Commits exist with the plan's messages and the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer.
4. The live probe in the task passed (→ Tested) or is recorded as outstanding in the ledger (→ Complete).
5. The program roadmap's checklist row and bug register rows are updated in the same commit series.
6. The ledger has the completion line with the commit range.

## 7. Plan-level exit criteria

Plan A is finished when the ledger shows all nine tasks complete and:

- `cd apps/api && npx vitest run` is green, including the seven new spec files (`market-scope.spec.ts` ×2, `admin-core.controller.spec.ts`, `admin-marketplace.scope.spec.ts`, `admin-taxi.controller.spec.ts`, the grocery and marketplace backend scope specs, `admin-market-scope.regression.spec.ts`) and the extended `route-exposure.regression.spec.ts`;
- `npx nest build --all` exits 0 and the marketplace, taxi, grocery, hotel, restaurant, pharmacy and doctor backends build;
- with the fleet up, `npm run verify:admin-scope` reports `0 failed` and `node scripts/verification/regional-isolation-authz.mjs` still reports 36/36;
- the final whole-branch review is clean or its residual findings are parked with rulings;
- the workspace directory is deleted and `superpowers:finishing-a-development-branch` has been followed to the point of presenting options.

**Do not merge.** Open the pull request against `fix/system-check-2026-09-06`, not `main`, so the diff shows Plan A alone; that parent branch is itself unmerged and the order of merging is the user's decision. The PR description ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## 8. When to stop and ask

Stop and report to the user (not to the plan author) when: a task hits BLOCKED that more context or a stronger model does not resolve; a reviewer finding contradicts the plan text and is not covered by §5; the baseline tests are red before A1; the fleet cannot be started and a task's probe is the only proof of a P0 fix (A1, A3, A4, A5, A6). Everything else, including fix loops up to the cap, is handled inside the skill without check-ins.

## 9. Then

When Plan A's PR is open, start `docs/superpowers/plans/2026-09-11-admin-identity-rbac-audit-plan.md` (Plan B) on the same branch, with its own ledger directory, beginning at Task B1. Plan B's live scripts assume `DEV_MFA_ECHO=true` from B2 onward.
