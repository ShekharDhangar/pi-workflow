# pi-workflow (milestone 1) — smoke test

Confirms the only two things that must be code: the **guardrail hook** (incl. spike #1 — children
inherit it) and the **`set_stage`** footer tool. Orchestration itself is the prompt templates.

## Setup
```bash
mkdir -p ~/tmp/pc-test && cd ~/tmp/pc-test
pi install -l ~/code/pi-workflow          # or: pi install -l git:github.com/ShekharDhangar/pi-workflow
cp ~/code/pi-workflow/templates/AGENTS.template.md ./AGENTS.md
git init -q
: > ~/.pi/pi-workflow-hook.log
pi                                        # accept project trust so .pi/ loads
```

## Test 1 — hook blocks sensitive paths, allows normal ones (parent)
```
Use the write tool to write "x" to ./.env
Use the write tool to write "x" to ./package-lock.json
Use the write tool to write "x" to ./src/foo.ts
```
Expect: `.env` and `package-lock.json` **blocked**; `src/foo.ts` **allowed**.
`cat ~/.pi/pi-workflow-hook.log` → shows the three attempts with blocked true/true/false.

## Test 2 — SPIKE #1: hook also fires in a CHILD process
```
Use the worker subagent to write "x" to ./.env , then report what happened.
```
Expect: the worker child is **blocked by our hook**, and a new log line appears **with a different
`pid`** — proof the child auto-loaded `pi-workflow`. (Source said it would; this is the eyes-on.)
`cat ~/.pi/pi-workflow-hook.log` → look for 2+ distinct pids.

## Test 3 — set_stage drives the footer
```
Call the set_stage tool with flow "spec" and stage "Freeze".
```
Expect the footer shows `pi-workflow ⋮ Brainstorm → Spec → ▶Freeze`.

## Test 4 — `/pi-workflow spec` runs end-to-end (smoke, small issue)
```
/pi-workflow spec the README has a broken link to the install docs
```
Expect: it writes `.pi/work/<slug>/spec.md` (Intent·Context·Acceptance), asks questions, writes
`acceptance.sh`, **pauses for approval at freeze**, and the footer tracks stages. You don't have to
finish it — you're confirming the router prompt orchestrates pi-subagents and pauses at the gate.

| Result | Meaning |
|---|---|
| Test 2 shows a child pid, write blocked | ✅ spike #1 — children inherit the guardrail |
| Test 1 blocks .env/lockfile, allows src | ✅ protected scoping correct (sensitive-only in M1) |
| Test 4 pauses at freeze/approval | ✅ prompt-driven orchestration + gates work |

## Test 5 — research hook blocks synthesizer without angle files
```bash
mkdir -p .pi/work/research-smoke/research
printf '# Research brief\n' > .pi/work/research-smoke/research-brief.md
```
```
Use the subagent tool to spawn pi-workflow.pi-researcher-synthesis with task "Pass 1 catalog. Read research-brief.md and all research/angle-*.md."
```
Expect: **blocked** — hook says angle files missing under `.pi/work/research-smoke/`.

Then:
```bash
printf '# Angle output\n' > .pi/work/research-smoke/research/angle-local-repo.md
```
Retry the same subagent call. Expect: **allowed** (synthesizer may run or fail for other reasons — the hook no longer blocks).

Fan-out without `output` should also block:
```
Use subagent with tasks: [{agent: "pi-workflow.pi-researcher-web", task: "find patterns"}]  (no output field)
```
Expect: blocked — must set `output` to `.pi/work/<slug>/research/angle-<name>.md`.

## Test 6 — `/research-cast` (TUI only)

In an interactive Pi session with pi-workflow loaded:

```text
/research-cast status
```

Expect: message listing researcher-orchestrator, pi-researcher-local, pi-researcher-web, pi-researcher-synthesis model assignments and settings paths.

```text
/research-cast settings
```

Expect: overlay with Save to (user/project), model row per agent, thinking rows for orchestrator/synthesis.
Changing a value writes `subagents.agentOverrides["pi-workflow.<name>"]` to the chosen settings file.

```text
/research-cast orchestrator
```

Expect: searchable model list from `ctx.modelRegistry.getAvailable()`.

## Test 7 — `/workflow-cast` (TUI only)

```text
/workflow-cast status
```

Expect: Scout, Planner, Worker, Reviewer, Reflect assignments and settings paths.

```text
/workflow-cast settings
```

Expect: overlay with Save to, model per agent, thinking rows for Planner/Reviewer.
Writes `subagents.agentOverrides["scout"|"planner"|"worker"|"reviewer"|"reflect"]`.

```text
/workflow-cast worker
```

Expect: searchable model list from live registry.
