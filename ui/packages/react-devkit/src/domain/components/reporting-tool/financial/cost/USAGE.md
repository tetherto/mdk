# Cost

Composite financial reporting page for a single mining site. Renders a page header,
a period selector slot, and a 2×2 grid of charts and metric tiles driven by the
cost-summary view model.

## Props

| Prop               | Type                                        | Required | Default | Description                                                                                    |
| ------------------ | ------------------------------------------- | -------- | ------- | ---------------------------------------------------------------------------------------------- |
| `metrics`          | `CostSummaryDisplayMetrics \| null`         | yes      | —       | Headline $/MWh tiles (all-in, energy, operations). Pass `null` while loading.                 |
| `costLog`          | `ReadonlyArray<CostTimeSeriesEntry>`        | yes      | —       | Monthly/weekly production-cost time series for the Production Cost / Price chart.             |
| `btcPriceLog`      | `ReadonlyArray<BtcPriceTimeSeriesEntry>`    | yes      | —       | BTC price time series aligned to `costLog` buckets.                                           |
| `totals`           | `CostSummaryMonetaryTotals \| null`         | yes      | —       | Period totals (energy + operations USD) for the Operations vs Energy doughnut.                |
| `dateRange`        | `FinancialDateRange \| null`                | yes      | —       | Active date range; drives x-axis labels across all charts.                                    |
| `avgAllInCostData` | `ReadonlyArray<AvgAllInCostDataPoint>`      | no       | —       | Revenue/cost series for the Avg All-in Cost bar chart (sourced separately from cost-summary). |
| `controls`         | `ReactElement`                              | yes      | —       | Period selector slot. Pass `<TimeframeControls>` for the OSS-style year/month picker.         |
| `setCostAction`    | `ReactElement`                              | no       | —       | Optional header action slot (e.g. a "Set Monthly Cost" link or button).                       |
| `isLoading`        | `boolean`                                   | no       | `false` | Shows a loading spinner overlay over the chart grid.                                          |
| `error`            | `unknown`                                   | no       | —       | When truthy, renders an error message in place of the chart grid.                             |

## Minimal example

```tsx
import {
  buildCostSummaryViewModel,
  Cost,
  PERIOD,
  TimeframeControls,
} from "@tetherto/mdk-react-devkit/domain";

const viewModel = buildCostSummaryViewModel({ data: costSummaryApiResponse });

<Cost
  metrics={viewModel.metrics}
  costLog={viewModel.costLog}
  btcPriceLog={viewModel.btcPriceLog}
  totals={viewModel.totals}
  dateRange={{ start, end, period: PERIOD.MONTHLY }}
  controls={<TimeframeControls dateRange={{ start, end }} onRangeChange={handleChange} />}
/>
```

## Notes

- Use `buildCostSummaryViewModel` to transform the raw API response into the props this component expects.
- `avgAllInCostData` comes from a separate endpoint (`useAvgAllInPowerCostData` in the OSS app) — omit it to hide the Avg All-in Cost panel.
- For a custom page layout (different header, navigation), mount `CostContent` directly instead and supply your own chrome.
- Multi-site aggregation is out of scope for this component; mount one `Cost` per site and compose them yourself.
