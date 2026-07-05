---
name: research-coach
description: >
  Research-coach — software-engineering research: requirements, fan-out, synthesizer iteration (sufficient ≠ optimal).
  Use when designing features, systems, pipelines, or migrations; /research-coach; /pi-workflow spec brainstorm mode before spec freeze.
---

# Research Coach (software engineering)

Orchestrated **engineering research** before you build — features, systems, data pipelines. Not a single web search. Not implementation. **sufficient ≠ optimal:** pass 1 may work; pass 2 still runs.

| Need | Use |
|------|-----|
| Orchestrate requirements + fan-out + synthesis | **`research-coach` skill** (this file) |
| Local code/constraints | **`pi-workflow.pi-researcher-local`** |
| Web/docs evidence per angle | **`pi-workflow.pi-researcher-web`** |
| Catalog + **composite** over angle outputs | **`pi-workflow.pi-researcher-synthesis`** (**fresh** spawn per pass) |
| Requirements interview only | **`pi-workflow.researcher-orchestrator`** |
| Implement chosen direction | **`worker`** |

Disclosed reference: [`sources.md`](sources.md) · [`angles.md`](angles.md) · [`synthesizer-passes.md`](synthesizer-passes.md)

**Models:** pi-workflow does not pin providers. Users set `subagents.agentOverrides` in Pi settings
(keys: `pi-workflow.researcher-orchestrator`, `pi-workflow.pi-researcher-local`, `pi-workflow.pi-researcher-web`, `pi-workflow.pi-researcher-synthesis`).
Use `/research-cast settings` for an interactive picker, or copy
`templates/research-agent-models.example.json` in the package.

---

## Iron rules

1. **No research until requirements are written.** One gap at a time until: problem, constraints, success criteria, context, out of scope.
2. **Research goal comes from the user** — e.g. *"Best ways to solve this with Go + Postgres + SQS; note tradeoffs."* Do not invent; ask.
3. **Depth is explicit:** **mini** ≤5 · **medium** ≤10 · **deep** ≤15 agents. Ask if not specified.
4. **Every subagent gets the same requirement block + research goal** — plus one **distinct angle** ([`angles.md`](angles.md)).
5. **sufficient ≠ optimal.** Minimum **two fresh `pi-researcher-synthesis` spawns** before recommending. Parent **never synthesizes inline**.
6. **No reflex picks.** Simplest wins **when requirements allow** — compare complex and simple fairly.
7. **Composite, don't vote.** ≥1 **composite** no single angle named. **UNLOCK** tags may open doors.
8. **Write everything** under `.pi/work/<slug>/`: `research-brief.md`, `research/angle-<name>.md`, `research-synthesis-pass1.md`, `research-synthesis-pass2.md`, `research-synthesis.md`.
9. **One role per agent.** Each synthesis pass = **fresh** synthesizer spawn reading all cumulative files.
10. **Practitioner sources by default** — see [`sources.md`](sources.md). Papers only when user asked.

---

## sufficient ≠ optimal

Each angle sees **one slice**. Pass 1 may be sufficient; pass 2 asks *can we do better?*

| Situation | Move |
|-----------|------|
| Pass 1 sufficient | Still pass 2 — **composite** hybrids across angles |
| No angle fully fits | Catalog **UNLOCK**; combine partials |
| Similar candidates | Requirements + judgment — no auto-pick by tag |
| New door opened | Use as base; layer pieces from other angles |

---

## Phase 0 — Requirements

**Done when:** `research-brief.md` exists with every load-bearing field filled.

Interview until complete. Thin `$ARGUMENTS` → ask before fan-out.

| Field | Prompt if missing |
|-------|---------------------|
| **Problem** | What must exist when we're done? |
| **Constraints** | Stack, latency, cost, compliance, team, timeline |
| **Success criteria** | How we know it works |
| **Context** | Repo, existing systems, brownfield deps |
| **Out of scope** | What we are not solving |
| **Research goal** | What should researchers optimize for? (user's words) |
| **Source preference** | Default practitioner — [`sources.md`](sources.md) |

Optional: prediction before spike. Template: `templates/research-brief.template.md`.

---

## Phase 1 — Depth tier

**Done when:** tier chosen and recorded in brief.

| Tier | Max agents | Use when |
|------|------------|----------|
| **mini** | 5 | Narrow scope, familiar domain |
| **medium** | 10 | New subsystem, several patterns |
| **deep** | 15 | Architecture bet, high migration cost |

---

## Phase 2 — Parallel research

**Done when:** every launched agent's output saved to `research/angle-<name>.md` before any synthesizer spawn. The **hook enforces this** — synthesizer spawns block until angle files exist; each fan-out task must set `output`.

Each subagent header (copy from brief):

```
REQUIREMENTS: <full block>
RESEARCH GOAL: <user goal verbatim>
YOUR ANGLE: <one angle from angles.md>
OUTPUT: Numbered findings with sources (link each). Tag each candidate:
  FULL | PARTIAL | COMPLEX | SIMPLE | UNLOCK
<lines from sources.md>
Note limitations honestly.
```

Pick angles from [`angles.md`](angles.md). Launch **pi-researcher-local** / **pi-researcher-web** in parallel — **each task must set `output`**:

```
subagent({
  tasks: [
    { agent: "pi-workflow.pi-researcher-local", task: "...", output: ".pi/work/<slug>/research/angle-local-repo.md" },
    { agent: "pi-workflow.pi-researcher-web", task: "...", output: ".pi/work/<slug>/research/angle-industry-standard.md" },
  ]
})
```

The hook records expected angles in `research/.expected-angles.json` and **blocks `pi-researcher-synthesis`** until every angle file is non-empty. If a subagent returns without writing the file, the hook auto-dumps its output.

---

## Phase 3 — Synthesis pass 1

**Done when:** `research-synthesis-pass1.md` exists; no recommendation in it.

Parent does not synthesize. **Fresh** spawn:

```
subagent({
  agent: "pi-workflow.pi-researcher-synthesis",
  task: "Pass 1 catalog. Read research-brief.md and all research/angle-*.md. Write research-synthesis-pass1.md only — no recommendation."
})
```

Pass spec: [`synthesizer-passes.md`](synthesizer-passes.md#pass-1--catalog-no-recommendation)

---

## Phase 4 — Synthesis pass 2

**Done when:** `research-synthesis-pass2.md` and `research-synthesis.md` (final) exist; ≥1 composite in final.

**Fresh** spawn — do not continue pass 1's session:

```
subagent({
  agent: "pi-workflow.pi-researcher-synthesis",
  task: "Pass 2 composite. Read brief, all angle files, pass1. Write pass2 + research-synthesis.md final. ≥1 composite not verbatim in any angle file."
})
```

Pass spec: [`synthesizer-passes.md`](synthesizer-passes.md#pass-2--composite-mandatory)

Gaps + budget → targeted fan-out → new angle files → **fresh** pass 3 synthesizer.

---

## Phase 5 — Present

**Done when:** user has seen — each tied to brief success criteria — recommendation, ≥1 composite, simplest-sufficient variant, spikes, residual risks.

Read `research-synthesis.md`. Present to user. In `/pi-workflow spec`, feed into `spec.md` — do not freeze until approved.

Parent orchestrates only. **Never** merge findings inline.

---

## When to invoke

- Feature, system, pipeline, migration, architecture design
- `/research-coach <topic>`
- `/pi-workflow spec` brainstorm mode — after pi-researcher-local (if brownfield), before spec freeze

**Skip:** obvious bugs, typos, frozen spec with clear acceptance.

---

## Red flags

- Fan-out before requirements written
- Research goal missing or generic ("find best practices")
- Stopped after first angle agent or first sufficient-looking synthesis
- Parent synthesized inline
- Only one synthesis pass
- Auto-picked simplest/complex without requirements link
- No **composite**
- Confused with one-shot pi-researcher-web brief
- Defaulted to arxiv/papers for a shipping decision

---

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "Pass 1 already works" | sufficient ≠ optimal. Run pass 2. |
| "Iteration means pass 1 was wrong" | Cumulative research combines better. |
| "Simplest tag wins" | Simplest **meeting success criteria**, after fair comparison. |
| "I'll merge findings myself" | Parent orchestrates; synthesizer **composite**s. |
| "One angle returned enough" | One angle = one slice. |
| "Deep research = more agents only" | Depth without synthesizer iteration is expensive browsing. |
| "Research means papers first" | Practitioner sources for SE shipping — [`sources.md`](sources.md). |
