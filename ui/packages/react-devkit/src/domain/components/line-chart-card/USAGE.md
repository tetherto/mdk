# `LineChartCard`

Composable line-chart card with title, timeline range selector, legend
(basic or detailed), error boundary, and an optional min/max/avg footer.

Accepts either pre-shaped `data` or `rawData` + a `dataAdapter` callback so
upstream domain components can keep their data wrangling local.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `chartProps` | Optional | `Partial<LightWeightLineChartProps>` | - | Pass-through props to the core LineChart |
| `chartRef` | Optional | `React.MutableRefObject<IChartApi \| null>` | - | Ref to the lightweight-charts IChartApi |
| `className` | Optional | `string` | - | Custom class name |
| `data` | Optional | `LineChartCardData` | - | Pre-adapted chart data (use this OR rawData+dataAdapter) |
| `dataAdapter` | Optional | `(data: unknown) => LineChartCardData` | - | Adapter to transform rawData into LineChartCardData |
| `defaultTimeline` | Optional | `string` | `first option` | Default timeline when uncontrolled |
| `detailLegends` | Optional | `boolean` | `false` | Show detail legends with current values |
| `headerAction` | Optional | `React.ReactNode` | - | Optional action rendered on the right of the card header (e.g. an expand toggle). Passed straight through to `ChartContainer`. Additive - omit it and the card header is unchanged |
| `isLoading` | Optional | `boolean` | `false` | Loading state |
| `minHeight` | Optional | `string \| number` | `350` | Minimum chart height |
| `onTimelineChange` | Optional | `(timeline: string) => void` | - | Callback when timeline changes |
| `rawData` | Optional | `unknown` | - | Raw data to be transformed by dataAdapter |
| `shouldResetZoom` | Optional | `boolean` | `true` | Whether to reset zoom on timeline change (default: true) |
| `timeline` | Optional | `string` | - | Controlled timeline value |
| `timelineOptions` | Optional | `TimelineOption[]` | - | Timeline range selector options |
| `title` | Optional | `string` | - | Chart title |
| `titleExtra` | Optional | `React.ReactNode` | - | Optional node rendered next to the title (e.g. an info tooltip). Passed straight through to `ChartContainer`. Additive |

### `TimelineOption`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `label` | Required | `string` | - | Range-selector button text |
| `value` | Required | `string` | - | Timeline key passed to `onTimelineChange`, matched against `timeline` and passed to the chart's `timeline`. Known keys: `1m`, `5m`, `30m`, `3h`, `1D` |
| `disabled` | Optional | `boolean` | - | Not forwarded to the range selector; currently has no effect |
<!-- END GENERATED: props -->

## Minimal example

```tsx
<LineChartCard
  title="Hashrate"
  data={chartData}
  timelineOptions={[{ label: "5m", value: "5m" }, { label: "3h", value: "3h" }]}
  defaultTimeline="5m"
/>
```

## Data contracts

`LineChartCardData` exposes `datasets`, `minMaxAvg`, `highlightedValue`,
`footerStats`, `yTicksFormatter`, and `priceFormatter`. See [`types.ts`](./types.ts) in
the same directory for the full shape.

## Notes

- The selected timeline option's `value` goes to the chart's `timeline`, which only sets the initial zoom. Known keys
  are `1m`, `5m`, `30m`, `3h` and `1D` (capital `D`); any other key shows the latest 24 points. The
  [`LineChart` timeline table](../../../primitives/components/line-chart/USAGE.md#timeline) has the counts.
- Time labels are in UTC. The card has no time zone prop of its own: pass `customDateFormat` or `fixedTimezone` through
  `chartProps`, as the [`LineChart` time zone table](../../../primitives/components/line-chart/USAGE.md#time-labels-and-time-zones)
  describes.
- Wrapped in `withErrorBoundary` — chart-level crashes won't blow up the page
- For mining-domain charts, map your history route's response to the
  `ChartCardData` payload in the query's `select` and pass it in
- A dataset's `lineStyle` (for example `dashed`) is passed to the chart; see
  [dashed lines](../../../primitives/components/line-chart/USAGE.md#dashed-lines).
- A series with a narrow range needs a smaller y-axis step: pass `priceFormat` through `chartProps`, as in
  `chartProps={{ priceFormat: { minMove: 0.001 } }}`. See the [y-axis step](../../../primitives/components/line-chart/USAGE.md#y-axis-step).
