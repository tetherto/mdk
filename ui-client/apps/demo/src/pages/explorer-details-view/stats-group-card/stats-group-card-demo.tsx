import { DemoPageHeader } from '../../../components/demo-page-header'
import { StatsGroupCard } from '@tetherto/foundation'
import type { ReactElement } from 'react'
import './stats-group-card-demo.scss'

// Demo data presets
const DEMO_MINERS = {
  singleMinerNormal: {
    id: 'miner-001',
    type: 'antminer-s19',
    last: {
      snap: {
        stats: {
          hashrate_mhs: { t_5m: 95500 },
          temperature_c: { max: 65 },
          frequency_mhz: { avg: 850 },
          power_w: 3250,
          uptime_ms: 432000000, // 5 days
          status: 'active',
        },
        config: {
          power_mode: 'normal',
          led_status: true,
        },
      },
    },
  },
  singleMinerHighTemp: {
    id: 'miner-002',
    type: 'antminer-s19-pro',
    last: {
      snap: {
        stats: {
          hashrate_mhs: { t_5m: 110000 },
          temperature_c: { max: 78 },
          frequency_mhz: { avg: 920 },
          power_w: 3600,
          uptime_ms: 86400000, // 1 day
          status: 'warning',
        },
        config: {
          power_mode: 'high',
          led_status: false,
        },
      },
    },
  },
  singleMinerLowPower: {
    id: 'miner-003',
    type: 'antminer-s19j',
    last: {
      snap: {
        stats: {
          hashrate_mhs: { t_5m: 90000 },
          temperature_c: { max: 58 },
          frequency_mhz: { avg: 800 },
          power_w: 2900,
          uptime_ms: 1209600000, // 14 days
          status: 'active',
        },
        config: {
          power_mode: 'eco',
          led_status: true,
        },
      },
    },
  },
} as const

/**
 * Stats Group Card Demo
 *
 * Interactive demonstration of StatsGroupCard component with various configurations
 */
export const StatsGroupCardDemo = (): ReactElement => {
  return (
    <div className="stats-group-card-demo">
      <DemoPageHeader
        title="Stats Group Card"
        description="Aggregated miner statistics with multiple display modes"
      />

      <div className="stats-group-card-demo__examples">
        <div className="stats-group-card-demo__section">
          <div className="stats-group-card-demo__comparison">
            <div className="stats-group-card-demo__comparison-item">
              <h4>Single Miner (with secondary stats)</h4>
              <StatsGroupCard miners={[DEMO_MINERS.singleMinerNormal]} />
            </div>
          </div>
        </div>

        <div className="stats-group-card-demo__section">
          <h3>Miner Metrics Layout</h3>
          <div className="stats-group-card-demo__comparison">
            <div className="stats-group-card-demo__comparison-item">
              <StatsGroupCard miners={[DEMO_MINERS.singleMinerNormal]} isMinerMetrics />
            </div>
            <div className="stats-group-card-demo__comparison-item">
              <StatsGroupCard miners={[DEMO_MINERS.singleMinerNormal]} isMinerMetrics />
            </div>
          </div>
        </div>

        <div className="stats-group-card-demo__section">
          <h3>Different Scenarios</h3>
          <div className="stats-group-card-demo__grid">
            <div>
              <h4>Normal Operation</h4>
              <StatsGroupCard miners={[DEMO_MINERS.singleMinerNormal]} />
            </div>
            <div>
              <h4>High Temperature</h4>
              <StatsGroupCard miners={[DEMO_MINERS.singleMinerHighTemp]} />
            </div>
            <div>
              <h4>Eco Mode</h4>
              <StatsGroupCard miners={[DEMO_MINERS.singleMinerLowPower]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
