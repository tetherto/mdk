# `EnabledDisableToggle`

Switch with confirmation that enables or disables a container tank, miner, or feature flag. Renders a switch when the current state is known (boolean), or Enable/Disable buttons when state is unknown. Disables all controls when the container is offline.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `isButtonDisabled` | Required | `boolean` | - | Disables the Enable/Disable buttons when a command is in-flight |
| `isOffline` | Required | `boolean` | - | Disables all controls and shows an offline tooltip |
| `onToggle` | Required | `(params: EnabledDisableToggleCbParams) => void` | - | Callback fired when the user confirms a state change |
| `tankNumber` | Required | `string \| number` | - | Tank identifier used in the label (`Tank {N} Circulation`). Pass an empty string for the air exhaust label |
| `value` | Required | `unknown` | - | Current state. A boolean drives a switch display; non-boolean shows action buttons |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { EnabledDisableToggle } from "@tetherto/mdk-react-devkit";

<EnabledDisableToggle
  value={true}
  tankNumber={1}
  isButtonDisabled={false}
  isOffline={false}
  onToggle={({ tankNumber, isOn }) => console.log(tankNumber, isOn)}
/>
```
