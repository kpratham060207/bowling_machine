/**
 * Shared ESLint flat config for the bowling_machine monorepo.
 * Kept minimal: TypeScript strict checks + Prettier compatibility only.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** @type {import('typescript-eslint').Config} */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/out/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'firmware/**',
      'eslint.config.js',
      'packages/config/eslint/**',
      // Next.js generated files — must not be linted (triple-slash refs are required).
      '**/next-env.d.ts',
      // PostCSS config is CommonJS, not part of the TypeScript project.
      '**/postcss.config.cjs',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  eslintConfigPrettier,
  {
    languageOptions: {
      parserOptions: {
        project: [
          'tsconfig.eslint.json',
          'apps/web/tsconfig.json',
          'apps/api/tsconfig.json',
          'apps/esp32-simulator/tsconfig.json',
        ],
        tsconfigRootDir: repoRoot,
      },
    },
    rules: {
      // Disallow explicit any — aligns with project TypeScript strictness goals.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  {
    // Next.js web app uses Supabase SSR — relax strict unsafe rules where ESLint
    // project service cannot resolve @supabase/* types across composite configs.
    files: ['apps/web/**/*.ts', 'apps/web/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
);
