# `LineChart`

Time-series line chart built on `lightweight-charts`. Supports multi-series
data, custom tooltips, vertical / horizontal crosshair labels, manual zoom,
point markers, fixed-timezone formatting, and auto-scaling.

For most use cases prefer wrapping in `ChartContainer` or `LineChartCard` so
you get title, legend, range selector, and loading / empty states for free.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Required | `LineChartData` | - | Data of the chart |
| `backgroundColor` | Optional | `string` | - | Background color of the chart |
| `beginAtZero` | Optional | `boolean` | - | Starts the value axis at 0 |
| `chartRef` | Optional | `React.MutableRefObject<IChartApi \| null>` | - | Mutable ref to hold the LightWeightCharts reference |
| `customDateFormat` | Optional | `string` | - | Custom date format |
| `customLabel` | Optional | `string` | - | TODO: Doc |
| `disableAutoRange` | Optional | `boolean` | - | Disable automatically determining range |
| `fadedBackground` | Optional | `boolean` | - | Use a faded background |
| `fixedTimezone` | Optional | `string` | - | Applies offset if provided, otherwise timestamps are assumed to already be in local time. Otherwise, use browser's current timezone offset for consistent time display |
| `height` | Optional | `number` | `240` | Controls the height of the chart |
| `horizontalLineLabelVisible` | Optional | `boolean` | - | Show horizontal line at mouse position |
| `priceFormatter` | Optional | `((value: number) => string)` | - | Callback to format ticks on y axis |
| `roundPrecision` | Optional | `number` | - | The number of decimals to show |
| `shouldResetZoom` | Optional | `boolean` | - | Wether to Reset Zoom |
| `showDateInTooltip` | Optional | `boolean` | - | Show date line in tooltip |
| `showPointMarkers` | Optional | `boolean` | - | Show a marker on the line |
| `skipMinWidth` | Optional | `boolean` | - | Do not enforce a min width |
| `skipRound` | Optional | `boolean` | - | Prevent rounding of values |
| `timeline` | Optional | `string` | - | TODO: DOC |
| `uniformDistribution` | Optional | `boolean` | - | Changes horizontal scale marks generation. With this flag equal to true, marks of the same weight are either all drawn or none are drawn at all |
| `unit` | Optional | `string` | `""` | The unit to display with values |
| `verticalLineLabelVisible` | Optional | `boolean` | - | Show vertical line at mouse position |
| `yTicksFormatter` | Optional | `((value: number) => string)` | - | Callback to format ticks on y axis. If `priceFormatter` is given. It would be used instead |
<!-- END GENERATED: props -->

## Example

```tsx
<LineChart
  data={{ datasets: [{ label: "Hashrate", borderColor: "#4f9ef5", data: points }] }}
  height={320}
  unit="TH/s"
/>
```

## Data contracts

```ts
type LineDataPoint = { x: number; y: number | null | undefined };
type LineDataset = {
  label?: string;
  visible?: boolean;
  borderColor: string;
  borderWidth?: number;
  data: LineDataPoint[];
};
type LineChartData = { datasets: LineDataset[] };
```
