# ExportButton

Split-button trigger for downloading dashboard data. Left half labels the
action; right half opens a `DropdownMenu` with the available formats.
Pairs with `useDashboardExport` from `@tetherto/mdk-react-adapter`, which
serializes whatever is currently in the TanStack Query cache.

## Props

| Prop        | Type                                  | Required | Default            | Description                                                  |
| ----------- | ------------------------------------- | -------- | ------------------ | ------------------------------------------------------------ |
| `onExport`  | `(format: 'csv' \| 'json') => void`   | yes      | —                  | Invoked with the user's selection.                           |
| `formats`   | `readonly ('csv' \| 'json')[]`        | no       | `['csv', 'json']`  | Restrict the menu to a subset of formats.                    |
| `label`     | `string`                              | no       | `'Export'`         | Trigger label.                                               |
| `disabled`  | `boolean`                             | no       | `false`            | Disable the button.                                          |
| `className` | `string`                              | no       | —                  | Optional class hook on the trigger button.                   |

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
  `useDashboardExport`) and triggers the download.
- Pass `formats={['csv']}` if you want a single-format button.
