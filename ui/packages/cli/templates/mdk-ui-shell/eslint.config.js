import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'app',
    typescript: { tsconfigPath: './tsconfig.json' },
    react: true,
    stylistic: false,
    formatters: false,
    // Typed-lint rules need the file to be in tsconfig's `include`.
    // The eslint + vite configs are JS/TS in the project root and aren't
    // part of `src/**`, so skip them — otherwise eslint crashes trying
    // to look up parser services for them.
    ignores: ['eslint.config.js', 'vite.config.ts', 'dist', 'node_modules'],
  },
  {
    rules: {
      'unicorn/filename-case': [
        'error',
        {
          cases: { kebabCase: true, pascalCase: true },
          // Conventional uppercase doc files (README.md, USAGE.md, LICENSE)
          // stay uppercase; everything else follows kebab- or PascalCase.
          ignore: [/^[A-Z_]+\.md$/, /^LICENSE$/],
        },
      ],
      'no-console': 'warn',
      'antfu/no-top-level-await': 'off',
      'antfu/top-level-function': 'off',
      'node/prefer-global/process': 'off',
    },
  },
)
