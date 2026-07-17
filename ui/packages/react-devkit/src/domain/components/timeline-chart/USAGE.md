# TimelineChart

Discrete-event timeline chart (e.g. miner state over time) with a category
legend. Supports streaming updates via `newData`.

## Props

| Prop            | Type                  | Required | Default              | Description                                            |
| --------------- | --------------------- | -------- | -------------------- | ------------------------------------------------------ |
| `initialData`   | `TimelineChartData`   | yes      | —                    | Initial timeline data.                                 |
| `newData`       | `TimelineChartData`   | no       | —                    | Streaming updates appended to the initial data.        |
| `skipUpdates`   | `boolean`             | no       | `false`              | Ignore `newData`.                                      |
| `range`         | `{ start; end }`      | no       | —                    | Visible time window.                                   |
| `axisTitleText` | `{ x; y }`            | no       | `{ x: "Time", y: "" }` | Axis title strings.                                   |
| `isLoading`     | `boolean`             | no       | `false`              | Show loader.                                           |
| `title`         | `string`              | no       | —                    | Chart title.                                           |
| `height`        | `number`              | no       | —                    | Chart pixel height.                                    |

## Example

```tsx
<TimelineChart initialData={data} range={{ start, end }} title="State" />
```

## Data contracts

`TimelineChartData` lives in `timeline-chart.types.ts`. Each dataset has a
`label` plus a list of `{ x: [startMs, endMs], y, mode }` items where `mode`
maps to a category color in the legend.
