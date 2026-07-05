# pi-workflow — map & loop (native context, inherited by children)

Copy this file to your project root as `AGENTS.md` and edit the constitution section for your repo.

## The loop
- `/pi-workflow spec <text>` — interactive spec phase: scout → direct spec or brainstorm → `acceptance.sh` → approval → freeze (then choose `/pi-workflow run` or `workflow run`).
- `/pi-workflow run <slug>` — resume an approved work item in a fresh Pi session.
- `/research-coach <text>` — researcher-orchestrator (requirements) → pi-researcher-local + pi-researcher-web (`research/angle-*.md`) → **pi-researcher-synthesis** pass 1 + pass 2. First pass may be sufficient; second pass improves. Parent never synthesizes inline.
- Orchestration is **parent-driven** (the workflow prompt is guidance, not a runtime engine).
- Models per role: set explicit `subagents.agentOverrides.<runtime>.model` in `~/.pi/agent/settings.json` or `.pi/settings.json` (no fallback to `defaultModel` for auto/loop). Use `/research-cast settings` (research cast) or `/workflow-cast settings` (Scout/Planner/Worker/Reviewer/Reflect), or copy `templates/research-agent-models.example.json` / `templates/workflow-agent-models.example.json`. Use any provider/model your Pi install exposes — not hardcoded by pi-workflow. Never set an `extensions:` field on an agent — it disables extension discovery and drops pi-workflow's guardrails in that child.

## Artifacts (under `.pi/work/<slug>/`)
`spec.md` (Intent · Context · Out of Scope · Acceptance) · **`acceptance.sh`** (the executable target — exits 0 iff done) · `plan/` (`tracker.md` + one `task-NN.md` per task) · `reviews/` · `gate3.md`. The `pi-workflow` extension blocks edits to `.env`, lockfiles, `constitution.md`, and post-freeze: `spec.md` + `acceptance.sh`.

**Banned patterns in `acceptance.sh`:** bare `exit 1` stubs; `grep` for file existence alone; tests that pass on the unmodified codebase; tests that pass for any non-empty output. The script must discriminate — correct implementation exits 0, everything else exits non-zero.

## The verifier has teeth (don't trust model "PASS")
Acceptance pass/fail is **deterministic**: `check_acceptance` runs `acceptance.sh` and the real exit code is the verdict — no agent may declare acceptance met over a `check_acceptance` FAIL. A model reviewer adds judgment but cannot override the deterministic result.

## Branch isolation
Every work item runs on `pi-workflow/<slug>` — **never pushes** (extension blocks `git push`), and by default does not edit `main` / `master`. Dirty working tree at start → stop and ask.

If your repo deliberately allows edits on the base branch, set `piWorkflow.allowEditsOnMain: true` in Pi settings. Project `.pi/settings.json` overrides the user default.

## Human gates
Approve the **target** (`acceptance.sh` + spec for `/pi-workflow spec`, or spec on the feature path) before implementation · plan approval · final review + merge/push. Between approvals, implementation runs **autonomously** — disagreements are logged for the final review.

## Optional: MR review policy (edit for your repo)

If this repo uses a final PR/MR reviewer after branch work is done, define the local policy here.

### Forge
- This repo uses: `github` / `gitlab` / other
- Primary CLI or API path: `gh` / `glab` / custom

### Trigger
- MR review is **manual only** and runs **after** a PR/MR exists.
- Define how to trigger it in this repo (explicit URL, current branch, issue comment, slash command, etc.).

### Reviewer inputs
The reviewer should read:
- the PR/MR diff
- the full checked-out repo
- this `AGENTS.md`
- `constitution.md`
- optional project memory (for example Hindsight), if configured

### Comment behavior
- Post inline comments for concrete evidence-backed findings
- Post one summary comment with blockers / fix-now / optional
- Do not auto-approve, auto-merge, or auto-push unless this repo explicitly says otherwise

### Memory rules
- Memory is advisory only; direct code and executable evidence win
- Suppress low-confidence or repetitive comments
- If this repo enables Hindsight or similar memory, scope it to this repo only

---

# constitution.md (project rules — edit per project)

> Hard, non-negotiable rules. The reviewer treats violations as blockers; the extension blocks
> edits to this file. Replace these with your project's real invariants.

1. Prefer the simplest thing that solves the problem; delete before you add.
2. Surgical, scoped changes — stay within the task's declared files unless you justify expanding.
3. No silent failures: handle or surface errors; never swallow them.
4. Match existing patterns in the codebase over introducing new ones.
5. Tests accompany behaviour changes.
