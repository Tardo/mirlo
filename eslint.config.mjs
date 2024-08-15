import {FlatCompat} from '@eslint/eslintrc';
import js from '@eslint/js';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  ...compat.extends('plugin:prettier/recommended'),

  ...compat.env({
    browser: true,
    es6: true,
    es2024: true,
  }),

  ...compat.plugins('jest'),

  {
    ignores: [
      'node_modules',
      '.github',
      '.husky',
      'dist',
      'docs',
      '*.code-workspace',
      '*.lock',
      '*.toml',
      'package-lock.json',
      'scripts/',
    ],
  },

  ...compat.config({
    overrides: [
      {
        files: ['**/*.mjs'],
        parserOptions: {
          sourceType: 'module',
        },
      },
      {
        files: ['tests/**/*.mjs'],
        env: {
          jest: true,
        },
      },
    ],
    globals: {},
    rules: {
      eqeqeq: 'error',
      'no-empty-function': 'error',
      'no-eval': 'error',
      'no-implicit-coercion': 'error',
      'no-implicit-globals': 'error',
      'no-implied-eval': 'error',
      'no-return-assign': 'error',
      'no-undef-init': 'error',
      'no-shadow': 'error',
      'no-script-url': 'error',
      'no-unneeded-ternary': 'error',
      'no-unused-expressions': 'error',
      'no-labels': 'error',
      'no-useless-call': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-concat': 'error',
      'no-useless-constructor': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      'no-void': 'error',
      'no-console': [
        'error',
        {
          allow: ['info', 'warn', 'error'],
        },
      ],
      'prefer-const': 'error',
      'prefer-numeric-literals': 'error',
      'prefer-object-has-own': 'error',
      'spaced-comment': 'error',
      radix: 'error',
      'prefer-arrow-callback': 'warn',
      'no-var': 'warn',
      'no-extra-bind': 'warn',
      'no-lone-blocks': 'warn',
    },
  }),
];
