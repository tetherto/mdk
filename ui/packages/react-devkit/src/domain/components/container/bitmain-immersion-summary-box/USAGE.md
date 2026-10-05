# BitMainImmersionSummaryBox

Summary card for a BitMain immersion-cooled container. Displays supply temperatures for both tank circuits, pump statuses, power consumption, and overall container health at a glance.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `containerSettings` | Optional | `BitMainImmersionSummaryBoxContainerSettings \| null` | `null` | Optional threshold configuration that drives colour/flash states on temperature stats |
| `data` | Optional | `Device` | - | Live device object from the devices store. Returns `null` when omitted |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { BitMainImmersionSummaryBox } from "@tetherto/mdk-react-devkit";

<BitMainImmersionSummaryBox data={device} />
```

## Notes

- Returns `null` when `data` is falsy, so it is safe to render unconditionally while the device is loading
