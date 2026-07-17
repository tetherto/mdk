# MinersSummaryBox

Headline card that summarises miner statistics (hash rate, efficiency, temperature) for one container in a 2-column grid. Accepts pre-formatted value strings so no numeric formatting is done inside the component.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `params` | `MinersSummaryParam[]` | yes | — | Array of `{ label, value }` pairs. `value` is a pre-formatted display string including units. |
| `className` | `string` | no | — | Additional CSS class on the root element. |

## Minimal example

```tsx
import { MinersSummaryBox } from "@tetherto/mdk-react-devkit";

<MinersSummaryBox
  params={[
    { label: "Hash Rate", value: "1.24 PH/s" },
    { label: "Efficiency", value: "32.5 W/TH/s" },
    { label: "Max Temp", value: "72 °C" },
    { label: "Online", value: "47 / 50" },
  ]}
/>
```
