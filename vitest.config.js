import { defineConfig } from 'vitest/config';

// Deliberately separate from vite.config.js — the PWA plugin has no business
// running during unit tests, and these are pure-logic tests with no DOM.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js']
  }
});
