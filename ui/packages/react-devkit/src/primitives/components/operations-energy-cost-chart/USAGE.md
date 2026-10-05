# `OperationsEnergyCostChart`

Doughnut chart comparing Operations and Energy cost ($/MWh). Includes
`ChartContainer` chrome: title, unit subtitle, loading, and empty state.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Extra class on the container |
| `data` | Optional | `Partial<{ energyCostsUSD: number; operationalCostsUSD: number; }>` | - | `operationalCostsUSD` and `energyCostsUSD` |
| `emptyMessage` | Optional | `string` | - | Message when both costs are zero or missing |
| `height` | Optional | `number` | `200` | Doughnut height in pixels |
| `isLoading` | Optional | `boolean` | `false` | Shows loading overlay on the chart area |
| `title` | Optional | `string` | `"Operations vs Energy Cost"` | Chart title |
| `unit` | Optional | `string` | `$/MWh` | Subtitle and tooltip unit label |
<!-- END GENERATED: props -->

## Example

```tsx
<OperationsEnergyCostChart
  data={{
    operationalCostsUSD: 1000,
    energyCostsUSD: 500,
  }}
/>
```
