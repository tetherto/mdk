# `TimelineChart`

Discrete-event timeline chart (e.g. miner state over time) with a category
legend. Supports streaming updates via `newData`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `initialData` | Required | `TimelineChartData` | - | Initial timeline data |
| `axisTitleText` | Optional | `AxisTitleText` | `{ x: "Time", y: "" }` | Axis title strings |
| `height` | Optional | `number` | - | Chart pixel height |
| `isLoading` | Optional | `boolean` | `false` | Show loader |
| `newData` | Optional | `TimelineChartData` | - | Streaming updates appended to the initial data |
| `range` | Optional | `ChartRange` | - | Visible time window |
| `skipUpdates` | Optional | `boolean` | `false` | Ignore `newData` |
| `title` | Optional | `string` | - | Chart title |
<!-- END GENERATED: props -->

## Example

```tsx
<TimelineChart initialData={data} range={{ min, max }} title="State" />
```

## Data contracts

`TimelineChartData` lives in [`timeline-chart.types.ts`](./timeline-chart.types.ts). Each dataset has a
`label` plus a list of `{ x: [startMs, endMs], y, mode }` items where `mode`
maps to a category color in the legend.
