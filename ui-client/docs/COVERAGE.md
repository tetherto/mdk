# Test Coverage Setup

## Overview

Test coverage has been set up for the monorepo packages using Vitest with v8 coverage provider. Coverage can be run locally and is enforced on CI.

## Current Status

### ✅ Foundation Package (`packages/foundation`)
- **Status**: Tests passing, coverage enforced ✅ **94%+ COVERAGE**
- **Current Coverage**: 97.81% lines, 95.04% functions (approx. 85%+ branches)
- **Thresholds**: 94% lines, 94% functions, 85% branches, 94% statements
- **Tests**: 546 tests passing across 48 test files

### ✅ Core Package (`packages/core`)
- **Status**: Tests passing, coverage enforced ✅ **80%+ COVERAGE**
- **Current Coverage**: 92.03% lines, 85.8% functions, 86.95% branches, 92.03% statements
- **Tests**: 573 tests passing across 34 test files
  - ✅ All utility functions tested (async, time, cn, chart-options, chart-tooltip, array, string, number, date, format, validation, conversion, chart)
  - ✅ All constants tested (charts, colors, units)
  - ✅ Theme utilities and design tokens (tokens.test.ts) tested
  - ✅ Utils: conversion (convertEnergy, calculateCurtailment, calculateTransactionSum) and format (formatHashrate, formatErrors, formatChartDate, formatRelativeTime, etc.) extended
  - ✅ Component logic tested (form hooks, form fields/primitives, sidebar helpers/state/menu-item/overlay, light-weight-line-chart utils/constants)
  - ✅ Data table (DataTable, TableBody, TableHeader, EmptyTableBody) tested
  - ✅ Form primitives and pre-built fields (FormInput, FormTextArea, FormSelect, FormCheckbox, FormSwitch, FormRadioGroup, FormDatePicker, FormTagInput, FormCascader) tested
  - ✅ Basic UI components tested (button, input, badge, card, label, typography, separator)
- **Thresholds**: 80% lines, 79% functions, 75% branches, 80% statements
- **Coverage exclusions**: `src/components/icons/**` (79 SVG config files with no testable logic) and `src/types/**` (pure type definitions) are excluded from the metric so coverage reflects testable code.

### ➖ Fonts Package (`packages/fonts`)
- **Status**: No tests (asset-only package)
- **Coverage**: N/A

## Usage

### Local Development

```bash
# Run tests with coverage for all packages
pnpm test:coverage

# Run coverage for a specific package
cd packages/foundation && pnpm test:coverage
cd packages/core && pnpm test:coverage

# Run tests without coverage
pnpm test

# Watch mode for development
pnpm test:watch
```

### CI/CD

Coverage is automatically checked on:
- Push to `main`, `develop`, `staging` branches
- Pull requests targeting these branches

The CI pipeline will fail if:
- Foundation or Core package coverage drops below its thresholds
- Any package test suite fails

## Configuration

### Coverage Settings

Each package has a `vitest.config.js` with coverage configuration:

**Foundation** (`packages/foundation/vitest.config.js`):
```javascript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov'],
  thresholds: {
    lines: 94,
    functions: 94,
    branches: 85,
    statements: 94,
  },
}
```

**Core** (`packages/core/vitest.config.js`):
```javascript
coverage: {
  provider: 'v8',
  reporter: ['text-summary', 'html', 'lcov'],
  include: ['src/**/*.{ts,tsx}'],
  exclude: [
    'src/**/*.{test,spec}.{ts,tsx}',
    'src/**/index.{ts,tsx}',
    'src/**/*.d.ts',
    'src/test-utils/**',
    'src/components/icons/**',  // 79 SVG config files — no testable logic
    'src/types/**',              // pure TypeScript type definitions
  ],
  thresholds: {
    lines: 80,
    functions: 79,
    branches: 75,
    statements: 80,
  },
}
```

### Coverage Exclusions

The following are excluded from coverage:
- Test files (`**/*.{test,spec}.{ts,tsx}`)
- Index files (`**/index.{ts,tsx}`)
- Type definition files (`**/*.d.ts`)
- Storybook files (`**/*.stories.{ts,tsx}` - foundation only)
- Test utilities (`src/test-utils/**` - foundation only)
- **Core only**: `src/components/icons/**` (icon SVG configs with no logic), `src/types/**` (type-only files)

## Roadmap

### ✅ Completed
1. ✅ **Foundation package: 94% coverage achieved** (exceeded 80% target!)
2. ✅ **Fix failing tests in Core package**
3. ✅ **Add comprehensive component tests** for device-explorer, incidents, and column factories
4. ✅ **Test all hooks, utils, constants, and Redux slices**
5. ✅ **Core package: Baseline coverage established (37.68%)**
   - Added 14 new test files covering utils, constants, theme, and component logic
   - Upgraded vitest config to jsdom with React plugin support
   - Enabled coverage thresholds at current baseline
   - 354 tests passing - all non-UI code comprehensively tested
6. ✅ **Core package: 80%+ coverage achieved (85.32% lines)**
   - Excluded `src/components/icons/**` and `src/types/**` from coverage so the metric reflects testable code
   - Added form-fields tests (FormItem, FormControl, FormLabel, FormDescription, FormMessage, useFormField, FormInput, FormTextArea, FormCheckbox, FormSwitch, FormRadioGroup, FormSelect, FormDatePicker, FormTagInput, FormCascader)
   - Added data-table tests (DataTable, TableBody, TableHeader, EmptyTableBody; rows, empty state, loading, pagination, row selection, row expansion)
   - Added sidebar menu-item tests (MenuItemInternal, OverlayContent; leaf/group items, expand/collapse, onItemClick)
   - Thresholds: 80% lines/statements, 79% functions, 75% branches
   - Theme tokens tests and extended conversion/format tests added; coverage now ~92% lines
   - 573 tests passing across 34 test files

### Next Steps for Core Package
1. **Maintain 80%+ coverage** as new code is added
2. **Add integration tests** for key user flows
3. **Set up coverage reporting badges** in README
4. **Consider E2E tests** with Playwright or Cypress

## Coverage Reports

After running `pnpm test:coverage`, you can view detailed HTML reports:

```bash
# Foundation coverage report
open packages/foundation/coverage/index.html

# Core coverage report
open packages/core/coverage/index.html
```

## Troubleshooting

### Coverage not generating
- Ensure `@vitest/coverage-v8` is installed: `pnpm install`
- Check that vitest.config.js exists in the package
- Verify test files match the `include` pattern

### Tests failing on CI but passing locally
- Ensure `pnpm-lock.yaml` is up to date
- Check Node.js version matches CI (v20)
- Run `pnpm install --frozen-lockfile` to match CI environment

### Coverage thresholds too strict
- Review current coverage with `pnpm test:coverage`
- Adjust thresholds in `vitest.config.js` to match current baseline
- Incrementally increase thresholds as more tests are added

## Contributing

When adding new code:
1. **Write tests first** (TDD approach recommended)
2. **Aim for 80% coverage** of new code
3. **Run coverage locally** before committing: `pnpm test:coverage`
4. **Check CI results** after pushing

When fixing bugs:
1. **Write a failing test** that reproduces the bug
2. **Fix the bug** to make the test pass
3. **Verify coverage** hasn't decreased

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)
- [Testing Library](https://testing-library.com/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
