# `MinerChip`

Individual chip tile inside `MinerChipsCard`. Shows the slot index, current frequency, and average/min/max temperature.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `frequency` | Required | `{ current: number; }` | - | Current frequency in MHz |
| `index` | Required | `number` | - | Chip slot index |
| `temperature` | Required | `{ avg: number; min: number; max: number; }` | - | Temperature readings in °C |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { MinerChip } from "@tetherto/mdk-react-devkit";

<MinerChip
  index={0}
  frequency={{ current: 620 }}
  temperature={{ avg: 65, min: 62, max: 68 }}
/>
```
