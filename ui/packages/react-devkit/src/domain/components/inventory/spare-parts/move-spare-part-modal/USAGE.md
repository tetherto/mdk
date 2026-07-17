# MoveSparePartModal

Two-step modal for moving a single spare part. Step one shows the part details (`SparePartDetails`)
alongside its current location and status, and lets the user pick a new location, status, and an
observation. Step two previews the before → after transition with color-coded badges for
confirmation before submitting.

## When to use

Use this from a spare-parts inventory row action when an operator moves one part and you want an
explicit confirm step showing exactly what will change. For moving many parts at once, use
`BatchMoveSparePartsModal` instead.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | — | Whether the modal is open |
| `onClose` | `() => void` | — | Called when the modal requests to close |
| `sparePart` | `MoveSparePartModalSparePart` | — | The part to move; when omitted the modal renders nothing |
| `requestedValues` | `{ location?: string; status?: string }` | — | Pre-seeds the target location/status |
| `locationOptions` | `FormSelectOption[]` | — | Location options |
| `statusOptions` | `FormSelectOption[]` | — | Status options |
| `onSubmit` | `(values, sparePart) => Promise<void> \| void` | — | Submit handler with the new `{ location, status, observation }` and the original part |

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

- Location/status labels are resolved from the passed option lists (`getOptionLabel`).
- The current/new badges are colored from `SPARE_PART_LOCATION_BG_COLORS` /
  `SPARE_PART_STATUS_BG_COLORS`; an unknown location key renders with no background.
- The footer shows "No Changes made" until the target location or status differs from the current
  values, at which point "Save Changes" advances to the confirmation step.
