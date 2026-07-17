/**
 * Runnable example for ErrorBoundary.
 */
import { useState } from 'react'
import { ErrorBoundary, withErrorBoundary } from '@tetherto/mdk-react-devkit'

/** Component that throws when `shouldThrow` is true */
const BrokenComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Simulated rendering error')
  }
  return (
    <div style={{ padding: 16, fontSize: 13, color: 'var(--mdk-color-text-primary, #fff)' }}>
      Component rendered successfully
    </div>
  )
}

const SafeChart = withErrorBoundary(
  ({ title }: { title: string }) => <div style={{ padding: 16, fontSize: 13 }}>{title}</div>,
  'SafeChart',
  (err) => console.error('Caught via HOC:', err),
)

export const ErrorBoundaryExample = () => {
  const [throwError, setThrowError] = useState(false)

  return (
    <div className="mdk-example-row" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Default fallback panel */}
      <div>
        <button
          type="button"
          onClick={() => setThrowError((v) => !v)}
          style={{ marginBottom: 8, padding: '4px 12px', cursor: 'pointer' }}
        >
          {throwError ? 'Reset (remount required)' : 'Trigger error'}
        </button>
        <ErrorBoundary componentName="BrokenComponent">
          <BrokenComponent shouldThrow={throwError} />
        </ErrorBoundary>
      </div>

      {/* Custom fallback */}
      <ErrorBoundary
        fallback={<div style={{ color: '#F87171', padding: 16 }}>Custom error UI</div>}
      >
        <BrokenComponent shouldThrow />
      </ErrorBoundary>

      {/* withErrorBoundary HOC */}
      <SafeChart title="Chart wrapped with withErrorBoundary HOC" />
    </div>
  )
}
