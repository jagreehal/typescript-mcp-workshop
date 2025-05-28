import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  eslintPluginUnicorn.configs.recommended,
  {
    rules: {
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/no-null': 'off',
      'unicorn/prefer-top-level-await': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'unicorn/prefer-node-protocol': 'off',
      'unicorn/import-style': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/prefer-string-replace-all': 'off',
      'unicorn/prefer-ternary': 'off',
      'unicorn/no-nested-ternary': 'off',
      'unicorn/explicit-length-check': 'off',
      'unicorn/prefer-string-slice': 'off',
      'unicorn/no-for-loop': 'off',
      'unicorn/numeric-separators-style': 'off',
      'unicorn/switch-case-braces': 'off',
      'unicorn/text-encoding-identifier-case': 'off',
      'unicorn/prefer-date-now': 'off',
      'prefer-const': 'warn',
    },
  },
);
