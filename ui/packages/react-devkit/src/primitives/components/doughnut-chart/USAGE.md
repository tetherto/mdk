# `DoughnutChart`

A Chart.js doughnut chart with a custom HTML legend, slice toggle, and percentage display.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Required | `DoughnutChartDataset[]` | - | Array of labelled slices |
| `borderWidth` | Optional | `number` | `4` | Border width between segments (default: 4) |
| `className` | Optional | `string` | - | Additional class for the root element |
| `cutout` | Optional | `string` | `"75%"` | Doughnut cutout percentage (default: '75%') |
| `formatValue` | Optional | `((value: number) => string)` | - | Formats slice values in the built-in legend and default tooltip (default: raw number) |
| `height` | Optional | `number` | `260` | Chart height in pixels |
| `legendPosition` | Optional | `"left" \| "right" \| "top" \| "bottom"` | `"top"` | Where to place the legend relative to the chart (default: 'top') |
| `options` | Optional | `object` | - | Chart.js options – merged with defaults |
| `tooltip` | Optional | `ChartTooltipConfig` | - | Custom HTML tooltip configuration. When provided, replaces the default doughnut tooltip (which shows label, value with unit, and percentage). Use `valueFormatter` to replicate the percentage display if needed |
| `unit` | Optional | `string` | `""` | Unit suffix appended to values in tooltips and legends |
<!-- END GENERATED: props -->

## Props detail

> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

### `DoughnutChartDataset`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `label` | `string` | yes | Slice label |
| `value` | `number` | yes | Numeric slice value |
| `color` | `string` | no | Slice color (falls back to the built-in palette) |

## Example

```tsx
import { DoughnutChart } from "@tetherto/mdk-react-devkit"

<DoughnutChart
  data={[
    { label: "Online", value: 120, color: "#34C759" },
    { label: "Offline", value: 30, color: "#FF3B30" },
    { label: "Sleeping", value: 15 },
  ]}
  unit="miners"
/>

// Legend on the right
<DoughnutChart
  data={data}
  legendPosition="right"
  cutout="60%"
/>
```

## Notes

- Clicking a legend item toggles the corresponding slice on the chart and dims the legend button
- When the `data` reference changes (labels change), all hidden states reset automatically
