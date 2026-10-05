# `ExportButton`

Split-button trigger for downloading dashboard data. Left half labels the
action; right half opens a `DropdownMenu` with the available formats.
Pairs with `useDashboardExport` from `@tetherto/mdk-react-adapter`, which
serializes whatever is currently in the TanStack Query cache.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `onExport` | Required | `(format: ExportFormat) => void` | - | Fires with the chosen format when the user picks an item |
| `className` | Optional | `string` | - | Optional class hook on the wrapper |
| `disabled` | Optional | `boolean` | `false` | Disable the button |
| `formats` | Optional | `readonly ExportFormat[]` | `['csv', 'json']` | Formats to offer in the dropdown — defaults to `['csv', 'json']` |
| `label` | Optional | `string` | `"Export"` | Button label — defaults to `'Export'` |
<!-- END GENERATED: props -->

## Example

```tsx
import { useDashboardExport } from "@tetherto/mdk-react-adapter"
import { ExportButton } from "@tetherto/mdk-react-devkit"

const { exportCsv, exportJson } = useDashboardExport()

<ExportButton
  onExport={(format) => (format === "csv" ? exportCsv() : exportJson())}
/>
```

## Notes

- The component is presentation-only. It does not decide *what* to
  serialize — the page-level handler reads from the cache (via
  `useDashboardExport`) and triggers the download
- Pass `formats={['csv']}` if you want a single-format button
