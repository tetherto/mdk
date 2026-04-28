import { useState } from 'react'
import { Button, ErrorBoundary, withErrorBoundary } from '@tetherto/core'

const BuggyCounter = (): JSX.Element => {
  const [count, setCount] = useState(0)
  if (count >= 3) {
    throw new Error('Counter exceeded maximum value of 2!')
  }
  return (
    <Button variant="secondary" onClick={() => setCount((c) => c + 1)}>
      Click count: {count} (crashes at 3)
    </Button>
  )
}

const SafeBuggyCounter = withErrorBoundary(BuggyCounter, 'BuggyCounter')

export const ErrorBoundaryPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Error Boundary</h2>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <section>
          <h3>withErrorBoundary HOC</h3>
          <p style={{ fontSize: '13px', opacity: 0.7, marginBottom: '12px' }}>
            Click the button 3 times to trigger the error boundary
          </p>
          <SafeBuggyCounter />
        </section>

        <section>
          <h3>ErrorBoundary wrapper with custom fallback</h3>
          <ErrorBoundary
            fallback={
              <div style={{ color: '#ff3b30', padding: '12px', border: '1px solid #ff3b30' }}>
                Custom fallback UI - error was caught!
              </div>
            }
          >
            <div>This content is protected by an ErrorBoundary</div>
          </ErrorBoundary>
        </section>
      </div>
    </section>
  )
}
