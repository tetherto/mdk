# BitMainImmersionPumpStationControlBox

Pump-station status card showing alarm, ready, operation, and start states for a Bitmain immersion container's pump station.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `alarmStatus` | Optional | `boolean` | `false` | Alarm/fault status |
| `className` | Optional | `string` | - | Custom className |
| `operation` | Optional | `boolean` | - | Operation status |
| `ready` | Optional | `boolean` | - | Ready status |
| `start` | Optional | `boolean` | - | Start status |
| `title` | Optional | `string` | - | Box title |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { BitMainImmersionPumpStationControlBox } from "@tetherto/mdk-react-devkit";

<BitMainImmersionPumpStationControlBox
  title="Pump Station A"
  ready={true}
  operation={true}
  start={true}
  alarmStatus={false}
/>
```
