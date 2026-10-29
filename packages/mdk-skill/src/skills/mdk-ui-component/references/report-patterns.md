# Report patterns

## Overview

A report shows figures over a period: a range the operator picks, bucketed by hour, day, week or month in the site's
timezone. MDK ships the pieces, so a report page needs no date library, chart setup or CSV code of its own. This page
puts them together and ends with the problems app developers hit most often.

## The site's timezone comes first

Buckets and custom ranges are in the site's timezone, so a report needs it before its first request. Serve it from
a small route of its own (`GET /api/<name>/site`, answering at least `{ timezone }`), load it once in a hook, and
render the report only once it is known: a gate component shows `Loader` or `ErrorCard` until then. React Query
caches it, so moving between pages doesn't load it again. Never take the timezone from the browser, and don't read it
from the report it is needed for.

## The period lives in the URL

`usePeriod` reads the range and bucket size from the URL, so a report reloads and shares as it is shown, and
`PeriodControl` renders the presets, a custom range and the bucket toggle for that state. Never hold the range in
`useState`.

```tsx
import { type QueryView, toQueryView, useMdkApp, usePeriod, useQuery } from '@tetherto/mdk-react-adapter'
import { PeriodControl } from '@tetherto/mdk-react-devkit'
import { zonedDayOf } from '@tetherto/mdk-ui-foundation'
import { useSearchParams } from 'react-router'

import { ReportPanel } from '../components/report-panel'
import { type Report, fetchReport, reportQueryKey } from '../data/report'

export type ReportView =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; labels: string[]; energyMwh: number[]; filename: string }

export const useReport = (timezone: string) => {
  const period = usePeriod(useSearchParams(), timezone, { preset: '30d' })
  const { apiUrl } = useMdkApp()
  const { start, end, granularity } = period.query
  const url = `${apiUrl('/api/<name>/report')}?start=${start}&end=${end}&granularity=${granularity}`
  const query = useQuery({
    queryKey: reportQueryKey(url),
    queryFn: () => fetchReport(url),
    // Keep the last report on screen while the next period loads.
    placeholderData: (previous) => previous,
  })
  return { period, view: shapeReport(toQueryView(query, url), timezone) }
}

// Shape from the period the body covers, not period.query: while the next period loads, the body is the last one.
const shapeReport = (view: QueryView<Report>, timezone: string): ReportView => {
  if (view.status !== 'ready') return view
  const { start, granularity, buckets } = view.data
  if (buckets.length === 0) return { status: 'empty' }
  return {
    status: 'ready',
    labels: buckets.map((b) => b.label),
    energyMwh: buckets.map((b) => b.energyMwh),
    filename: `energy-${zonedDayOf(start, timezone)}-${granularity}.csv`,
  }
}

export const ReportPage = ({ timezone }: { timezone: string }) => {
  const { period, view } = useReport(timezone)
  return (
    <>
      <PeriodControl state={period} timezone={timezone} />
      <ReportPanel view={view} />
    </>
  )
}
```

| Preset (`preset`) | Default bucket |
| ----------------- | -------------- |
| `24h`             | `hour`         |
| `7d`, `30d`       | `day`          |
| `90d`             | `week`         |
| `12m`, `ytd`      | `month`        |

`period.query` is `{ start, end, granularity }`, with `start` and `end` in ms; `period.allowed` lists the bucket sizes
that fit the range. Pass `showGranularity={false}` to `PeriodControl` on a page that shows one figure per period.

> [!IMPORTANT]
> With `placeholderData`, the view holds the previous period's body while the next one loads. Shape it from what the
> response says it covers (have the route echo `start`, `end` and `granularity`, as `shapeReport` reads them above), not
> from `period.query`, or the old buckets get the new period's labels and export filename.

## Charts and tiles

- **Bars over buckets:** `BarChart` with `data={buildBarChartData({ labels, series: [{ label, values, color }] })}`
  and `options={buildBarChartOptions({ yUnit: 'MWh' })}`. Series with the same `stack` id stack. The unit goes once
  on the axis title, and `categoryTicksPadding` spaces date labels on a long range.
- **A titled card:** `ChartContainer` with `title`, `loading` and `empty`, so the card keeps its size in every state.
  `headerAction` holds a toggle or an export button.
- **A figure:** `SingleStatCard` with `name` and `value`, plus `caption` under the name, a `tag` beside the value and
  `detail` lines under it.

## Formatting

| Need                                              | Use                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| A value in the unit it reads best in (kW, MW)     | `scaleToUnit(value, POWER_W_SCALES)`, which returns `{ value, unit }`  |
| One unit for a whole series, from its maximum     | `pickUnitScale(HASHRATE_TH_S_SCALES, max)`, then divide by its `factor` |
| A bitcoin amount                                  | `formatBitcoin(btc)` or `formatBitcoin(btc, 'sats')`                   |

All three come from `@tetherto/mdk-react-devkit`. Energy has no scale list: write the payload's own unit. Shape and
format in the hook, so the component only places strings.

## CSV export

Build the rows in the hook and hand them to `downloadCsv` (`@tetherto/mdk-ui-foundation`) from `ExportButton`'s
`onExport`:

```tsx
<ExportButton formats={['csv']} onExport={() => downloadCsv(rows, 'energy-2026-10.csv')} />
```

Write numbers without units or thousands separators, so a spreadsheet can sum them, and name the unit in the column
header (`energy_mwh`).

## Known problems

| Symptom                                                                 | Cause                                                                     | Fix                                                                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Every request answers 401                                               | A bare `fetch` sends no token                                             | Request through `mdkFetch`                                                                            |
| 404 from the app's own route on someone else's stack                    | The URL hardcodes `/apps/<name>`, and the operator installed another name | `useMdkApp().apiUrl(...)`                                                                             |
| "Invalid hook call"                                                     | React or an MDK package is bundled into the app                           | Keep `MDK_APP_SHARED_MODULES` external, and import the devkit from its root only                      |
| A downloaded archive is corrupt                                         | `mdkFetch` reads every non-JSON body as text                              | `fetch` the file with `Authorization: Bearer ${authStore.getState().token}`, then save `response.blob()` |
| An installed app shows old UI                                           | `ui/` was not rebuilt or not committed                                    | `npm run build:ui` in the app, then commit `ui/`                                                      |
| The app's pages show in one flat group, or the devkit's styles win over the shell's | The dashboard was created from an older template               | Recreate it with `mdk create dashboard`                                                               |
| The error line says nothing useful                                      | The component shows `error.message` or a raw status                       | `toQueryView(query, url, { unreachableHint })` in the hook                                            |

When you hit one that is not here, note it for the MDK team with the symptom, the cause and your workaround.
