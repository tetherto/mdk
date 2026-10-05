# TanksBox / TankRow

`TanksBox` renders the full tank list for an immersion container, one `TankRow` per tank. Each row shows per-tank temperature, pressure, and oil/water pump running status.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `TankRow` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `color` | Required | `string` | - | CSS colour for the temperature value (threshold-driven) |
| `label` | Required | `string` | - | Tank identifier label (e.g. "Tank 1") |
| `oilPumpEnabled` | Required | `boolean` | - | Running state for the oil pump |
| `pressure` | Required | `Partial<{ value: number; flash: boolean; color: string; tooltip: string; }>` | - | Pressure reading with optional flash/colour/tooltip |
| `temperature` | Required | `number` | - | Current temperature value |
| `unit` | Required | `string` | - | Temperature unit string (e.g. "°C") |
| `waterPumpEnabled` | Required | `boolean` | - | Running state for the water pump |
| `flash` | Optional | `boolean` | - | Enables flash animation on the temperature row |
| `tooltip` | Optional | `string` | - | Tooltip text for the temperature value |

### `TanksBox` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Optional | `{ oil_pump: Tank[]; water_pump: WaterPump[]; pressure: TanksBoxPressure[]; }` | - | Tank telemetry arrays; returns `null` when omitted |
<!-- END GENERATED: props -->

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
