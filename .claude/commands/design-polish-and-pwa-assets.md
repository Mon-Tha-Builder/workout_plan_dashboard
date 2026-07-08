---
name: design-polish-and-pwa-assets
description: Workflow command scaffold for design-polish-and-pwa-assets in workout_plan_dashboard.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /design-polish-and-pwa-assets

Use this workflow when working on **design-polish-and-pwa-assets** in `workout_plan_dashboard`.

## Goal

Refines design elements (badges, fonts, icons) and improves PWA assets (manifest, icons, fonts), ensuring consistency and offline capability.

## Common Files

- `src/styles/*.css`
- `public/icon-*.png`
- `public/fonts/*.woff2`
- `index.html`
- `manifest.webmanifest`
- `src/styles/fonts.css`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Update styles in src/styles/ to reflect new design choices.
- Add or replace icon files in public/ for various sizes.
- Modify index.html and manifest.webmanifest to reference new assets.
- Self-host or update fonts in public/fonts/ and src/styles/fonts.css.
- Update package.json and vite.config.js if build or asset handling changes.

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.