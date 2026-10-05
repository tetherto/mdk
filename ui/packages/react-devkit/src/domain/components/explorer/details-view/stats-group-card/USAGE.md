# `StatsGroupCard`

Aggregated stats card for a group of miners: total hashrate, max temperature, average frequency, and total power consumption.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `isMinerMetrics` | Optional | `boolean` | `false` | Whether to show miner metrics card layout |
| `miners` | Optional | `Device[] \| DeviceData[]` | - | Array of miners to display stats for |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { StatsGroupCard } from "@tetherto/mdk-react-devkit";

<StatsGroupCard miners={devices} />
```
