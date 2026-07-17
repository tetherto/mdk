# ContainerChartsBuilder

Generic, declarative chart builder for container telemetry. Given a
`chartDataPayload` describing the desired lines + value adapters, it pulls
per-tag values out of nested `container_specific_stats_group_aggr` log
entries and renders a `LineChart` inside a `ChartContainer`.

## Props

| Prop                | Type                              | Required | Default       | Description                                              |
| ------------------- | --------------------------------- | -------- | ------------- | -------------------------------------------------------- |
| `tag`               | `string`                          | no       | —             | Container tag (any leading prefix is stripped).          |
| `chartDataPayload`  | `ChartDataPayload`                | no       | —             | Declarative chart configuration.                         |
| `chartTitle`        | `string`                          | no       | —             | Title shown in the chart header.                         |
| `dateRange`         | `{ start?: number; end?: number }` | no      | —             | Date range bounds (parent integration).                  |
| `data`              | `UnknownRecord[]`                 | no       | `[]`          | Raw container telemetry entries (with `ts` + nested stats group). |
| `timeline`          | `string`                          | no       | `"24h"`       | Initial / controlled timeline value.                     |
| `fixedTimezone`     | `string`                          | no       | —             | IANA timezone for x-axis ticks.                          |
| `height`            | `number`                          | no       | —             | Chart pixel height.                                      |
| `showLegend`        | `boolean`                         | no       | `true`        | Show the toggleable legend.                              |
| `showRangeSelector` | `boolean`                         | no       | `true`        | Show the range selector buttons.                         |
| `rangeOptions`      | `Array<{ label; value }>`         | no       | 5m/30m/3h/1D  | Override the default range selector options.             |
| `footer`            | `React.ReactNode`                 | no       | —             | Optional footer (e.g. min/max/avg stats).                |

## `ChartDataPayload`

```ts
type ChartDataPayload = {
  unit?: string;
  lines?: Array<{
    backendAttribute: string;
    label: string;
    borderColor: string;
    borderWidth?: number;
    visible?: boolean;
  }>;
  currentValueLabel?: { backendAttribute?: string; decimals?: number };
  valueFormatter?: (value: number) => number;
  valueDecimals?: number;
};
```

## Minimal example

```tsx
<ContainerChartsBuilder
  tag="cont-A"
  chartTitle="Temperature"
  chartDataPayload={tempChartConfig}
  data={telemetryLog}
/>
```

## Notes

- Returns `null` when `chartDataPayload` is not provided.
- Designed for the "configure once per chart kind" use case — for chart-type
  freedom prefer `ContainerCharts` or a hand-rolled `ChartContainer +
  LineChart` composition.
