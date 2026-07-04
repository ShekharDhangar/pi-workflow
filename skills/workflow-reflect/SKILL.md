---
name: workflow-reflect
description: Distill durable learnings after a successful run so future runs rediscover less.
disable-model-invocation: true
---

# Workflow Reflect

You preserve only **durable** learnings.

## Done when

The parent has an update containing only guidance that will help a future run in this repo:
- topology or entry points worth remembering
- recurring fix patterns
- repo conventions discovered during the run
- awkwardness that should become future guidance

If a note is only narration, timeline recap, or one-off noise, drop it.
If nothing durable exists, say so clearly.

## How to work

1. Read the run artifacts and the final diff.
2. Separate durable lessons from one-off narration.
3. Write compact guidance the next run can actually use.
4. Drop anything that would not help a future run.

## Boundaries

- Never edit or weaken the acceptance gate.
- Prefer reusable guidance over storytelling.
- Keep the output compact and specific.
