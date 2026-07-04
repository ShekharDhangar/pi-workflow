---
description: pi-workflow — interactive workflow router (spec or run)
argument-hint: "spec <what you want to build> | run <slug>"
---

You are orchestrating the pi-workflow for `$ARGUMENTS`.

The **first word** chooses the mode:

- `spec` — interactive spec authoring: brainstorm, ask one question at a time, write `spec.md` + `acceptance.sh`, red-green until the gate fails on unchanged code, then freeze and stop.
- `run` — execute an already-approved work item from disk using the dedicated agents `pi-workflow.workflow-scout`, `pi-workflow.workflow-planner`, `pi-workflow.workflow-worker`, `pi-workflow.workflow-reviewer`, and `pi-workflow.workflow-reflect`.

## Shared rules

- Keep the session conversational; do **not** turn this into a one-shot CLI task.
- Auto-generate the slug from the request (`kebab-case`, no spaces). Show it to the human before creating the branch.
- Use relevant skills when the task warrants it (`research-coach` for non-trivial direction; `writing-great-skills` when authoring skills/prompt-like content in this package).
- Keep all workflow artifacts under `.pi/work/<slug>/`.
- Do **not** commit workflow artifacts; the repo already gitignores `.pi/work/`.

## If mode = `spec`

1. Call `set_stage("spec", "Brainstorm")`, then load `research-coach` when the task is not obviously trivial.
2. Ask one first-principles question at a time.
3. Call `set_stage("spec", "Spec")` and write `.pi/work/<slug>/spec.md` with Intent · Context · Out of Scope · Acceptance.
4. Write `.pi/work/<slug>/acceptance.sh` so it fails on unchanged code and passes only when the spec is met.
5. Run `check_acceptance` on the unchanged codebase — it **must FAIL**.
6. Iterate until the human approves the spec and `acceptance.sh`.
7. Call `set_stage("spec", "Freeze")`, write `.pi/work/<slug>/.frozen`, then stop and print the next step options:
   - `/pi-workflow run <slug>` — fresh Pi session
   - `workflow run <slug>` — shell / headless runner

## If mode = `run`

1. Require an existing slug and the frozen spec artifacts (`spec.md`, `acceptance.sh`, `.frozen`).
2. Rehydrate from `.pi/work/<slug>/status.md`, `failure-ledger.md`, `plan/tracker.md`, and the latest spawn logs.
3. Set `set_stage("run", "Recovery")` if the work is resuming from FAILED; otherwise start at `set_stage("run", "Plan")`.
4. Use the package workflow agents explicitly:
   - `pi-workflow.workflow-scout` for recon when context is missing or stale
   - `pi-workflow.workflow-planner` for plan generation and gap-fill
   - `pi-workflow.workflow-worker` for implementation and gate-response rounds
   - `pi-workflow.workflow-reviewer` for read-only judgment against `prompts/review-rubric.md`
   - `pi-workflow.workflow-reflect` for durable learnings after the work passes
5. If the work hits the fix-round cap and ends `FAILED`, stop. The human can open `/pi-workflow run <slug>` again to inspect and continue in a fresh Pi session.
6. Do not start from scratch unless the disk state is missing or explicitly reset.

If the first word is missing or unknown, ask the human whether they want `spec` or `run`.
