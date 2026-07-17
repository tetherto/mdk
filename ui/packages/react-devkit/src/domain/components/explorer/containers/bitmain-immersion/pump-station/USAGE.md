# BitMainImmersionPumpStationControlBox

Pump-station status card showing alarm, ready, operation, and start states for a BitMain immersion container's pump station.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | no | — | Card heading. |
| `alarmStatus` | `boolean` | no | — | Whether an alarm is active. |
| `ready` | `boolean` | no | — | Pump station is in ready state. |
| `operation` | `boolean` | no | — | Pump station is in operation. |
| `start` | `boolean` | no | — | Pump station has started. |
| `className` | `string` | no | — | Additional CSS class. |

## Minimal example

```tsx
import { BitMainImmersionPumpStationControlBox } from "@tetherto/mdk-react-devkit";

<BitMainImmersionPumpStationControlBox
  title="Pump Station A"
  ready={true}
  operation={true}
  start={true}
  alarmStatus={false}
/>
```
