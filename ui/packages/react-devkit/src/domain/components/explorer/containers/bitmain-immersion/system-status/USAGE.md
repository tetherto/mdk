# BitMainImmersionSystemStatus

Aggregated system-status card for a BitMain immersion container. Rolls up subsystem health including server start permission and connection status.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `Device` | no | — | Live device object. |

## Minimal example

```tsx
import { BitMainImmersionSystemStatus } from "@tetherto/mdk-react-devkit";

<BitMainImmersionSystemStatus data={device} />
```
