# StatsGroupCard

Aggregated stats card for a group of miners: total hashrate, max temperature, average frequency, and total power consumption.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `miners` | `DeviceData[] \| Device[]` | no | — | Array of miners whose stats should be aggregated. |
| `isMinerMetrics` | `boolean` | no | — | Show miner-metrics layout instead of container layout. |

## Minimal example

```tsx
import { StatsGroupCard } from "@tetherto/mdk-react-devkit";

<StatsGroupCard miners={devices} />
```
