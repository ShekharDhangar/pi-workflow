---
description: pi-workflow — full feature path (brainstorm → plan → implement → review)
---

You are orchestrating the pi-workflow **feature** workflow for: `$ARGUMENTS`

You are the parent/controller. Use the `subagent` tool to delegate; keep decision-making yourself.
Call `set_stage` (flow: "feature") at each transition. Follow `AGENTS.md` and `constitution.md`.

## 0. Isolate
If the working tree has **uncommitted changes, stop and ask me**. Otherwise: `git switch -c pi-workflow/<slug>`.

## 1. Brainstorm  → `set_stage("feature", "Brainstorm")`
- **Greenfield vs brownfield:** scout the codebase before the first question — is the affected code new or does something depend on it? Greenfield → breaking changes fine, no shims, implement cleanly; record `greenfield: yes` in Intent. Brownfield → note compat constraints in Out of Scope. **Only ask me** if you've determined something depends on the touched code: "This touches [X], which [Y] depends on. Does it need to remain backward-compatible?" I will answer. Do not ask if the code is clearly new.
- **Interview me** one first-principles question at a time. If the problem is too big, ask me to break it down.
- **Engineering research** (non-trivial direction): load **`research-coach` skill** before `spec.md` — full Phases 0–5; parent never synthesizes inline. Skip for obvious small scope.
- **Problem sharpening** (optional, ambiguous *whether* to build): interactive **`pi-workflow.researcher-orchestrator`** for Phase 0 only — Hamming check before fan-out.
- Write `.pi/work/<slug>/spec.md` (**Intent · Context · Out of Scope · Acceptance**) and **`.pi/work/<slug>/acceptance.sh`** (exits 0 iff done, with any fixtures). Out of Scope: list what must NOT be touched — adjacent features, files outside declared scope, anything needing separate approval.
- **Red-green check:** run `check_acceptance` on unchanged code — it **must FAIL**. If it passes, fix it or ask me.
- Iterate with me until **I approve the spec and `acceptance.sh`**. On approval, write `.pi/work/<slug>/.frozen`. **Pause for my approval.**

## 2. Plan  → `set_stage("feature", "Plan")`
Same as the issue workflow: `planner` → multi-file `plan/` + `tracker.md`, gap-fill (cross-check every testable condition in `acceptance.sh` against tasks; add missing `task-NN.md` files), then **pause for my plan approval**.

## 3. Implement  → `set_stage("feature", "Implement · task N/total")`
Same as the issue workflow.

## 4. Done → pause for my review
Write `.pi/work/<slug>/gate3.md` and **stop**. Do not commit/push until I authorise it.
