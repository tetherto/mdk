# SupplyLiquidBox

Status card for the dielectric supply tank in a Bitmain Hydro container. Shows supply-liquid temperature, pressure, and flow readings with color/flash states driven by configurable thresholds.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `containerSettings` | Optional | `SupplyLiquidBoxContainerSettings \| null` | `null` | Optional threshold map that controls colour and flash states on readings |
| `data` | Optional | `Device` | - | Live device object. Returns `null` when omitted |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { SupplyLiquidBox } from "@tetherto/mdk-react-devkit";

<SupplyLiquidBox data={device} />
```

## Notes

- Returns `null` when `data` is falsy
