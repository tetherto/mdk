# PowerMeters

Power-meter panel for a MicroBT container showing voltage (AB/BC/CA), power factor, and frequency for each distribution circuit.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `Device` | no | — | Live device object. |

## Minimal example

```tsx
import { PowerMeters } from "@tetherto/mdk-react-devkit";

<PowerMeters data={device} />
```
