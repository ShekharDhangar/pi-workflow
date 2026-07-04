---
description: pi-workflow — coding guidelines (used by reviewers in /review-loop, part B of review-rubric.md)
---

# Coding Guidelines

## Core Principle

**Write the simplest code that solves the problem, that a senior engineer would not call overcomplicated.** Optimize for the human who reads it next, not for cleverness. When two guidelines pull in different directions, **simplicity and readability win the tie.**

These rules are not aspirational — apply them, and when tempted to break one, check the Red Flags and Rationalizations tables first. They bias toward caution over speed; for a genuinely trivial change, use judgment instead of ceremony.

## The Principles

### Clarity
- **Name to reveal intent.** `maxRetries`, not `n`. A name should make a comment unnecessary.
- **No magic values.** Every literal with meaning becomes a named constant. `MAX_UPLOAD_BYTES`, not `5242880` inline.
- **Human-readable over clever.** No dense one-liners, no obscure tricks. If a reviewer must pause to decode a line, expand it.
- **Comments explain *why*, not *what*.** The code says what. Comment the reason, the tradeoff, the gotcha. Delete comments that just restate the code.
- **Match the surrounding code.** Follow the file's existing style, naming, and patterns even if you'd personally do it differently. Consistency beats personal preference.

### Structure
- **Flatten control flow.** Prefer guard clauses and early returns over nested `if`/`else`. Max ~2 levels of nesting — beyond that, extract a function.
- **Avoid `if`/`else` ladders.** Replace long `if/else if/else` chains and nested conditionals with: early returns, a lookup map/table, or polymorphism. A chain testing the same variable is a map waiting to happen.
- **Avoid nested loops.** Extract the inner loop into a named function, or restructure with a map/set lookup. Nested loops hide both complexity and O(n²) cost.
- **One job per unit.** Each function/module does one thing with a clear name, a narrow interface, and is understandable and testable on its own. A growing file is a signal it does too much — split it.
- **Right-size the solution.** If you wrote 200 lines and it could be 50, rewrite it. More code than the problem needs is a cost, not thoroughness.
- **Minimize shared mutable state.** Prefer pure functions and immutable data (`const` by default). Side effects should be few, obvious, and pushed to the edges.

### Correctness & Security
- **Handle errors — never omit, never swallow.** No empty `catch {}`. No discarding errors to "keep it from crashing." Either handle it meaningfully or let it propagate loudly. Failing silently is worse than failing.
- **Don't handle impossible errors.** Guard real failure modes, not hypothetical ones. (This is the other side of the rule — no defensive noise for cases that can't happen.)
- **Validate at boundaries.** Untrusted input (user, network, file, env) is validated/sanitized where it enters. Inside the trusted core, assume it's clean.
- **Secure by default.** Never hardcode secrets. Parameterize queries (no string-built SQL). Least privilege. Don't log sensitive data. Assume input is hostile until validated.

### Discipline (how the worker should have worked)
- **Surgical changes.** Touch only what the task requires. Every changed line traces to the task. No "improving" adjacent code, reformatting, or refactoring things that aren't broken. Unrelated dead code should be flagged, not deleted.
- **Clean orphans, leave the rest.** Imports/vars/functions the change made unused should be removed. Pre-existing dead code should be left alone unless the task asked for it.

## Key Tensions — Resolved

| Tension | Ruling |
|---------|--------|
| **DRY vs. don't-abstract-speculatively** | **Rule of three.** Two occurrences = leave it duplicated. Third real occurrence = extract. Never abstract for a single use or an imagined future one. |
| **Proper abstraction vs. simplicity** | Build *deep* modules: simple, narrow interface hiding real complexity. Reject *shallow* abstractions (wrappers that add a layer without hiding anything). No configurability that wasn't requested. |
| **Error handling vs. noise** | Handle *real* failure modes loudly; do not add handlers for impossible cases. Fail loud > fail silent, always. |
| **Any rule vs. another** | Simplicity and readability are the tie-breaker. |

## Red Flags — Blockers or Fixes-Worth-Doing-Now

- A number or string literal with meaning instead of a named constant
- An empty catch, or a catch that only logs-and-continues past a real error
- Code indented 3+ levels deep, or an `if/else if/else` chain 3+ branches long
- A parameter, option, or config added "in case we need it later"
- A clever one-liner that would need a comment to explain
- Edits/reformatting unrelated to the task
- An abstraction built for the first or second use
- String-built SQL, a hardcoded secret, or unvalidated input from a boundary

## The Test

Before passing this part of the review, ask:
1. Would a senior engineer call this overcomplicated? If yes, flag it.
2. Can the next reader understand each unit without reading its internals?
3. Does every changed line trace to the task?
4. Does it fail loudly on real errors and validate hostile input?
