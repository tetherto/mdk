# `MinerMetricCard`

Card showing primary and secondary statistics for a single miner: efficiency, hashrate, temperature, frequency, and power consumption.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `primaryStats` | Optional | `StatItem[]` | - | Primary statistics (efficiency, hashrate, temperature, frequency, consumption) |
| `secondaryStats` | Optional | `StatItem[]` | - | Secondary statistics to display in grid |
| `showSecondaryStats` | Optional | `boolean` | `true` | Whether to show secondary stats section |
<!-- END GENERATED: props -->

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
