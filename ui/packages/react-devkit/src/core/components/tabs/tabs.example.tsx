/**
 * Runnable example for Tabs.
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tetherto/mdk-react-devkit'

export const TabsExample = () => {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="alerts">Alerts</TabsTrigger>
        <TabsTrigger value="settings" disabled>
          Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <p>Operational metrics will appear here.</p>
      </TabsContent>
      <TabsContent value="alerts">
        <p>No active alerts.</p>
      </TabsContent>
    </Tabs>
  )
}
