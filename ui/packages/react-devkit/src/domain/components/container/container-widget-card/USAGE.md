# `ContainerWidgetCard`

Presentational summary card for a single container in the Site Overview widgets
grid. Renders a header row (title / alarm badges / power), then either an
offline / error banner or the body: an optional vendor-specific content slot, a
miners summary, and a miner-activity chart.

Fully props-driven — no data fetching, formatting, or alarm math. The owning
feature/hook shapes every value (including `flash` and the pre-formatted
`summary` rows).

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `summary` | Required | `MinersSummaryParam[]` | - | Pre-formatted miners-summary rows (label + display value incl. units) |
| `title` | Required | `string` | - | Container display name shown in the header row |
| `activity` | Optional | `ContainerActivityData` | `{}` | Miner-state activity counts for the embedded chart |
| `activityError` | Optional | `ContainerActivityError` | `null` | Activity chart error payload |
| `alarms` | Optional | `Partial<Record<AlarmPropKey, Alert[]>>` | - | Per-category alarm badges for the header row |
| `className` | Optional | `string` | - | Additional class for the root element |
| `errorMessage` | Optional | `string` | - | Container-level error message; renders an error banner instead of the body |
| `flash` | Optional | `boolean` | `false` | Critical-high alarm flash. Computed upstream (by the data hook) so the card stays presentational — never derive alarm state inside this component |
| `isActivityError` | Optional | `boolean` | `false` | Activity chart error state |
| `isActivityLoading` | Optional | `boolean` | `false` | Activity chart loading state |
| `isOffline` | Optional | `boolean` | `false` | Render the offline banner instead of the body |
| `onClick` | Optional | `(() => void)` | - | Invoked when the card is clicked (navigation is the caller's concern) |
| `power` | Optional | `number` | - | Latest container power draw in watts (rendered in kW by the top row) |
| `powerUnit` | Optional | `string` | - | Power unit label shown next to the reading |
| `statsErrorMessage` | Optional | `string \| ErrorWithTimestamp[] \| null` | - | Raw stats error surfaced as a tooltip in place of the power reading |
| `vendorContent` | Optional | `React.ReactNode` | - | Optional vendor-specific content (supply-liquid / tanks / immersion / MicroBT boxes) rendered above the miners summary. Kept as a slot so the generic card carries no per-model branching |
<!-- END GENERATED: props -->

## Example

```tsx
import { ContainerWidgetCard } from "@tetherto/mdk-react-devkit"

<ContainerWidgetCard
  title="Container A"
  power={412_000}
  powerUnit="kW"
  summary={[
    { label: "Hash Rate", value: "1.24 PH/s" },
    { label: "Max Temp", value: "72 °C" },
    { label: "Avg Temp", value: "65 °C" },
  ]}
  activity={{ total: 210, online: 200, offline: 10 }}
/>
```

## Notes

- `flash` and `summary` are derived by the container-widgets data hook — the card
  never computes alarm state or formats values itself
- Use `vendorContent` to slot in per-model boxes (`SupplyLiquidBox`, `TanksBox`,
  `MicroBTWidgetBox`, `BitmainImmersionSummaryBox`) without adding model
  branching to the generic card
