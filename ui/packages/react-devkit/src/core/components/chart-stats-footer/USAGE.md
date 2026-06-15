# ChartStatsFooter

Displays Min/Max/Avg values and an optional grid of additional stat items below a chart.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `minMaxAvg` | `MinMaxAvg` | no | — | Min, Max, and Avg values to display |
| `stats` | `ChartStatsFooterItem[]` | no | — | Additional label/value pairs displayed in columns |
| `statsPerColumn` | `number` | no | `1` | How many stat items to stack per column |
| `secondaryLabel` | `SecondaryLabel` | no | — | A single label/value row shown below `stats` |
| `className` | `string` | no | — | Additional class for the root element |

### `MinMaxAvg`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `min` | `string` | no | Minimum value string |
| `max` | `string` | no | Maximum value string |
| `avg` | `string` | no | Average value string |

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
import { ChartStatsFooter } from "@tetherto/mdk-core-ui"

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

- Returns `null` when none of `minMaxAvg`, `stats`, or `secondaryLabel` are provided.
- If `minMaxAvg.avg` is `'-'`, all three values display as `'-'`.
