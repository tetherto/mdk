# ConfirmDeleteSparePartModal

Confirmation modal for deleting a spare part. Warns that the action is irreversible and surfaces the
part code so the user can verify before confirming.

## When to use

Use this as the confirm step for a destructive "Delete" row action in a spare-parts inventory view.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | — | Whether the modal is open |
| `onClose` | `() => void` | — | Called when the modal requests to close |
| `onConfirm` | `(sparePart) => Promise<void> \| void` | — | Called with the part when the user confirms |
| `sparePart` | `{ id: string; code: string }` | — | The part to delete; when omitted the modal renders nothing |
| `isLoading` | `boolean` | — | Disables the action buttons while the delete is in flight |

## Example

```tsx
import { ConfirmDeleteSparePartModal } from '@tetherto/mdk-react-devkit/domain'

<ConfirmDeleteSparePartModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  sparePart={{ id: 'sp-001', code: 'HB-A001' }}
  onConfirm={async (part) => { await api.deleteSparePart(part.id) }}
/>
```
