import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tetherto/mdk-core-ui'
import { DemoPageHeader } from '../../../components/demo-page-header'
import type { ReactElement } from 'react'

import '../styles/_contaienrs-page-common.scss'
import BitdeerChartsDemo from './charts/bitdeer-charts-demo'
import { BitdeerOptionsDemo } from './home/bitdeer-options-demo'
import { BitdeerSettingsPage } from './settings/bitdeer-settings-page'

/**
 * Bitdeer Container Demo Page
 *
 * Main demo page with tabs for Bitdeer Settings and Dry Cooler components
 */
export const BitdeerPage = (): ReactElement => {
  return (
    <div className="explorer-containers">
      <DemoPageHeader
        title="Bitdeer Container"
        description="Interactive demonstrations of container management components"
      />

      <Tabs defaultValue="settings" className="explorer-containers-page__tabs">
        <TabsList>
          <TabsTrigger value="settings">Container Settings</TabsTrigger>
          <TabsTrigger value="cooling">Cooling System</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <BitdeerSettingsPage />
        </TabsContent>

        <TabsContent value="cooling">
          <BitdeerOptionsDemo />
        </TabsContent>
        <TabsContent value="charts">
          <BitdeerChartsDemo />
        </TabsContent>
      </Tabs>
    </div>
  )
}
