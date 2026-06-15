# BitMainImmersionControlBox

Generic layout box used inside BitMain immersion container panels. Provides a two-column main area (left + right) and an optional bottom row.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | no | — | Box heading. |
| `leftContent` | `ReactNode` | no | — | Content for the left column. |
| `rightContent` | `ReactNode` | no | — | Content for the right column. |
| `bottomContent` | `ReactNode` | no | — | Content for the bottom row. |
| `secondary` | `boolean` | no | — | Render without border (secondary style). |
| `className` | `string` | no | — | Additional CSS class. |

## Minimal example

```tsx
import { BitMainImmersionControlBox } from "@tetherto/mdk-react-devkit";

<BitMainImmersionControlBox
  title="Pump Station"
  leftContent={<span>Pump 1</span>}
  rightContent={<span>Pump 2</span>}
/>
```
