# BitMainImmersionControlBox

Generic layout box used inside Bitmain immersion container panels. Provides a two-column main area (left + right) and an optional bottom row.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `bottomContent` | Optional | `React.ReactNode` | - | Content for bottom row |
| `className` | Optional | `string` | - | Custom className |
| `leftContent` | Optional | `React.ReactNode` | - | Content for left column |
| `rightContent` | Optional | `React.ReactNode` | - | Content for right column |
| `secondary` | Optional | `boolean` | `false` | Secondary variant (no border) |
| `title` | Optional | `string` | - | Box title |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { BitMainImmersionControlBox } from "@tetherto/mdk-react-devkit";

<BitMainImmersionControlBox
  title="Pump Station"
  leftContent={<span>Pump 1</span>}
  rightContent={<span>Pump 2</span>}
/>
```
