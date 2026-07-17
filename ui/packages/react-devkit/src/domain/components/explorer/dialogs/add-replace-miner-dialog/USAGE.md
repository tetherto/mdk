# AddReplaceMinerDialog

Modal for adding a new miner to an empty slot or swapping the existing unit with a replacement. Orchestrates the add/replace/maintenance flow.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `open` | `boolean` | yes | — | Controls dialog visibility. |
| `onClose` | `VoidFunction` | yes | — | Called when the dialog should close. |
| `selectedSocketToReplace` | `UnknownRecord` | no | — | Socket being replaced. |
| `selectedEditSocket` | `UnknownRecord` | no | — | Socket being edited. |
| `currentDialogFlow` | `string` | no | — | Active flow identifier. |
| `isDirectToMaintenanceMode` | `boolean` | no | — | Skip add/replace and go directly to maintenance. |
| `minersType` | `string` | no | — | Miner hardware type filter. |
| `isContainerEmpty` | `boolean` | no | — | Whether the target slot is empty. |

## Minimal example

```tsx
import { AddReplaceMinerDialog } from "@tetherto/mdk-react-devkit";

<AddReplaceMinerDialog
  open={isOpen}
  onClose={() => setIsOpen(false)}
/>
```
