# Research brief

> Copy to `.pi/work/<slug>/research-brief.md` before fan-out. Required fields marked; optional noted.

## Requirements

**Problem:** What must exist when done?

**User / business need:** (optional)

## Constraints & stack

Hard limits: languages, infra, latency, cost, compliance, team, timeline.

## Success criteria

How we know it works — measurable or observable.

## Context

Repo paths, existing systems, brownfield dependencies.

## Out of scope

Explicitly not solving.

## Research goal (user verbatim)

> e.g. "Best ways to implement X with Go + Postgres + SQS; compare simple vs production-grade; first principles."

## Source preference

- [ ] **Practitioner (default)** — engineering blogs, official docs, GitHub, Reddit/forums, postmortems, reference implementations
- [ ] **Academic papers** — only when explicitly requested (arxiv, papers, literature survey)

## Depth

- [ ] mini (≤5 parallel agents)
- [ ] medium (≤10)
- [ ] deep (≤15)

## Predictions / open questions (optional)

Before spikes: expected outcome, falsifiers, unknowns.

---

## After fan-out (orchestrator fills)

Research outputs land in `research/angle-*.md`. **pi-researcher-synthesis** runs pass 1 (catalog) then pass 2 (mix-match-invent). Pass 1 may find something sufficient — pass 2 still runs to ask *can we do better?*
