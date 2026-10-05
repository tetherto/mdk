# `MinersSummaryBox`

Headline card that summarises miner statistics (hash rate, efficiency, temperature) for one container in a 2-column grid. Accepts pre-formatted value strings so no numeric formatting is done inside the component.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `params` | Required | `MinersSummaryParam[]` | - | Array of label-value pairs to display in a 2-column grid |
| `className` | Optional | `string` | - | Additional CSS class name |
<!-- END GENERATED: props -->

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
