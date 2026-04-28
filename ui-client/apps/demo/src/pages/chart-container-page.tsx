import { ChartContainer } from '@tetherto/mdk-core-ui'

export const ChartContainerPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Chart Container</h2>
      <p className="demo-section__description">
        Wrapper for chart content with loading and empty states.
      </p>
      <div className="demo-section__charts">
        <section>
          <h3>States</h3>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <ChartContainer title="Loading" loading>
              <div style={{ height: 200 }} />
            </ChartContainer>
            <ChartContainer title="Empty" empty emptyMessage="No data for this period">
              <div style={{ height: 200 }} />
            </ChartContainer>
          </div>
        </section>
      </div>
    </section>
  )
}
