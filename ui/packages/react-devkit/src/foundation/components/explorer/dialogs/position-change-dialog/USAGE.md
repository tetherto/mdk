# Position-Change Dialog Components

Multi-step dialog flow for moving a miner between rack slots or performing maintenance. Composed of a top-level orchestrator and three swappable content panels.

| Component | Description |
|---|---|
| `PositionChangeDialog` | Top-level multi-step dialog orchestrating the slot-change flow. |
| `ContainerSelectionDialog` | Step for picking a target container. |
| `RemoveMinerDialog` | Confirmation step for removing a miner from its current slot. |
| `MaintenanceDialogContent` | Form for capturing work-order details before applying the maintenance flag. |

## PositionChangeDialog Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `open` | `boolean` | yes | — | Controls dialog visibility. |
| `onClose` | `(flow, isDontReset?) => void` | yes | — | Called when dialog closes. |
| `selectedSocketToReplace` | `UnknownRecord` | no | — | Socket being replaced. |
| `selectedEditSocket` | `UnknownRecord` | no | — | Socket being edited. |
| `onChangePositionClicked` | `VoidFunction` | no | — | Callback when position change is triggered. |
| `onPositionChangedSuccess` | `VoidFunction` | no | — | Callback on successful position change. |
| `isContainerEmpty` | `boolean` | no | — | Whether the target container slot is empty. |
| `dialogFlow` | `string` | no | — | Initial dialog step/flow identifier. |

## Minimal example

```tsx
import { PositionChangeDialog } from "@tetherto/mdk-react-devkit";

<PositionChangeDialog
  open={isOpen}
  onClose={(flow) => setIsOpen(false)}
/>
```
