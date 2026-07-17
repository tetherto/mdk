# MinerUnitView

Per-unit efficiency tab inside `OperationsEfficiency`. Shows efficiency data for individual miner units with search and filter.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `log` | `MetricsEfficiencyLogEntry[]` | no | — | Efficiency log entries. |
| `isLoading` | `boolean` | no | — | Loading state. |
| `dateRange` | `EfficiencyDateRange` | no | — | Selected date range. |
| `onDateRangeChange` | `(range) => void` | no | — | Date range change handler. |

## Minimal example

```tsx
import { MinerUnitView } from "@tetherto/mdk-react-devkit";

<MinerUnitView isLoading={false} log={[]} />
```
