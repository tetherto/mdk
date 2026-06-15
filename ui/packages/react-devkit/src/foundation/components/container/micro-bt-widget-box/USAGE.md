# MicroBTWidgetBox

Summary card for a MicroBT-equipped container showing the circulation pump status and cooling fan state as coloured indicators.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `Device` | no | — | Live device object. Returns `null` when omitted. |

## Minimal example

```tsx
import { MicroBTWidgetBox } from "@tetherto/mdk-react-devkit";

<MicroBTWidgetBox data={device} />
```

## Notes

- Returns `null` when `data` is falsy, safe to render while loading.
- Reads `container_specific.cdu` from the device for pump/fan state.
