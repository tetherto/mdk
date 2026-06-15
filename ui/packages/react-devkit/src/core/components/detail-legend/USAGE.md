# DetailLegend

An enhanced chart legend that displays color swatches, current values, units, and percentage-change indicators. Each item is a clickable button for toggling dataset visibility.

## Props

### `DetailLegend`

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `items` | `DetailLegendItem[]` | yes | — | Legend items to render |
| `onToggle` | `(label: string, index: number) => void` | no | — | Fired when a legend item is clicked |
| `className` | `string` | no | — | Additional class for the root element |

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
import { DetailLegend } from "@tetherto/mdk-core-ui"

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

- Returns `null` when `items` is empty or undefined.
- `percentChange` of `0` is treated as "no change" and the indicator is not rendered.
