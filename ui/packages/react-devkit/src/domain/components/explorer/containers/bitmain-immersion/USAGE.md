# Bitmain immersion container components

Components for the Bitmain immersion-cooled container explorer view.

| Component | Description |
|---|---|
| `BitMainImmersionSettings` | Full settings form: tank thresholds, pump curves, and limits |
| `BitMainImmersionControlBox` | Generic layout box with left/right/bottom content areas |
| `BitMainImmersionPumpStationControlBox` | Pump station status card: alarm, ready, operation, start |
| `BitMainImmersionSystemStatus` | Aggregated system-health card rolling up all subsystems |
| `BitMainControlsTab` | Read-only status tab: fan status, tank levels, and GPS location |
| `BitMainImmersionUnitControlBox` | Individual unit box (pump, dry-cooler) with frequency and status |
| `BitMainImmersionCompactUnitControlBox` | Compact variant of the unit control box |

Each of the other six components has its own props, documented in its co-located USAGE.md.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `containerSettings` | Optional | `{ thresholds?: Record<string, unknown> \| undefined; } \| null` | `null` | Container settings with custom thresholds |
| `data` | Optional | `Device` | - | Device data |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { BitMainImmersionSettings } from "@tetherto/mdk-react-devkit";

<BitMainImmersionSettings data={device} />
```
