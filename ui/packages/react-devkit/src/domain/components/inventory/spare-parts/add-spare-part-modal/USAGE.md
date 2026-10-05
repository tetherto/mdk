# `AddSparePartModal`

Modal for registering a new spare part. Presents a part-type tab strip (Controller, PSU,
Hashboard, …) and a form for miner model, part model, serial number, MAC address, status,
location, tags, and a comment. Validation is controller-aware — the MAC address field appears and
is required only when a controller part type is selected; other part types require a serial number.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `isOpen` | Required | `boolean` | - | Whether the modal is open |
| `locationOptions` | Required | `FormSelectOption[]` | - | Location options |
| `minerModelOptions` | Required | `FormSelectOption[]` | - | Parent miner model options |
| `modelOptions` | Required | `FormSelectOption[]` | - | Part model options for the active part type |
| `onClose` | Required | `VoidFunction` | - | Called when the modal requests to close |
| `onPartTypeChange` | Required | `(partTypeId: string) => void` | - | Called when the active part type changes (refetch model options here) |
| `onSubmit` | Required | `(values: AddSparePartFormValues) => Promise<void \| { fieldErrors?: { field: string; message: string; }[] \| undefined; }>` | - | Submit handler; return `fieldErrors` to surface server-side validation |
| `partTypes` | Required | `SparePartSubTypesModalPartType[]` | - | Part-type tabs |
| `statusOptions` | Required | `FormSelectOption[]` | - | Status options |
| `defaultPartTypeId` | Optional | `string` | - | Initially selected part type |
| `isControllerPartTypeSelected` | Optional | `boolean` | - | When true, the MAC address field is shown and required |
| `isLoading` | Optional | `boolean` | - | Renders a loader instead of the form |
| `isModelOptionsLoading` | Optional | `boolean` | - | Disables the model select while options load |
| `isSubTypesLoading` | Optional | `boolean` | - | Loading state for the embedded subtypes modal |
| `onAddSubType` | Optional | `((name: string) => Promise<void \| { error?: string \| undefined; }>)` | - | Add handler for the embedded subtypes modal; return `{ error }` to surface a field error |
| `onSubTypesPartTypeChange` | Optional | `((id: string) => void)` | - | Called when the active tab changes in the embedded subtypes modal |
| `subTypes` | Optional | `string[]` | - | Subtype names for the active part type in the embedded modal |
| `subTypesActivePartTypeId` | Optional | `string` | - | Active part type for the embedded subtypes modal |
| `subTypesPartTypes` | Optional | `SparePartSubTypesModalPartType[]` | - | Part types for the embedded "View Subtypes" modal |
<!-- END GENERATED: props -->

## When to use

Use this in an inventory "Spare Parts" view when an operator needs to register a single new part.
Pair it with `SparePartSubTypesModal` (via the `subTypes*` props) so the user can manage the
allowed part models without leaving the dialog.

## Example

```tsx
import { AddSparePartModal } from '@tetherto/mdk-react-devkit/domain'

<AddSparePartModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  partTypes={partTypes}
  defaultPartTypeId={activePartType}
  modelOptions={modelOptions}
  minerModelOptions={minerModelOptions}
  statusOptions={statusOptions}
  locationOptions={locationOptions}
  isControllerPartTypeSelected={activePartType === 'controller'}
  onPartTypeChange={setActivePartType}
  onSubmit={async (values) => { await api.addSparePart(values) }}
/>
```

## Notes

- Select fields default to `""` (empty), which renders the placeholder. Switching part type clears
  the part model and any serial/MAC validation errors.
- MAC validation uses the format `00:1A:2B:3C:4D:5E` (case-insensitive, `:` or `-` separators)
