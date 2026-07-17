# Heatmap

A generic grid of value-coloured cells on a low→high gradient, plus a matching
`HeatmapLegend`. Presentational and domain-agnostic — pass a row-major matrix of
cells and an optional `[min, max]` range (auto-derived otherwise).

Use `renderCell` to overlay domain content (e.g. PDU socket borders, selection,
tooltips) without forking the primitive; the grid still owns each cell's
background colour.

## Heatmap props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `data` | `HeatmapCell[][]` | yes | — | Row-major matrix of cells (`{ value, label?, key? }`); rows may be ragged |
| `min` | `number` | no | auto | Range floor (maps to the first gradient stop) |
| `max` | `number` | no | auto | Range ceiling (maps to the last stop) |
| `colors` | `readonly string[]` | no | `HEATMAP_GRADIENT` | Gradient stops low→high |
| `emptyColor` | `string` | no | `#000000` | Colour for `null` cells |
| `showValues` | `boolean` | no | `false` | Render each cell's value/label as text |
| `renderCell` | `(cell, ctx) => ReactNode` | no | — | Override cell content; `ctx` is `{ color, row, col }` |
| `ariaLabel` | `string` | no | `"Heatmap"` | Accessible label for the grid |
| `className` | `string` | no | — | Additional class for the root element |

## HeatmapLegend props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `min` | `number \| string` | yes | — | Low-end value or pre-formatted label |
| `max` | `number \| string` | yes | — | High-end value or pre-formatted label |
| `unit` | `string` | no | — | Unit suffix appended to `min`/`max` |
| `label` | `string` | no | — | Heading above the gradient bar |
| `colors` | `readonly string[]` | no | `HEATMAP_GRADIENT` | Gradient stops low→high |
| `className` | `string` | no | — | Additional class for the root element |

## Example

```tsx
import { Heatmap, HeatmapLegend } from "@tetherto/mdk-react-devkit"

<Heatmap
  data={[
    [{ value: 20 }, { value: 45 }],
    [{ value: 70 }, { value: null }],
  ]}
  showValues
/>
<HeatmapLegend label="Temperature" min={20} max={85} unit="°C" />
```

## Notes

- The colour scale is exported as `getHeatmapColor(value, min, max, stops?)` and
  the default palette as `HEATMAP_GRADIENT` (cold→hot: blue → green → yellow →
  red) from `@tetherto/mdk-react-devkit`.
- `null` values render `emptyColor` and no text.
- Values outside `[min, max]` are clamped to the end stops.
