import { ErrorCard } from '@tetherto/core'

export const ErrorCardPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Error Card</h2>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <section style={{ width: '320px' }}>
          <h3>Card variant (default)</h3>
          <ErrorCard error="Connection to miner timed out after 30 seconds" />
        </section>

        <section style={{ width: '320px' }}>
          <h3>Card with multi-line error</h3>
          <ErrorCard
            error={'Failed to fetch hashrate data\nServer returned status 503\nRetry in 5 seconds'}
            title="API Error"
          />
        </section>

        <section style={{ width: '320px' }}>
          <h3>Inline variant</h3>
          <ErrorCard error="Invalid MAC address format" title="Validation Error" variant="inline" />
        </section>
      </div>
    </section>
  )
}
