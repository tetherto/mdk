# BitMainCoolingSystem

Cooling subsystem panel for a BitMain container showing pumps, fans, and dry-cooler running state.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `Device` | no | — | Live device object. |

## Minimal example

```tsx
import { BitMainCoolingSystem } from "@tetherto/mdk-react-devkit";

<BitMainCoolingSystem data={device} />
```
