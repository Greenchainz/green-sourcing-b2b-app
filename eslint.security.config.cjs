const security = require('eslint-plugin-security');

module.exports = [
  {
    files: ['backend/**/*.js', '*.js'],
    plugins: {
      security,
    },
    rules: {
      ...security.configs.recommended.rules,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
    },
    ignores: ['**/node_modules/**', '**/dist/**', '**/tmp/**'],
  },
];
