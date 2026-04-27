import { MinersActivityChart } from '@mdk/foundation'
import type { ReactElement } from 'react'

export const MinersActivityChartDemo = (): ReactElement => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Miners Activity Chart</h2>
      <section className="demo-section__miners-activity">
        {/* Default */}
        <section>
          <h3>Default (no data)</h3>
          <div className="demo-section__miners-activity--content">
            <MinersActivityChart />
          </div>
        </section>

        {/* With Data */}
        <section>
          <h3>With Data</h3>
          <div className="demo-section__miners-activity--content">
            <MinersActivityChart
              data={{
                offline: 2,
                error: 1,
                sleep: 3,
                low: 4,
                normal: 28,
                high: 5,
                disconnected: 7,
              }}
            />
          </div>
        </section>

        {/* Large variant */}
        <section>
          <h3>Large</h3>
          <div className="demo-section__miners-activity--content">
            <MinersActivityChart
              large
              data={{
                offline: 2,
                error: 1,
                sleep: 3,
                low: 4,
                normal: 28,
                high: 5,
                disconnected: 7,
              }}
            />
          </div>
        </section>

        {/* Without Labels */}
        <section>
          <h3>Without Labels</h3>
          <div className="demo-section__miners-activity--content">
            <MinersActivityChart
              showLabel={false}
              data={{
                offline: 0,
                error: 0,
                sleep: 0,
                low: 12,
                normal: 39,
                high: 0,
                disconnected: 9,
              }}
            />
          </div>
        </section>

        {/* Loading State */}
        <section>
          <h3>Loading</h3>
          <div className="demo-section__miners-activity--content">
            <MinersActivityChart isLoading />
          </div>
        </section>

        {/* Error State */}
        <section>
          <h3>Error</h3>
          <div className="demo-section__miners-activity--content">
            <MinersActivityChart isError />
          </div>
        </section>

        {/* Error with custom message */}
        <section>
          <h3>Error with Custom Message</h3>
          <div className="demo-section__miners-activity--content">
            <MinersActivityChart
              isError
              error={{ data: { message: 'Service temporarily unavailable' } }}
            />
          </div>
        </section>

        {/* Error in Demo Mode (shows empty data instead) */}
        <section>
          <h3>Error in Demo Mode</h3>
          <div className="demo-section__miners-activity--content">
            <MinersActivityChart
              isError
              isDemoMode
              data={{
                offline: 2,
                error: 1,
                normal: 28,
              }}
            />
          </div>
        </section>

        {/* All zeros */}
        <section>
          <h3>All Zeros</h3>
          <div className="demo-section__miners-activity--content">
            <MinersActivityChart
              data={{
                offline: 0,
                error: 0,
                sleep: 0,
                low: 0,
                normal: 0,
                high: 0,
                disconnected: 0,
              }}
            />
          </div>
        </section>

        {/* Large with no labels */}
        <section>
          <h3>Large Without Labels</h3>
          <div className="demo-section__miners-activity--content">
            <MinersActivityChart
              large
              showLabel={false}
              data={{
                offline: 1,
                error: 0,
                sleep: 5,
                low: 8,
                normal: 42,
                high: 3,
                disconnected: 11,
              }}
            />
          </div>
        </section>
      </section>
    </section>
  )
}
