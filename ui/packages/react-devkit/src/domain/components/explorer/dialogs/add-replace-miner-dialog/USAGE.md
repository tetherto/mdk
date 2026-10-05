# `AddReplaceMinerDialog`

Modal for adding a new miner to an empty slot or swapping the existing unit with a replacement. Orchestrates the add/replace/maintenance flow.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `onClose` | Required | `VoidFunction` | - | Called when the dialog should close |
| `open` | Required | `boolean` | - | Controls dialog visibility |
| `currentDialogFlow` | Optional | `string` | - | Active flow identifier |
| `isDirectToMaintenanceMode` | Optional | `boolean` | `false` | Skip add/replace and go directly to maintenance |
| `minersType` | Optional | `string` | - | Miner hardware type filter |
| `selectedEditSocket` | Optional | `UnknownRecord` | - | Socket being edited |
| `selectedSocketToReplace` | Optional | `UnknownRecord` | - | Socket being replaced |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { AddReplaceMinerDialog } from "@tetherto/mdk-react-devkit";

<AddReplaceMinerDialog
  open={isOpen}
  onClose={() => setIsOpen(false)}
/>
```
