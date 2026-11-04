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
| `customDateFormat` | Optional | `string` | - | `date-fns` format for axis and crosshair time labels, rendered in the browser's local time zone. Without it, labels are in UTC |
| `customLabel` | Optional | `string` | - | Name shown in the tooltip row of a series that has no `label`; a dataset's own `label` wins |
| `disableAutoRange` | Optional | `boolean` | - | Disable automatically determining range |
| `fadedBackground` | Optional | `boolean` | - | Use a faded background |
| `fixedTimezone` | Optional | `string` | - | IANA time zone (e.g. `Europe/Berlin`) whose offset is added to every timestamp, so the default UTC axis labels read as that zone's wall-clock time |
| `height` | Optional | `number` | `240` | Controls the height of the chart |
| `horizontalLineLabelVisible` | Optional | `boolean` | - | Show horizontal line at mouse position |
| `priceFormat` | Optional | `LineChartPriceFormat` | - | Y-axis step and decimals. The default `minMove` of `0.01` leaves a series that moves less than that (e.g. 0.942 to 0.945) with no y-axis labels; set e.g. `{ minMove: 0.001 }` |
| `priceFormatter` | Optional | `((value: number) => string)` | - | Callback to format ticks on y axis |
| `roundPrecision` | Optional | `number` | - | The number of decimals to show |
| `shouldResetZoom` | Optional | `boolean` | - | Wether to Reset Zoom |
| `showDateInTooltip` | Optional | `boolean` | - | Show date line in tooltip |
| `showPointMarkers` | Optional | `boolean` | - | Show a marker on the line |
| `skipMinWidth` | Optional | `boolean` | - | Do not enforce a min width |
| `skipRound` | Optional | `boolean` | - | Prevent rounding of values |
| `timeline` | Optional | `string` | - | Bucket interval of the data (`1m`, `5m`, `30m`, `3h`, `1D`; case-sensitive). Sets how many of the latest points are visible on load or when it changes (15, 12, 12, 12, 14; 24 for any other key) while `shouldResetZoom` is on. Without it the whole series fits |
| `uniformDistribution` | Optional | `boolean` | - | Changes horizontal scale marks generation. With this flag equal to true, marks of the same weight are either all drawn or none are drawn at all |
| `unit` | Optional | `string` | `""` | The unit to display with values |
| `verticalLineLabelVisible` | Optional | `boolean` | - | Show vertical line at mouse position |
| `yTicksFormatter` | Optional | `((value: number) => string)` | - | Callback to format ticks on y axis. If `priceFormatter` is given. It would be used instead |

### `LineChartData`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `datasets` | Required | `LineDataset[]` | - | One line series per entry; `visible: false` hides a series without removing it |

### `LineChartPriceFormat`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `minMove` | Optional | `number` | - | Smallest step between y values and axis ticks. Defaults to `0.01` |
| `precision` | Optional | `number` | - | Decimals shown. Derived from `minMove` when unset |
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
  lineStyle?: "solid" | "dotted" | "dashed" | "largeDashed" | "sparseDotted";
  data: LineDataPoint[];
};
type LineChartData = { datasets: LineDataset[] };
```

## Dashed lines

Set `lineStyle` on a dataset to draw it dashed or dotted, for example a nominal or target line next to the measured
series. Datasets without it are solid.

```tsx
<LineChart
  data={{
    datasets: [
      { label: "Power", borderColor: "#4f9ef5", data: power },
      { label: "Nominal", borderColor: "#ffffff", lineStyle: "dashed", data: nominal },
    ],
  }}
/>
```

## Y-axis step

The y-axis steps in `minMove` units, `0.01` by default. A series that moves less than one step, such as 0.942 to
0.945 MW, gets no y-axis labels. Set `priceFormat` to a step that fits the data:

```tsx
<LineChart data={data} priceFormat={{ minMove: 0.001 }} unit="MW" />
```

`precision` sets the decimals shown and defaults to the decimals of `minMove`. `priceFormatter` and `yTicksFormatter`
change how a value is printed, not where ticks fall, so they don't fix a missing axis.

## Time labels and time zones

`x` is a Unix timestamp in milliseconds. The chart draws it in UTC unless a prop changes that:

| Label                              | Without either prop          | `customDateFormat`                     | `fixedTimezone`              |
| ---------------------------------- | ---------------------------- | -------------------------------------- | ---------------------------- |
| Time axis ticks                    | UTC                          | That `date-fns` format, browser's zone | The zone's wall-clock time   |
| Crosshair time                     | UTC                          | That `date-fns` format, browser's zone | The zone's wall-clock time   |
| Tooltip date (`showDateInTooltip`) | `MM-dd-yyyy`, browser's zone | `MM-dd-yyyy`, browser's zone           | Shifted by the zone's offset |

`fixedTimezone` moves the data itself, so combining it with `customDateFormat` applies the browser's offset on top of the
zone's. Pick one: `fixedTimezone` to pin a site's zone, or `customDateFormat` to label in the viewer's zone.

## Timeline

`timeline` names the bucket interval of the data. It only sets the initial zoom: how many of the latest points are
visible when the data loads or `timeline` changes, while `shouldResetZoom` is on (the default). Keys are
case-sensitive:

| `timeline` | Points visible |
| ---------- | -------------- |
| `1m`       | 15             |
| `5m`       | 12             |
| `30m`      | 12             |
| `3h`       | 12             |
| `1D`       | 14             |
| Any other  | 24             |
| Not set    | Whole series   |

A series shorter than that count fits the chart. `timeline` does not bucket, resample or relabel the data; the app's
hook fetches and shapes the series for the interval.
