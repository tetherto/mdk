# ChartContainer

A layout wrapper for charts that provides a title/header row, interactive legend, range selector, highlighted value display, loading/empty states, and a stats footer.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `children` | `React.ReactNode` | yes | — | The chart element to render |
| `title` | `string` | no | — | Chart heading (renders as `<h3>` unless `header` is provided) |
| `header` | `React.ReactNode` | no | — | Replaces the default `title` heading with a custom element |
| `legendData` | `LegendItem[]` | no | — | Color-keyed legend items; each item can be toggled |
| `highlightedValue` | `HighlightedValueProps` | no | — | Large value/unit displayed alongside the legend |
| `rangeSelector` | `RangeSelectorProps` | no | — | Radio-card time-range selector |
| `loading` | `boolean` | no | — | Shows a centered `<Loader>` overlay |
| `empty` | `boolean` | no | — | Hides the chart and shows `emptyMessage` |
| `emptyMessage` | `string` | no | `'No data available'` | Message shown when `empty` is true |
| `minMaxAvg` | `MinMaxAvg` | no | — | Built-in footer showing Min / Avg / Max values |
| `timeRange` | `string` | no | — | Time range label shown in the footer |
| `footer` | `React.ReactNode` | no | — | Custom footer content rendered below the chart |
| `footerClassName` | `string` | no | — | Additional class for the footer area |
| `onToggleDataset` | `(index: number) => void` | no | — | Fired when a legend item is clicked |
| `className` | `string` | no | — | Additional class for the root element |

### `LegendItem`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `label` | `string` | yes | Legend label |
| `color` | `string` | yes | Color string (hex, hsl, etc.) |
| `hidden` | `boolean` | no | Whether this dataset is currently hidden |

### `HighlightedValueProps`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `value` | `string \| number` | yes | The primary value to display |
| `unit` | `string` | no | Unit suffix |
| `className` | `string` | no | Additional class |
| `style` | `React.CSSProperties` | no | Inline style |

### `RangeSelectorProps`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `options` | `RangeSelectorOption[]` | yes | `{ label, value }` items |
| `value` | `string` | yes | Currently selected value |
| `onChange` | `(value: string) => void` | yes | Fires when user picks a range |

## Example

```tsx
import { ChartContainer, BarChart } from "@tetherto/mdk-core-ui"

<ChartContainer
  title="Hashrate"
  loading={isLoading}
  empty={!data.length}
  legendData={[{ label: "Pool A", color: "#59E8E8" }]}
  rangeSelector={{ options: [{ label: "1H", value: "1h" }, { label: "24H", value: "24h" }], value: range, onChange: setRange }}
  minMaxAvg={{ min: "10 TH/s", avg: "55 TH/s", max: "100 TH/s" }}
  onToggleDataset={(i) => toggleDataset(i)}
>
  <BarChart data={chartData} />
</ChartContainer>
```

## Notes

- `minMaxAvg` and `timeRange` are only rendered when the chart is not loading or empty.
