# pi-workflow

A small, verifier-centered engineering workflow for [pi](https://pi.dev), built on
[`pi-subagents`](https://github.com/nicobailon/pi-subagents).

> **Set an executable target, then an unattended verify-fix loop runs against it** — on a branch,
> fenced by a guardrail hook, capped by a budget, with a deterministic verifier that can't be faked
> or weakened. The model is your stand-in's tool; the *verifier* is what lets you leave the room.

## Why

Orchestration is the commodity part of a coding harness; the **verifier sets the quality ceiling.**
So pi-workflow keeps the loop thin (prompts the parent follows, like `pi-subagents`' `/review-loop`)
and puts the engineering into the thing that determines whether autonomy is safe: the acceptance check.

## What it is

- **One workflow router** (prompt template): `/pi-workflow spec` (interactive spec phase) and `/pi-workflow run`
  (resume an approved item), plus the existing `/workflow-issue` and `/workflow-feature` paths.
  Each drives the relevant loop autonomously, pausing only at human gates.
- **A deterministic verifier** (`check_acceptance` tool): the acceptance verdict is the *real exit
  code* of a project-defined `acceptance.sh`, not a model's opinion — so a model can't hallucinate "PASS."
- **Anti-reward-hack defenses:** you approve the target before work; the test must fail-then-pass
  (red-green); once approved it's **frozen** (the hook blocks edits to it); you can seed examples.
- **Branch isolation:** every work item runs on `pi-workflow/<slug>`; the loop never touches `main`
  and the hook blocks `git push`. You review the branch diff and merge.
- **Guardrail hook:** blocks edits to sensitive paths (`.env`, lockfiles, `constitution.md`) — and,
  because `pi-subagents` children auto-load this extension, it governs every child agent too.

## Install

pi-workflow is a [pi package](https://pi.dev/packages): install it once globally, or pin it per project.

### Prerequisites

```bash
pi install npm:pi-subagents      # required (spawning + /review-loop + /parallel-research)
pi install npm:pi-web-access     # optional (research fan-out: `/parallel-research`)
```

### Global (all projects)

```bash
pi install npm:@shekhardhangar/pi-workflow
pi install git:github.com/ShekharDhangar/pi-workflow
pi install /path/to/pi-workflow  # local clone
```

Extension + prompts load automatically whenever you run `pi` in any project.

### Project-local (team pin)

```bash
cd your-project
pi install -l npm:@shekhardhangar/pi-workflow
pi install -l git:github.com/ShekharDhangar/pi-workflow@v0.1.0
pi install -l /path/to/pi-workflow
```

Writes to `.pi/settings.json`; teammates get the same package after trusting the project.

### Try without installing

```bash
pi -e npm:@shekhardhangar/pi-workflow
pi -e git:github.com/ShekharDhangar/pi-workflow
```

### Per-project bootstrap (one time)

Copy the bundled template and edit the constitution for your repo:

```bash
# npm install (global):
cp ~/.pi/agent/npm/node_modules/@shekhardhangar/pi-workflow/templates/AGENTS.template.md ./AGENTS.md

# npm install (project-local, -l):
cp .pi/npm/node_modules/@shekhardhangar/pi-workflow/templates/AGENTS.template.md ./AGENTS.md

# git or local path install:
cp /path/to/pi-workflow/templates/AGENTS.template.md ./AGENTS.md
```

## Usage

In any project with pi-workflow installed and `AGENTS.md` bootstrapped:

```
/pi-workflow spec add user API with validation
/pi-workflow run add-user-api
/workflow-issue fix the broken README install link
/workflow-feature add user-facing settings for dark mode
/research-coach event-driven sync for MFD profile updates
```

For **software-engineering research**: `/research-coach` — `pi-researcher-web` fan-out uses **practitioner sources** (blogs, docs, GitHub, forums) by default, not academic papers unless you ask. `pi-researcher-synthesis` runs pass 1 + pass 2 over cumulative outputs.

See `templates/AGENTS.template.md` for the full loop, artifacts, gates, and verifier rules.

## Choose models per agent

pi-workflow does **not** hardcode providers or model IDs. You pick models in Pi settings via
**pi-subagents** `agentOverrides` — works with OpenAI, Anthropic, Ollama, Cursor, opencode, or any
provider your Pi install exposes.

**Research cast** (override keys are runtime names):

| Agent | Role | Typical tier |
|-------|------|--------------|
| `pi-workflow.researcher-orchestrator` | Requirements interview | Strong |
| `pi-workflow.pi-researcher-local` | Local/repo angles | Fast/cheap |
| `pi-workflow.pi-researcher-web` | Web/practitioner angles | Mid |
| `pi-workflow.pi-researcher-synthesis` | Synthesis pass 1 + 2 | Strongest |

**Workflow cast** (`/pi-workflow`, `/workflow-issue`, and `/workflow-feature` — package workflow agents):

| Agent | Role | Typical tier |
|-------|------|--------------|
| `pi-workflow.workflow-scout` | Codebase recon (greenfield/brownfield) | Fast/cheap |
| `pi-workflow.workflow-planner` | Read-only plan + task breakdown | Mid |
| `pi-workflow.workflow-worker` | Implement tasks | Strong |
| `pi-workflow.workflow-reviewer` | Review loop + judgment | Strong |
| `pi-workflow.workflow-reflect` | Distill learnings → project skill | Strong |

**Where to edit:**

| Scope | File |
|-------|------|
| All projects | `~/.pi/agent/settings.json` |
| One repo (wins) | `.pi/settings.json` |

**Interactive picker** (TUI — lists models from your live registry):

```text
/research-cast settings        orchestrator · local · web · synthesis
/workflow-cast settings        Scout · Planner · Worker · Reviewer · Reflect
/research-cast status          show research assignments
/workflow-cast status          show workflow assignments
/research-cast web             pick one research agent
/workflow-cast worker          pick one workflow agent
```

Copy `templates/research-agent-models.example.json` or `templates/workflow-agent-models.example.json`
into your settings file (merge the `subagents` block). Workflow override keys are the package agent runtimes
(`pi-workflow.workflow-scout`, `pi-workflow.workflow-planner`, `pi-workflow.workflow-worker`, `pi-workflow.workflow-reviewer`, `pi-workflow.workflow-reflect`). Replace `REPLACE provider/model` with ids
from your registry, e.g. `openai/gpt-5-mini`, `anthropic/claude-haiku-4-5`, `ollama/qwen2.5-coder`.
Optional thinking: `"thinking": "high"` or append `:low|:medium|:high` when your provider supports it.

**One-off override** (does not change settings):

```text
/run pi-workflow.pi-researcher-web[model=openai/gpt-5-mini:medium][output=.pi/work/foo/research/angle-x.md] "..."
```

**Profile workflow** (save a named preset under `~/.pi/agent/profiles/pi-subagents/`):

```text
/subagents-refresh-provider-models openai
/subagents-generate-profiles openai
```

Copy `templates/pi-workflow.research.profile.example.json` to
`~/.pi/agent/profiles/pi-subagents/pi-workflow.research.json`, edit model ids, then:

```text
/subagents-load-profile pi-workflow.research
```

**Verify loaded models:**

```text
/subagents-models pi-workflow.pi-researcher-synthesis
/subagents-models pi-workflow.workflow-worker
```

Both casts share the same `agentOverrides` mechanism in Pi settings.

## Files

| File | What |
|---|---|
| `index.ts` | the extension: guardrail hook · frozen-acceptance enforcement · `set_stage` footer · `check_acceptance` |
| `cast-settings.ts` | shared TUI for `/research-cast` and `/workflow-cast` |
| `research-cast.ts` | `/research-cast` — research cast model picker |
| `workflow-cast.ts` | `/workflow-cast` — workflow-scout / planner / worker / reviewer / reflect model picker |
| `prompts/pi-workflow.md` | `/pi-workflow` router — spec and run |
| `prompts/` | the orchestration — `pi-workflow.md`, `workflow-issue.md`, `workflow-feature.md`, `review-rubric.md`, `coding-guidelines.md`, `research-coach.md` |
| `agents/` | `workflow-scout` · `workflow-planner` · `workflow-worker` · `workflow-reviewer` · `workflow-reflect` · `researcher-orchestrator` · `pi-researcher-local` · `pi-researcher-web` · `pi-researcher-synthesis` |
| `skills/research-coach/` | requirements → fan-out → synthesizer iteration (sufficient ≠ stop); `/workflow-feature` |
| `skills/writing-great-skills/` | skill-authoring reference ([Matt Pocock](https://github.com/mattpocock/skills)); invoke when writing or editing package skills |
| `templates/research-agent-models.example.json` | merge into `.pi/settings.json` — research cast models |
| `templates/workflow-agent-models.example.json` | merge into `.pi/settings.json` — workflow cast models |
| `templates/pi-workflow.research.profile.example.json` | copy to `~/.pi/agent/profiles/pi-subagents/` for `/subagents-load-profile` |
| `templates/research-brief.template.md` | brief schema before parallel research |
| `templates/AGENTS.template.md` | workflow map + constitution template (copy to `AGENTS.md` in each repo) |
| `SMOKE-TEST.md` | how to verify the hook, child inheritance, and a workflow run |

## Status

Milestone 1, verified end-to-end via headless runs (full workflow, child-governance, the
deterministic verifier catching a planted bug, frozen acceptance, `git push` blocked). The
compounding/meta-harness loop (`/learn`) is Milestone 2 — and it needs real run traces first.
