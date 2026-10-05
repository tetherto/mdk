# `BarChart`

A Chart.js bar chart with gradient fills, optional stacking, horizontal layout, data labels, and a custom HTML tooltip.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Required | `any` | - | Chart data - required, provided by parent. Use `as any` for mixed bar+line datasets |
| `className` | Optional | `string` | - | Additional class for the wrapper `div` |
| `formatDataLabel` | Optional | `((value: number) => string)` | - | Format data label values (default: round to nearest integer) |
| `formatYLabel` | Optional | `((value: number) => string)` | - | Format Y-axis tick labels |
| `height` | Optional | `number` | `300` | Chart height in pixels |
| `isHorizontal` | Optional | `boolean` | `false` | Render bars horizontally (indexAxis: 'y') |
| `isStacked` | Optional | `boolean` | `false` | Stack bars on top of each other |
| `legendAlign` | Optional | `"center" \| "start" \| "end"` | `"start"` | Alignment of the legend labels within their position |
| `legendPosition` | Optional | `"left" \| "right" \| "top" \| "bottom"` | `"top"` | Position of the legend |
| `options` | Optional | `object` | - | Chart.js options - merged with defaults |
| `showDataLabels` | Optional | `boolean` | `false` | Show values above each bar |
| `showLegend` | Optional | `boolean` | `true` | Show built-in Chart.js legend |
| `tooltip` | Optional | `ChartTooltipConfig` | - | Custom HTML tooltip configuration. When provided, replaces the default Chart.js tooltip |
<!-- END GENERATED: props -->

## Example

```tsx
import { BarChart } from "@tetherto/mdk-react-devkit"

const data = {
  labels: ["Jan", "Feb", "Mar"],
  datasets: [
    {
      label: "Hashrate",
      data: [120, 95, 140],
      backgroundColor: "#59E8E8",
    },
  ],
}

<BarChart data={data} height={280} formatYLabel={(value) => `${value} TH/s`} />

// Stacked with data labels
<BarChart
  data={stackedData}
  isStacked
  showDataLabels
  formatDataLabel={(value) => `${value}%`}
/>
```

## Notes

- Bar datasets automatically receive a vertical gradient fill derived from `backgroundColor`. Pass `backgroundColor` as a function to opt out.
- For mixed bar + line charts pass the dataset `type: 'line'` inside `data.datasets` and use `data` typed as `any`
- `showDataLabels` adds `chartjs-plugin-datalabels`; it adds 20 px of top padding to prevent label clipping
