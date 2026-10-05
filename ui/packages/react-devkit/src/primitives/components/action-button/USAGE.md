# `ActionButton`

A button that requires confirmation before executing an action. The confirmation UI can be an inline popover or a modal dialog.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `confirmation` | Required | `ActionButtonConfirmation` | - | Configuration for the confirmation UI |
| `className` | Optional | `string` | - | Additional class for the trigger button |
| `disabled` | Optional | `boolean` | - | Disables the trigger button |
| `label` | Optional | `string` | - | Button label text |
| `loading` | Optional | `boolean` | - | Shows a spinner on the trigger button |
| `mode` | Optional | `"dialog" \| "popover"` | `"popover"` | Confirmation mode: popover (inline) or dialog (modal) |
| `variant` | Optional | `"primary" \| "danger" \| "secondary"` | `"secondary"` | Visual style of the trigger button |
<!-- END GENERATED: props -->

## Props detail

> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

### `ActionButtonConfirmation`

| Prop           | Status   | Type              | Default                     | Description                                          |
| -------------- | -------- | ----------------- | --------------------------- | ---------------------------------------------------- |
| `title`        | Required | `string`          | —                           | Heading shown in the confirmation UI                 |
| `description`  | Optional | `React.ReactNode` | —                           | Body text or node shown below the title              |
| `icon`         | Optional | `React.ReactNode` | `<QuestionMarkCircledIcon>` | Icon shown in the popover header (popover mode only) |
| `confirmLabel` | Optional | `string`          | `'OK'` / `'Confirm'`        | Label for the confirm button                         |
| `cancelLabel`  | Optional | `string`          | `'Cancel'`                  | Label for the cancel button                          |
| `onConfirm`    | Optional | `VoidFunction`    | —                           | Fired when the user confirms                         |
| `onCancel`     | Optional | `VoidFunction`    | —                           | Fired when the user cancels                          |

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

- In `popover` mode the confirm button defaults to `variant="primary"`; in `dialog` mode it uses the same `variant` as the trigger
- The component manages its own open/close state — no external state required
