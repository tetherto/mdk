# ChangeConfirmationModal

Generic confirmation dialog that presents a summary of pending changes before applying them. Supports both standard (primary) and destructive (danger) confirmation actions. The body content is passed as `children`, making it flexible enough to render diffs, item lists, or plain text.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `open` | `boolean` | yes | — | Controls whether the dialog is visible. |
| `title` | `string` | yes | — | Dialog header title. |
| `onConfirm` | `VoidFunction` | yes | — | Called when the user clicks the confirm button. |
| `onClose` | `VoidFunction` | yes | — | Called when the user cancels or dismisses the dialog. |
| `children` | `ReactNode` | yes | — | Body content — use to describe the change being confirmed. |
| `confirmText` | `string` | no | `"Confirm"` | Label for the confirm button. |
| `destructive` | `boolean` | no | `false` | When `true`, the confirm button uses the danger variant. |

## Minimal example

```tsx
<ChangeConfirmationModal
  open={isOpen}
  title="Delete Site Configuration?"
  onConfirm={handleDelete}
  onClose={() => setIsOpen(false)}
  confirmText="Delete"
  destructive
>
  This will permanently remove the site and all associated pool assignments.
</ChangeConfirmationModal>
```

## Notes

- Closing via the backdrop is disabled to prevent accidental dismissal.
- Use `destructive={true}` any time the action is irreversible (delete, reset, revoke).
- For non-destructive confirmations such as applying setting changes, omit `destructive` or set it to `false`.
