import globals from 'globals';
import js from '@eslint/js';
import ftflow from 'eslint-plugin-ft-flow';
import prettierConfig from 'eslint-config-prettier';
import hermes from 'hermes-eslint';

export default [
  {
    ignores: [
      'node_modules/*',
      '.github/*',
      '.husky/*',
      'dist/*',
      'docs/**/*',
      '*.code-workspace',
      '*.lock',
      '*.toml',
      'package-lock.json',
      'scripts/*',
    ],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parser: hermes,
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      'ft-flow': ftflow,
    },
    rules: {
      eqeqeq: 'error',
      'no-empty-function': 'error',
      'no-eval': 'error',
      'no-implicit-coercion': 'error',
      'no-implicit-globals': 'off',
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
  },
  {
    files: ['**/*.mjs'],
    ...js.configs.recommended,
    ...prettierConfig,
  },
  {
    files: ['tests/**/*.mjs'],
    ...js.configs.recommended,
    ...prettierConfig,
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
