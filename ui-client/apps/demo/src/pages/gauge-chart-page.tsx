import { ChartContainer, GaugeChart } from '@tetherto/core'

export const GaugeChartPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Gauge Chart</h2>
      <p className="demo-section__description">
        Gauge charts for displaying percentage-based metrics like system utilization, capacity, or
        progress.
      </p>
      <p className="demo-section__resize-hint">
        ← Resize the window horizontally to see charts adapt →
      </p>
      <div className="demo-section__charts demo-section__charts--2-col">
        <section>
          <h3>Default (75%)</h3>
          <ChartContainer title="System utilization">
            <GaugeChart height="auto" percent={0.75} id="gauge-1" />
          </ChartContainer>
        </section>

        <section>
          <h3>Custom colors (35%)</h3>
          <ChartContainer title="CPU usage">
            <GaugeChart
              height="auto"
              percent={0.35}
              id="gauge-2"
              colors={['#72F59E', '#FFC107', '#EF4444']}
            />
          </ChartContainer>
        </section>

        <section>
          <h3>Without text (92%)</h3>
          <ChartContainer title="Memory usage">
            <GaugeChart height="auto" percent={0.92} id="gauge-3" hideText />
          </ChartContainer>
        </section>

        <section>
          <h3>Low value (15%)</h3>
          <ChartContainer title="Disk usage">
            <GaugeChart height="auto" percent={0.15} id="gauge-4" />
          </ChartContainer>
        </section>
      </div>
    </section>
  )
}
