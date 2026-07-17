import { MinersSummaryBox } from '@tetherto/mdk-react-devkit/domain'
import { FALLBACK, UNITS } from '@tetherto/mdk-react-devkit/primitives'
import type { JSX, ReactNode } from 'react'
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
              { label: 'Efficiency', value: `32.5 ${UNITS.EFFICIENCY_W_PER_TH_S}` },
              { label: 'Hash Rate', value: `1.24 ${UNITS.HASHRATE_PH_S}` },
              { label: 'Max Temp', value: `72 ${UNITS.TEMPERATURE_C}` },
              { label: 'Avg Temp', value: `65 ${UNITS.TEMPERATURE_C}` },
            ]}
          />
        </DemoPreview>
      </section>

      <section>
        <h3>Long values (label font shrinks)</h3>
        <DemoPreview>
          <MinersSummaryBox
            params={[
              { label: 'Efficiency', value: `32.567890 ${UNITS.EFFICIENCY_W_PER_TH_S}` },
              { label: 'Hash Rate', value: `1,245.78901 ${UNITS.HASHRATE_PH_S}` },
              { label: 'Max Temp', value: `72 ${UNITS.TEMPERATURE_C}` },
              { label: 'Avg Temp', value: `65 ${UNITS.TEMPERATURE_C}` },
            ]}
          />
        </DemoPreview>
      </section>

      <section>
        <h3>Fallback values</h3>
        <DemoPreview>
          <MinersSummaryBox
            params={[
              { label: 'Efficiency', value: FALLBACK },
              { label: 'Hash Rate', value: FALLBACK },
              { label: 'Max Temp', value: FALLBACK },
              { label: 'Avg Temp', value: FALLBACK },
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
