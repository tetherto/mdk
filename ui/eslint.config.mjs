import antfu from '@antfu/eslint-config'

// Formatting is owned by Prettier (.prettierrc + lint-staged). Antfu's
// stylistic ruleset is disabled here so the two don't fight at commit time
// vs. CI time. Keep this off; do not re-introduce `style/*` overrides.
export default antfu(
  {
    type: 'lib',
    typescript: true,
    stylistic: false,
    formatters: false,
    ignores: [
      'postcss.config.js',
      'vite.config.base.js',
      '*/*.md',
      'packages/**/*.md',
      'apps/**/*.md',
      'packages/cli/templates/**',
      // mdk-ui-shell is a scaffold-shaped app: it owns its own eslint
      // config (PascalCase filenames, looser typed-lint scope) so the
      // monorepo-wide rules don't apply here. Lint via
      // `npm run lint --workspace @tetherto/mdk-ui-shell`.
      'apps/mdk-ui-shell/**',
    ],
  },
  // ── Cross-boundary import guard ──────────────────────────────────────────
  // Ban relative paths that navigate into src/core from src/foundation, or
  // climb 2+ levels in ui-core / react-adapter (which have no sub-directories
  // deep enough to need that). All packages expose '@/*' → 'src/*' and
  // react-devkit additionally exposes '@core' → 'src/core'.
  {
    // foundation → core: any relative path that resolves to src/core must use @core.
    files: ['packages/react-devkit/src/foundation/**'],
    rules: {
      'ts/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(\\.\\./)+core($|\\/)',
              message: "Use '@core' instead of a relative path to src/core.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/ui-core/src/**', 'packages/react-adapter/src/**'],
    rules: {
      'ts/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(\\.\\./){2,}',
              message: "Use '@/<path>' path aliases instead of deep relative imports.",
            },
          ],
        },
      ],
    },
  },
  {
    rules: {
      'ts/no-redeclare': 'off',
      'ts/explicit-function-return-type': 'off',
      'ts/consistent-type-definitions': ['error', 'type'],
      'no-console': ['warn'],
      'antfu/no-top-level-await': 'off',
      'antfu/top-level-function': 'off',
      'import/consistent-type-specifier-style': 'off',
      'node/prefer-global/process': 'off',
      'perfectionist/sort-imports': 'off',
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
  // TEMP: moria port — see PORTING.md in this tree. Remove block when checklist done.
  // packages/react-devkit/src/foundation/components/domain/reporting-tool/multi-site/mining-report/PORTING.md
  {
    files: ['**/multi-site/mining-report/**'],
    rules: {
      'unicorn/filename-case': 'off',
      'ts/ban-ts-comment': 'off',
    },
  },
)
