# ImportExportSettings

Settings panel for exporting the site configuration as a JSON snapshot and importing a previously saved one. Handles file parsing internally.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onExport` | `VoidFunction` | yes | — | Trigger configuration export. |
| `onImport` | `(data: SettingsExportData) => void` | yes | — | Apply imported configuration. |
| `onParseFile` | `(file: File) => Promise<SettingsExportData>` | no | — | Custom file-parsing function. |
| `isExporting` | `boolean` | no | — | Show export loading state. |
| `isImporting` | `boolean` | no | — | Show import loading state. |
| `className` | `string` | no | — | Additional CSS class. |

## Minimal example

```tsx
import { ImportExportSettings } from "@tetherto/mdk-react-devkit";

<ImportExportSettings
  onExport={() => downloadConfig()}
  onImport={(data) => applyConfig(data)}
/>
```
