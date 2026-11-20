import {
  FluidAlarmIcon,
  OtherAlarmIcon,
  PressureAlarmIcon,
  TemperatureAlarmIcon,
  UNITS,
} from '@tetherto/mdk-react-devkit/primitives'
import { WidgetTopRow } from '@tetherto/mdk-react-devkit/domain'

import type { JSX } from 'react'

export const WidgetTopRowPage = (): JSX.Element => (
  <section className="demo-section">
    <h2 className="demo-section__title">Widget Top Row</h2>
    <div className="demo-section__stack-grid demo-section__stack-grid--2-col demo-section__stack-grid--narrow">
      <section>
        <h3>With All Types of Alarms & Power label</h3>
        <br />
        <WidgetTopRow
          alarms={[
            {
              title: 'Liquid',
              icon: <TemperatureAlarmIcon />,
              items: [
                {
                  severity: 'critical',
                  createdAt: Date.now(),
                  name: 'Al.Liq.#1',
                  description: '1st Liquid Alarm',
                },
              ],
            },
            {
              title: 'Leakage',
              icon: <FluidAlarmIcon />,
              items: [
                {
                  severity: 'high',
                  createdAt: Date.now(),
                  name: 'Al.Lkg.#1',
                  description: '1st Leakage Alarm',
                },
              ],
            },
            {
              title: 'Pressure',
              icon: <PressureAlarmIcon />,
              items: [
                {
                  severity: 'medium',
                  createdAt: Date.now(),
                  name: 'Al.Prs.#1',
                  description: '1st Pressure Alarm',
                },
              ],
            },
            {
              title: 'Other',
              icon: <OtherAlarmIcon />,
              items: [
                {
                  severity: 'low',
                  createdAt: Date.now(),
                  name: 'Al.Oth.#1',
                  description: '1st Other Alarm',
                },
              ],
            },
          ]}
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
