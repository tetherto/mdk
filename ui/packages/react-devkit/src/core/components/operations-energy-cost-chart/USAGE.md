# OperationsEnergyCostChart

Doughnut chart comparing Operations and Energy cost (USD/MWh). Includes
`ChartContainer` chrome: title, unit subtitle, loading, and empty state.

## Props

| Prop           | Type                           | Required | Default                      | Description                                      |
| -------------- | ------------------------------ | -------- | ---------------------------- | ------------------------------------------------ |
| `data`         | `OperationsEnergyCostChartData`| no       | —                            | `operationalCostsUSD` and `energyCostsUSD`.      |
| `title`        | `string`                       | no       | `Operations vs Energy Cost`  | Chart title.                                     |
| `unit`         | `string`                       | no       | `USD/MWh`                    | Subtitle and tooltip unit label.                 |
| `height`       | `number`                       | no       | `200`                        | Doughnut height in pixels.                       |
| `isLoading`    | `boolean`                      | no       | `false`                      | Shows loading overlay on the chart area.         |
| `emptyMessage` | `string`                       | no       | —                            | Message when both costs are zero or missing.     |
| `className`    | `string`                       | no       | —                            | Extra class on the container.                    |

## Example

```tsx
<OperationsEnergyCostChart
  data={{
    operationalCostsUSD: 1000,
    energyCostsUSD: 500,
  }}
/>
```
