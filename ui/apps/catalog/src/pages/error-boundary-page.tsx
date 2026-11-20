import { useState } from 'react'
import type { JSX } from 'react'
import { Button, ErrorBoundary, withErrorBoundary } from '@tetherto/mdk-react-devkit/primitives'

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
      <div className="demo-section__showcase demo-section__showcase--start">
        <section>
          <h3>withErrorBoundary HOC</h3>
          <p className="demo-section__label">
            Click the button 3 times to trigger the error boundary
          </p>
          <SafeBuggyCounter />
        </section>

        <section>
          <h3>ErrorBoundary wrapper with custom fallback</h3>
          <ErrorBoundary
            fallback={
              <div className="demo-section__error-fallback">
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
