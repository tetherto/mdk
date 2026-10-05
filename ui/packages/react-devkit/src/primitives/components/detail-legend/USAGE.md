# `DetailLegend`

An enhanced chart legend that displays color swatches, current values, units, and percentage-change indicators. Each item is a clickable button for toggling dataset visibility.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `items` | Required | `DetailLegendItem[]` | - | Legend items to display |
| `className` | Optional | `string` | - | Custom class name |
| `onToggle` | Optional | `((label: string, index: number) => void)` | - | Callback when a legend item is toggled |
<!-- END GENERATED: props -->

## Props detail

> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

### `DetailLegendItem`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `label` | `string` | yes | Display label |
| `color` | `string` | yes | Color for the swatch (hex, css color) |
| `icon` | `React.ReactNode` | no | Custom icon replacing the default color box |
| `currentValue` | `{ value: number \| string; unit?: string }` | no | Current value displayed below the label |
| `percentChange` | `number \| null` | no | Percentage change; positive shows ▲ green, negative shows ▼ red |
| `hidden` | `boolean` | no | Dims the item to indicate a hidden dataset |

## Example

```tsx
import { DetailLegend } from "@tetherto/mdk-react-devkit"

const [hiddenSets, setHiddenSets] = useState<Record<number, boolean>>({})

<DetailLegend
  items={[
    {
      label: "Hashrate",
      color: "#59E8E8",
      currentValue: { value: 3590, unit: "TH/s" },
      percentChange: 2.5,
      hidden: hiddenSets[0],
    },
    {
      label: "Power",
      color: "#FF9500",
      currentValue: { value: 1200, unit: "W" },
      percentChange: -0.8,
      hidden: hiddenSets[1],
    },
  ]}
  onToggle={(label, index) =>
    setHiddenSets((prev) => ({ ...prev, [index]: !prev[index] }))
  }
/>
```

## Notes

- Returns `null` when `items` is empty or undefined
- `percentChange` of `0` is treated as "no change" and the indicator is not rendered
