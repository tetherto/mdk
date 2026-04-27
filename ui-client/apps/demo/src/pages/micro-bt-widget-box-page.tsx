import { MicroBTWidgetBox } from '@mdk/foundation'
import type { ComponentProps, ReactNode } from 'react'
import './micro-bt-widget-box-page.scss'

type WidgetData = NonNullable<ComponentProps<typeof MicroBTWidgetBox>['data']>

const WidgetDemoPreview = ({ children }: { children: ReactNode }): JSX.Element => (
  <div className="micro-bt-widget-box-page__preview">{children}</div>
)

const makeDevice = (cdu: Record<string, unknown> = {}): WidgetData => ({
  id: 'demo-micro-bt-widget',
  type: 'microbt',
  last: {
    snap: {
      stats: {
        status: 'running',
        container_specific: { cdu },
      },
    },
  },
})

export const MicroBTWidgetBoxPage = (): JSX.Element => (
  <section className="demo-section">
    <h2 className="demo-section__title">Micro BT Widget Box</h2>
    <p className="demo-section__description">
      Compact container widget for Micro BT CDU status: circulation pump (running vs off, matched to{' '}
      <code>circulation_pump_running_status === &apos;running&apos;</code>) and cooling fan (
      <code>cooling_fan_control</code>: running vs error when false or missing). Labels match
      miningos-app-ui (including &quot;Cicle Pump&quot;).
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
        <h3>Healthy: circulation pump running, cooling fan on</h3>
        <WidgetDemoPreview>
          <MicroBTWidgetBox
            data={makeDevice({
              circulation_pump_running_status: 'running',
              cooling_fan_control: true,
            })}
          />
        </WidgetDemoPreview>
      </section>

      <section>
        <h3>Circulation pump off, cooling fan on</h3>
        <WidgetDemoPreview>
          <MicroBTWidgetBox
            data={makeDevice({
              circulation_pump_running_status: 'stopped',
              cooling_fan_control: true,
            })}
          />
        </WidgetDemoPreview>
      </section>

      <section>
        <h3>Circulation pump running, cooling fan off (fan shows Error)</h3>
        <WidgetDemoPreview>
          <MicroBTWidgetBox
            data={makeDevice({
              circulation_pump_running_status: 'running',
              cooling_fan_control: false,
            })}
          />
        </WidgetDemoPreview>
      </section>

      <section>
        <h3>Both circulation pump off and fan off</h3>
        <WidgetDemoPreview>
          <MicroBTWidgetBox
            data={makeDevice({
              circulation_pump_running_status: 'offline',
              cooling_fan_control: false,
            })}
          />
        </WidgetDemoPreview>
      </section>

      <section>
        <h3>Pump status string &quot;Running&quot; (capital R) — treated as off</h3>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginBottom: '0.5rem' }}>
          The widget matches the lowercase container status token <code>running</code> only (same as
          miningos-app-ui).
        </p>
        <WidgetDemoPreview>
          <MicroBTWidgetBox
            data={makeDevice({
              circulation_pump_running_status: 'Running',
              cooling_fan_control: true,
            })}
          />
        </WidgetDemoPreview>
      </section>

      <section>
        <h3>
          Missing <code>cdu</code> in container_specific
        </h3>
        <WidgetDemoPreview>
          <MicroBTWidgetBox
            data={{
              id: 'demo-no-cdu',
              type: 'microbt',
              last: {
                snap: {
                  stats: {
                    status: 'running',
                    container_specific: {},
                  },
                },
              },
            }}
          />
        </WidgetDemoPreview>
      </section>

      <section>
        <h3>
          Partial <code>cdu</code> (only pump running, no fan flag)
        </h3>
        <WidgetDemoPreview>
          <MicroBTWidgetBox
            data={makeDevice({
              circulation_pump_running_status: 'running',
            })}
          />
        </WidgetDemoPreview>
      </section>

      <section>
        <h3>No device data (renders nothing)</h3>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '14px' }}>
          When <code>data</code> is undefined, the component returns <code>null</code>.
        </p>
        <WidgetDemoPreview>
          <MicroBTWidgetBox />
        </WidgetDemoPreview>
        <em>Nothing rendered above this line</em>
      </section>
    </div>
  </section>
)
