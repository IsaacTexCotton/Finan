const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, module: 'readonly' },
    },
  },
  {
    files: ['tests/**/*.js', 'eslint.config.js', 'playwright.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: globals.node },
  },
  {
    // Os testes no navegador têm funções (page.evaluate) que rodam dentro da página.
    files: ['tests/e2e/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
      complexity: ['warn', 15],
      'max-lines-per-function': ['warn', { max: 60, skipBlankLines: true, skipComments: true }],
    },
  },
];
