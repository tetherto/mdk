# `MinerPowerModeSelectionButtons`

Button group for selecting the operating power mode of selected miners. Reads available power modes from the device and dispatches the chosen mode through `actionsStore`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `connectedMiners` | Optional | `Device[]` | - | Currently connected miners |
| `disabled` | Optional | `boolean` | `false` | Disable all buttons |
| `hasMargin` | Optional | `boolean` | `false` | Add margin around the button group |
| `powerModesLog` | Optional | `UnknownRecord` | - | Log of previous power mode selections |
| `selectedDevices` | Optional | `Device[]` | `[]` | Devices to apply the power mode to |
| `setPowerMode` | Optional | `((devices: Device[], mode: string) => void)` | - | Callback to apply the selected mode |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { MinerPowerModeSelectionButtons } from "@tetherto/mdk-react-devkit";

<MinerPowerModeSelectionButtons
  selectedDevices={[device]}
  setPowerMode={(devices, mode) => console.log(mode)}
/>
```
