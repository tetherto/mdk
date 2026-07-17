# BarChart

A Chart.js bar chart with gradient fills, optional stacking, horizontal layout, data labels, and a custom HTML tooltip.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `data` | `any` | yes | — | Chart.js dataset object (`{ labels, datasets }`) |
| `options` | `ChartJS<'bar'>['options']` | no | — | Extra Chart.js options merged with the MDK defaults |
| `isStacked` | `boolean` | no | `false` | Stacks datasets on top of each other |
| `isHorizontal` | `boolean` | no | `false` | Renders bars horizontally (sets `indexAxis: 'y'`) |
| `formatYLabel` | `(value: number) => string` | no | — | Formats Y-axis tick labels |
| `showLegend` | `boolean` | no | `true` | Displays the Chart.js built-in legend |
| `legendPosition` | `Position` | no | `'top'` | Legend placement (`'top' \| 'bottom' \| 'left' \| 'right'`) |
| `legendAlign` | `FlexAlign` | no | `'start'` | Horizontal alignment of legend labels |
| `showDataLabels` | `boolean` | no | `false` | Renders values above each bar |
| `formatDataLabel` | `(value: number) => string` | no | — | Formats the data label text |
| `tooltip` | `ChartTooltipConfig` | no | — | Custom HTML tooltip configuration (replaces the default Chart.js tooltip) |
| `height` | `number` | no | `300` | Chart height in pixels |
| `className` | `string` | no | — | Additional class for the wrapper `div` |

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
- For mixed bar + line charts pass the dataset `type: 'line'` inside `data.datasets` and use `data` typed as `any`.
- `showDataLabels` adds `chartjs-plugin-datalabels`; it adds 20 px of top padding to prevent label clipping.
