# `HeaderStats`

Dashboard header stat boxes: `HeaderStatsBar` (container) plus four
slot-fillers — `HeaderMinersBox`, `HeaderHashrateBox`,
`HeaderConsumptionBox`, `HeaderEfficiencyBox`. Each box is a pure
presentational component: pass numeric props, get the formatted display.
No internal data fetching — pair with `useSiteHashrate`,
`useSiteConsumption`, `useSiteEfficiency`, `useSiteMinerCounts` from
`@tetherto/mdk-react-adapter`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `HeaderConsumptionBox` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Additional class names |
| `icon` | Optional | `React.ReactNode` | - | Icon shown next to the stat |
| `unit` | Optional | `string` | `MW` | Unit label — defaults to `MW` |
| `valueMw` | Optional | `number` | - | Current site-level power consumption, in megawatts |

### `HeaderEfficiencyBox` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Additional class names |
| `icon` | Optional | `React.ReactNode` | - | Icon shown next to the stat |
| `unit` | Optional | `string` | `W/TH/S` | Unit label — defaults to `W/TH/S` |
| `valueWthS` | Optional | `number` | - | Efficiency in watts per TH/s |

### `HeaderHashrateBox` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `appLabel` | Optional | `string` | `WEBAPP_SHORT_NAME ("APP")` | Label for the app-side row |
| `appPhs` | Optional | `number` | - | App-side aggregate hashrate in PH/s |
| `className` | Optional | `string` | - | Additional class names |
| `fractionDigits` | Optional | `number` | `3` | Decimal places shown for both values — defaults to `3` |
| `icon` | Optional | `React.ReactNode` | - | Icon shown next to the stat |
| `poolPhs` | Optional | `number` | - | Pool-side aggregate hashrate in PH/s |
| `unit` | Optional | `string` | `PH/s` | Hashrate unit label — defaults to `PH/s` |

### `HeaderMinersBox` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `appLabel` | Optional | `string` | `WEBAPP_SHORT_NAME ("APP")` | Label for the app-side row |
| `appTotal` | Optional | `number` | - | Optional app-side meta line — total miners reporting to the app |
| `className` | Optional | `string` | - | Additional class names |
| `error` | Optional | `number` | - | Miners flagged in warning (the small amber count) |
| `icon` | Optional | `React.ReactNode` | - | Icon shown next to the "Miners" label. Caller-provided so the package stays icon-agnostic |
| `offline` | Optional | `number` | - | Miners offline (the small red count) |
| `online` | Optional | `number` | - | Online miners (the `158` numerator) |
| `poolMismatch` | Optional | `number` | - | Optional pool-side mismatch count (red) |
| `poolOnline` | Optional | `number` | - | Optional pool-side online count (green) |
| `poolTotal` | Optional | `number` | - | Optional pool-side meta — total miners as reported by upstream pools |
| `total` | Optional | `number` | - | Total miners across the site (denominator of the `158 / 2,188` ratio) |

### `HeaderStatsBar` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `children` | Required | `React.ReactNode` | - | Stat boxes to render in order, left-to-right |
| `className` | Optional | `string` | - | Optional class hook |
<!-- END GENERATED: props -->

## Composition

```tsx
import {
  AppHeader,
  HeaderStatsBar,
  HeaderMinersBox,
  HeaderHashrateBox,
  HeaderConsumptionBox,
  HeaderEfficiencyBox,
} from '@tetherto/mdk-react-devkit'

import {
  useSiteConsumption,
  useSiteEfficiency,
  useSiteHashrate,
  useSiteMinerCounts,
} from '@tetherto/mdk-react-adapter'

const Header = () => {
  const counts = useSiteMinerCounts()
  const hashrate = useSiteHashrate({ timeline: '5m' })
  const consumption = useSiteConsumption({ timeline: '5m' })
  const efficiency = useSiteEfficiency({ timeline: '5m' })

  return (
    <AppHeader>
      <HeaderStatsBar>
        <HeaderMinersBox
          total={counts.data?.total}
          online={counts.data?.online}
          error={counts.data?.error}
          offline={counts.data?.offline}
        />
        <HeaderHashrateBox appPhs={hashrate.valuePhs} />
        <HeaderConsumptionBox valueMw={consumption.valueMw} />
        <HeaderEfficiencyBox valueWthS={efficiency.valueWthS} />
      </HeaderStatsBar>
    </AppHeader>
  )
}
```

## Notes

- Undefined numbers render as `—`. Loading state is the empty state
- The icon slot on each box is optional — pass a 16/20px SVG
- Styles use cascade layer `mdk`; consumer styles in `app` win without
  specificity tricks
