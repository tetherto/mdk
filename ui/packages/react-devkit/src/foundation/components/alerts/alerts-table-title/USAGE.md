# AlertsTableTitle

Title strip for an alerts table section with a heading and an optional count badge.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `ReactNode` | yes | — | Section heading. |
| `subtitle` | `ReactNode` | no | — | Optional subtitle or count badge. |
| `className` | `string` | no | — | Additional CSS class. |

## Minimal example

```tsx
import { AlertsTableTitle } from "@tetherto/mdk-react-devkit";

<AlertsTableTitle title="Active Alerts" subtitle="12 total" />
```
