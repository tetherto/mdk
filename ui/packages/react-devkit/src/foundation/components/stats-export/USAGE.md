# StatsExport

Dropdown button that triggers asynchronous CSV or JSON export. Shows a spinner
while the corresponding handler is awaited.

## Props

| Prop           | Type                  | Required | Default | Description                                |
| -------------- | --------------------- | -------- | ------- | ------------------------------------------ |
| `showLabel`    | `boolean`             | no       | `false` | Show the textual "Export" label.           |
| `disabled`     | `boolean`             | no       | `false` | Disable the trigger.                       |
| `onCsvExport`  | `() => Promise<void>` | yes      | —       | Awaited; spinner shown while pending.      |
| `onJsonExport` | `() => Promise<void>` | yes      | —       | Awaited; spinner shown while pending.      |

## Example

```tsx
<StatsExport onCsvExport={exportCsv} onJsonExport={exportJson} />
```
