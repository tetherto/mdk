import { DemoPageHeader } from '../../../components/demo-page-header'
import { SecondaryStatCard } from '@tetherto/foundation'
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
          <SecondaryStatCard name="Hashrate" value="95.5 TH/s" />
          <SecondaryStatCard name="Efficiency" value="92%" />
          <SecondaryStatCard name="Uptime" value="99.8%" />
          <SecondaryStatCard name="Power" value="1500W" />
        </div>
      </div>

      <div className="secondary-stat-card-demo__section">
        <h2>Temperature Metrics</h2>
        <div className="secondary-stat-card-demo__grid">
          <SecondaryStatCard name="Inlet Temp" value="28°C" />
          <SecondaryStatCard name="Outlet Temp" value="42°C" />
          <SecondaryStatCard name="Ambient" value="24°C" />
          <SecondaryStatCard name="Delta" value="14°C" />
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
