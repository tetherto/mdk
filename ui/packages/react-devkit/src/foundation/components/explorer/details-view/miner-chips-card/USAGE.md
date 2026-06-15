# MinerChipsCard & MinerChip

`MinerChipsCard` lists all miners in a container as selectable `MinerChip` tiles — useful for at-a-glance selection and health monitoring.

| Component | Description |
|---|---|
| `MinerChipsCard` | Container-level card rendering a grid of `MinerChip` tiles. |
| `MinerChip` | Individual chip tile showing slot index, frequency, and temperature. |

## MinerChipsCard Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `ContainerStats` | yes | — | Container stats including chip frequency and temperature arrays. |

## MinerChip Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `index` | `number` | yes | — | Chip slot index. |
| `frequency` | `{ current: number }` | yes | — | Current frequency in MHz. |
| `temperature` | `{ avg: number; min: number; max: number }` | yes | — | Temperature readings in °C. |

## Minimal example

```tsx
import { MinerChipsCard } from "@tetherto/mdk-react-devkit";

<MinerChipsCard data={containerStats} />
```
