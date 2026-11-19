import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'public/**', 'qa/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
  },
  {
    files: ['scripts/**/*.cjs'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly', require: 'readonly', __dirname: 'readonly', module: 'readonly', Buffer: 'readonly' },
    },
    rules: { '@typescript-eslint/no-require-imports': 'off', 'no-unused-vars': 'error', 'no-undef': 'error' },
  },
];
