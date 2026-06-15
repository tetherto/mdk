# SupplyLiquidBox

Status card for the dielectric supply tank in a Bitmain Hydro container. Shows supply-liquid temperature, pressure, and flow readings with colour/flash states driven by configurable thresholds.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `Device` | no | — | Live device object. Returns `null` when omitted. |
| `containerSettings` | `SupplyLiquidBoxContainerSettings \| null` | no | `null` | Optional threshold map that controls colour and flash states on readings. |

## Minimal example

```tsx
import { SupplyLiquidBox } from "@tetherto/mdk-react-devkit";

<SupplyLiquidBox data={device} />
```

## Notes

- Returns `null` when `data` is falsy.
