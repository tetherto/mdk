# AlertConfirmationModal

Confirmation dialog that appears before acknowledging or clearing one or more alerts. Prevents accidental bulk-clear actions.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | yes | — | Controls dialog visibility. |
| `onOk` | `VoidFunction` | yes | — | Called when the user confirms the action. |

## Minimal example

```tsx
import { AlertConfirmationModal } from "@tetherto/mdk-react-devkit";

<AlertConfirmationModal
  isOpen={isOpen}
  onOk={() => { clearAlerts(); setIsOpen(false); }}
/>
```
