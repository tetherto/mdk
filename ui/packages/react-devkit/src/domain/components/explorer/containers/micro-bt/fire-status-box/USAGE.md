# FireStatusBox

Safety-status card for a MicroBT container showing smoke detector, water-ingress detector, and cooling-fan status readings.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `{ smokeDetector, waterIngressDetector, coolingFanStatus }` | no | — | Raw sensor values from the device. |

## Minimal example

```tsx
import { FireStatusBox } from "@tetherto/mdk-react-devkit";

<FireStatusBox
  data={{ smokeDetector: 0, waterIngressDetector: 0, coolingFanStatus: 1 }}
/>
```
