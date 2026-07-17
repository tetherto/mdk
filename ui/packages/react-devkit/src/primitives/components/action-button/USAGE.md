# ActionButton

A button that requires confirmation before executing an action. The confirmation UI can be an inline popover or a modal dialog.

## Props

### `ActionButton`

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `confirmation` | `ActionButtonConfirmation` | yes | — | Configuration for the confirmation UI |
| `label` | `string` | no | — | Button label text |
| `variant` | `'primary' \| 'danger' \| 'secondary'` | no | `'secondary'` | Visual style of the trigger button |
| `mode` | `'popover' \| 'dialog'` | no | `'popover'` | Whether confirmation appears as an inline popover or a modal dialog |
| `loading` | `boolean` | no | — | Shows a spinner on the trigger button |
| `disabled` | `boolean` | no | — | Disables the trigger button |
| `className` | `string` | no | — | Additional class for the trigger button |

### `ActionButtonConfirmation`

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `title` | `string` | yes | — | Heading shown in the confirmation UI |
| `description` | `React.ReactNode` | no | — | Body text or node shown below the title |
| `icon` | `React.ReactNode` | no | `<QuestionMarkCircledIcon>` | Icon shown in the popover header (popover mode only) |
| `confirmLabel` | `string` | no | `'OK'` / `'Confirm'` | Label for the confirm button |
| `cancelLabel` | `string` | no | `'Cancel'` | Label for the cancel button |
| `onConfirm` | `VoidFunction` | no | — | Fired when the user confirms |
| `onCancel` | `VoidFunction` | no | — | Fired when the user cancels |

## Example

```tsx
import { ActionButton } from "@tetherto/mdk-react-devkit"

<ActionButton
  label="Reboot Device"
  variant="secondary"
  confirmation={{
    title: "Reboot Device",
    description: "This will restart all communication workers.",
    onConfirm: () => rebootDevice(),
    onCancel: () => console.log("Cancelled"),
  }}
/>

// Modal dialog variant with danger style
<ActionButton
  label="Factory Reset"
  variant="danger"
  mode="dialog"
  confirmation={{
    title: "Confirm Factory Reset",
    description: "This action cannot be undone.",
    confirmLabel: "Reset",
    onConfirm: () => factoryReset(),
  }}
/>
```

## Notes

- In `popover` mode the confirm button defaults to `variant="primary"`; in `dialog` mode it uses the same `variant` as the trigger.
- The component manages its own open/close state — no external state required.
