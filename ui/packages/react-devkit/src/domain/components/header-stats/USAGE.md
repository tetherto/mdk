# HeaderStats

Dashboard header stat boxes: `HeaderStatsBar` (container) plus four
slot-fillers — `HeaderMinersBox`, `HeaderHashrateBox`,
`HeaderConsumptionBox`, `HeaderEfficiencyBox`. Each box is a pure
presentational component: pass numeric props, get the formatted display.
No internal data fetching — pair with `useSiteHashrate`,
`useSiteConsumption`, `useSiteEfficiency`, `useSiteMinerCounts` from
`@tetherto/mdk-react-adapter`.

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
        <HeaderHashrateBox mosPhs={hashrate.valuePhs} />
        <HeaderConsumptionBox valueMw={consumption.valueMw} />
        <HeaderEfficiencyBox valueWthS={efficiency.valueWthS} />
      </HeaderStatsBar>
    </AppHeader>
  )
}
```

## Notes

- Undefined numbers render as `—`. Loading state is the empty state.
- The icon slot on each box is optional — pass a 16/20px SVG.
- Styles use cascade layer `mdk`; consumer styles in `app` win without
  specificity tricks.
