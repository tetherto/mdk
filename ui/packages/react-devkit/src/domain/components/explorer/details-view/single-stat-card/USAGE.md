# `SingleStatCard`

Prominent stat tile for displaying a single key metric. Supports flash animations and four visual variants.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `color` | Optional | `string` | `"inherit"` | Color for flash/border |
| `flash` | Optional | `boolean` | `false` | Enable flash animation |
| `name` | Optional | `string` | - | Stat name/label |
| `row` | Optional | `boolean` | `false` | Row layout |
| `subtitle` | Optional | `string` | `""` | Subtitle text |
| `superflash` | Optional | `boolean` | `false` | Enable superflash animation (faster) |
| `unit` | Optional | `string` | `""` | Unit of measurement |
| `value` | Optional | `string \| number \| null` | `null` | Stat value |
| `variant` | Optional | `"primary" \| "secondary" \| "tertiary" \| "highlighted"` | `"primary"` | Card variant |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { SingleStatCard } from "@tetherto/mdk-react-devkit";

<SingleStatCard name="Hashrate" value={95.5} unit="TH/s" variant="primary" />
```
