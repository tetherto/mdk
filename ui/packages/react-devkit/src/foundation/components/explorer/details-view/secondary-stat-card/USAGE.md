# SecondaryStatCard

Compact stat tile rendered alongside a primary stat to provide supporting context. Displays a `name` label and a `value` in a card format.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `string` | no | — | Stat label (e.g. `"Efficiency"`). |
| `value` | `string \| number` | no | — | Stat value to display. |
| `className` | `string` | no | — | Additional CSS class name. |

## Minimal example

```tsx
import { SecondaryStatCard } from "@tetherto/mdk-react-devkit";

<SecondaryStatCard name="Efficiency" value="92%" />
```
