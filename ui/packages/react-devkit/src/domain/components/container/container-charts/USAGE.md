# `ContainerCharts`

Multi-series time-series chart panel used by container detail views to display temperature, pressure, and power data over configurable time windows. Supports paired-index expansion for dual-tank (Bitdeer) and dual-supply (Bitmain Immersion) container types.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `combinations` | Required | `ContainerChartCombinationOption[]` | - | Options for the combination selector |
| `chartRawData` | Optional | `ChartEntry[] \| null` | `null` | Raw overview stats rows passed to chart adapters |
| `defaultSelectedCombination` | Optional | `string \| null` | `null` | Initial selection when uncontrolled |
| `disabledMessage` | Optional | `string` | `"Container Charts feature is not enabled"` | Message when `featureEnabled` is false |
| `featureEnabled` | Optional | `boolean` | `true` | When false, shows an empty state (feature gate) |
| `getDatasetBorderColor` | Optional | `ContainerChartsDatasetBorderColorResolver` | - | Optional per-dataset line colors after adapters run (e.g. demo or host branding) |
| `isLoadingCharts` | Optional | `boolean` | `false` | Loading state for the chart panels |
| `isLoadingCombinations` | Optional | `boolean` | `false` | Loading state for combination options |
| `onSelectedCombinationChange` | Optional | `((value: string \| null) => void)` | - | Called when the selected combination changes |
| `selectedCombination` | Optional | `string \| null` | - | Controlled selected combination value |
| `title` | Optional | `string` | `"Container Charts"` | Section heading |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { ContainerCharts } from "@tetherto/mdk-react-devkit";

<ContainerCharts combinations={[]} />
```
