# ContainerChartsBuilder

Generic, declarative chart builder for container telemetry. Given a
`chartDataPayload` describing the desired lines + value adapters, it pulls
per-tag values out of nested `container_specific_stats_group_aggr` log
entries and renders a `LineChart` inside a `ChartContainer`.

## Props detail

| Prop                | Status   | Type                      | Default      | Description                                                      |
| ------------------- | -------- | ------------------------- | ------------ | ---------------------------------------------------------------- |
| `tag`               | Optional | `string`                  | —            | Container tag (any leading prefix is stripped)                   |
| `chartDataPayload`  | Optional | `ChartDataPayload`        | —            | Declarative chart configuration                                  |
| `chartTitle`        | Optional | `string`                  | —            | Title shown in the chart header                                  |
| `data`              | Optional | `UnknownRecord[]`         | `[]`         | Raw container telemetry entries (with `ts` + nested stats group) |
| `timeline`          | Optional | `string`                  | `"24h"`      | Initial / controlled timeline value                              |
| `fixedTimezone`     | Optional | `string`                  | —            | IANA timezone for x-axis ticks                                   |
| `height`            | Optional | `number`                  | —            | Chart pixel height                                               |
| `showLegend`        | Optional | `boolean`                 | `true`       | Show the toggleable legend                                       |
| `showRangeSelector` | Optional | `boolean`                 | `true`       | Show the range selector buttons                                  |
| `rangeOptions`      | Optional | `Array<{ label; value }>` | 5m/30m/3h/1D | Override the default range selector options                      |
| `footer`            | Optional | `React.ReactNode`         | —            | Footer (e.g. min/max/avg stats)                                  |

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

- Returns `null` when `chartDataPayload` is not provided
- Designed for the "configure once per chart kind" use case — for chart-type
  freedom prefer `ContainerCharts` or a hand-rolled `ChartContainer +
  LineChart` composition
