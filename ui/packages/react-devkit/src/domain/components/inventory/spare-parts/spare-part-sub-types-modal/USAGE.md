# SparePartSubTypesModal

Modal for viewing and adding spare part subtypes (part models) per part type. Presents a part-type
tab strip, a table of existing subtypes for the active type, and an inline add form.

## When to use

Use this to manage the list of allowed part models for each part type. It can be opened standalone
or embedded from `AddSparePartModal`'s "View Subtypes" button so users can add a missing model
without losing their in-progress form.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | — | Whether the modal is open |
| `onClose` | `() => void` | — | Called when the modal requests to close |
| `partTypes` | `{ value: string; label: string }[]` | — | Part-type tabs |
| `activePartTypeId` | `string` | — | The selected part type (controlled by the parent) |
| `onPartTypeChange` | `(id: string) => void` | — | Called when the active tab changes (fetch that type's subtypes here) |
| `subTypes` | `string[]` | — | Subtype names for the active part type |
| `onAddSubType` | `(name: string) => Promise<{ error?: string } \| void>` | — | Add handler; return `{ error }` to surface a field error |
| `isLoading` | `boolean` | — | Renders a loader instead of the body |

## Example

```tsx
import { SparePartSubTypesModal } from '@tetherto/mdk-react-devkit/domain'

<SparePartSubTypesModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  partTypes={partTypes}
  activePartTypeId={activeId}
  onPartTypeChange={setActiveId}
  subTypes={subTypesByType[activeId] ?? []}
  onAddSubType={async (name) => {
    if (exists(name)) return { error: 'Subtype already exists' }
    await api.addSubType(activeId, name)
  }}
/>
```

## Notes

- The active part type is controlled by the parent: change `activePartTypeId` and supply the
  matching `subTypes` in `onPartTypeChange`.
- The add form validates a non-empty name and clears on successful add.
