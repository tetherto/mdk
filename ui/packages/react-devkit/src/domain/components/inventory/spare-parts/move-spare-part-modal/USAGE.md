# `MoveSparePartModal`

Two-step modal for moving a single spare part. Step one shows the part details (`SparePartDetails`)
alongside its current location and status, and lets the user pick a new location, status, and an
observation. Step two previews the before → after transition with color-coded badges for
confirmation before submitting.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `locationOptions` | Required | `FormSelectOption[]` | - | Location options |
| `onSubmit` | Required | `(values: { location: string; status: string; observation: string; }, sparePart: MoveSparePartModalSparePart) => void \| Promise<void>` | - | Submit handler with the new `{ location, status, observation }` and the original part |
| `statusOptions` | Required | `FormSelectOption[]` | - | Status options |
| `isOpen` | Optional | `boolean` | - | Whether the modal is open |
| `onClose` | Optional | `VoidFunction` | - | Called when the modal requests to close |
| `requestedValues` | Optional | `{ location?: string \| undefined; status?: string \| undefined; }` | - | Pre-seeds the target location/status |
| `sparePart` | Optional | `MoveSparePartModalSparePart` | - | The part to move; when omitted the modal renders nothing |
<!-- END GENERATED: props -->

## When to use

Use this from a spare-parts inventory row action when an operator moves one part and you want an
explicit confirm step showing exactly what changes. For moving many parts at once, use
`BatchMoveSparePartsModal` instead.

## Data shape

```ts
const sparePart: MoveSparePartModalSparePart = {
  id: 'sp-001',
  code: 'CB-AM-CB5_V10-01',  // shown via SparePartDetails
  type: 'CB5_V10',
  site: 'Site A',
  serialNum: 'test-miner',
  macAddress: 'aa:bb:cc:dd:ee:ff',
  location: 'site.warehouse',  // dot-separated location key
  status: 'ok_repaired',       // spare part status key
}
```

## Example

```tsx
import { MoveSparePartModal } from '@tetherto/mdk-react-devkit/domain'

<MoveSparePartModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  sparePart={selectedPart}
  locationOptions={locationOptions}
  statusOptions={statusOptions}
  onSubmit={async (values, part) => { await api.moveSparePart(part.id, values) }}
/>
```

## Label & color resolution

- Location/status labels are resolved from the passed option lists (`getOptionLabel`)
- The current/new badges are colored from `SPARE_PART_LOCATION_BG_COLORS` /
  `SPARE_PART_STATUS_BG_COLORS`; an unknown location key renders with no background
- The footer shows "No Changes made" until the target location or status differs from the current
  values, at which point "Save Changes" advances to the confirmation step
