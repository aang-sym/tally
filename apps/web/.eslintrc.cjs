module.exports = {
  root: true,
  extends: ['../../packages/config/eslint.config.js', 'plugin:react-hooks/recommended'],
  plugins: ['react-hooks'],
  env: {
    browser: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};