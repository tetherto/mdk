# ContainerSelectionDialog

Modal step that lists containers for the operator to choose from as part of a position-change or batch-action flow.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `miner` | `Device` | no | — | The miner being moved. |
| `containers` | `Device[]` | no | — | Available target containers. |
| `isLoading` | `boolean` | no | — | Show loading spinner. |
| `open` | `boolean` | yes | — | Controls visibility. |
| `onClose` | `(value?: boolean) => void` | yes | — | Called when dialog closes. |

## Minimal example

```tsx
import { ContainerSelectionDialog } from "@tetherto/mdk-react-devkit";

<ContainerSelectionDialog
  open={isOpen}
  onClose={() => setIsOpen(false)}
  containers={availableContainers}
/>
```
