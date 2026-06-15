# BitMain Container Settings Sub-panels

Three focused settings panels composing the BitMain container settings view:

| Component | Description |
|---|---|
| `BitMainBasicSettings` | Top-level composite: cooling system + power + GPS positioning. |
| `BitMainCoolingSystem` | Pumps, fans, and dry-cooler running state. |
| `BitMainPowerAndPositioning` | Distribution-box power consumption and rack-slot GPS coordinates. |

## Props (all three)

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `Device` | no | — | Live device object. |

## Minimal example

```tsx
import { BitMainBasicSettings } from "@tetherto/mdk-react-devkit";

<BitMainBasicSettings data={device} />
```
