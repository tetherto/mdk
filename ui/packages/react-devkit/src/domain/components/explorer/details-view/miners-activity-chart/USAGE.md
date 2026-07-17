# MinersActivityChart

Stacked-area chart of miner-state counts (online / offline / faulted) over the selected time window. Built on Chart.js via `react-chartjs-2`.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `MinersActivityData` | yes | — | Time-series data for online/offline/faulted counts. |
| `large` | `boolean` | yes | — | Use tall variant. |
| `isLoading` | `boolean` | yes | — | Show loading state. |
| `isError` | `boolean` | yes | — | Show error state. |
| `error` | `MinerActivityChartErrorProp \| null` | yes | — | Error details to display. |
| `showLabel` | `boolean` | yes | — | Show axis labels. |
| `isDemoMode` | `boolean` | yes | — | Use demo/mock data. |

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
