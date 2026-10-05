# ImportExportSettings

Settings panel for exporting the site configuration as a JSON snapshot and importing a previously saved one. Handles file parsing internally.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `onExport` | Required | `VoidFunction` | - | Trigger configuration export |
| `onImport` | Required | `(data: SettingsExportData) => void` | - | Apply imported configuration |
| `className` | Optional | `string` | - | Additional CSS class |
| `isExporting` | Optional | `boolean` | `false` | Show export loading state |
| `isImporting` | Optional | `boolean` | `false` | Show import loading state |
| `onParseFile` | Optional | `((file: File) => Promise<SettingsExportData>)` | - | Custom file-parsing function |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { ImportExportSettings } from "@tetherto/mdk-react-devkit";

<ImportExportSettings
  onExport={() => downloadConfig()}
  onImport={(data) => applyConfig(data)}
/>
```
