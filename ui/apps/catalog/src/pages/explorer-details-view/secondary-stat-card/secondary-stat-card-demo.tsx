import { UNITS } from '@tetherto/mdk-react-devkit/primitives'
import { DemoPageHeader } from '../../../components/demo-page-header'
import { SecondaryStatCard } from '@tetherto/mdk-react-devkit/domain'
import type { ReactElement } from 'react'
import './secondary-stat-card-demo.scss'

/**
 * Secondary Stat Card Demo
 *
 * Demonstrates various uses of the SecondaryStatCard component
 */
export const SecondaryStatCardDemo = (): ReactElement => {
  return (
    <div className="secondary-stat-card-demo">
      <DemoPageHeader
        title="Secondary Stat Card"
        description="Compact statistic display cards for dashboard metrics"
      />

      <div className="secondary-stat-card-demo__section">
        <h2>Mining Statistics</h2>
        <div className="secondary-stat-card-demo__grid">
          <SecondaryStatCard name="Hashrate" value={`95.5${UNITS.HASHRATE_TH_S}`} />
          <SecondaryStatCard name="Efficiency" value={`92${UNITS.PERCENT}`} />
          <SecondaryStatCard name="Uptime" value={`99.8${UNITS.PERCENT}`} />
          <SecondaryStatCard name="Power" value={`1500${UNITS.POWER_W}`} />
        </div>
      </div>

      <div className="secondary-stat-card-demo__section">
        <h2>Temperature Metrics</h2>
        <div className="secondary-stat-card-demo__grid">
          <SecondaryStatCard name="Inlet Temp" value={`28${UNITS.TEMPERATURE_C}`} />
          <SecondaryStatCard name="Outlet Temp" value={`42${UNITS.TEMPERATURE_C}`} />
          <SecondaryStatCard name="Ambient" value={`24${UNITS.TEMPERATURE_C}`} />
          <SecondaryStatCard name="Delta" value={`14${UNITS.TEMPERATURE_C}`} />
        </div>
      </div>

      <div className="secondary-stat-card-demo__section">
        <h2>Numeric Values</h2>
        <div className="secondary-stat-card-demo__grid">
          <SecondaryStatCard name="Active Miners" value={156} />
          <SecondaryStatCard name="Offline" value={4} />
          <SecondaryStatCard name="Errors" value={0} />
          <SecondaryStatCard name="Total" value={160} />
        </div>
      </div>
    </div>
  )
}
