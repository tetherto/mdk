# `SparePartSubTypesModal`

Modal for viewing and adding spare part subtypes (part models) per part type. Presents a part-type
tab strip, a table of existing subtypes for the active type, and an inline add form.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `activePartTypeId` | Required | `string` | - | The selected part type (controlled by the parent) |
| `isOpen` | Required | `boolean` | - | Whether the modal is open |
| `onAddSubType` | Required | `(name: string) => Promise<void \| { error?: string \| undefined; }>` | - | Add handler; return `{ error }` to surface a field error |
| `onClose` | Required | `VoidFunction` | - | Called when the modal requests to close |
| `onPartTypeChange` | Required | `(id: string) => void` | - | Called when the active tab changes (fetch that type's subtypes here) |
| `partTypes` | Required | `SparePartSubTypesModalPartType[]` | - | Part-type tabs |
| `subTypes` | Required | `string[]` | - | Subtype names for the active part type |
| `isLoading` | Optional | `boolean` | - | Renders a loader instead of the body |
<!-- END GENERATED: props -->

## When to use

Use this to manage the list of allowed part models for each part type. It can be opened standalone
or embedded from `AddSparePartModal`'s "View Subtypes" button so users can add a missing model
without losing their in-progress form.

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
  matching `subTypes` in `onPartTypeChange`
- The add form validates a non-empty name and clears on successful add
