import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'android', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Scripts d'outillage et tests e2e : exécutés par Node, pas dans le navigateur.
    files: ['tools/**/*.{js,mjs,ts}', 'e2e/**/*.ts', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
);
