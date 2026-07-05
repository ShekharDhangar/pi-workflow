# `/pi-workflow spec` + `workflow run` — Autonomous, self-improving workflow — Design

**Date:** 2026-07-04
**Status:** Approved for planning
**Origin:** User wants: one **interactive Pi session** to brainstorm → spec → `acceptance.sh` →
approve → freeze; then **choose** run in Pi (new session) or run via **shell script** (walk away).
Plus self-improvement via project-local skills after each run.

**Lineage:** [Chakravyuh](https://github.com/maahaa-dev/chakravyuh) — failure ledger, gate in harness,
spawn-per-role. We add autonomous reflect + held-out guard.

## Goal

Three **supervised** commands (unchanged) plus one **autonomous** path:

| Path | Entry | Human? |
|------|-------|--------|
| **Autonomous spec** | `/pi-workflow spec <text>` | Interactive Pi — direct spec or brainstorm until you approve |
| **Autonomous run (Pi)** | `/pi-workflow run <slug>` | No — new Pi session, fresh context |
| **Autonomous run (shell)** | `workflow run <slug>` | No — headless script, walk away |

Autonomous = **one human gate** (approve spec + `acceptance.sh` in Phase 1). Phase 2 is fully
unattended until optional `--mr`.

## Pi prompts vs shell (critical)

| Phase | Surface | Not this |
|-------|---------|----------|
| **Spec** | `/pi-workflow spec …` — Pi TUI, conversational | Not a shell command |
| **Run in Pi** | `/pi-workflow run <slug>` — Pi TUI (prefer **new session**) | Not `workflow run --pi` |
| **Run outside Pi** | `workflow run <slug>` — shell, headless by default | Not a Pi prompt |

Phase 1 is **always** back-and-forth in Pi. The orchestrator loads skills (research-coach, etc.) as
needed, iterates on spec/acceptance with you, and **stops at `.frozen`** — it does not plan or
implement in the same session.

## Auto slug

Derived from `$ARGUMENTS` before creating the branch — **never spaces**:

```
"POST /v1/users with validation"  →  post-v1-users-with-validation
"add user API"                    →  add-user-api
```

Rules: lowercase · `[a-z0-9-]` only · max ~40 chars · collision → append `-2`.

Orchestrator **shows proposed slug in chat**; you may say "use slug `user-api`" before branch creation.
Artifacts: `.pi/work/<slug>/` · branch: `pi-workflow/<slug>`.

## Two phases, one contract

```
Phase 1 — Pi session (interactive)
  /pi-workflow spec <text>
  → auto slug · brainstorm · spec.md · acceptance.sh
  → red-green FAIL · you approve · .frozen
  → STOP — print next steps only (do not auto-run Phase 2)

Phase 2 — your choice (requires .frozen)
  /pi-workflow run <slug>              # Pi, new session recommended
  workflow run <slug>               # terminal script, walk away (headless by default)
  workflow run <slug> --mr          # optional, after DONE
```

Shared disk: `.pi/work/<slug>/` — `failure-ledger.md`, `status.md`, `plan/`, role briefs, hook
(`.frozen`, `.mr-approved`). Spawn logs live **outside repo** (see Observability). Either run mode
can hand off mid-run or after FAILED via artifacts.

```
                    ┌─────────────────────────────────────┐
                    │  Shared contract                     │
                    │  .pi/work/<slug>/ · failure-ledger   │
                    │  role briefs · .frozen               │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
    workflow run <slug>                       /pi-workflow run <slug>
    workflow-run-harness.ts                 prompts/pi-workflow.md
    spawn pi --mode json per role           Pi parent + fresh subagents
```

**Naming:** **`workflow run`** (no leading `/`) = shell driver — always headless. **`/pi-workflow run`**
= Pi TUI. Inner retries = **fix-rounds** / **failure ledger** — not "loop".

## User experience

### Phase 1 — `/pi-workflow spec` (Pi only)

Example session:

```text
/pi-workflow spec POST /v1/users with email validation

Agent: Proposed slug: post-v1-users-email-validation. OK?
You: yes
Agent: [brainstorm questions, research-coach if needed]
Agent: Draft spec.md + acceptance.sh …
Agent: Red-green: FAIL (good). Review?
You: tighten the 400 case … approve
Agent: .frozen written.

Slug: post-v1-users-email-validation
Next (pick one):
  • new Pi session:  /pi-workflow run post-v1-users-email-validation
  • terminal:        workflow run post-v1-users-email-validation
```

**Must not:** start plan/implement · auto-invoke `workflow run` · treat spec as one-shot CLI.

Optional v1 flags on prompt: `--direct` (skip brainstorm, issue-shaped scout → spec).

### Phase 2a — `/pi-workflow run <slug>` (Pi)

New session recommended for fresh parent context. Requires `.frozen`.

Orchestrates: plan → implement/fix-rounds → gate → reviewer → commit → reflect → `status.md`.

**Resume:** same prompt if crashed — reads `tracker.md` + `failure-ledger.md` + `status.md`.

**After shell FAILED (fix-round cap):** open a new Pi session with the same prompt. Orchestrator
enters **recovery mode** — surfaces `status.md`, `failure-ledger.md`, spawn logs, and git diff; you
inspect and decide; then continues from disk (plan + partial work preserved). Resets `.fix-rounds`
on human-initiated Pi resume so autonomous fix-rounds can run again (cap still 3 per recovery cycle).
Shell may be re-invoked later on the same slug once Pi moves status forward.

### Phase 2b — `workflow run <slug>` (shell)

```bash
workflow run post-v1-users-email-validation
# → workflow-run-harness.ts until status.md: DONE | FAILED | BLOCKED
# headless by default — no flag needed
```

Refuses start without: `spec.md`, `acceptance.sh`, `.frozen`, required `/workflow-cast` models.

On fix-round cap: writes `status.md: FAILED`, prints path to ledger + logs, exits non-zero. Does
**not** loop forever. User picks up in Pi with `/pi-workflow run <slug>` (recovery mode).

### Phase 3 — optional MR (shell)

```bash
workflow run <slug> --mr
# status.md DONE → .mr-approved → push → gh pr create
```

## Interactive spec shaping

**`/pi-workflow spec`** chooses the shaping depth inside one command.

- **Direct spec mode** — no extra brainstorm. Scout → spec when the target is already clear.
- **Brainstorm spec mode** — scout + research/questions before spec when discovery is still needed.

After spec approval and freeze, use `/pi-workflow run <slug>` when you want the unattended phase.

## Run comparison (Phase 2)

| | **`/pi-workflow run` (Pi)** | **`workflow run` (shell)** |
|---|---|---|
| Loop owner | Pi parent prompt | TypeScript harness |
| Fresh context | New session + fresh subagents | Fresh `pi --mode json` per role |
| Gate | `check_acceptance` | `bash acceptance.sh` in harness |
| Unattended | TUI session must stay open | Headless by default, no stdin |
| Best for | Watch, debug, **recover after FAILED** | Approve spec and leave |

## Observability (spawn logs)

Chakravyuh-style: harness captures **each Pi spawn's stdout** to a log file. Default log root is
**outside the consumer repo** (leak-guard parity — logs are harness metadata, not product code).

Default layout:

```
~/.pi/workflow-runs/<slug>/logs/
  2026-07-04T12-01-02Z-planner.log
  2026-07-04T12-04-11Z-worker-attempt-1.log
  2026-07-04T12-08-33Z-worker-attempt-2.log
  2026-07-04T12-11-00Z-reviewer.log
  2026-07-04T12-14-22Z-reflect.log
```

Override via project/user settings (e.g. `.pi/settings.json` → `workflowRun.logDir`). Harness writes
the active log path into `status.md` on each stage transition so `workflow run <slug> --status` and
Pi recovery mode can point you at the latest file.

**Headless monitoring:**

```bash
workflow run add-user-api --status          # status.md + latest log tail
tail -f ~/.pi/workflow-runs/add-user-api/logs/*.log   # optional
cat .pi/work/<slug>/failure-ledger.md
```

Pi `/pi-workflow run` recovery mode reads the same paths — no separate log format per driver.

## Fix-round cap and recovery

**Not infinite.** Post-freeze gate FAIL increments `.fix-rounds` (max **3** per recovery cycle —
enforced today by `check_acceptance` in `index.ts`; harness mirrors it).

| Event | Shell | Pi |
|-------|-------|-----|
| Gate FAIL, rounds < 3 | Retry worker with ledger | Same |
| Gate FAIL, rounds = 3 | `status.md: FAILED`, exit | HARD STOP autonomous loop |
| Human opens `/pi-workflow run` after FAILED | — | Recovery mode: inspect → reset `.fix-rounds` → continue |
| Gate PASS | reviewer → commit → reflect → DONE | Same |

Recovery mode is **interactive** — orchestrator summarizes failure, you may steer (scope, manual
fix, re-run gate), then autonomous subagent rounds resume under the same frozen gate.

Cross-mode: shell FAILED → Pi recovery → optionally `workflow run <slug>` again once status is no
longer FAILED-at-cap (or harness supports `--resume` idempotently from `tracker.md`).

## Freeze timing

Autonomous path locks acceptance at **spec approve** (Phase 1):

1. You approve `spec.md` + `acceptance.sh` in `/pi-workflow spec`.
2. Red-green — gate **must FAIL** on unchanged code.
3. Write `.pi/work/<slug>/.frozen`.
4. Phase 2 runs **without** plan approval pause.

(`/pi-workflow` now freezes at spec approval via `/pi-workflow spec`.)

## Safety invariant

Self-improvement may edit **project-local skills** only — never the gate.

- `acceptance.sh` frozen after Phase 1 — hook blocks edits.
- Reflect must not edit `review-rubric.md` / package prompts (prompt-forbidden v1).
- Wrong gate → **escalate**, never edit `acceptance.sh`.

## Run shape — shell

```
YOU: /pi-workflow spec → approve → .frozen
        ▼
  workflow run <slug>
        ▼
  harness: planner → fix-rounds (worker + bash acceptance.sh) → reviewer
           → work commit → reflect → skill commit → status.md
```

## Run shape — Pi

```
YOU: /pi-workflow spec → approve → .frozen
        ▼
  [new session] /pi-workflow run <slug>
        ▼
  parent: planner → fix-rounds (worker + check_acceptance) → reviewer
          → work commit → reflect → skill commit → status.md
```

## Reflect, ledger, models

Same as prior spec: mandatory reflect before DONE; append-only `failure-ledger.md`; explicit per-role
models via `/workflow-cast` (no `defaultModel` fallback for run). Required at run time: `planner`,
`worker`, `reviewer`, `reflect`.

## Components (v1)

| Unit | Surface | Purpose |
|------|---------|---------|
| `prompts/pi-workflow.md` | `/pi-workflow spec` + `/pi-workflow run` | Interactive router: brainstorm/spec/freeze or run/recovery |
| `workflow-run-harness.ts` | shell | Headless loop (default for `workflow run`) |
| `scripts/workflow-run.sh` | shell | `workflow run <slug> [--mr] [--status]` |
| Spawn log dir | shell (default) | `~/.pi/workflow-runs/<slug>/logs/` — outside repo |
| `prompts/pi-workflow-run-recovery.md` | `/pi-workflow run` when FAILED | Inspect ledger/logs; reset fix-rounds; continue |
| `prompts/pi-workflow-run-planner.md` | both run modes | Planner brief |
| `prompts/pi-workflow-run-worker.md` | both | Worker + ledger |
| `prompts/pi-workflow-run-reviewer.md` | both | Reviewer (advisory) |
| `prompts/reflect.md` | both | Reflect + held-out |
| Hook | both | `.frozen` at spec approve; `.mr-approved` for push |

## Implementation order

1. `prompts/pi-workflow.md` — auto slug, interactive, stop at `.frozen`
2. Hook — freeze at spec approve (autonomous path)
3. Shared role briefs + artifact schema
4. `workflow run` harness (shell CLI via npm `bin`) + spawn logs outside repo
5. `prompts/pi-workflow.md` + recovery branch for FAILED handoff
6. Reflect + held-out

## Out of scope (v1)

- Shell command for spec phase
- Auto-starting Phase 2 from spec session
- Splitting spec shaping back into separate issue/feature entrypoints
- `/pi-workflow` as the user-facing command name (use `/pi-workflow spec`)

## Open risks (accepted)

- Overfitting → held-out + revertable skill commit
- Non-convergence → 3 fix-rounds per cycle; `failure-ledger.md` + `status.md`; Pi recovery after FAILED
- Driver drift → shared briefs + cross-mode fixture tests (shell FAILED → Pi continue)
