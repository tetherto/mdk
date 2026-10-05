# `HashrateMiningUnitView`

Mining-unit drilldown tab inside `<Hashrate>`. Bar chart of the latest
hashrate per container (Bitdeer 1A, MicroBT 1, ...), with an optional
multi-select filter. The utils layer drops BE-leaked rollup keys
(`group-N`, `maintenance`) so the consumer never sees them.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `dateRange` | Optional | `HashrateDateRange` | - | Selected date range |
| `isLoading` | Optional | `boolean` | `false` | Drives the chart spinner |
| `log` | Optional | `HashrateGroupedLog` | `[]` | Hashrate log grouped by container / mining unit (groupBy=container) |
| `onDateRangeChange` | Optional | `((range: HashrateDateRange) => void)` | - | Fires when the user picks a new range |
| `onReset` | Optional | `VoidFunction` | - | Optional reset handler |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { HashrateMiningUnitView } from "@tetherto/mdk-react-devkit";

<HashrateMiningUnitView isLoading={false} log={[]} />
```
