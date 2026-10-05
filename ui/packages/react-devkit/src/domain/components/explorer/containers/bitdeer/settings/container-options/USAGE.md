# BitdeerOptions / BitdeerPumps

`BitdeerOptions` is the top-level cooling options panel for a Bitdeer container; it composes the `DryCooler` and `BitdeerPumps` sub-panels. `BitdeerPumps` renders the exhaust-fan status using a coloured indicator.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `BitdeerOptions` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Optional | `UnknownRecord` | - | Container settings payload; both components derive state from `cooling_system` fields |

### `BitdeerPumps` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Optional | `UnknownRecord` | - | - |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { BitdeerOptions, BitdeerPumps } from "@tetherto/mdk-react-devkit";

<BitdeerOptions data={containerData} />
<BitdeerPumps data={containerData} />
```
