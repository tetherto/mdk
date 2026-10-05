# `BatchMoveSparePartsModal`

Modal for moving multiple spare parts at once. Shows the selected parts in a table (code, current
location, current status) and lets the user choose a new location and/or status plus an
observation, applied to every selected part in one submit.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `isOpen` | Required | `boolean` | - | Whether the modal is open |
| `locationOptions` | Required | `FormSelectOption[]` | - | New-location options |
| `onClose` | Required | `VoidFunction` | - | Called when the modal requests to close |
| `onSubmit` | Required | `(values: { location: string \| null; status: string \| null; observation: string \| null; }) => void \| Promise<void>` | - | Submit handler; unselected fields are `null` |
| `spareParts` | Required | `BatchMoveSparePart[]` | - | The parts to move, rendered in the table |
| `statusOptions` | Required | `FormSelectOption[]` | - | New-status options |
<!-- END GENERATED: props -->

## When to use

Use this when an operator multi-selects spare-part rows and wants to relocate or re-status them
together. At least one of location or status must be chosen. For a single part with a confirm
step, use `MoveSparePartModal`.

## Data shape

```ts
const spareParts: BatchMoveSparePart[] = [
  { id: 'sp-001', code: 'HB-A001', location: 'site.warehouse', status: 'ok_brand_new' },
  { id: 'sp-002', code: 'HB-A002', location: 'workshop.lab',   status: 'faulty' },
]
```

## Example

```tsx
import { BatchMoveSparePartsModal } from '@tetherto/mdk-react-devkit/domain'

<BatchMoveSparePartsModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  spareParts={selectedParts}
  locationOptions={locationOptions}
  statusOptions={statusOptions}
  onSubmit={async ({ location, status, observation }) => {
    await api.batchMove(selectedParts.map((p) => p.id), { location, status, observation })
  }}
/>
```

## Notes

- The form validates that **either** a location or a status is selected before submit
- Table location/status cells are resolved to display labels from the passed option lists
