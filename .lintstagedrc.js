module.exports = {
  // Lint staged files matching *.ts / *.tsx
  '*.{ts,tsx}': [
    'prettier --write',
    'eslint --fix --max-warnings 0',
  ],
  // Format JSON, YAML, Markdown
  '*.{json,yml,yaml,md}': ['prettier --write'],
  // Format JS / JSX
  '*.{js,jsx}': ['prettier --write', 'eslint --fix --max-warnings 0'],
};
