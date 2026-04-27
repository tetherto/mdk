import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    typescript: true,
    formatters: false,
    ignores: [
      'postcss.config.js',
      'vite.config.base.js',
      '*/*.md',
      'packages/**/*.md',
      'apps/**/*.md',
    ],
  },
  {
    rules: {
      'ts/no-redeclare': 'off',
      'ts/explicit-function-return-type': 'off',
      'ts/consistent-type-definitions': ['error', 'type'],
      'no-console': ['warn'],
      'antfu/no-top-level-await': 'off',
      'antfu/top-level-function': 'off',
      'node/prefer-global/process': 'off',
      'perfectionist/sort-imports': 'off',
      'style/jsx-one-expression-per-line': 'off',
      'style/quote-props': 'off',
      'style/arrow-parens': 'off',
      'style/indent-binary-ops': 'off',
      'style/multiline-ternary': 'off',
      'style/operator-linebreak': 'off',
      'style/jsx-wrap-multilines': 'off',
      'style/jsx-curly-newline': 'off',
      'style/brace-style': 'off',
      'style/member-delimiter-style': 'off',
      'antfu/consistent-list-newline': 'off',
      'antfu/if-newline': 'off',
      'test/prefer-lowercase-title': 'off',
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
          ignore: ['README.md', 'App.tsx'],
        },
      ],
    },
  },
)
