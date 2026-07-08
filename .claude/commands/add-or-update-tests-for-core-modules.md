---
name: add-or-update-tests-for-core-modules
description: Workflow command scaffold for add-or-update-tests-for-core-modules in workout_plan_dashboard.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-or-update-tests-for-core-modules

Use this workflow when working on **add-or-update-tests-for-core-modules** in `workout_plan_dashboard`.

## Goal

Adds or updates unit tests for core business logic modules to ensure correctness and prevent regressions.

## Common Files

- `src/lib/*.test.js`
- `vitest.config.js`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update test files in src/lib/ (e.g., *.test.js) for the relevant modules.
- Run the test suite (e.g., npm run test) to verify correctness.
- Update or add test configuration files if needed (e.g., vitest.config.js).

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.