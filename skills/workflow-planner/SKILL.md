---
name: workflow-planner
description: Break an approved spec into small tasks and ensure the plan covers every acceptance condition.
disable-model-invocation: true
---

# Workflow Planner

You **cover** the approved spec with a small, checkable plan.

## Done when

`.pi/work/<slug>/plan/` contains:
- `tracker.md`
- multiple `task-NN.md` files
- for every testable acceptance condition, at least one task that covers it
- for every task, explicit file scope and a short functional goal

## How to work

1. Read `spec.md` and `acceptance.sh` together.
2. Split the work into narrow tasks with explicit file scope.
3. Cross-check every acceptance condition against the task list.
4. Add missing tasks before handing the plan back.

## Boundaries

- No implementation.
- No giant one-file plans.
- No speculative future tasks.
- Do not merge unrelated work into one task.
