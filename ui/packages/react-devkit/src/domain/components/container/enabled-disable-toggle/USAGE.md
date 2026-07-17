# EnabledDisableToggle

Switch with confirmation that enables or disables a container tank, miner, or feature flag. Renders a switch when the current state is known (boolean), or Enable/Disable buttons when state is unknown. Disables all controls when the container is offline.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | `unknown` | yes | — | Current state. A boolean drives a switch display; non-boolean shows action buttons. |
| `tankNumber` | `number \| string` | yes | — | Tank identifier used in the label (`Tank {N} Circulation`). Pass an empty string for the air exhaust label. |
| `isButtonDisabled` | `boolean` | yes | — | Disables the Enable/Disable buttons when a command is in-flight. |
| `isOffline` | `boolean` | yes | — | Disables all controls and shows an offline tooltip. |
| `onToggle` | `(params: { tankNumber; isOn }) => void` | yes | — | Callback fired when the user confirms a state change. |

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
