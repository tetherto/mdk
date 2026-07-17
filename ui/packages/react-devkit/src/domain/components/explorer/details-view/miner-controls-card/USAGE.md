# MinerControlsCard

Action card for a single miner exposing power, reboot, mode-select, and maintenance entry points. Reads selected devices from the `devicesStore` and dispatches commands through the `actionsStore`.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `buttonsStates` | `Record<string, boolean \| undefined>` | yes | — | Map of action name → loading/disabled state. |
| `isLoading` | `boolean` | yes | — | Whether the card itself is in a loading state. |
| `showPowerModeSelector` | `boolean` | no | `true` | Show the power-mode selection button. |

## Minimal example

```tsx
import { MinerControlsCard } from "@tetherto/mdk-react-devkit";

<MinerControlsCard
  buttonsStates={{ reboot: false, start: false }}
  isLoading={false}
/>
```
