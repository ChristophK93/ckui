// @ts-check
const { defineConfig } = require('eslint/config');
const rootConfig = require('../../eslint.config.js');

module.exports = defineConfig([
  ...rootConfig,
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'ck',
          style: 'camelCase',
        },
      ],
      // One array of configs: ck- elements, and attribute components such as button[ckButton].
      '@angular-eslint/component-selector': [
        'error',
        [
          { type: 'element', prefix: 'ck', style: 'kebab-case' },
          { type: 'attribute', prefix: 'ck', style: 'camelCase' },
        ],
      ],
    },
  },
  {
    files: ['**/*.html'],
    rules: {},
  },
]);
