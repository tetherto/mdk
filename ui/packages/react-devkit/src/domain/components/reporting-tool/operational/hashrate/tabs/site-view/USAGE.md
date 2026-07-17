# HashrateSiteView

Site-level hashrate trend tab inside `<Hashrate>`. Aggregates the grouped
hashrate log across all (or filtered) miner types into a single series for
the selected date range.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `log` | `HashrateGroupedLog` | no | `[]` | Hashrate log grouped by miner type. |
| `isLoading` | `boolean` | no | `false` | Drives the chart spinner. |
| `error` | `unknown` | no | - | Drives the chart error state. |
| `dateRange` | `HashrateDateRange` | no | - | Selected date range. |
| `onDateRangeChange` | `(range) => void` | no | - | Fires when the user picks a new range. |
| `onReset` | `VoidFunction` | no | - | Optional reset handler. |

The miner-type filter state is owned internally - the chart re-sums whenever
the user toggles a miner type.

## Minimal example

```tsx
import { HashrateSiteView } from "@tetherto/mdk-react-devkit";

<HashrateSiteView isLoading={false} log={[]} />
```
