# `AlertsTableTitle`

Title strip for an alerts table section with a heading and an optional count badge.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `title` | Required | `React.ReactNode` | - | Section heading |
| `className` | Optional | `string` | - | Additional CSS class |
| `subtitle` | Optional | `React.ReactNode` | - | Optional subtitle or count badge |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { AlertsTableTitle } from "@tetherto/mdk-react-devkit";

<AlertsTableTitle title="Active Alerts" subtitle="12 total" />
```
