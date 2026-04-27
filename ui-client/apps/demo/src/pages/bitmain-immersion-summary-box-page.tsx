import { BitMainImmersionSummaryBox } from '@mdk/foundation'
import type { ComponentProps, ReactNode } from 'react'
import './bitmain-immersion-summary-box-page.scss'

type SummaryData = NonNullable<ComponentProps<typeof BitMainImmersionSummaryBox>['data']>

const SummaryDemoPreview = ({ children }: { children: ReactNode }): JSX.Element => (
  <div className="bitmain-immersion-summary-box-page__preview">{children}</div>
)

const baseContainerSpecific = {
  second_supply_temp1: 40,
  second_supply_temp2: 41,
  primary_supply_temp: 42,
  second_pump2: true,
  second_pump1: true,
  second_pump1_fault: false,
  second_pump2_fault: false,
  one_pump: true,
}

const makeDevice = (
  containerSpecific: Record<string, unknown>,
  stats: Record<string, unknown> = {},
): SummaryData => ({
  id: 'demo-bitmain-immersion',
  type: 'bitmain-immersion',
  last: {
    snap: {
      stats: {
        status: 'running',
        container_specific: containerSpecific,
        ...stats,
      },
    },
  },
})

export const BitMainImmersionSummaryBoxPage = (): JSX.Element => (
  <section className="demo-section">
    <h2 className="demo-section__title">Bitmain Immersion Summary Box</h2>
    <p className="demo-section__description">
      Summary widget for Bitmain immersion containers: oil pumps (#1 / #2), water pump, and primary
      / secondary liquid supply temperatures with threshold-based coloring (from container
      settings).
    </p>
    <div
      style={{
        display: 'grid',
        gap: '2rem',
        gridTemplateColumns: '1fr',
        maxWidth: '960px',
      }}
    >
      <section>
        <h3>Typical running (healthy)</h3>
        <SummaryDemoPreview>
          <BitMainImmersionSummaryBox data={makeDevice(baseContainerSpecific)} />
        </SummaryDemoPreview>
      </section>

      <section>
        <h3>Oil pump #1 fault (Error) while #2 running</h3>
        <SummaryDemoPreview>
          <BitMainImmersionSummaryBox
            data={makeDevice({
              ...baseContainerSpecific,
              second_pump1_fault: true,
              second_pump1: true,
              second_pump2: true,
            })}
          />
        </SummaryDemoPreview>
      </section>

      <section>
        <h3>Both oil pumps off (no fault)</h3>
        <SummaryDemoPreview>
          <BitMainImmersionSummaryBox
            data={makeDevice({
              ...baseContainerSpecific,
              second_pump1: false,
              second_pump2: false,
              second_pump1_fault: false,
              second_pump2_fault: false,
            })}
          />
        </SummaryDemoPreview>
      </section>

      <section>
        <h3>Water pump off</h3>
        <SummaryDemoPreview>
          <BitMainImmersionSummaryBox
            data={makeDevice({
              ...baseContainerSpecific,
              one_pump: false,
            })}
          />
        </SummaryDemoPreview>
      </section>

      <section>
        <h3>High supply temperatures (threshold styling)</h3>
        <SummaryDemoPreview>
          <BitMainImmersionSummaryBox
            data={makeDevice({
              ...baseContainerSpecific,
              primary_supply_temp: 50,
              second_supply_temp1: 49,
              second_supply_temp2: 51,
            })}
          />
        </SummaryDemoPreview>
      </section>

      <section>
        <h3>Stopped container status</h3>
        <SummaryDemoPreview>
          <BitMainImmersionSummaryBox
            data={makeDevice(baseContainerSpecific, { status: 'stopped' })}
          />
        </SummaryDemoPreview>
      </section>

      <section>
        <h3>Offline container status</h3>
        <SummaryDemoPreview>
          <BitMainImmersionSummaryBox
            data={makeDevice(baseContainerSpecific, { status: 'offline' })}
          />
        </SummaryDemoPreview>
      </section>

      <section>
        <h3>Custom container settings (tighter oil temperature thresholds)</h3>
        <SummaryDemoPreview>
          <BitMainImmersionSummaryBox
            data={makeDevice({
              ...baseContainerSpecific,
              primary_supply_temp: 36,
              second_supply_temp1: 35,
              second_supply_temp2: 37,
            })}
            containerSettings={{
              thresholds: {
                oilTemperature: {
                  COLD: 30,
                  LIGHT_WARM: 34,
                  WARM: 38,
                  HOT: 42,
                  SUPERHOT: 45,
                },
              },
            }}
          />
        </SummaryDemoPreview>
      </section>

      <section>
        <h3>Low / cold-side temperatures</h3>
        <SummaryDemoPreview>
          <BitMainImmersionSummaryBox
            data={makeDevice({
              ...baseContainerSpecific,
              primary_supply_temp: 28,
              second_supply_temp1: 29,
              second_supply_temp2: 30,
            })}
          />
        </SummaryDemoPreview>
      </section>

      <section>
        <h3>Mixed pump states</h3>
        <SummaryDemoPreview>
          <BitMainImmersionSummaryBox
            data={makeDevice({
              ...baseContainerSpecific,
              second_pump1: true,
              second_pump2: false,
              second_pump2_fault: false,
              one_pump: true,
            })}
          />
        </SummaryDemoPreview>
      </section>

      <section>
        <h3>Missing liquid temperature fields (matches app: empty values, not 0°C)</h3>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginBottom: '0.5rem' }}>
          When <code>container_specific</code> omits supply temps, cards show no numeric value (same
          as miningos-app-ui).
        </p>
        <SummaryDemoPreview>
          <BitMainImmersionSummaryBox
            data={makeDevice({
              second_pump1: true,
              second_pump2: true,
              second_pump1_fault: false,
              second_pump2_fault: false,
              one_pump: true,
            })}
          />
        </SummaryDemoPreview>
      </section>

      <section>
        <h3>No device data (renders nothing)</h3>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '14px' }}>
          When <code>data</code> is undefined, the component returns <code>null</code>.
        </p>
        <SummaryDemoPreview>
          <BitMainImmersionSummaryBox />
        </SummaryDemoPreview>
        <em>Nothing rendered above this line</em>
      </section>
    </div>
  </section>
)
