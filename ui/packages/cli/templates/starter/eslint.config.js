import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'app',
    typescript: { tsconfigPath: './tsconfig.json' },
    react: true,
    stylistic: false,
    formatters: false,
  },
  {
    rules: {
      // `mdk-ui add page` generates PascalCase component files (React convention).
      // Allow both so generated pages and kebab-case utilities both pass lint.
      'unicorn/filename-case': [
        'error',
        {
          cases: { kebabCase: true, pascalCase: true },
        },
      ],
      'no-console': 'warn',
      'antfu/no-top-level-await': 'off',
      'antfu/top-level-function': 'off',
      'node/prefer-global/process': 'off',
    },
  },
)
