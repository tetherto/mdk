# Heatmap

A generic grid of value-coloured cells on a low→high gradient, plus a matching
`HeatmapLegend`. Presentational and domain-agnostic — pass a row-major matrix of
cells and an optional `[min, max]` range (auto-derived otherwise).

Use `renderCell` to overlay domain content (e.g. PDU socket borders, selection,
tooltips) without forking the primitive; the grid still owns each cell's
background colour.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `Heatmap` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Required | `HeatmapCell[][]` | - | Rows of cells (row-major). Rows may be ragged |
| `ariaLabel` | Optional | `string` | `"Heatmap"` | Accessible label for the grid |
| `className` | Optional | `string` | - | Additional class for the root element |
| `colors` | Optional | `readonly string[]` | `HEATMAP_GRADIENT` | Gradient stops low→high. Defaults to the cold→hot `HEATMAP_GRADIENT` |
| `emptyColor` | Optional | `string` | `#000000` | Colour used for `null` cells |
| `max` | Optional | `number` | `auto` | Range ceiling (maps to the last gradient stop); auto-derived from the finite values when omitted |
| `min` | Optional | `number` | `auto` | Range floor (maps to the first gradient stop); auto-derived from the finite values when omitted |
| `renderCell` | Optional | `((cell: HeatmapCell, context: HeatmapCellContext) => React.ReactNode)` | - | Override the cell's inner content — e.g. to overlay socket borders, selection, or tooltips for a PDU grid. The primitive still owns the cell's background colour (passed via `context.color`) |
| `showValues` | Optional | `boolean` | `false` | Render each cell's value/label as text |

### `HeatmapLegend` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `max` | Required | `string \| number` | - | Value (or pre-formatted label) at the high end of the scale |
| `min` | Required | `string \| number` | - | Value (or pre-formatted label) at the low end of the scale |
| `className` | Optional | `string` | - | Additional class for the root element |
| `colors` | Optional | `readonly string[]` | `HEATMAP_GRADIENT` | Gradient stops low→high |
| `label` | Optional | `string` | - | Heading above the gradient bar (e.g. "Temperature") |
| `unit` | Optional | `string` | - | Unit suffix appended to `min`/`max` |
<!-- END GENERATED: props -->

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
- `null` values render `emptyColor` and no text
- Values outside `[min, max]` are clamped to the end stops
