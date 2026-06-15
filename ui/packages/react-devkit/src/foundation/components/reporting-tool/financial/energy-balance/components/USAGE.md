# Energy Balance Metric Components

Individual stat cards and charts used inside the Energy Balance section.

| Component | Description |
|---|---|
| `AvgAllInCostCard` | Average all-in cost per MWh for the selected period. |
| `AvgEnergyCostCard` | Average energy cost per MWh for the selected period. |
| `AvgEnergyRevenueCard` | Average energy revenue per MWh for the selected period. |
| `AvgOperationsCostCard` | Average operations cost per MWh for the selected period. |
| `AvgPowerAvailabilityCard` | Average power availability in MW for the selected period. |
| `AvgPowerConsumptionCard` | Average power consumption in MW for the selected period. |
| `CurtailmentRateCard` | Curtailment rate percentage for the selected period. |
| `OpIssuesRateCard` | Operational issues rate percentage for the selected period. |
| `DowntimeChart` | Bar chart of average downtime percentage over time. |
| `EnergyCostChart` | Bar chart comparing site revenue vs cost per MWh with USD/BTC toggle. |
| `EnergyRevenueChart` | Bar chart of site energy revenue per MWh with USD/BTC toggle. |
| `EnergyBalancePowerChart` | Line chart of power consumption against threshold. |

## Stat card props

All stat cards accept a single `value: number` prop.

## DowntimeChart props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `chartData` | `BarChartDataResult` | yes | — | Labels and datasets for the stacked downtime bars. |
| `height` | `number` | no | `260` | Chart height when `fillHeight` is false. |
| `fillHeight` | `boolean` | no | `false` | Stretch the panel and chart to fill a mosaic cell (uses height `320` and `mdk-energy-balance__panel--fill`). Used on the revenue tab left column below metrics. |

## EnergyBalancePowerChart props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `chartInput` | `ThresholdLineChartInput` | yes | — | Series and optional threshold line for power vs availability. |
| `periodType` | `PeriodType` | yes | — | Controls x-axis date formatting (`month` uses `MM-yy`). |
| `height` | `number` | no | `280` | Chart height when `fillHeight` is false. |
| `fillHeight` | `boolean` | no | `false` | Stretch the panel and chart to fill a mosaic cell (uses height `320` and `mdk-energy-balance__panel--fill`). Used on the revenue tab power column in `EnergyBalanceRevenueCharts`. |

## Minimal example

```tsx
import {
  AvgAllInCostCard,
  AvgEnergyCostCard,
  CurtailmentRateCard,
} from "@tetherto/mdk-react-devkit";

<AvgAllInCostCard value={42.5} />
<AvgEnergyCostCard value={38.2} />
<CurtailmentRateCard value={3.2} />
```

## Notes

- Set `fillHeight` when placing `DowntimeChart` or `EnergyBalancePowerChart` inside the energy balance revenue mosaic (`EnergyBalanceRevenueCharts`). Parent layout should use `mdk-energy-balance__revenue-mosaic` (or equivalent flex column with `min-height: 0`) so `--fill` panels can grow.
- Other charts in this folder (`EnergyCostChart`, `EnergyRevenueChart`) do not expose `fillHeight`; they use a fixed default height.
