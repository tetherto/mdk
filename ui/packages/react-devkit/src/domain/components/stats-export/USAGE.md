# `StatsExport`

Dropdown button that triggers asynchronous CSV or JSON export. Shows a spinner
while the corresponding handler is awaited.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `onCsvExport` | Required | `() => Promise<void>` | - | Awaited; spinner shown while pending |
| `onJsonExport` | Required | `() => Promise<void>` | - | Awaited; spinner shown while pending |
| `disabled` | Optional | `boolean` | `false` | Disable the trigger |
| `hideLabel` | Optional | `boolean` | `false` | Hides the textual "Export" label |
<!-- END GENERATED: props -->

## Example

```tsx
<StatsExport onCsvExport={exportCsv} onJsonExport={exportJson} />
```
