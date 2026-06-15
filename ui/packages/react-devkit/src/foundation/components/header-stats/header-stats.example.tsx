import { HeaderConsumptionBox } from './header-consumption-box'
import { HeaderEfficiencyBox } from './header-efficiency-box'
import { HeaderHashrateBox } from './header-hashrate-box'
import { HeaderMinersBox } from './header-miners-box'
import { HeaderStatsBar } from './header-stats-bar'

/**
 * Four-box dashboard header strip — Miners / Hashrate / Consumption /
 * Efficiency. Lives in the middle slot of `<AppHeader>`.
 */
export const HeaderStatsExample = (): React.ReactNode => (
  <HeaderStatsBar>
    <HeaderMinersBox
      total={2188}
      online={158}
      error={1}
      offline={57}
      mosTotal={216}
      poolTotal={205}
      poolOnline={201}
      poolMismatch={4}
    />
    <HeaderHashrateBox mosPhs={63.262} poolPhs={52.687} />
    <HeaderConsumptionBox valueMw={1.663} />
    <HeaderEfficiencyBox valueWthS={26.29} />
  </HeaderStatsBar>
)
