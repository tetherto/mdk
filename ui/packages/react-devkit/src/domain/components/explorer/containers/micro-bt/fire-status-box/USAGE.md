# `FireStatusBox`

Safety-status card for a MicroBT container showing smoke detector, water-ingress detector, and cooling-fan status readings.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Optional | `{ smokeDetector: string \| number; waterIngressDetector: string \| number; coolingFanStatus: string \| number; }` | - | Device data |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { FireStatusBox } from "@tetherto/mdk-react-devkit";

<FireStatusBox
  data={{ smokeDetector: 0, waterIngressDetector: 0, coolingFanStatus: 1 }}
/>
```
