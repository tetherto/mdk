# BitMain Immersion Container Components

Components for the BitMain immersion-cooled container explorer view.

| Component | Description |
|---|---|
| `BitMainImmersionSettings` | Full settings form — tank thresholds, pump curves, and limits. |
| `BitMainImmersionControlBox` | Generic layout box with left/right/bottom content areas. |
| `BitMainImmersionPumpStationControlBox` | Pump station status card — alarm, ready, operation, start. |
| `BitMainImmersionSystemStatus` | Aggregated system-health card rolling up all subsystems. |
| `BitMainImmersionControlsTab` | Controls tab: start/stop, mode select, fan status, tank levels. |
| `BitMainImmersionUnitControlBox` | Individual unit box (pump, dry-cooler) with frequency and status. |
| `BitMainImmersionCompactUnitControlBox` | Compact variant of the unit control box. |

## Common Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `Device` | no | Live device object from the devices store. |

## Minimal example

```tsx
import { BitMainImmersionSettings } from "@tetherto/mdk-react-devkit";

<BitMainImmersionSettings data={device} />
```
