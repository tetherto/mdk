# `ConfirmDeleteSparePartModal`

Confirmation modal for deleting a spare part. Warns that the action is irreversible and surfaces the
part code so the user can verify before confirming.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `isLoading` | Optional | `boolean` | - | Disables the action buttons while the delete is in flight |
| `isOpen` | Optional | `boolean` | - | Whether the modal is open |
| `onClose` | Optional | `VoidFunction` | - | Called when the modal requests to close |
| `onConfirm` | Optional | `((sparePart: ConfirmDeleteSparePartModalSparePart) => void \| Promise<void>)` | - | Called with the part when the user confirms |
| `sparePart` | Optional | `ConfirmDeleteSparePartModalSparePart` | - | The part to delete; when omitted the modal renders nothing |
<!-- END GENERATED: props -->

## When to use

Use this as the confirm step for a destructive "Delete" row action in a spare-parts inventory view.

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
