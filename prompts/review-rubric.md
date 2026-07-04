---
description: pi-workflow — review rubric (used by reviewers in /review-loop)
---

Review the current change as a **fresh-context** reviewer. Read `constitution.md`, the task/plan, and the diff directly from files.

This review has **two parts** — do both, every time.

## A. Task Review

Prefer **executable** evidence — if an Acceptance item can be a command/test, *run it*.

Check, in priority order:
1. **Acceptance — deterministic, not your opinion.** Call `check_acceptance` and report its verdict + real output. Then sanity-check the script: does `acceptance.sh` genuinely test the stated intent, or is it trivially passing / missing cases? A weak acceptance script is a blocker.
2. **Correctness / regressions** — edge cases, error handling, no silent failures.
3. **Constitution** — any violation of a hard rule in `constitution.md`? (blocker)
4. **Completeness** — does the change cover the full scope of its `task-NN.md`, not a partial/stubbed version?
5. **Tests** — adequate unit/behaviour coverage for the change, and run locally where the change is runnable?

(Interim reviews catch *drift from spec intent*. Final review checks *does the result meet Acceptance*.)

## B. Coding Guidelines Review

Read `coding-guidelines.md` (bundled alongside this rubric) and check the diff against it: clarity, structure, correctness & security, discipline (surgical scope, no stray edits). Call out any hit on its Red Flags list by name.

Synthesise into: **blockers** · **fixes worth doing now** · **optional** · **defer/ignore (one-line reason)**. Flag unapproved product/scope/architecture decisions for the human.
