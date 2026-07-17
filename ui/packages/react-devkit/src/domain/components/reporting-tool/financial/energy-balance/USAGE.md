# Energy Balance Components

Components for the Energy Balance financial reporting section.

| Component                     | Description                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `EnergyBalance`               | Top-level energy balance dashboard with tabbed revenue and cost views.                    |
| `EnergyBalanceCostCharts`     | Layout container for the energy cost tab: revenue-vs-cost bar chart and power line chart. |
| `EnergyBalanceCostMetrics`    | Grid of stat cards summarising cost metrics for the selected period.                      |
| `EnergyBalanceRevenueCharts`  | Mosaic layout of revenue, downtime, and power charts for the revenue tab.                 |
| `EnergyBalanceRevenueMetrics` | Grid of stat cards summarising revenue metrics for the selected period.                   |

## EnergyBalance Props

| Prop                         | Type                              | Description                                                                                                                                 |
| ---------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `viewModel`                  | `EnergyBalanceViewModel`          | All display state: chart inputs, metrics, active tab, display modes, loading/error flags. Returned directly by `useEnergyBalanceViewModel`. |
| `onTabChange`                | `(tab: EnergyBalanceTab) => void` | Called when the user switches between Revenue and Cost tabs.                                                                                |
| `onRevenueDisplayModeChange` | `(mode: DisplayMode) => void`     | Called when the user toggles USD / BTC on the revenue tab.                                                                                  |
| `onCostDisplayModeChange`    | `(mode: DisplayMode) => void`     | Called when the user toggles USD / BTC on the cost tab.                                                                                     |
| `timeframeControls`          | `ReactNode`                       | Optional slot for date-range controls rendered by the host app.                                                                             |
| `setCostHref`                | `string`                          | Optional URL for the "Set Monthly Cost" action (hidden when omitted).                                                                       |
| `isDemoMode`                 | `boolean`                         | Suppresses error banners in demo/mock environments.                                                                                         |

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
