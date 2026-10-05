# `EfficiencyMinerTypeView`

Miner-type-level efficiency tab inside `OperationsEfficiency`. Groups efficiency data by miner hardware model. A thin
wrapper around `EfficiencyBarView` with a fixed `title`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `chartInput` | Optional | `ToBarChartDataInput` | `{ series: [] }` | Bar chart series data |
| `isEmpty` | Optional | `boolean` | `false` | Shows the empty state instead of the chart |
| `isLoading` | Optional | `boolean` | `false` | Loading state |
| `onTimeFrameChange` | Optional | `((start: Date, end: Date) => void)` | - | Fired when the time-frame selector changes |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { EfficiencyMinerTypeView } from "@tetherto/mdk-react-devkit";

<EfficiencyMinerTypeView isLoading={false} />
```
