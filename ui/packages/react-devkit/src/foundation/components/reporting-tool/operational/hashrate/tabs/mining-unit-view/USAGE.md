# HashrateMiningUnitView

Mining-unit drilldown tab inside `<Hashrate>`. Bar chart of the latest
hashrate per container (Bitdeer 1A, MicroBT 1, ...), with an optional
multi-select filter. The utils layer drops BE-leaked rollup keys
(`group-N`, `maintenance`) so the consumer never sees them.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `log` | `HashrateGroupedLog` | no | `[]` | Hashrate log grouped by container (`groupBy=container`). |
| `isLoading` | `boolean` | no | `false` | Drives the chart spinner. |
| `error` | `unknown` | no | - | Drives the chart error state. |
| `dateRange` | `HashrateDateRange` | no | - | Selected date range. |
| `onDateRangeChange` | `(range) => void` | no | - | Fires when the user picks a new range. |
| `onReset` | `VoidFunction` | no | - | Optional reset handler. |

## Minimal example

```tsx
import { HashrateMiningUnitView } from "@tetherto/mdk-react-devkit";

<HashrateMiningUnitView isLoading={false} log={[]} />
```
