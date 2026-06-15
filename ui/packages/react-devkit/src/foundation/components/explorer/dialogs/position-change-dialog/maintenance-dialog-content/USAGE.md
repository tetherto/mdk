# MaintenanceDialogContent

Form body inside the maintenance dialog. Captures work-order details (reason, technician, notes) before applying the maintenance flag to a miner slot.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `selectedEditSocket` | `Partial<SelectedEditSocket>` | no | — | The socket/slot being flagged for maintenance. |
| `onCancel` | `VoidFunction` | no | — | Called when the user cancels. |

## Minimal example

```tsx
import { MaintenanceDialogContent } from "@tetherto/mdk-react-devkit";

<MaintenanceDialogContent
  selectedEditSocket={socket}
  onCancel={() => setOpen(false)}
/>
```
