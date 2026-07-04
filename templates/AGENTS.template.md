# pi-workflow — map & loop (native context, inherited by children)

Copy this file to your project root as `AGENTS.md` and edit the constitution section for your repo.

## The loop
- `/pi-workflow spec <text>` — interactive spec phase: brainstorm → spec → acceptance → freeze (then choose `/pi-workflow run` or `workflow run`).
- `/pi-workflow run <slug>` — resume an approved work item in a fresh Pi session.
- `/workflow-issue <text>` — direct path: spec → plan → (approve) → implement → review → (approve) → commit.
- `/workflow-feature <text>` — full path: brainstorm → (approve spec) → plan → (approve) → implement → review → (approve) → commit.
- `/research-coach <text>` — researcher-orchestrator (requirements) → pi-researcher-local + pi-researcher-web (`research/angle-*.md`) → **pi-researcher-synthesis** pass 1 + pass 2. First pass may be sufficient; second pass improves. Parent never synthesizes inline.
- Orchestration is **parent-driven** (the workflow prompt is guidance, not a runtime engine).
- Models per role: set explicit `subagents.agentOverrides.<runtime>.model` in `~/.pi/agent/settings.json` or `.pi/settings.json` (no fallback to `defaultModel` for auto/loop). Use `/research-cast settings` (research cast) or `/workflow-cast settings` (Scout/Planner/Worker/Reviewer/Reflect), or copy `templates/research-agent-models.example.json` / `templates/workflow-agent-models.example.json`. Use any provider/model your Pi install exposes — not hardcoded by pi-workflow. Never set an `extensions:` field on an agent — it disables extension discovery and drops pi-workflow's guardrails in that child.

## Artifacts (under `.pi/work/<slug>/`)
`spec.md` (Intent · Context · Out of Scope · Acceptance) · **`acceptance.sh`** (the executable target — exits 0 iff done) · `plan/` (`tracker.md` + one `task-NN.md` per task) · `reviews/` · `gate3.md`. The `pi-workflow` extension blocks edits to `.env`, lockfiles, `constitution.md`, and post-freeze: `spec.md` + `acceptance.sh`.

**Banned patterns in `acceptance.sh`:** bare `exit 1` stubs; `grep` for file existence alone; tests that pass on the unmodified codebase; tests that pass for any non-empty output. The script must discriminate — correct implementation exits 0, everything else exits non-zero.

## The verifier has teeth (don't trust model "PASS")
Acceptance pass/fail is **deterministic**: `check_acceptance` runs `acceptance.sh` and the real exit code is the verdict — no agent may declare acceptance met over a `check_acceptance` FAIL. A model reviewer adds judgment but cannot override the deterministic result.

## Branch isolation
Every work item runs on `pi-workflow/<slug>` — **never pushes** (extension blocks `git push`), never touches `main`. Dirty working tree at start → stop and ask.

## Human gates
Approve the **target** (`acceptance.sh` + spec for `/pi-workflow spec`, or spec on the feature path) before implementation · plan approval · final review + merge/push. Between approvals, implementation runs **autonomously** — disagreements are logged for the final review.

---

# constitution.md (project rules — edit per project)

> Hard, non-negotiable rules. The reviewer treats violations as blockers; the extension blocks
> edits to this file. Replace these with your project's real invariants.

1. Prefer the simplest thing that solves the problem; delete before you add.
2. Surgical, scoped changes — stay within the task's declared files unless you justify expanding.
3. No silent failures: handle or surface errors; never swallow them.
4. Match existing patterns in the codebase over introducing new ones.
5. Tests accompany behaviour changes.
