# MinerMetricCard

Card showing primary and secondary statistics for a single miner: efficiency, hashrate, temperature, frequency, and power consumption.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `primaryStats` | `StatItem[]` | yes | — | Primary statistics (efficiency, hashrate, temperature, frequency, consumption). |
| `secondaryStats` | `StatItem[]` | yes | — | Secondary statistics displayed in a grid below. |
| `showSecondaryStats` | `boolean` | yes | — | Whether to show the secondary stats section. |

**StatItem shape:** `{ name?: string; value?: number | string; unit?: string; tooltipText?: string }`

## Minimal example

```tsx
import { MinerMetricCard } from "@tetherto/mdk-react-devkit";

<MinerMetricCard
  primaryStats={[
    { name: "Hashrate", value: 95.5, unit: "TH/s" },
    { name: "Efficiency", value: 28.3, unit: "J/TH" },
  ]}
  secondaryStats={[
    { name: "Temperature", value: 65, unit: "°C" },
  ]}
  showSecondaryStats={true}
/>
```
