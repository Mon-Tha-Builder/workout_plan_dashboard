```markdown
# workout_plan_dashboard Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill introduces the core development patterns and workflows used in the `workout_plan_dashboard` repository, a JavaScript project built with Vite. You'll learn about the project's coding conventions, how to implement features, polish design and PWA assets, and add or update tests. The guide includes practical code examples and suggested commands to streamline your workflow.

## Coding Conventions

### File Naming
- **JavaScript/JSX files:** Use `camelCase` for filenames.
  - Example: `workoutPlanCard.jsx`, `exerciseUtils.js`
- **CSS files:** Use `camelCase` as well.
  - Example: `mainStyles.css`, `fonts.css`

### Import Style
- **Relative imports** are used throughout the codebase.
  ```js
  import { calculateSets } from './exerciseUtils.js';
  import WorkoutPlanCard from '../components/workoutPlanCard.jsx';
  ```

### Export Style
- **Named exports** are preferred for modules and utilities.
  ```js
  // src/lib/exerciseUtils.js
  export function calculateSets(reps, weight) {
    // ...
  }
  ```

### Commit Patterns
- Commit messages are freeform, with no enforced prefixes.
- Average commit message length: ~64 characters.

## Workflows

### Feature Implementation with UI and Library Changes
**Trigger:** When building or improving a feature that requires both UI and logic changes.  
**Command:** `/feature-ui-lib`

1. Update or create relevant files in `src/components/` and/or `src/pages/` for UI changes.
2. Modify or add logic in `src/lib/` for business logic, data models, or utility functions.
3. Adjust or add styles in `src/styles/` as needed.
4. Optionally update documentation (`README.md`) if the change is significant.

**Example:**
```js
// src/lib/exerciseUtils.js
export function calculateCalories(exercise, duration) {
  // logic here
}

// src/components/workoutPlanCard.jsx
import { calculateCalories } from '../lib/exerciseUtils.js';
// ...use in component
```

### Design Polish and PWA Assets
**Trigger:** When refining design elements or updating PWA-related assets for better installability and appearance.  
**Command:** `/design-polish-pwa`

1. Update styles in `src/styles/` to reflect new design choices.
2. Add or replace icon files in `public/` for various sizes.
3. Modify `index.html` and `manifest.webmanifest` to reference new assets.
4. Self-host or update fonts in `public/fonts/` and `src/styles/fonts.css`.
5. Update `package.json` and `vite.config.js` if build or asset handling changes.

**Example:**
```css
/* src/styles/fonts.css */
@font-face {
  font-family: 'Inter';
  src: url('../../public/fonts/Inter.woff2') format('woff2');
}
```
```json
// manifest.webmanifest
{
  "name": "Workout Plan Dashboard",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" }
  ]
}
```

### Add or Update Tests for Core Modules
**Trigger:** When adding new logic to core modules or improving test coverage.  
**Command:** `/add-tests`

1. Create or update test files in `src/lib/` (e.g., `*.test.js`) for the relevant modules.
2. Run the test suite (e.g., `npm run test`) to verify correctness.
3. Update or add test configuration files if needed (e.g., `vitest.config.js`).

**Example:**
```js
// src/lib/exerciseUtils.test.js
import { calculateCalories } from './exerciseUtils.js';

test('calculateCalories returns correct value', () => {
  expect(calculateCalories('running', 30)).toBeGreaterThan(0);
});
```

## Testing Patterns

- **Test files** are placed alongside modules in `src/lib/` and named with the `.test.js` suffix.
- **Testing framework** is not explicitly specified, but configuration may exist in `vitest.config.js`.
- **Test example:**
  ```js
  // src/lib/someModule.test.js
  import { someFunction } from './someModule.js';

  test('someFunction works as expected', () => {
    expect(someFunction(2)).toBe(4);
  });
  ```

## Commands

| Command           | Purpose                                                                 |
|-------------------|-------------------------------------------------------------------------|
| /feature-ui-lib   | Implement or refactor a feature with both UI and logic/model changes     |
| /design-polish-pwa| Refine design elements and update PWA assets                            |
| /add-tests        | Add or update tests for core business logic modules                     |
```
