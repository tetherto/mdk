# BitMainImmersionUnitControlBox

Individual unit control box for a pump or dry-cooler within a BitMain immersion container. Displays running state, frequency, and alarm status.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | no | — | Unit label (e.g. `"Pump 1"`). |
| `alarmStatus` | `boolean` | no | — | Whether an alarm is active. |
| `frequency` | `number` | no | — | Current operating frequency in Hz. |
| `isDryCooler` | `boolean` | no | — | Render as dry-cooler variant. |
| `running` | `boolean` | no | — | Whether the unit is running. |

## Minimal example

```tsx
import { BitMainImmersionUnitControlBox } from "@tetherto/mdk-react-devkit";

<BitMainImmersionUnitControlBox
  title="Pump 1"
  running={true}
  frequency={50}
  alarmStatus={false}
/>
```
