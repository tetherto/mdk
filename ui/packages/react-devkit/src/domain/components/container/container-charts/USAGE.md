# ContainerCharts

Multi-series time-series chart panel used by container detail views to display temperature, pressure, and power data over configurable time windows. Supports paired-index expansion for dual-tank (Bitdeer) and dual-supply (Bitmain Immersion) container types.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | no | — | Panel heading. |
| `chartCombinations` | `ContainerChartCombinationOption[]` | yes | — | Ordered list of chart groups to render. |
| `data` | `unknown` | yes | — | Raw telemetry payload forwarded to adapter functions. |
| `timelineOptions` | `{ label: string; value: string }[]` | no | — | Time-range selector buttons (e.g. 1H / 24H / 7D). |
| `defaultTimeline` | `string` | no | — | Initially selected timeline value. |
| `onTimelineChange` | `(value: string) => void` | no | — | Callback when the user switches the time range. |
| `pairIndices` | `readonly number[]` | no | — | For paired layouts: which series index to show side-by-side. |
| `isLoading` | `boolean` | no | `false` | Shows skeleton loading state when `true`. |
| `className` | `string` | no | — | Additional CSS class on the root element. |
| `borderColorResolver` | `ContainerChartsDatasetBorderColorResolver` | no | — | Override line border colour per dataset. |
| `customOptions` | `ChartOptions<"line">` | no | — | Chart.js option overrides merged onto the base config. |

## Minimal example

```tsx
import { ContainerCharts } from "@tetherto/mdk-react-devkit";

<ContainerCharts chartCombinations={[]} data={null} isLoading={false} />
```
