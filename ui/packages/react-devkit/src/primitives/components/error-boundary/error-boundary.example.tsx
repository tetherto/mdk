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
  return <div className="mdk-example-panel">Component rendered successfully</div>
}

const SafeChart = withErrorBoundary(
  ({ title }: { title: string }) => <div className="mdk-example-panel">{title}</div>,
  'SafeChart',
  (err) => console.error('Caught via HOC:', err),
)

export const ErrorBoundaryExample = () => {
  const [throwError, setThrowError] = useState(false)

  return (
    <div className="mdk-example-col mdk-example-col--centered mdk-example-col--gap-xl">
      {/* Default fallback panel */}
      <div>
        <button
          type="button"
          onClick={() => setThrowError((v) => !v)}
          className="mdk-example-button"
        >
          {throwError ? 'Reset (remount required)' : 'Trigger error'}
        </button>
        <ErrorBoundary componentName="BrokenComponent">
          <BrokenComponent shouldThrow={throwError} />
        </ErrorBoundary>
      </div>

      {/* Custom fallback */}
      <ErrorBoundary
        fallback={<div className="mdk-example-panel mdk-example-panel--error">Custom error UI</div>}
      >
        <BrokenComponent shouldThrow />
      </ErrorBoundary>

      {/* withErrorBoundary HOC */}
      <SafeChart title="Chart wrapped with withErrorBoundary HOC" />
    </div>
  )
}
