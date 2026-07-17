# MinerTypeView

Miner-type-level efficiency tab inside `OperationsEfficiency`. Groups efficiency data by miner hardware model.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `log` | `MetricsEfficiencyLogEntry[]` | no | — | Efficiency log entries. |
| `isLoading` | `boolean` | no | — | Loading state. |
| `dateRange` | `EfficiencyDateRange` | no | — | Selected date range. |
| `onDateRangeChange` | `(range) => void` | no | — | Date range change handler. |

## Minimal example

```tsx
import { MinerTypeView } from "@tetherto/mdk-react-devkit";

<MinerTypeView isLoading={false} log={[]} />
```
