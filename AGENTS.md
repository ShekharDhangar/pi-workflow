# pi-workflow — project context (this repo)

Source repo for the **pi-workflow** pi package: a verifier-centered engineering workflow built on
[`pi-subagents`](https://github.com/nicobailon/pi-subagents).

- **GitHub:** https://github.com/ShekharDhangar/pi-workflow
- **npm:** `@shekhardhangar/pi-workflow`
- **Install:** `pi install npm:@shekhardhangar/pi-workflow` (or `pi install git:github.com/ShekharDhangar/pi-workflow`)

## What this repo is

A small pi **extension + prompt templates**, not an application. Milestone 1 ships:

| Path | Role |
|---|---|
| `index.ts` | Guardrail hook · frozen-acceptance · research artifact hook · `set_stage` · `check_acceptance` |
| `cast-settings.ts` | Shared TUI + settings persistence for cast commands |
| `research-cast.ts` | `/research-cast` TUI — research cast model picker |
| `workflow-cast.ts` | `/workflow-cast` TUI — Scout/Planner/Worker/Reviewer/Reflect |
| `prompts/` | `/pi-workflow`, `/workflow-issue`, `/workflow-feature`, `review-rubric`, `/research-coach` orchestration |
| `agents/` | `workflow-scout` · `workflow-planner` · `workflow-worker` · `workflow-reviewer` · `workflow-reflect` · `researcher-orchestrator` · `pi-researcher-local` · `pi-researcher-web` · `pi-researcher-synthesis` |
| `skills/workflow-scout/` | recon heuristics for workflow-scout |
| `skills/workflow-planner/` | task slicing + acceptance coverage for workflow-planner |
| `skills/workflow-reviewer/` | evidence-first review heuristics for workflow-reviewer |
| `skills/workflow-reflect/` | durable learning extraction for workflow-reflect |
| `prompts/review-rubric.md` | reviewer contract: acceptance → correctness → constitution → completeness → tests |
| `prompts/coding-guidelines.md` | package coding rules used by planner / worker / reviewer |
| `skills/research-coach/` | orchestrator → local/web fan-out → synthesis iteration (sufficient ≠ stop); feature brainstorm |
| `skills/writing-great-skills/` | reference for authoring skills (Matt Pocock); invoke when editing skills/agents/prompts here |
| `templates/research-brief.template.md` | brief schema for Phase 0 |
| `templates/AGENTS.template.md` | Consumer template — copy into target projects as `AGENTS.md` |
| `SMOKE-TEST.md` | Manual verification checklist |
| `README.md` | Install and usage docs |

Orchestration is **prompt-driven** (parent follows workflow prompts). Code only does what prompts cannot: enforce guardrails and run the deterministic verifier.

## Working in this repo

- **Do not** use `/pi-workflow`, `/workflow-issue`, or `/workflow-feature` here unless explicitly testing the smoke path — this repo is the harness source, not a consumer project.
- Prefer surgical edits: extension logic in `index.ts`, orchestration in `prompts/`, docs in `README.md` / `SMOKE-TEST.md`.
- When authoring or refactoring skills, agents, or prompts in this package, invoke **`writing-great-skills`** first (user-invoked reference skill).
- Run smoke checks from `SMOKE-TEST.md` after hook or verifier changes.
- Test local install: `pi install ./` or `pi install -l ./` from this directory.
- Unscoped npm name `pi-workflow` is taken by another package; publish only as `@shekhardhangar/pi-workflow`.
- **Commits carry no agent attribution** — no `Co-authored-by:` trailers or “Generated with …” lines.

## The loop (for consumer projects)

Downstream projects install the package globally or per-project, copy `templates/AGENTS.template.md` → `AGENTS.md`, then run:

- `/workflow-issue <text>` — spec → plan → (approve) → implement → review → (approve) → commit
- `/workflow-feature <text>` — brainstorm → (approve spec) → plan → (approve) → implement → review → (approve) → commit

Artifacts live under `.pi/work/<slug>/`: `spec.md`, **`acceptance.sh`**, `plan/`, `reviews/`, `gate3.md`.

**Verifier:** `check_acceptance` runs `acceptance.sh`; exit code 0 is the only PASS. Models cannot override a FAIL.

**Branch isolation:** work on `pi-workflow/<slug>`; hook blocks `git push` and edits to `main`.

**Child agents:** inherit this extension automatically via pi-subagents — never set `extensions:` on subagent configs.

---

## Repo rules

This repo dogfoods a standalone `constitution.md`. Read and follow it when working here.
