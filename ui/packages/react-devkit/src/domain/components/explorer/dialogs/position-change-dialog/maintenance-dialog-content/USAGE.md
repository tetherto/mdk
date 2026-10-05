# `MaintenanceDialogContent`

Form body inside the maintenance dialog. Captures work-order details (reason, technician, notes) before applying the maintenance flag to a miner slot.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `onCancel` | Optional | `VoidFunction` | - | Called when the user cancels |
| `selectedEditSocket` | Optional | `Partial<SelectedEditSocket>` | - | The socket/slot being flagged for maintenance |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { MaintenanceDialogContent } from "@tetherto/mdk-react-devkit";

<MaintenanceDialogContent
  selectedEditSocket={socket}
  onCancel={() => setOpen(false)}
/>
```
