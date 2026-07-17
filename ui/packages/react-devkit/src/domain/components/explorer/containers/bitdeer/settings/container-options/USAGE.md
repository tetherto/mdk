# BitdeerOptions / BitdeerPumps

`BitdeerOptions` is the top-level cooling options panel for a Bitdeer container; it composes the `DryCooler` and `BitdeerPumps` sub-panels. `BitdeerPumps` renders the exhaust-fan status using a coloured indicator.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `UnknownRecord` | no | — | Container settings payload; both components derive state from `cooling_system` fields. |

## Minimal example

```tsx
import { BitdeerOptions, BitdeerPumps } from "@tetherto/mdk-react-devkit";

<BitdeerOptions data={containerData} />
<BitdeerPumps data={containerData} />
```
