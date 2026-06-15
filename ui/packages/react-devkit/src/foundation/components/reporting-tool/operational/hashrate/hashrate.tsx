import { Tabs, TabsContent, TabsList, TabsTrigger } from '@core'
import { useState } from 'react'

import type { HASHRATE_TAB_TYPES as HashrateTabTypes } from './hashrate.constants'
import { HASHRATE_TAB_TYPES, HASHRATE_TABS } from './hashrate.constants'
import './hashrate.scss'
import type { HashrateMinerTypeViewProps } from './tabs/miner-type-view/miner-type-view'
import { HashrateMinerTypeView } from './tabs/miner-type-view/miner-type-view'
import type { HashrateMiningUnitViewProps } from './tabs/mining-unit-view/mining-unit-view'
import { HashrateMiningUnitView } from './tabs/mining-unit-view/mining-unit-view'
import type { HashrateSiteViewProps } from './tabs/site-view/site-view'
import { HashrateSiteView } from './tabs/site-view/site-view'

export type HashrateTabValue = (typeof HashrateTabTypes)[keyof typeof HashrateTabTypes]

export type HashrateProps = {
  /** Tab selected on first render. Defaults to the Site View. */
  defaultTab?: HashrateTabValue
  /** Props forwarded to the Site View tab. */
  siteView?: HashrateSiteViewProps
  /** Props forwarded to the Miner Type View tab. */
  minerTypeView?: HashrateMinerTypeViewProps
  /** Props forwarded to the Mining Unit View tab. */
  miningUnitView?: HashrateMiningUnitViewProps
}

/**
 * Top-level hashrate reporting section - composes the site / miner-type /
 * mining-unit drilldowns into a tabbed shell. Each tab fetches independently
 * because the three views use different `groupBy` axes; the composite stitches
 * them via per-tab prop bags.
 *
 * @category charts
 * @domain mining-operations
 * @orkCapability hashrate-monitoring
 * @tier agent-ready
 */
export const Hashrate = ({
  defaultTab = HASHRATE_TAB_TYPES.SITE_VIEW,
  siteView,
  minerTypeView,
  miningUnitView,
}: HashrateProps) => {
  const [activeTab, setActiveTab] = useState<HashrateTabValue>(defaultTab)

  return (
    <div className="mdk-hashrate">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as HashrateTabValue)}>
        <TabsList>
          {HASHRATE_TABS.map(({ key, label }) => (
            <TabsTrigger key={key} value={key}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={HASHRATE_TAB_TYPES.SITE_VIEW}>
          <HashrateSiteView {...siteView} />
        </TabsContent>
        <TabsContent value={HASHRATE_TAB_TYPES.MINER_TYPE_VIEW}>
          <HashrateMinerTypeView {...minerTypeView} />
        </TabsContent>
        <TabsContent value={HASHRATE_TAB_TYPES.MINING_UNIT_VIEW}>
          <HashrateMiningUnitView {...miningUnitView} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
