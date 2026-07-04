# Synthesizer passes — software engineering research

Read `research-brief.md`, all `research/angle-*.md`, and prior pass files first. **No web search** — return gaps to the orchestrator.

Tags: `FULL | PARTIAL | COMPLEX | SIMPLE | UNLOCK`

---

## Pass 1 — Catalog (no recommendation)

Write `research-synthesis-pass1.md`:

```markdown
# Research synthesis — pass 1

## Candidates
| ID | Source angle | Fit | Solves | Doesn't | Tags |

Note source types used (blogs, docs, GitHub, forums — papers only if brief requested them).

## Partial fits & unlocks
## Conflicts with requirements
## Cross-angle overlaps
## Gaps (follow-up research needed?)
```

**Done when:** every angle file represented; no recommendation; no winner picked.

Pass 1 may surface a **sufficient** candidate — note it; pass 2 still runs.

---

## Pass 2 — Composite (mandatory)

Read brief + all angles + pass 1. Write `research-synthesis-pass2.md` and **Final** section in `research-synthesis.md`:

1. **Compare fairly** — no auto-pick by tag
2. **Composite** — ≥1 design not verbatim in any angle file; cite sources + what's novel
3. **Simplicity test** — simplest option **meeting success criteria**
4. **UNLOCK reuse** — non-fits that open doors may combine with others
5. **Improve pass 1** — if pass 1 was sufficient, show what pass 2 adds or confirm with evidence
6. **Spikes** — falsifier + smallest repro per top candidate

List follow-up research questions for orchestrator if gaps remain.

**Final output shape** (`research-synthesis.md`):

```markdown
## Recommendation
## Alternatives considered
## Composite design
## Simplest sufficient variant
## Spikes / next experiments
## Residual risks
## Follow-up research (if any)
```

**Done when:** recommendation tied to success criteria; ≥1 composite; simplest-sufficient variant named.

---

## Pass 3+ — After follow-up fan-out

Re-read all files including new angles. Update `research-synthesis.md`. Show what changed from pass 2 and why.
