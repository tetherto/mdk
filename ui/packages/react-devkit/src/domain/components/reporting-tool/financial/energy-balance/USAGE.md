# Energy balance components

Components for the Energy Balance financial reporting section.

| Component                     | Description                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `EnergyBalance`               | Top-level energy balance dashboard with tabbed revenue and cost views                    |
| `EnergyBalanceCostCharts`     | Layout container for the energy cost tab: revenue-vs-cost bar chart and power line chart |
| `EnergyBalanceCostMetrics`    | Grid of stat cards summarizing cost metrics for the selected period                      |
| `EnergyBalanceRevenueCharts`  | Mosaic layout of revenue, downtime, and power charts for the revenue tab                 |
| `EnergyBalanceRevenueMetrics` | Grid of stat cards summarizing revenue metrics for the selected period                   |

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `EnergyBalance` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `onCostDisplayModeChange` | Required | `(mode: DisplayMode) => void` | - | Called when the user toggles USD / BTC on the cost tab |
| `onRevenueDisplayModeChange` | Required | `(mode: DisplayMode) => void` | - | Called when the user toggles USD / BTC on the revenue tab |
| `onTabChange` | Required | `(tab: EnergyBalanceTab) => void` | - | Called when the user switches between Revenue and Cost tabs |
| `viewModel` | Required | `EnergyBalanceViewModel` | - | All display state: chart inputs, metrics, active tab, display modes, loading/error flags. Returned directly by `useEnergyBalanceViewModel` |
| `isDemoMode` | Optional | `boolean` | `false` | Suppresses error banners in demo/mock environments |
| `setCostHref` | Optional | `string` | - | Optional URL for the "Set Monthly Cost" control (hidden when omitted) |
| `timeframeControls` | Optional | `React.ReactNode` | - | Slot for timeframe / date-range controls rendered by the host app |

### `EnergyBalanceCostCharts` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `barLabelFormatter` | Required | `(v: number) => string` | - | - |
| `btcUnit` | Required | `string \| null` | - | - |
| `costChartData` | Required | `BarChartDataResult` | - | - |
| `displayMode` | Required | `"BTC" \| "USD"` | - | - |
| `onDisplayModeChange` | Required | `(mode: DisplayMode) => void` | - | - |
| `periodType` | Required | `"month" \| "week" \| "day"` | - | - |
| `powerChartInput` | Required | `ThresholdLineChartInput` | - | - |
| `showCostBarChart` | Required | `boolean` | - | Show the revenue-vs-cost bar chart only for non-daily periods |

### `EnergyBalanceCostMetrics` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `metrics` | Required | `EnergyCostMetrics` | - | - |

### `EnergyBalanceRevenueCharts` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `averageDowntimeData` | Required | `AverageDowntimeChartData` | - | - |
| `barLabelFormatter` | Required | `(v: number) => string` | - | - |
| `displayMode` | Required | `"BTC" \| "USD"` | - | - |
| `onDisplayModeChange` | Required | `(mode: DisplayMode) => void` | - | - |
| `periodType` | Required | `"month" \| "week" \| "day"` | - | - |
| `powerChartInput` | Required | `ThresholdLineChartInput` | - | - |
| `revenueChartData` | Required | `BarChartDataResult` | - | - |
| `revenueMetrics` | Required | `EnergyRevenueMetrics` | - | - |

### `EnergyBalanceRevenueMetrics` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `metrics` | Required | `EnergyRevenueMetrics` | - | - |
<!-- END GENERATED: props -->

## Typical usage with `useEnergyBalanceViewModel`

```tsx
import { EnergyBalance, useEnergyBalanceViewModel } from '@tetherto/mdk-react-devkit'

const MyPage = ({ data, isLoading, errors, dateRange, availablePowerMW }) => {
  const { queryParams, ...componentProps } = useEnergyBalanceViewModel({
    data,
    isLoading,
    fetchErrors: errors,
    dateRange,
    availablePowerMW,
  })

  return (
    <EnergyBalance
      {...componentProps}
      timeframeControls={<MyDateRangePicker />}
      setCostHref="/settings/energy-cost"
    />
  )
}
```

`queryParams` contains the `{ start, end, period }` values to pass to your API call. Everything else from the hook maps directly onto `EnergyBalance`.
