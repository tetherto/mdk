# Alarm

Mining-domain feedback components for rendering alarm timelines and alert details.

## Components

### `AlarmContents`

Body region of an alarm card. Renders a scrollable list of `AlarmRow` entries from a `TimelineItemData` array, or an `EmptyState` when no data is present.

#### Props detail

| Prop         | Status   | Type                            | Default | Description                  |
| ------------ | -------- | ------------------------------- | ------- | ---------------------------- |
| `alarmsData` | Required | `TimelineItemData[] \| unknown` | —       | Alert entries to render. Falls back to `EmptyState` when empty or falsy. |
| `onNavigate` | Required | `(path: string) => void`        | —       | Navigation callback forwarded to each `AlarmRow` |

### `AlarmRow`

Single alarm-feed row with a severity dot, timestamp, source device label, and the alert message.

#### Props detail

| Prop         | Status   | Type                     | Default | Description                                                      |
| ------------ | -------- | ------------------------ | ------- | ---------------------------------------------------------------- |
| `data`       | Required | `TimelineItemData`       | —       | The alarm entry to render                                        |
| `onNavigate` | Required | `(path: string) => void` | —       | Called when the row is clicked (routes to the alarm detail page) |

## Types

```ts
type AlarmItemData = {
  title: string
  subtitle: string
  body: string        // pipe-separated segments rendered as separate lines
  uuid?: string       // used for routing on click
  status: string      // controls severity color and icon
  [key: string]: unknown
}

type TimelineItemData = {
  item: AlarmItemData
  dot: ReactNode
  children: ReactNode
}
```

## Notes

- Category: `feedback` | Domain: `mining-operations` | Capability: `incident-alerts` | Tier: `agent-ready`
- Severity color is driven by `status` via `ALERT_COLOR_MAP` (defined in [`alarm-row-constants.tsx`](./alarm-row/alarm-row-constants.tsx))
- `AlarmContents` renders a plain `ReactNode` fallback when `alarmsData` is not an array
