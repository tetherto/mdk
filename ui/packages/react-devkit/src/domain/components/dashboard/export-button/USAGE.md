# `ExportButton`

Split-button trigger for downloading dashboard data. Left half labels the
action; right half opens a `DropdownMenu` with the available formats.
The page decides what to serialize and handles the download.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `onExport` | Required | `(format: ExportFormat) => void \| Promise<void>` | - | Fires with the chosen format when the user picks an item. Return a promise to show a loading state until it settles; a rejection clears it and is not rethrown, so report failures inside the handler |
| `className` | Optional | `string` | - | Optional class hook on the wrapper |
| `disabled` | Optional | `boolean` | `false` | Disable the button |
| `formats` | Optional | `readonly ExportFormat[]` | `['csv', 'json']` | Formats to offer in the dropdown — defaults to `['csv', 'json']` |
| `label` | Optional | `string` | `"Export"` | Button label — defaults to `'Export'` |
<!-- END GENERATED: props -->

## Example

```tsx
import { ExportButton } from "@tetherto/mdk-react-devkit"
import { downloadCsv, downloadJson } from "@tetherto/mdk-ui-foundation"

<ExportButton
  onExport={(format) => (format === "csv" ? downloadCsv(rows, "miners.csv") : downloadJson(rows, "miners.json"))}
/>
```

## Notes

- The component is presentation-only. It does not decide *what* to
  serialize — the page-level handler builds the file from the data it is
  showing and triggers the download
- Pass `formats={['csv']}` if you want a single-format button
- Return a promise from `onExport` to show a spinner, with the button disabled, until
  the export settles. A rejection clears the spinner and is not rethrown, so show
  the failure (a toast, say) inside the handler
- Replaces `StatsExport`: `onCsvExport` / `onJsonExport` become one
  `onExport={(format) => (format === 'csv' ? exportCsv() : exportJson())}`
