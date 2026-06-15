# AlarmRow

Single alarm-feed row with a severity dot, timestamp, source device label, and the alert message body. Clicking the row triggers `onNavigate` to route to the alarm detail page.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `TimelineItemData` | yes | — | The alarm entry to render. Contains `item` (alarm metadata), `dot`, and `children`. |
| `onNavigate` | `(path: string) => void` | yes | — | Called when the row is clicked; receives the alarm `uuid` as the path segment. |

## Minimal example

```tsx
import { AlarmRow } from "@tetherto/mdk-react-devkit";

const alarm = {
  item: {
    title: "Miner offline",
    subtitle: "2 min ago",
    body: "No telemetry received.|Check network.",
    uuid: "a1",
    status: "critical",
  },
  dot: null,
  children: null,
};

<AlarmRow data={alarm} onNavigate={(path) => console.log(path)} />
```

## Notes

- Severity colour is driven by `item.status` via `ALERT_COLOR_MAP`; supported values match the alert severity palette (`critical`, `warning`, `info`, etc.).
- The `body` string is split on `|` and each segment is rendered as a separate line.
