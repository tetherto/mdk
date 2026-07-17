# AverageDowntimeChart

Stacked bar chart of Curtailment vs Op. Issues downtime rates. Includes
`ChartContainer` chrome: title, unit subtitle, loading, and empty state.

## Props

| Prop              | Type                        | Required | Default                    | Description                                           |
| ----------------- | --------------------------- | -------- | -------------------------- | ----------------------------------------------------- |
| `data`            | `AverageDowntimeChartData`  | no       | —                          | Period labels and rate arrays (fractions 0–1).        |
| `title`           | `string`                    | no       | `Monthly Average Downtime` | Chart title (unit renders on its own line below).       |
| `unit`            | `string`                    | no       | `%`                        | Unit subtitle under the title.                          |
| `height`          | `number`                    | no       | `280`                      | Chart height in pixels.                               |
| `barWidth`        | `number`                    | no       | `38`                       | Max bar thickness.                                    |
| `yTicksFormatter` | `(value: number) => string` | no       | rate × 100 via `formatNumber` | Axis, tooltip, and data labels (input is 0–1 rate). |
| `showDataLabels`  | `boolean`                   | no       | `false`                    | Show values above stacked bars.                         |
| `isLoading`       | `boolean`                   | no       | `false`                    | Shows loading overlay.                                |
| `emptyMessage`    | `string`                    | no       | —                          | Message when there are no period labels or rate series. |
| `className`       | `string`                    | no       | —                          | Extra class on the container.                         |

## Example

```tsx
<AverageDowntimeChart
  data={{
    labels: ['Jan', 'Feb'],
    curtailment: [0.02, 0.01],
    operationalIssues: [0.05, 0.04],
  }}
/>
```
