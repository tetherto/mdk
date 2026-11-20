/**
 * Runnable example for LazyTabWrapper.
 */
import { type ComponentType, lazy } from 'react'
import { LazyTabWrapper } from '@tetherto/mdk-react-devkit'

// Simulate a lazily-loaded tab component using a pre-resolved promise so the
// example renders immediately without an actual dynamic import.
const StaticTab: ComponentType<{ data?: { title: string } }> = ({ data }) => (
  <div className="mdk-example-panel mdk-example-surface">{data?.title ?? 'Tab content loaded'}</div>
)

// Wrap in lazy() to satisfy the Suspense contract used by LazyTabWrapper.
const LazyStaticTab = lazy(() => Promise.resolve({ default: StaticTab }))

export const LazyTabWrapperExample = () => (
  <div className="mdk-example-col mdk-example-col--centered mdk-example-col--gap-xl">
    {/* Default spinner fallback */}
    <LazyTabWrapper
      Component={LazyStaticTab}
      data={{ title: 'Details Tab (default spinner fallback)' }}
    />

    {/* Custom fallback */}
    <LazyTabWrapper
      Component={LazyStaticTab}
      data={{ title: 'Settings Tab (custom fallback)' }}
      fallback={<div className="mdk-example-panel mdk-example-caption">Loading settings…</div>}
    />

    {/* No data prop */}
    <LazyTabWrapper Component={LazyStaticTab} />
  </div>
)
