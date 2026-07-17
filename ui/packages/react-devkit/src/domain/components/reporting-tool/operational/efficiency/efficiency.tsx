import { Tabs, TabsContent, TabsList, TabsTrigger } from '@primitives'
import { useState } from 'react'
import type { EFFICIENCY_TAB_TYPES as EfficiencyTabTypes } from './efficiency.constants'
import { EFFICIENCY_TAB_TYPES, EFFICIENCY_TABS } from './efficiency.constants'
import './efficiency.scss'
import type { EfficiencyMinerTypeViewProps } from './tabs/miner-type-view/miner-type-view'
import { EfficiencyMinerTypeView } from './tabs/miner-type-view/miner-type-view'
import type { EfficiencyMinerUnitViewProps } from './tabs/miner-unit-view/miner-unit-view'
import { EfficiencyMinerUnitView } from './tabs/miner-unit-view/miner-unit-view'
import type { EfficiencySiteViewProps } from './tabs/site-view/site-view'
import { EfficiencySiteView } from './tabs/site-view/site-view'

export type EfficiencyTabValue = (typeof EfficiencyTabTypes)[keyof typeof EfficiencyTabTypes]

export type OperationsEfficiencyProps = {
  defaultTab?: EfficiencyTabValue
  siteView?: EfficiencySiteViewProps
  minerTypeView?: EfficiencyMinerTypeViewProps
  minerUnitView?: EfficiencyMinerUnitViewProps
}

/**
 * Top-level operations-efficiency section of the report — composes the site/type/unit views.
 *
 * @category tables
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const OperationsEfficiency = ({
  defaultTab = EFFICIENCY_TAB_TYPES.SITE_VIEW,
  siteView,
  minerTypeView,
  minerUnitView,
}: OperationsEfficiencyProps) => {
  const [activeTab, setActiveTab] = useState<EfficiencyTabValue>(defaultTab)

  return (
    <div className="mdk-operations-efficiency">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EfficiencyTabValue)}>
        <TabsList>
          {EFFICIENCY_TABS.map(({ key, label }) => (
            <TabsTrigger key={key} value={key}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={EFFICIENCY_TAB_TYPES.SITE_VIEW}>
          <EfficiencySiteView {...siteView} />
        </TabsContent>
        <TabsContent value={EFFICIENCY_TAB_TYPES.MINER_TYPE_VIEW}>
          <EfficiencyMinerTypeView {...minerTypeView} />
        </TabsContent>
        <TabsContent value={EFFICIENCY_TAB_TYPES.MINING_UNIT_VIEW}>
          <EfficiencyMinerUnitView {...minerUnitView} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
