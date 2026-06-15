# LineChartCard

Composable line-chart card with title, timeline range selector, legend
(basic or detailed), error boundary, and an optional min/max/avg footer.

Accepts either pre-shaped `data` or `rawData` + a `dataAdapter` callback so
upstream domain components can keep their data wrangling local.

## Props

| Prop              | Type                              | Required | Default | Description                                              |
| ----------------- | --------------------------------- | -------- | ------- | -------------------------------------------------------- |
| `title`           | `string`                          | no       | —       | Chart title.                                             |
| `data`            | `LineChartCardData`               | no       | —       | Pre-shaped chart data.                                   |
| `rawData`         | `unknown`                         | no       | —       | Raw data; pair with `dataAdapter`.                       |
| `dataAdapter`     | `(rawData) => LineChartCardData`  | no       | —       | Transforms `rawData` into chart data.                    |
| `timelineOptions` | `TimelineOption[]`                | no       | —       | Range selector options.                                  |
| `timeline`        | `string`                          | no       | —       | Controlled timeline.                                     |
| `defaultTimeline` | `string`                          | no       | first option | Default timeline for uncontrolled mode.              |
| `onTimelineChange`| `(value: string) => void`         | no       | —       | Called when user selects a new timeline.                 |
| `detailLegends`   | `boolean`                         | no       | `false` | Show detailed legend (current value + delta per series). |
| `isLoading`       | `boolean`                         | no       | `false` | Show loading state.                                      |
| `shouldResetZoom` | `boolean`                         | no       | `true`  | Reset zoom when timeline changes.                        |
| `chartProps`      | `Partial<LineChartProps>`         | no       | —       | Pass-through props for the underlying `LineChart`.       |
| `minHeight`       | `number \| string`                | no       | `350`   | Minimum chart height.                                    |
| `className`       | `string`                          | no       | —       | Additional class names.                                  |

## Minimal example

```tsx
<LineChartCard
  title="Hashrate"
  data={chartData}
  timelineOptions={[{ label: "5m", value: "5m" }, { label: "1h", value: "1h" }]}
  defaultTimeline="5m"
/>
```

## Data contracts

`LineChartCardData` exposes `datasets`, `minMaxAvg`, `highlightedValue`,
`footerStats`, `yTicksFormatter`, and `priceFormatter`. See `types.ts` in
the same directory for the full shape.

## Notes

- Wrapped in `withErrorBoundary` — chart-level crashes won't blow up the page.
- For mining-domain charts, pair `<LineChartCard>` with adapter chart hooks
  (`useHashrateChartData`, `useSiteConsumptionChartData`) — the hooks
  return the `ChartCardData` payload pre-shaped.
