# `SecondaryStatCard`

Compact stat tile rendered alongside a primary stat to provide supporting context. Displays a `name` label and a `value` in a card format.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Custom className |
| `name` | Optional | `string` | `""` | Stat name/label |
| `value` | Optional | `string \| number` | `""` | Stat value |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { SecondaryStatCard } from "@tetherto/mdk-react-devkit";

<SecondaryStatCard name="Efficiency" value="92%" />
```
