# `SingleStatCard`

Prominent stat tile for displaying a single key metric. Supports flash animations and four visual variants.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `caption` | Optional | `string` | - | Short text beside the name, e.g. the unit basis ("per PH/s/day") |
| `className` | Optional | `string` | - | Additional class for the root element |
| `color` | Optional | `string` | `"inherit"` | Color for the value on every variant, plus the border on `tertiary` and the flash animations |
| `detail` | Optional | `React.ReactNode` | - | Line below the value, e.g. how the figure was reached |
| `flash` | Optional | `boolean` | `false` | Enable flash animation |
| `name` | Optional | `string` | - | Stat name/label |
| `row` | Optional | `boolean` | `false` | Row layout |
| `subtitle` | Optional | `string` | `""` | Subtitle text |
| `superflash` | Optional | `boolean` | `false` | Enable superflash animation (faster) |
| `tag` | Optional | `React.ReactNode` | - | Badge after the value, e.g. "estimated" or a change |
| `unit` | Optional | `string` | `""` | Unit of measurement |
| `value` | Optional | `string \| number \| null` | `null` | Stat value |
| `variant` | Optional | `"primary" \| "secondary" \| "tertiary" \| "highlighted" \| "compact"` | `"primary"` | Card variant. `compact` is a centred name-over-value tile in muted text, for dense grids of secondary metrics |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { SingleStatCard } from "@tetherto/mdk-react-devkit";

<SingleStatCard name="Hashrate" value={95.5} unit="TH/s" variant="primary" />
```
