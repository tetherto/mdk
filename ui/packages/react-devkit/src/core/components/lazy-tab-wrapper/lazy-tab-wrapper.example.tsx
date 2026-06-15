/**
 * Runnable example for LazyTabWrapper.
 */
import { type ComponentType, lazy } from 'react'
import { LazyTabWrapper } from '@tetherto/mdk-react-devkit'

// Simulate a lazily-loaded tab component using a pre-resolved promise so the
// example renders immediately without an actual dynamic import.
const StaticTab: ComponentType<{ data?: { title: string } }> = ({ data }) => (
  <div
    style={{
      padding: '16px',
      background: 'var(--mdk-color-surface-secondary, #1a1a2e)',
      borderRadius: 4,
      color: 'var(--mdk-color-text-primary, #fff)',
      fontSize: 13,
    }}
  >
    {data?.title ?? 'Tab content loaded'}
  </div>
)

// Wrap in lazy() to satisfy the Suspense contract used by LazyTabWrapper.
const LazyStaticTab = lazy(() => Promise.resolve({ default: StaticTab }))

export const LazyTabWrapperExample = () => (
  <div className="mdk-example-row" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    {/* Default spinner fallback */}
    <LazyTabWrapper
      Component={LazyStaticTab}
      data={{ title: 'Details Tab (default spinner fallback)' }}
    />

    {/* Custom fallback */}
    <LazyTabWrapper
      Component={LazyStaticTab}
      data={{ title: 'Settings Tab (custom fallback)' }}
      fallback={<div style={{ padding: 16, color: '#888', fontSize: 13 }}>Loading settings…</div>}
    />

    {/* No data prop */}
    <LazyTabWrapper Component={LazyStaticTab} />
  </div>
)
