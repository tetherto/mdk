# `MinerControlsCard`

Action card for a single miner exposing power, reboot, mode-select, and maintenance entry points. Reads selected devices from the `devicesStore` and dispatches commands through the `actionsStore`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `buttonsStates` | Required | `Record<string, boolean \| undefined>` | - | Map of action name → loading/disabled state |
| `isLoading` | Required | `boolean` | - | Whether the card itself is in a loading state |
| `showPowerModeSelector` | Optional | `boolean` | `true` | Show the power-mode selection button |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { MinerControlsCard } from "@tetherto/mdk-react-devkit";

<MinerControlsCard
  buttonsStates={{ reboot: false, start: false }}
  isLoading={false}
/>
```
