---
name: feature-implementation-with-ui-and-lib-changes
description: Workflow command scaffold for feature-implementation-with-ui-and-lib-changes in workout_plan_dashboard.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-implementation-with-ui-and-lib-changes

Use this workflow when working on **feature-implementation-with-ui-and-lib-changes** in `workout_plan_dashboard`.

## Goal

Implements or refactors a feature by updating both UI components/pages and underlying library logic, often including styles and sometimes documentation.

## Common Files

- `src/components/*.jsx`
- `src/pages/*.jsx`
- `src/lib/*.js`
- `src/styles/*.css`
- `README.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Update or create relevant files in src/components/ and/or src/pages/ for UI changes.
- Modify or add logic in src/lib/ for business logic, data models, or utility functions.
- Adjust or add styles in src/styles/ as needed.
- Optionally update documentation (README.md) if the change is significant.

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.