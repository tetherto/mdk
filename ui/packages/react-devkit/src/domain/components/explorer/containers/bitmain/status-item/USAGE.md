# StatusItem

Compact labelled status pill used inside BitMain container panels for boolean or enum readings. Renders a label alongside a coloured indicator driven by the `status` value.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | no | — | Display label for the reading (e.g. `"Circulation Pump"`). |
| `status` | `StatusType` | no | — | Status value that controls indicator colour (e.g. `"running"`, `"error"`, `"offline"`). |

## Minimal example

```tsx
import { StatusItem } from "@tetherto/mdk-react-devkit";

<StatusItem label="Circulation Pump" status="running" />
```
