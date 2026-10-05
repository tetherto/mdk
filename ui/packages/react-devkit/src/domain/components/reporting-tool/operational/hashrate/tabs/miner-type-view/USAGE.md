# `HashrateMinerTypeView`

Miner-type drilldown tab inside `<Hashrate>`. Bar chart of the latest
hashrate per miner type (Antminer, Whatsminer, ...), with an optional
multi-select filter and a date-range picker that drives the host query.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `dateRange` | Optional | `HashrateDateRange` | - | Selected date range |
| `isLoading` | Optional | `boolean` | `false` | Drives the chart spinner |
| `log` | Optional | `HashrateGroupedLog` | `[]` | Hashrate log grouped by miner type (groupBy=miner) |
| `onDateRangeChange` | Optional | `((range: HashrateDateRange) => void)` | - | Fires when the user picks a new range |
| `onReset` | Optional | `VoidFunction` | - | Optional reset handler |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { HashrateMinerTypeView } from "@tetherto/mdk-react-devkit";

<HashrateMinerTypeView isLoading={false} log={[]} />
```
