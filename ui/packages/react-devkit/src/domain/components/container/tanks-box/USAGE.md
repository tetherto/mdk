# TanksBox / TankRow

`TanksBox` renders the full tank list for an immersion container, one `TankRow` per tank. Each row shows per-tank temperature, pressure, and oil/water pump running status.

## TanksBox Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `{ oil_pump: Tank[]; water_pump: WaterPump[]; pressure: TanksBoxPressure[] }` | no | — | Tank telemetry arrays; returns `null` when omitted. |

## TankRow Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | yes | — | Tank identifier label (e.g. "Tank 1"). |
| `temperature` | `number` | yes | — | Current temperature value. |
| `unit` | `string` | yes | — | Temperature unit string (e.g. "°C"). |
| `oilPumpEnabled` | `boolean` | yes | — | Running state for the oil pump. |
| `waterPumpEnabled` | `boolean` | yes | — | Running state for the water pump. |
| `color` | `string` | yes | — | CSS colour for the temperature value (threshold-driven). |
| `flash` | `boolean` | no | — | Enables flash animation on the temperature row. |
| `tooltip` | `string` | no | — | Tooltip text for the temperature value. |
| `pressure` | `TankRowPressure` | yes | — | Pressure reading with optional flash/colour/tooltip. |

## Minimal example

```tsx
import { TanksBox } from "@tetherto/mdk-react-devkit";

<TanksBox
  data={{
    oil_pump: [{ cold_temp_c: 45, enabled: true }],
    water_pump: [{ enabled: true }],
    pressure: [{ value: 1.2 }],
  }}
/>
```
