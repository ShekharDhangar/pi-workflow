---
description: pi-workflow — direct issue path (spec → plan → implement → review), you review at the end
---

You are orchestrating the pi-workflow **issue** workflow for: `$ARGUMENTS`

You are the parent/controller. Use the `subagent` tool to delegate; keep decision-making yourself.
Call `set_stage` (flow: "issue") at each transition. Follow `AGENTS.md` and `constitution.md`.

## 0. Isolate
If the working tree has **uncommitted changes, stop and ask me**. Otherwise: `git switch -c pi-workflow/<slug>`.

## 1. Spec  → `set_stage("issue", "Spec")`
**Greenfield vs brownfield:** `pi-workflow.workflow-scout` the codebase — is the affected code new or does something depend on it?
- **Greenfield** → breaking changes fine, no shims, no deprecation wrappers, implement cleanly. Record `greenfield: yes` in Intent.
- **Brownfield** → note what must not break in Out of Scope.
- **Only ask me** if you've determined something depends on the touched code: "This touches [X], which [Y] depends on. Does it need to remain backward-compatible?" I will tell you whether to maintain compat or treat as greenfield. Do not ask if the code is clearly new.

Write `.pi/work/<slug>/spec.md` with four sections:
- **Intent** — what the issue is, constraints, failure modes.
- **Context** — the relevant code/stack (`pi-workflow.workflow-scout` if needed).
- **Out of Scope** — what must NOT be touched. Be explicit; the worker is bound by this list.
- **Acceptance** — prose done-condition here, plus **`.pi/work/<slug>/acceptance.sh`**: exits 0 iff done (include fixtures, e.g. `expected.txt`). If you can't form a checkable condition, **ask me** or suggest `/workflow-feature`.

**Red-green check.** Run `check_acceptance` on the *unchanged* codebase — it **must FAIL**. If it passes before any work, fix it or ask me.

## 2. Plan  → `set_stage("issue", "Plan")`
`pi-workflow.workflow-planner` subagent (read-only): produce `.pi/work/<slug>/plan/` as multiple `task-NN.md` files + `tracker.md` — never one giant file. Each task states its file scope and a short functional description.

**Gap-fill.** Cross-check the task list against `acceptance.sh`: every testable condition needs at least one task. Add missing `task-NN.md` files before proceeding.

**→ Pause for my approval.** Show me the plan and `acceptance.sh`. On approval, write `.pi/work/<slug>/.frozen`.

## 3. Implement — the unattended verify-fix loop  → `set_stage("issue", "Implement · task N/total")`
Per task in order:
- `pi-workflow.workflow-worker` implements the task (code + unit/behaviour tests). A new task discovered mid-flight gets its own `task-NN.md` first.
- **Verify** after every 5 completed tasks and at the end (≤5 tasks → end only):
  - **(a) Acceptance.** Call `check_acceptance` — its exit code is the verdict. FAIL → feed real output to `pi-workflow.workflow-worker`, fix, re-run.
  - **(b) Judgment.** Fresh-context `pi-workflow.workflow-reviewer` via `/review-loop` against `review-rubric.md`. Adds findings; cannot override a FAIL.

**Stop on ANY of:**
1. **Done** — Acceptance met and final verify passes.
2. **Budget cap** — `check_acceptance` returns HARD STOP (3 fix-rounds reached).
3. **Hard blocker** — constitution violation, unapproved scope/architecture decision, or `pi-workflow.workflow-worker` believes `acceptance.sh` is wrong (must escalate, never change it silently).

Note reviewer disagreements and surface at the end; don't halt on them.

## 4. Done → pause for my review
Write `.pi/work/<slug>/gate3.md` (result summary · open findings · disagreements · scope expansions · acceptance result) with an **`## Outcomes`** block: `acceptance: PASS/FAIL` · `fix-rounds: N` · `human-escalations: N` · `reviewer-findings: N` · `notes: what was awkward`.
Commit on the branch. Show me `gate3.md` + `git diff main...HEAD`, then stop. Do not merge or push.
