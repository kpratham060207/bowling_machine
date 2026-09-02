import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'apps/web/src'),
    },
  },
  test: {
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'packages/**/*.test.ts',
      'packages/**/*.test.tsx',
      'apps/**/*.test.ts',
      'apps/**/*.test.tsx',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', 'tests/e2e/**'],
    environment: 'node',
    passWithNoTests: false,
  },
});
