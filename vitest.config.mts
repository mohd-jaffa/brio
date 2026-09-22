import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
    environmentMatchGlobs: [
      // Backend tests use node environment
      ['tests/backend/**', 'node'],
      ['tests/db/**', 'node'],
      ['tests/e2e/**', 'node'],
    ],
  },
});
