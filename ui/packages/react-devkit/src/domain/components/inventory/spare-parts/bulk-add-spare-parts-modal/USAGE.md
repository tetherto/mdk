# BulkAddSparePartsModal

Modal for bulk-adding spare parts from a CSV file. Provides a CSV template download, file selection
with client-side parsing, and submits the parsed records. CSV parsing and validation helpers
(`parseCsvText`, `validateCSVRecords`, `mapRawRowToRecord`, `downloadCsvTemplate`, `CSVRecord`) are
exported alongside the component for use in the consuming submit handler.

## When to use

Use this when operators need to register many spare parts at once. Validate the parsed records in
your `onSubmit` with `validateCSVRecords` (location/status/model checks, duplicate detection) and
return an `{ error }` to surface a message in the modal.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | — | Whether the modal is open |
| `onClose` | `() => void` | — | Called when the modal requests to close |
| `onSubmit` | `(records: CSVRecord[]) => Promise<{ error?: string } \| void>` | — | Submit handler; return `{ error }` to show an inline error |
| `isLoading` | `boolean` | — | Renders a loader instead of the form |

## Example

```tsx
import {
  BulkAddSparePartsModal,
  validateCSVRecords,
} from '@tetherto/mdk-react-devkit/domain'

<BulkAddSparePartsModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSubmit={async (records) => {
    try {
      const validated = await validateCSVRecords(records, {
        checkDuplicateDelegate: api.checkDuplicates,
        rackIds,
        validLocations,
        subPartTypes,
        minerModels,
      })
      await api.bulkAdd(validated)
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Upload failed' }
    }
  }}
/>
```

## CSV format

Template headers (downloadable from the modal): `part, model, miner model, serial num, mac, status,
location, comment`. Max `MAX_CSV_ITEMS` (50) rows per upload. `validateCSVRecords` enforces valid
part types, miner models, statuses, locations, per-part-type model subtypes, and duplicate
serial/MAC detection (the latter only for controllers).
