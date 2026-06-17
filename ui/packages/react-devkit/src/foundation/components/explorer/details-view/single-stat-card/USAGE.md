# SingleStatCard

Prominent stat tile for displaying a single key metric. Supports flash animations and four visual variants.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `string` | no | — | Metric label. |
| `subtitle` | `string` | no | — | Optional subtitle text. |
| `value` | `number \| string \| null` | no | — | Metric value. |
| `unit` | `string` | no | — | Unit of measurement (e.g. `"TH/s"`, `"W"`). |
| `color` | `string` | no | — | Accent color for the border or flash effect. |
| `flash` | `boolean` | no | — | Enable flash animation on value change. |
| `superflash` | `boolean` | no | — | Faster flash animation. |
| `variant` | `"primary" \| "secondary" \| "tertiary" \| "highlighted"` | no | `"primary"` | Visual style variant. |
| `row` | `boolean` | no | — | Use row layout instead of column. |

## Minimal example

```tsx
import { SingleStatCard } from "@tetherto/mdk-react-devkit";

<SingleStatCard name="Hashrate" value={95.5} unit="TH/s" variant="primary" />
```
