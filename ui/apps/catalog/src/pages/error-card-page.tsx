import { ErrorCard } from '@tetherto/mdk-react-devkit/primitives'

import type { JSX } from 'react'

export const ErrorCardPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Error Card</h2>
      <div className="demo-section__showcase demo-section__showcase--start">
        <section className="demo-section__showcase-item--wide">
          <h3>Card variant (default)</h3>
          <ErrorCard error="Connection to miner timed out after 30 seconds" />
        </section>

        <section className="demo-section__showcase-item--wide">
          <h3>Card with multi-line error</h3>
          <ErrorCard
            error={'Failed to fetch hashrate data\nServer returned status 503\nRetry in 5 seconds'}
            title="API Error"
          />
        </section>

        <section className="demo-section__showcase-item--wide">
          <h3>Inline variant</h3>
          <ErrorCard error="Invalid MAC address format" title="Validation Error" variant="inline" />
        </section>
      </div>
    </section>
  )
}
