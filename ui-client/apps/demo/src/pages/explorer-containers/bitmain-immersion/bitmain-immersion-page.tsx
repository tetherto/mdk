import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tetherto/mdk-core-ui'
import { DemoPageHeader } from '../../../components/demo-page-header'
import type { ReactElement } from 'react'
import '../styles/_contaienrs-page-common.scss'
import { BitMainImmersionControlsDemo } from './controls/bitmain-immersion-controls-demo'
import { BitMainImmersionSettingsDemo } from './settings/bitmain-immersion-settings-demo'
import { BitMainImmersionSystemDemo } from './system/bitmain-immersion-system-demo'
/**
 * Bitmain Immersion Container Demo Page
 *
 */
export const BitmainImmersionPage = (): ReactElement => {
  return (
    <div className="explorer-containers-page">
      <DemoPageHeader
        title="Bitmain Immersion Container"
        description="Interactive demonstrations of container management and monitoring components"
      />

      <Tabs defaultValue="settings" className="explorer-containers-page__tabs">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <BitMainImmersionSettingsDemo />
        </TabsContent>

        <TabsContent value="controls">
          <BitMainImmersionControlsDemo />
        </TabsContent>

        <TabsContent value="system">
          <BitMainImmersionSystemDemo />
        </TabsContent>
      </Tabs>
    </div>
  )
}
