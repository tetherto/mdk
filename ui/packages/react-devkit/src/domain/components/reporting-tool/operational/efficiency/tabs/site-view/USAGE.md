# `EfficiencySiteView`

Site-level efficiency tab inside `OperationsEfficiency`. Shows an efficiency chart and summary table for the whole mining site.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `avgEfficiency` | Optional | `number \| null` | `null` | Average efficiency value |
| `dateRange` | Optional | `EfficiencyDateRange` | - | Selected date range |
| `isLoading` | Optional | `boolean` | `false` | Loading state |
| `log` | Optional | `MetricsEfficiencyLogEntry[]` | `[]` | Efficiency log entries |
| `nominalValue` | Optional | `number \| null` | `null` | Nominal target efficiency |
| `onDateRangeChange` | Optional | `((range: EfficiencyDateRange) => void)` | - | Date range change handler |
| `onReset` | Optional | `VoidFunction` | - | Reset handler |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { EfficiencySiteView } from "@tetherto/mdk-react-devkit";

<EfficiencySiteView isLoading={false} log={[]} />
```
