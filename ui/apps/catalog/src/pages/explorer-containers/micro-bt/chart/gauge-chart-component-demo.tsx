import { COLOR, UNITS } from '@tetherto/mdk-react-devkit/primitives'
import { GaugeChartComponent } from '@tetherto/mdk-react-devkit/domain'
import type { ReactElement } from 'react'
import './gauge-chart-component-demo.scss'

/**
 * Gauge Chart Component Demo
 *
 * Interactive demonstration of gauge charts with various configurations
 */
export const GaugeChartComponentDemo = (): ReactElement => {
  return (
    <div className="gauge-chart-demo">
      <div className="gauge-chart-demo__section">
        <div className="gauge-chart-demo__grid">
          <GaugeChartComponent
            max={100}
            value={85}
            label="Hash Rate"
            unit={UNITS.HASHRATE_TH_S}
            colors={[COLOR.EMERALD, COLOR.SOFT_TEAL]}
          />

          <GaugeChartComponent
            max={1000}
            value={756}
            label="Network Speed"
            unit="Mbps"
            colors={['#10B981', '#059669']}
          />

          <GaugeChartComponent
            max={100}
            value={42}
            label="Pool Temperature"
            unit={UNITS.TEMPERATURE_C}
            colors={['#3B82F6', '#F59E0B', '#EF4444']}
          />

          <GaugeChartComponent
            max={10000}
            value={7500}
            label="Total Power"
            unit={UNITS.POWER_KW}
            colors={[COLOR.YELLOW, COLOR.ORANGE]}
          />
        </div>
      </div>
    </div>
  )
}
