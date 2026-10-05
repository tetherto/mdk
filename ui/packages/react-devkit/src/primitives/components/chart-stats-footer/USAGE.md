# `ChartStatsFooter`

Displays Min/Max/Avg values and an optional grid of additional stat items below a chart.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Custom class name |
| `minMaxAvg` | Optional | `Partial<{ min: string; max: string; avg: string; }>` | - | Min/Max/Avg values row |
| `secondaryLabel` | Optional | `SecondaryLabel` | - | Secondary label displayed below stats |
| `stats` | Optional | `ChartStatsFooterItem[]` | - | Additional stats displayed in a columnar grid |
| `statsPerColumn` | Optional | `number` | `1` | Number of stat items per column (default: 1) |
<!-- END GENERATED: props -->

## Props detail

> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

### `ChartStatsFooterItem`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `label` | `string` | yes | Stat label |
| `value` | `string \| number` | yes | Stat value |

### `SecondaryLabel`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `title` | `string` | yes | Label text |
| `value` | `string \| number` | yes | Value text |

## Example

```tsx
import { ChartStatsFooter } from "@tetherto/mdk-react-devkit"

<ChartStatsFooter
  minMaxAvg={{ min: "10 TH/s", avg: "55 TH/s", max: "100 TH/s" }}
  stats={[
    { label: "Uptime", value: "99.5%" },
    { label: "Rejected", value: "0.2%" },
  ]}
/>

// Multiple stats per column
<ChartStatsFooter
  stats={[
    { label: "A", value: "1" },
    { label: "B", value: "2" },
    { label: "C", value: "3" },
    { label: "D", value: "4" },
  ]}
  statsPerColumn={2}
/>
```

## Notes

- Returns `null` when none of `minMaxAvg`, `stats`, or `secondaryLabel` are provided
- If `minMaxAvg.avg` is `'-'`, all three values display as `'-'`
