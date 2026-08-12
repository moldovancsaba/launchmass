// ESLint flat config (project package.json has "type": "module").
//
// Why this file exists: WARP.md forbids automated tests in this repo ("Tests are
// forbidden — this is an MVP factory, no testing allowed"), so static analysis is
// the load-bearing substitute guardrail. See ARCHITECTURE.md's "Static analysis as
// the test substitute" note for the full rationale.
//
// Baseline: eslint-config-next's `next/core-web-vitals` (React + Next.js
// recommended rules, incl. react-hooks and @next/next), applied via FlatCompat
// since eslint-config-next ships legacy-style shareable configs. On top of that we
// add the project-specific rules called for by issue #15: no-unused-vars,
// no-console (warn, allowing error/warn), no-undef, eqeqeq (smart).
import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import globals from 'globals';

const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
});

const projectRules = {
  'no-unused-vars': 'error',
  'no-console': ['warn', { allow: ['error', 'warn'] }],
  'no-undef': 'error',
  eqeqeq: ['error', 'smart'],
};

export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'public/**',
      'vendor/**',
      'package-lock.json',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    // Default runtime: Next.js pages/lib/components run in a browser + Node
    // mix (client components render in the browser; pages/api/* and lib/*
    // that back them run under Node on the server) so both global sets apply.
    files: ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: projectRules,
  },
  {
    // scripts/** are pure Node CLI scripts (some .cjs, some .mjs) — no browser
    // globals apply here, and .cjs files additionally need CommonJS globals
    // (require/module/exports/__dirname/__filename) that the base config above
    // does not provide.
    files: ['scripts/**/*.js', 'scripts/**/*.mjs', 'scripts/**/*.cjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: projectRules,
  },
  {
    // .cjs files are CommonJS (require/module.exports), not ES modules —
    // sourceType must say so or `require`/`module`/`exports`/`__dirname` parse
    // as undefined-global errors despite the globals above.
    files: ['scripts/**/*.cjs'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.node,
      },
    },
    rules: projectRules,
  },
];
