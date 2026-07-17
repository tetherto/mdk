# BitMainPowerAndPositioning

Power and GPS-positioning panel for a BitMain container. Shows distribution-box power consumption and rack-slot GPS coordinates.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `Device` | no | — | Live device object. |

## Minimal example

```tsx
import { BitMainPowerAndPositioning } from "@tetherto/mdk-react-devkit";

<BitMainPowerAndPositioning data={device} />
```
