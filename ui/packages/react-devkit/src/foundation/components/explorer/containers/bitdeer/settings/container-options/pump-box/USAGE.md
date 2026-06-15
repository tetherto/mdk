# PumpBox

Single-pump status card showing RPM, flow, and fault state for one immersion-cooling pump. Renders a coloured indicator (green = running, grey = off). Returns `null` if `pumpItem.enabled` is not a boolean.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `pumpTitle` | `string` | yes | — | Label prefix for the pump (e.g. `"Circulation"`). |
| `pumpItem` | `{ enabled?: boolean; index: number }` | no | — | Pump data. `index` is 0-based; displayed as `index + 1`. |

## Minimal example

```tsx
import { PumpBox } from "@tetherto/mdk-react-devkit";

<PumpBox pumpTitle="Circulation" pumpItem={{ enabled: true, index: 0 }} />
```
