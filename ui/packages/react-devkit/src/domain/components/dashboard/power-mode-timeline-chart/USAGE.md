# PowerModeTimelineChart

Timeline chart for power-mode state changes over time. Wraps `TimelineChart`
with mining-specific data shaping.

## Props

| Prop          | Type                       | Required | Default                   | Description                                  |
| ------------- | -------------------------- | -------- | ------------------------- | -------------------------------------------- |
| `data`        | `PowerModeTimelineEntry[]` | no       | `[]`                      | Initial power-mode entries.                  |
| `dataUpdates` | `PowerModeTimelineEntry[]` | no       | `[]`                      | Streaming updates.                           |
| `isLoading`   | `boolean`                  | no       | `false`                   | Show loading state.                          |
| `timezone`    | `string`                   | no       | `"UTC"`                   | IANA timezone string.                        |
| `title`       | `string`                   | no       | `CHART_TITLES.POWER_MODE_TIMELINE` | Chart title.                          |

## Example

```tsx
<PowerModeTimelineChart data={powerModeLog} timezone="UTC" />
```

## Data contracts

`PowerModeTimelineEntry` lives in `power-mode-timeline-chart.helper.ts`.
