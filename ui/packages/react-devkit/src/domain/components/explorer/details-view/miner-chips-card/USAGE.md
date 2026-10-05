# MinerChipsCard & MinerChip

`MinerChipsCard` lists all miners in a container as selectable `MinerChip` tiles, useful for at-a-glance selection and health monitoring.

| Component | Description |
|---|---|
| `MinerChipsCard` | Container-level card rendering a grid of `MinerChip` tiles |
| `MinerChip` | Individual chip tile showing slot index, frequency, and temperature |

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Required | `ContainerStats` | - | Container stats including chip frequency and temperature arrays |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { MinerChipsCard } from "@tetherto/mdk-react-devkit";

<MinerChipsCard data={containerStats} />
```
