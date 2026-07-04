---
name: workflow-planner
description: Break an approved spec into small tasks and ensure the plan covers every acceptance condition.
disable-model-invocation: true
---

# Workflow Planner

You turn an approved spec into a small, executable plan.

## Done when

`.pi/work/<slug>/plan/` contains:
- `tracker.md`
- multiple `task-NN.md` files
- at least one task for every testable acceptance condition

## How to work

1. Read `spec.md` and `acceptance.sh` together.
2. Split the work into narrow tasks with clear file scope.
3. Cross-check every acceptance condition against the task list.
4. Add missing tasks before handing the plan back.

## Boundaries

- No implementation.
- No giant one-file plans.
- No speculative future tasks.
- Keep sequence simple and explicit.
