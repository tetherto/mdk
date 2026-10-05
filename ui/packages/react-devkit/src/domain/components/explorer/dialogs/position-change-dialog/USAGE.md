# Position-change dialog components

Multi-step dialog flow for moving a miner between rack slots or performing maintenance. Composed of a top-level orchestrator and three swappable content panels.

| Component | Description |
|---|---|
| `PositionChangeDialog` | Top-level multi-step dialog orchestrating the slot-change flow |
| `ContainerSelectionDialog` | Step for picking a target container |
| `RemoveMinerDialog` | Confirmation step for removing a miner from its current slot |
| `MaintenanceDialogContent` | Form for capturing work-order details before applying the maintenance flag |

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `onClose` | Required | `(currentDialogFlow: string, isDontReset?: boolean \| undefined) => void` | - | Called when dialog closes |
| `open` | Required | `boolean` | - | Controls dialog visibility |
| `dialogFlow` | Optional | `string` | - | Initial dialog step/flow identifier |
| `isContainerEmpty` | Optional | `boolean` | `false` | Whether the target container slot is empty |
| `onChangePositionClicked` | Optional | `VoidFunction` | - | Callback when position change is triggered |
| `onPositionChangedSuccess` | Optional | `VoidFunction` | - | Callback on successful position change |
| `selectedEditSocket` | Optional | `UnknownRecord` | - | Socket being edited |
| `selectedSocketToReplace` | Optional | `UnknownRecord` | - | Socket being replaced |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { PositionChangeDialog } from "@tetherto/mdk-react-devkit";

<PositionChangeDialog
  open={isOpen}
  onClose={(flow) => setIsOpen(false)}
/>
```
