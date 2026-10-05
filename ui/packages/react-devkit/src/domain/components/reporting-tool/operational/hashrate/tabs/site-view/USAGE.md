# `HashrateSiteView`

Site-level hashrate trend tab inside `<Hashrate>`. Aggregates the grouped
hashrate log across all (or filtered) miner types into a single series for
the selected date range.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `dateRange` | Optional | `HashrateDateRange` | - | Selected date range used by the host to drive the query |
| `isLoading` | Optional | `boolean` | `false` | Loading state - drives the chart spinner |
| `log` | Optional | `HashrateGroupedLog` | `[]` | Hashrate log grouped by miner type |
| `onDateRangeChange` | Optional | `((range: HashrateDateRange) => void)` | - | Fires when the user picks a new range from the DateRangePicker |
| `onReset` | Optional | `VoidFunction` | - | Optional reset handler shown as a "Reset" button next to the date picker |
<!-- END GENERATED: props -->

## Props detail

The miner-type filter state is owned internally - the chart re-sums whenever
the user toggles a miner type.

## Minimal example

```tsx
import { HashrateSiteView } from "@tetherto/mdk-react-devkit";

<HashrateSiteView isLoading={false} log={[]} />
```
