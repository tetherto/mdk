# SiteView

Site-level efficiency tab inside `OperationsEfficiency`. Shows an efficiency chart and summary table for the whole mining site.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `log` | `MetricsEfficiencyLogEntry[]` | no | — | Efficiency log entries. |
| `avgEfficiency` | `number \| null` | no | — | Average efficiency value. |
| `nominalValue` | `number \| null` | no | — | Nominal target efficiency. |
| `isLoading` | `boolean` | no | — | Loading state. |
| `dateRange` | `EfficiencyDateRange` | no | — | Selected date range. |
| `onDateRangeChange` | `(range) => void` | no | — | Date range change handler. |
| `onReset` | `VoidFunction` | no | — | Reset handler. |

## Minimal example

```tsx
import { SiteView } from "@tetherto/mdk-react-devkit";

<SiteView isLoading={false} log={[]} />
```
