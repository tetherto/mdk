# MicroBTWidgetBox

Summary card for a MicroBT-equipped container showing the circulation pump status and cooling fan state as coloured indicators.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Optional | `Device` | - | Live device object. Returns `null` when omitted |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { MicroBTWidgetBox } from "@tetherto/mdk-react-devkit";

<MicroBTWidgetBox data={device} />
```

## Notes

- Returns `null` when `data` is falsy, safe to render while loading
- Reads `container_specific.cdu` from the device for pump/fan state
