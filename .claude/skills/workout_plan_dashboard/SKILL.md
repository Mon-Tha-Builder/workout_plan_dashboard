```markdown
# workout_plan_dashboard Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns, coding conventions, and workflows used in the `workout_plan_dashboard` JavaScript codebase. You'll learn how to structure files, write and organize code, and follow the main workflow for batch bugfixes and feature audits. This guide also covers testing patterns and provides handy commands for common tasks.

## Coding Conventions

### File Naming
- **PascalCase** is used for component and page files.
  - Example: `Progress.jsx`, `CalendarHeatmap.jsx`
- Utility and library files use **camelCase**.
  - Example: `store.js`, `models.js`

### Import Style
- **Relative imports** are used throughout the codebase.
  - Example:
    ```javascript
    import { getUserProgress } from '../lib/store.js';
    import CalendarHeatmap from '../components/CalendarHeatmap.jsx';
    ```

### Export Style
- **Named exports** are preferred.
  - Example:
    ```javascript
    // In src/lib/store.js
    export function getUserProgress(userId) { ... }
    export function updateUserSettings(settings) { ... }
    ```

### Commit Messages
- Freeform, descriptive messages.
- No strict prefixing, but messages are clear and average around 77 characters.
  - Example:  
    ```
    Fix progress calculation bug and update onboarding flow for new users
    ```

## Workflows

### Multi-file Bugfix and Feature Audit
**Trigger:** When a full code audit or review identifies multiple bugs or minor issues that need to be fixed across several core files.  
**Command:** `/audit-bugfix`

**Step-by-step:**
1. **Identify and Document Issues**
   - During a code review or audit, list all bugs, inconsistencies, and minor feature gaps.
   - Example documentation:
     ```
     - Progress not updating on Settings change
     - CalendarHeatmap not rendering for new users
     - Onboarding skips step 2 on fast connections
     ```
2. **Edit Related Files**
   - Update the relevant files to address each issue.
   - Typical files involved:
     - `src/lib/store.js`
     - `src/lib/models.js`
     - `src/pages/Progress.jsx`
     - `src/pages/Settings.jsx`
     - `src/pages/Onboarding.jsx`
     - `src/components/CalendarHeatmap.jsx`
   - Example fix:
     ```javascript
     // In src/pages/Settings.jsx
     import { updateUserSettings } from '../lib/store.js';

     function handleSave(settings) {
       updateUserSettings(settings);
       // Ensure progress is recalculated
       refreshProgress();
     }
     ```
3. **Update Logic, UI, and Data Handling**
   - Make sure all affected logic and UI components are consistent and correct.
   - Example: Adjust data flow between `store.js` and `Progress.jsx`.
4. **Test Changes**
   - Run automated tests (see Testing Patterns below).
   - Perform manual regression testing to ensure no new issues.
5. **Document Fixes**
   - Write a detailed commit message listing all changes and fixes.
   - Example:
     ```
     Fix: Progress calculation and onboarding flow
     - Fixed progress update on settings change
     - Resolved onboarding step skipping
     - Improved CalendarHeatmap rendering for new users
     ```

## Testing Patterns

- **Test Framework:** Unknown (not detected), but test files follow the `*.test.*` pattern.
- **Location:** Test files are typically placed alongside the files they test.
- **Example Test File:**
  ```
  src/lib/store.test.js
  ```
- **Test Example:**
  ```javascript
  import { getUserProgress } from './store';

  test('returns correct progress for new user', () => {
    const progress = getUserProgress('newUser');
    expect(progress).toEqual({ completed: 0, total: 10 });
  });
  ```

## Commands

| Command        | Purpose                                                        |
|----------------|----------------------------------------------------------------|
| /audit-bugfix  | Run a batch bugfix and minor feature audit across core files   |

```