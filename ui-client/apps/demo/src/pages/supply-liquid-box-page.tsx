import { SupplyLiquidBox } from '@tetherto/foundation'
import type { ComponentProps, ReactNode } from 'react'
import './supply-liquid-box-page.scss'

type HydroDemoData = NonNullable<ComponentProps<typeof SupplyLiquidBox>['data']>

const DemoPreview = ({ children }: { children: ReactNode }): JSX.Element => (
  <div className="supply-liquid-box-page__preview">{children}</div>
)

const baseStats = {
  supply_liquid_temp: 35,
  supply_liquid_set_temp: 32,
  supply_liquid_pressure: 2.5,
}

const makeDevice = (
  stats: Record<string, unknown>,
  containerSpecific: Record<string, unknown> = {},
): HydroDemoData => ({
  id: 'demo-bitmain-hydro',
  type: 'bitmain-hydro',
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

export const SupplyLiquidBoxPage = (): JSX.Element => (
  <section className="demo-section">
    <h2 className="demo-section__title">Supply Liquid Box</h2>
    <p className="demo-section__description">
      Bitmain Antspace hydro summary for supply liquid: measured temperature, set temperature, and
      pressure. Values are read from <code>last.snap.stats</code> (with{' '}
      <code>water_temperature</code> as a fallback for supply temperature) and from{' '}
      <code>container_specific</code> when stats omit a field. Coloring and flash states use the
      same Antspace hydro threshold helpers as <code>BitMainHydroSettings</code>.
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
        <DemoPreview>
          <SupplyLiquidBox data={makeDevice(baseStats)} />
        </DemoPreview>
      </section>

      <section>
        <h3>High supply temperature and pressure (threshold styling)</h3>
        <DemoPreview>
          <SupplyLiquidBox
            data={makeDevice({
              ...baseStats,
              supply_liquid_temp: 39,
              supply_liquid_set_temp: 38,
              supply_liquid_pressure: 3.8,
            })}
          />
        </DemoPreview>
      </section>

      <section>
        <h3>Stopped container status</h3>
        <DemoPreview>
          <SupplyLiquidBox data={makeDevice({ ...baseStats, status: 'stopped' })} />
        </DemoPreview>
      </section>

      <section>
        <h3>Offline container status</h3>
        <DemoPreview>
          <SupplyLiquidBox data={makeDevice({ ...baseStats, status: 'offline' })} />
        </DemoPreview>
      </section>

      <section>
        <h3>Custom container settings (hydro thresholds)</h3>
        <DemoPreview>
          <SupplyLiquidBox
            data={makeDevice({
              ...baseStats,
              supply_liquid_temp: 33,
            })}
            containerSettings={{
              thresholds: {
                waterTemperature: {
                  criticalLow: 21,
                  alarmLow: 21,
                  alert: 25,
                  normal: 30,
                  alarmHigh: 37,
                  criticalHigh: 40,
                },
                supplyLiquidPressure: {
                  criticalLow: 2,
                  alarmLow: 2,
                  normal: 2.3,
                  alarmHigh: 3.5,
                  criticalHigh: 4,
                },
              },
            }}
          />
        </DemoPreview>
      </section>

      <section>
        <h3>Supply temp from water_temperature only</h3>
        <DemoPreview>
          <SupplyLiquidBox
            data={makeDevice({
              water_temperature: 40,
              supply_liquid_set_temp: 30,
              supply_liquid_pressure: 2.2,
            })}
          />
        </DemoPreview>
      </section>

      <section>
        <h3>Values only in container_specific</h3>
        <DemoPreview>
          <SupplyLiquidBox
            data={makeDevice(
              { status: 'running' },
              {
                supply_liquid_temp: 34,
                supply_liquid_set_temp: 31,
                supply_liquid_pressure: 2.4,
              },
            )}
          />
        </DemoPreview>
      </section>

      <section>
        <h3>Low / cold-side readings</h3>
        <DemoPreview>
          <SupplyLiquidBox
            data={makeDevice({
              ...baseStats,
              supply_liquid_temp: 18,
              supply_liquid_set_temp: 20,
              supply_liquid_pressure: 2.1,
            })}
          />
        </DemoPreview>
      </section>

      <section>
        <h3>Missing metric fields (empty values, not 0°C / 0 bar)</h3>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginBottom: '0.5rem' }}>
          When stats omit supply liquid fields, cards show no numeric value (same pattern as other
          container summary boxes).
        </p>
        <DemoPreview>
          <SupplyLiquidBox data={makeDevice({ status: 'running' })} />
        </DemoPreview>
      </section>

      <section>
        <h3>No device data (renders nothing)</h3>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '14px' }}>
          When <code>data</code> is undefined, the component returns <code>null</code>.
        </p>
        <DemoPreview>
          <SupplyLiquidBox />
        </DemoPreview>
        <em>Nothing rendered above this line</em>
      </section>
    </div>
  </section>
)
