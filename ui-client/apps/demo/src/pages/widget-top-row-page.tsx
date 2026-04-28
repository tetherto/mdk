import { UNITS } from '@tetherto/core'
import { WidgetTopRow } from '@tetherto/foundation'

export const WidgetTopRowPage = (): JSX.Element => (
  <section className="demo-section">
    <h2 className="demo-section__title">Widget Top Row</h2>
    <div
      style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr', maxWidth: '600px' }}
    >
      <section>
        <h3>With All Types of Alarms & Power label</h3>
        <br />
        <WidgetTopRow
          alarms={{
            liquidAlarms: [
              {
                severity: 'critical',
                createdAt: Date.now(),
                name: 'Al.Liq.#1',
                description: '1st Liquid Alarm',
              },
            ],
            leakageAlarms: [
              {
                severity: 'high',
                createdAt: Date.now(),
                name: 'Al.Lkg.#1',
                description: '1st Leakage Alarm',
              },
            ],
            pressureAlarms: [
              {
                severity: 'medium',
                createdAt: Date.now(),
                name: 'Al.Prs.#1',
                description: '1st Pressure Alarm',
              },
            ],
            otherAlarms: [
              {
                severity: 'low',
                createdAt: Date.now(),
                name: 'Al.Oth.#1',
                description: '1st Other Alarm',
              },
            ],
          }}
          title="Example Title"
          power={1_234_567.89}
          unit={UNITS.POWER_KW}
        />
      </section>
      <section>
        <h3>Without Alarms & Power label</h3>
        <br />
        <WidgetTopRow title="Example Title" statsErrorMessage="Example Error Message" />
      </section>
    </div>
  </section>
)
