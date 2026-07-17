# AlarmContents

Renders the body region of an alarm card as a scrollable list of `AlarmRow` entries from a `TimelineItemData` array. Shows an `EmptyState` placeholder when the data is empty or falsy.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `alarmsData` | `TimelineItemData[] \| unknown` | yes | — | Alert entries to render. Passes each entry to an `AlarmRow`; falls back to `EmptyState` when array is empty or falsy. Accepts a raw `ReactNode` as a passthrough fallback. |
| `onNavigate` | `(path: string) => void` | yes | — | Navigation callback forwarded to each `AlarmRow` for click-through routing. |

## Minimal example

```tsx
import { AlarmContents } from "@tetherto/mdk-react-devkit";

const alarms = [
  {
    item: { title: "Miner offline", subtitle: "2 min ago", body: "No telemetry.", uuid: "a1", status: "critical" },
    dot: null,
    children: null,
  },
];

<AlarmContents alarmsData={alarms} onNavigate={(path) => console.log(path)} />
```

## Notes

- Accepts non-array values via the `unknown` union type — these are rendered as a `ReactNode` fallback, enabling progressive disclosure patterns.
