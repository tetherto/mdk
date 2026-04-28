import { LazyTabWrapper, Tabs, TabsContent, TabsList, TabsTrigger } from '@tetherto/mdk-core-ui'
import React from 'react'

const Tab1Content = (): JSX.Element => (
  <div>
    <h3>Tab 1 Content (Lazy Loaded)</h3>
    <p>This content was loaded on demand when the tab was activated.</p>
  </div>
)

const Tab2Content = (): JSX.Element => (
  <div>
    <h3>Tab 2 Content (Lazy Loaded)</h3>
    <p>This is the second tab content, also lazy loaded.</p>
  </div>
)

const Tab3Content = (): JSX.Element => (
  <div>
    <h3>Tab 3 Content (Lazy Loaded)</h3>
    <p>Third tab content with lazy loading support.</p>
  </div>
)

const LazyTab1Content = React.lazy<React.ComponentType>(() =>
  Promise.resolve({ default: Tab1Content }),
)
const LazyTab2Content = React.lazy<React.ComponentType>(
  () =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({ default: Tab2Content })
      }, 2_000) // 2 second delay
    }),
)

// Tab3 with 2 second delay
const LazyTab3Content = React.lazy<React.ComponentType>(
  () =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({ default: Tab3Content })
      }, 3_000) // 3 seconds delay
    }),
)

export const TabsPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Tabs</h2>
      <h3 className="demo-section__subtitle">Side Variant</h3>
      <div className="demo-section__tabs">
        <Tabs defaultValue="tab1">
          <TabsList variant="side">
            <TabsTrigger variant="side" value="tab1">
              Tab 1
            </TabsTrigger>
            <TabsTrigger variant="side" value="tab2">
              Tab 2
            </TabsTrigger>
            <TabsTrigger variant="side" value="tab3">
              Tab 3
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Tab 1 content</TabsContent>
          <TabsContent value="tab2">Tab 2 content</TabsContent>
          <TabsContent value="tab3">Tab 3 content</TabsContent>
        </Tabs>
      </div>
      <h3 className="demo-section__subtitle">Side Variant (Disabled)</h3>
      <div className="demo-section__tabs">
        <Tabs defaultValue="tab1">
          <TabsList variant="side">
            <TabsTrigger variant="side" value="tab1">
              Tab 1
            </TabsTrigger>
            <TabsTrigger variant="side" value="tab2" disabled>
              Tab 2
            </TabsTrigger>
            <TabsTrigger variant="side" value="tab3" disabled>
              Tab 3
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Tab 1 content</TabsContent>
          <TabsContent value="tab2">Tab 2 content</TabsContent>
          <TabsContent value="tab3">Tab 3 content</TabsContent>
        </Tabs>
      </div>
      <div className="demo-section__tabs">
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Tab 1 content</TabsContent>
          <TabsContent value="tab2">Tab 2 content</TabsContent>
          <TabsContent value="tab3">Tab 3 content</TabsContent>
        </Tabs>
      </div>
      <div className="demo-section__tabs">
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger disabled value="tab2">
              Tab 2
            </TabsTrigger>
            <TabsTrigger disabled value="tab3">
              Tab 3
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Tab 1 content</TabsContent>
          <TabsContent value="tab2">Tab 2 content</TabsContent>
          <TabsContent value="tab3">Tab 3 content</TabsContent>
        </Tabs>
      </div>

      {/* Example 3: Tabs with LazyTabWrapper */}
      <div className="demo-section__tabs" style={{ marginTop: '2rem' }}>
        <h3 className="demo-section__subtitle">Tabs with Lazy Loading</h3>
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">
            <LazyTabWrapper Component={LazyTab1Content} />
          </TabsContent>
          <TabsContent value="tab2">
            <LazyTabWrapper Component={LazyTab2Content} />
          </TabsContent>
          <TabsContent value="tab3">
            <LazyTabWrapper Component={LazyTab3Content} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
