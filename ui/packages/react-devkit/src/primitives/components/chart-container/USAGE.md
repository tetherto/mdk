# `ChartContainer`

A layout wrapper for charts that provides a title/header row, interactive legend, range selector, highlighted value display, loading/empty states, and a stats footer.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `children` | Required | `React.ReactNode` | - | The chart element to render |
| `className` | Optional | `string` | - | Additional class for the root element |
| `empty` | Optional | `boolean` | - | Hides the chart and shows `emptyMessage` |
| `emptyMessage` | Optional | `string` | `"No data available"` | Message shown when `empty` is true |
| `footer` | Optional | `React.ReactNode` | - | Custom footer content rendered below the chart |
| `footerClassName` | Optional | `string` | - | Additional class for the footer area |
| `header` | Optional | `React.ReactNode` | - | Replaces the default `title` heading with a custom element |
| `headerAction` | Optional | `React.ReactNode` | - | Optional action rendered on the right side of the header row (e.g. an expand/fullscreen toggle). Sits alongside the range selector when both are present. Purely additive - omit it and the header renders exactly as before |
| `highlightedValue` | Optional | `HighlightedValueProps` | - | Large value/unit displayed alongside the legend |
| `legendData` | Optional | `LegendItem[]` | - | Color-keyed legend items; each item can be toggled |
| `loading` | Optional | `boolean` | - | Shows a centered `<Loader>` overlay |
| `minMaxAvg` | Optional | `Partial<{ min: string; max: string; avg: string; }>` | - | Built-in footer showing Min / Avg / Max values |
| `onToggleDataset` | Optional | `((index: number) => void)` | - | Fired when a legend item is clicked |
| `rangeSelector` | Optional | `RangeSelectorProps` | - | Radio-card time-range selector |
| `timeRange` | Optional | `string` | - | Time range label shown in the footer |
| `title` | Optional | `string` | - | Chart heading (renders as `<h3>` unless `header` is provided) |
| `titleExtra` | Optional | `React.ReactNode` | - | Optional node rendered immediately after the title text (e.g. an info tooltip). Only shown when `title` is set and `header` is not. Additive - omit it and the title renders exactly as before |
<!-- END GENERATED: props -->

## Prop data shapes

> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

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
import { ChartContainer, BarChart } from "@tetherto/mdk-react-devkit"

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

- `minMaxAvg` and `timeRange` are only rendered when the chart is not loading or empty
