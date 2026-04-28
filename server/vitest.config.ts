/**
 * Vitest configuration for the BFF server tests.
 *
 * Separate from the frontend vitest config to allow independent
 * test runs with server-specific settings.
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
