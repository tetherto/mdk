# MinerPowerModeSelectionButtons

Button group for selecting the operating power mode of selected miners. Reads available power modes from the device and dispatches the chosen mode through `actionsStore`.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `selectedDevices` | `Device[]` | no | — | Devices to apply the power mode to. |
| `setPowerMode` | `(devices, mode) => void` | no | — | Callback to apply the selected mode. |
| `connectedMiners` | `Device[]` | no | — | Currently connected miners. |
| `powerModesLog` | `UnknownRecord` | no | — | Log of previous power mode selections. |
| `disabled` | `boolean` | no | — | Disable all buttons. |
| `hasMargin` | `boolean` | no | — | Add margin around the button group. |

## Minimal example

```tsx
import { MinerPowerModeSelectionButtons } from "@tetherto/mdk-react-devkit";

<MinerPowerModeSelectionButtons
  selectedDevices={[device]}
  setPowerMode={(devices, mode) => console.log(mode)}
/>
```
