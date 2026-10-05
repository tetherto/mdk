# `MinersActivityChart`

Stacked-area chart of miner-state counts (online / offline / faulted) over the selected time window. Built on Chart.js via `react-chartjs-2`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Optional | `MinersActivityData` | `{}` | Time-series data for online/offline/faulted counts |
| `error` | Optional | `MinerActivityChartErrorProp \| null` | `null` | Error details to display |
| `isDemoMode` | Optional | `boolean` | `false` | Use demo/mock data |
| `isError` | Optional | `boolean` | `false` | Show error state |
| `isLoading` | Optional | `boolean` | `false` | Show loading state |
| `large` | Optional | `boolean` | `false` | Use tall variant |
| `showLabel` | Optional | `boolean` | `true` | Show axis labels |
| `variant` | Optional | `"indicators" \| "tiles"` | `"indicators"` | `indicators` (default) renders coloured dots; `tiles` renders tinted status tiles |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { MinersActivityChart } from "@tetherto/mdk-react-devkit";

<MinersActivityChart
  data={{ online: [], offline: [], faulted: [] }}
  large={false}
  isLoading={false}
  isError={false}
  error={null}
  showLabel={true}
  isDemoMode={true}
/>
```
