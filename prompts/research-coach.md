---
description: pi-workflow — /research-coach orchestrator (load skill, do not synthesize inline)
---

Load the **`research-coach`** skill. Run Phases 0–5 for: `$ARGUMENTS`

You **orchestrate only** — requirements, fan-out, save angles, **fresh** synthesizer spawns, present. **Never synthesize inline.**

- Phase 0: `research-brief.md` (optional: interactive `pi-workflow.researcher-orchestrator` with `output: ".pi/work/<slug>/research-brief.md"`)
- Phase 2: parallel `pi-workflow.pi-researcher-local` / `pi-workflow.pi-researcher-web` → `research/angle-*.md` — **each task needs `output` path** (hook-enforced)
- Phases 3–4: **`pi-workflow.pi-researcher-synthesis`** ×2 minimum — spawn blocks in skill
- Phase 5: present `research-synthesis.md` per skill completion criterion

If `$ARGUMENTS` is empty, ask what to research, then Phase 0.
