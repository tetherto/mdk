# MinerChip

Individual chip tile inside `MinerChipsCard`. Shows the slot index, current frequency, and average/min/max temperature. Selectable via click.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `index` | `number` | yes | — | Chip slot index (0-based). |
| `frequency` | `{ current: number }` | yes | — | Current frequency in MHz. |
| `temperature` | `{ avg: number; min: number; max: number }` | yes | — | Temperature stats in °C. |

## Minimal example

```tsx
import { MinerChip } from "@tetherto/mdk-react-devkit";

<MinerChip
  index={0}
  frequency={{ current: 620 }}
  temperature={{ avg: 65, min: 62, max: 68 }}
/>
```
