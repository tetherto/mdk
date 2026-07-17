# MicroBTSettings

Settings form for a MicroBT container with vendor-specific operating limits (temperature thresholds, cooling parameters).

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `Device` | no | — | Live device object. |
| `containerSettings` | `{ thresholds?: Record<string, unknown> } \| null` | no | — | Container-level threshold overrides. |

## Minimal example

```tsx
import { MicroBTSettings } from "@tetherto/mdk-react-devkit";

<MicroBTSettings data={device} />
```
