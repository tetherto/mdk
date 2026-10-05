# `AreaChart`

Presentational Chart.js area chart (`Line` with fill). Data must be provided
via props — no data fetching.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Required | `ChartData<"line", (number \| Point \| null)[], unknown>` | - | Chart data - required, provided by parent |
| `className` | Optional | `string` | - | Additional class names |
| `height` | Optional | `number` | `300` | Chart height in pixels |
| `options` | Optional | `object` | - | Chart.js options - merged with defaults |
| `tooltip` | Optional | `ChartTooltipConfig` | - | Custom HTML tooltip configuration. When provided, replaces the default Chart.js tooltip |
<!-- END GENERATED: props -->

## Example

```tsx
<AreaChart data={areaData} options={options} height={300} />
```
