# `ChartContainer`

A layout wrapper for charts that provides a title/header row, interactive legend, range selector, highlighted value display, loading/empty states, and a stats footer.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `children` | Required | `React.ReactNode` | - | The chart element to render |
| `className` | Optional | `string` | - | Additional class for the root element |
| `empty` | Optional | `boolean` | - | Hides the chart and shows `emptyMessage` |
| `emptyMessage` | Optional | `React.ReactNode` | `"No data available"` | Message shown when `empty` is true: a string, or any element (an `EmptyState`, say) |
| `footer` | Optional | `React.ReactNode` | - | Custom footer content rendered below the chart |
| `footerClassName` | Optional | `string` | - | Additional class for the footer area |
| `header` | Optional | `React.ReactNode` | - | Replaces the default `title` heading with a custom element |
| `headerAction` | Optional | `React.ReactNode` | - | Optional action rendered on the right side of the header row (e.g. an expand/fullscreen toggle). Sits alongside the range selector when both are present. Purely additive - omit it and the header renders exactly as before |
| `highlightedValue` | Optional | `HighlightedValueProps` | - | Large value/unit displayed alongside the legend |
| `legendData` | Optional | `LegendItem[]` | - | Color-keyed legend items; each item can be toggled |
| `loader` | Optional | `React.ReactNode` | - | Replaces the default `<Loader>` in the loading overlay |
| `loading` | Optional | `boolean` | - | Shows a centered `<Loader>` overlay |
| `minMaxAvg` | Optional | `Partial<{ min: string; max: string; avg: string }>` | - | Built-in footer showing Min / Avg / Max values |
| `onToggleDataset` | Optional | `((index: number) => void)` | - | Fired when a legend item is clicked |
| `rangeSelector` | Optional | `RangeSelectorProps` | - | Radio-card time-range selector |
| `timeRange` | Optional | `string` | - | Time range label shown in the footer |
| `title` | Optional | `string` | - | Chart heading (renders as `<h3>` unless `header` is provided) |
| `titleExtra` | Optional | `React.ReactNode` | - | Optional node rendered immediately after the title text (e.g. an info tooltip). Only shown when `title` is set and `header` is not. Additive - omit it and the title renders exactly as before |

### `LegendItem`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `color` | Required | `string` | - | Color string (hex, hsl, etc.) |
| `label` | Required | `string` | - | Legend label |
| `hidden` | Optional | `boolean` | - | Whether this dataset is currently hidden |

### `HighlightedValueProps`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `value` | Required | `string \| number` | - | The primary value to display |
| `className` | Optional | `string` | - | Additional class |
| `style` | Optional | `React.CSSProperties` | - | Inline style |
| `unit` | Optional | `string` | - | Unit suffix |

### `RangeSelectorProps`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `onChange` | Required | `(value: string) => void` | - | Fires when user picks a range |
| `options` | Required | `RangeSelectorOption[]` | - | `{ label, value, disabled? }` items |
| `value` | Required | `string` | - | Currently selected value |
| `buttonClassName` | Optional | `string` | - | Additional class for each option button |
| `className` | Optional | `string` | - | Additional class for the selector |
| `style` | Optional | `React.CSSProperties` | - | Inline style for the selector |
<!-- END GENERATED: props -->

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
