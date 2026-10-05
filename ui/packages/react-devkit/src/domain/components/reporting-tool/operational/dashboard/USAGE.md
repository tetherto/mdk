# `OperationalDashboard`

A 2x2 grid of the four site-operations charts - **Hashrate**, **Power
Consumption**, **Site Efficiency** (line trends with an optional nominal
reference line) and **Miners Status** (stacked daily breakdown). Each card can
expand to full width, and the expand state persists across remounts.

The composite is pure glue: it renders pre-shaped data. Use the
`useOperationsDashboard` hook to turn raw metric logs into the chart-ready
payloads, then spread them in. Wire your own data layer (RTK Query, TanStack,
fixtures) - the hook never fetches.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `consumption` | Optional | `OperationalDashboardTrendInput` | - | Shaped power-consumption trend |
| `controls` | Optional | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>>` | - | Optional controls (e.g. a date-range picker) rendered above the grid |
| `efficiency` | Optional | `OperationalDashboardTrendInput` | - | Shaped site-efficiency trend |
| `hashrate` | Optional | `OperationalDashboardTrendInput` | - | Shaped hashrate trend (`LineChartCardData`) |
| `miners` | Optional | `OperationalDashboardMinersInput` | - | Shaped stacked miners-status data |
<!-- END GENERATED: props -->

## Props detail

### `useOperationsDashboard(input)`

`input` accepts one entry per chart. Trend inputs take `{ log, nominalValue?, isLoading?, error? }`
where `log` is `{ ts, value }[]` in base units (hashrate MH/s, power W, efficiency W/TH/s).
The miners input takes per-day `{ ts, online, error, offline, sleep, maintenance }` counts.

## Example

```tsx
import { OperationalDashboard, useOperationsDashboard } from '@tetherto/mdk-react-devkit'

const Dashboard = ({ queries }) => {
  const viewModel = useOperationsDashboard({
    hashrate: { log: queries.hashrate.log, nominalValue: queries.nominalHashrateMhs },
    consumption: { log: queries.consumption.log, nominalValue: queries.nominalPowerW },
    efficiency: { log: queries.efficiency.log, nominalValue: queries.nominalEfficiency },
    miners: { log: queries.miners.log },
  })

  return <OperationalDashboard {...viewModel} controls={<DateRangePicker />} />
}
```

## Notes

- Hashrate is displayed in TH/s (kit standard); power in MW; efficiency in W/TH/s
- A nominal value renders a flat reference line (lightweight-charts has no
  native reference line)
- The individual chart components (`OperationalHashrateChart`, …) and
  `ChartExpandAction` are exported as `advanced` building blocks for custom
  layouts
