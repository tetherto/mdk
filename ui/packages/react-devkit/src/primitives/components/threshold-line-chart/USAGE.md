# ThresholdLineChart

Line chart for time series with optional horizontal threshold lines (`thresholds`).
Includes `ChartContainer` chrome: title, legend with series toggle, and empty state.

## Props

| Prop              | Type                        | Required | Default | Description                                       |
| ----------------- | --------------------------- | -------- | ------- | ------------------------------------------------- |
| `data`            | `ThresholdLineChartData`    | no       | —       | `series` points plus optional `thresholds` lines. |
| `title`           | `string`                    | no       | —       | Chart title (unit appended when `unit` is set).   |
| `unit`            | `string`                    | no       | —       | Shown in title and axis/tooltip formatting.       |
| `height`          | `number`                    | no       | `280`   | Chart height in pixels (`360` when `isTall`).     |
| `isTall`          | `boolean`                   | no       | `false` | Taller default height.                            |
| `isLegendVisible` | `boolean`                   | no       | `true`  | Legend with click-to-hide series.                 |
| `emptyMessage`    | `string`                    | no       | —       | Message when data is missing or all zero.         |
| `yTicksFormatter` | `(value: number) => string` | no       | —       | Custom Y-axis tick labels.                        |
| `className`       | `string`                    | no       | —       | Extra class on the container.                     |

## Example

```tsx
<ThresholdLineChart
  title="Power Consumption"
  unit="MW"
  data={{
    series: [
      {
        label: 'Power',
        color: '#f59e0b',
        points: [
          { timestamp: '2025-01-01T00:00:00.000Z', value: 30 },
          { timestamp: '2025-01-02T00:00:00.000Z', value: 34 },
        ],
      },
    ],
    thresholds: [{ label: 'Availability', value: 38, color: '#22c55e' }],
  }}
/>
```
