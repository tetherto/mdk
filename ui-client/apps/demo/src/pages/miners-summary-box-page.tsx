import { MinersSummaryBox } from '@tetherto/mdk-foundation-ui'
import type { ReactNode } from 'react'
import './miners-summary-box-page.scss'

const DemoPreview = ({ children }: { children: ReactNode }): JSX.Element => (
  <div className="miners-summary-box-page__preview">{children}</div>
)

export const MinersSummaryBoxPage = (): JSX.Element => (
  <section className="demo-section">
    <h2 className="demo-section__title">Miners Summary Box</h2>
    <p className="demo-section__description">
      Displays mining summary parameters in a 2-column grid. Accepts pre-formatted label/value pairs
      - consumers handle data formatting (efficiency calculation, unit conversion, etc.).
    </p>
    <div className="miners-summary-box-page__grid">
      <section>
        <h3>Typical container stats</h3>
        <DemoPreview>
          <MinersSummaryBox
            params={[
              { label: 'Efficiency', value: '32.5 W/TH/S' },
              { label: 'Hash Rate', value: '1.24 PH/s' },
              { label: 'Max Temp', value: '72 °C' },
              { label: 'Avg Temp', value: '65 °C' },
            ]}
          />
        </DemoPreview>
      </section>

      <section>
        <h3>Long values (label font shrinks)</h3>
        <DemoPreview>
          <MinersSummaryBox
            params={[
              { label: 'Efficiency', value: '32.567890 W/TH/S' },
              { label: 'Hash Rate', value: '1,245.78901 PH/s' },
              { label: 'Max Temp', value: '72 °C' },
              { label: 'Avg Temp', value: '65 °C' },
            ]}
          />
        </DemoPreview>
      </section>

      <section>
        <h3>Fallback values</h3>
        <DemoPreview>
          <MinersSummaryBox
            params={[
              { label: 'Efficiency', value: '-' },
              { label: 'Hash Rate', value: '-' },
              { label: 'Max Temp', value: '-' },
              { label: 'Avg Temp', value: '-' },
            ]}
          />
        </DemoPreview>
      </section>

      <section>
        <h3>Empty (no params)</h3>
        <DemoPreview>
          <MinersSummaryBox params={[]} />
        </DemoPreview>
        <em>Nothing rendered above this line</em>
      </section>
    </div>
  </section>
)
