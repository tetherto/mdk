# `AlarmContents`

Renders the body region of an alarm card as a scrollable list of `AlarmRow` entries from a `TimelineItemData` array. Shows an `EmptyState` placeholder when the data is empty or falsy.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `alarmsData` | Required | `unknown` | - | Alert entries to render. Falls back to `EmptyState` when empty or falsy |
| `onNavigate` | Required | `(path: string) => void` | - | Navigation callback forwarded to each `AlarmRow` for click-through routing |
<!-- END GENERATED: props -->

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

- Accepts non-array values via the `unknown` union type: these are rendered as a `ReactNode` fallback, enabling progressive disclosure patterns
