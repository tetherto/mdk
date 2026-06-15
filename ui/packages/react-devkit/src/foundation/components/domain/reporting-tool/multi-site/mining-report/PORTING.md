# Multi-site mining report — port follow-up

This tree was ported from moria with intentional **temporary** exemptions from
foundation conventions. Do not treat the overrides below as permanent; close
this checklist and delete this file when done.

**Exit criteria:** ESLint subtree override removed, Vitest component coverage
exclusions removed (or replaced with real tests), no `@ts-nocheck` in
`SiteDetails/**/*.util.ts`, filenames match kebab-case, public surfaces use
named exports where the rest of foundation does.

## ESLint (`ui/eslint.config.mjs`)

Block on `**/multi-site/mining-report/**` disables:

- `unicorn/filename-case` — legacy PascalCase dirs/files (`SiteDetails/Ebitda/`,
  `ReportCover/`, `AllSites/`, `BtcPriceIcon.tsx`, period `Weekly/` / `Monthly/`
  / `Yearly/`, etc.)
- `ts/ban-ts-comment` — `@ts-nocheck` on ported chart-builder utils (see below)

**Follow-up:** rename paths to kebab-case, remove `@ts-nocheck`, delete the ESLint
block.

## TypeScript strictness

These files still open with `@ts-nocheck` (strict-null / indexed-access cleanup):

- `components/SiteDetails/CostSummary/CostSummary.util.ts`
- `components/SiteDetails/DailyHashrate/DailyHashrate.util.ts`
- `components/SiteDetails/Ebitda/Ebitda.util.ts`
- `components/SiteDetails/Efficiency/Efficiency.util.ts`
- `components/SiteDetails/EnergyCosts/EnergyCosts.util.ts`
- `components/SiteDetails/EnergyRevenues/EnergyRevenues.util.ts`
- `components/SiteDetails/HashCosts/HashCosts.util.ts`
- `components/SiteDetails/HashRevenues/HashRevenues.util.ts`
- `components/SiteDetails/Operations/Operations.util.ts`
- `components/SiteDetails/PowerConsumption/PowerConsumption.util.ts`
- `components/SiteDetails/SubsidyVSFees/SubsidyVSFees.util.ts`
- `components/SiteDetails/Workers/Workers.util.ts`

**Follow-up:** type log/API rows against `mining-report.types`, drop
`@ts-nocheck` file-by-file; re-enable `ts/ban-ts-comment` for this tree via
ESLint cleanup above.

## Test coverage (`packages/react-devkit/vitest.config.js`)

Mining-report **components** and several shells are excluded from coverage;
logic is covered via `lib/**` and `*.util.test.ts`. Component RTL tests are
still TODO.

**Follow-up:** add foundation-dom tests for report shells/charts; shrink
coverage `exclude` list; document any remaining exclusions in
`ui/docs/COVERAGE.md`.

## Agent-ready surface

- `SiteReports` has `USAGE.md` + example; tier is still `advanced`.
- `MiningReport` has demo page only — no `USAGE.md` / `*.example.tsx` yet.

**Follow-up:** promote to `agent-ready` when agents should scaffold full report
pages via `mdk-ui docs` / `example`.

## Conventions alignment

| Area | Port state | Foundation norm |
| ---- | ---------- | ----------------- |
| Filenames | PascalCase segments | kebab-case |
| Chart utils | `@ts-nocheck` | strict TS |
| Some components | `default` export | named exports |
| ESLint | subtree off | full rules |

Track progress by checking boxes in PRs that touch this tree; remove
ESLint/Vitest exemptions only when the corresponding section is complete.
