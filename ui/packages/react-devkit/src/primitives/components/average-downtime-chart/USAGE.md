# `AverageDowntimeChart`

Stacked bar chart of Curtailment vs Op. Issues downtime rates. Includes
`ChartContainer` chrome: title, unit subtitle, loading, and empty state.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `barWidth` | Optional | `number` | `38` | Max bar thickness |
| `className` | Optional | `string` | - | Extra class on the container |
| `data` | Optional | `AverageDowntimeChartData` | - | Period labels and rate arrays (fractions 0–1) |
| `emptyMessage` | Optional | `string` | - | Message when there are no period labels or rate series |
| `height` | Optional | `number` | `280` | Chart height in pixels |
| `isLoading` | Optional | `boolean` | `false` | Shows loading overlay |
| `showDataLabels` | Optional | `boolean` | `false` | Show values above stacked bars |
| `title` | Optional | `string` | `"Monthly Average Downtime"` | Chart title (unit renders on its own line below) |
| `unit` | Optional | `string` | `%` | Unit subtitle under the title |
| `yTicksFormatter` | Optional | `(value: number) => string` | - | Formats Y-axis ticks, tooltips, and bar data labels (values are 0–1 rates). Defaults to rate × 100 via `formatNumber` |
<!-- END GENERATED: props -->

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
