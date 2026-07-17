# EnergyReport

Operational **Energy** report with three tabs: site consumption trend, power modes by miner type, and bar charts by miner type / mining unit.

## Composite

```tsx
import { EnergyReport } from "@tetherto/mdk-react-devkit";

<EnergyReport
  siteView={{
    dateRange: { start, end },
    onDateRangeChange: setRange,
    consumptionLog,
    nominalPowerAvailabilityMw: 600,
    tailLog,
    containers,
    onRefetchSnapshot: refetch,
  }}
  minerTypeView={{
    groupedConsumption,
    containers,
    isLoading,
    onTimeFrameChange: (start, end) => fetchGrouped("miner", start, end),
  }}
  minerUnitView={{
    groupedConsumption: containerGrouped,
    containers,
    isLoading,
  }}
/>
```

## Hooks / utils

- `useEnergyReportSite` — derives site chart series, power-mode table rows, and container cards from v2 consumption + tail log.
- `transformToBarData` / `toEnergyReportBarChartInput` — latest-day grouped consumption bars (miner vs container `groupBy`).

## Demo

`apps/demo` route: `/operational-energy`
