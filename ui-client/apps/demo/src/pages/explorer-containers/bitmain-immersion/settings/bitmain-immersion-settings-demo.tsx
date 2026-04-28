import { BitMainImmersionSettings } from '@tetherto/mdk-foundation-ui'
import type { ReactElement } from 'react'
import './bitmain-immersion-settings-demo.scss'

/**
 * Demo data preset with complete immersion threshold data
 */
const DEMO_PRESET = {
  id: 'demo-normal',
  type: 'bitmain-immersion',
  status: 'active',
  thresholds: {
    oilTemperature: {
      criticalLow: 10,
      alert: 20,
      normal: 30,
      alarm: 40,
      criticalHigh: 50,
    },
  },
  last: {
    snap: {
      stats: {
        primary_supply_temp: 40,
        second_supply_temp1: 38,
        second_supply_temp2: 39,
        primary_circulating_pump: false,
        container_fan: true,
        fan_fault: false,
        tank_a_level: 100,
        tank_b_level: 95,
        tank_c_level: 90,
        tank_d_level: 85,
        container_specific: {
          latitude: '37.7749',
          latitude_direction: 'N',
          longitude: '122.4194',
          longitude_direction: 'W',
        },
      },
      config: {},
    },
  },
} as const

/**
 * BitMain Immersion Settings Demo
 *
 * Interactive demonstration of BitMain Immersion container settings with oil temperature thresholds
 */
export const BitMainImmersionSettingsDemo = (): ReactElement => {
  const customSettings = {
    thresholds: {
      oilTemperature: {
        criticalLow: 15,
        alert: 25,
        normal: 35,
        alarm: 45,
        criticalHigh: 55,
      },
    },
  }

  return (
    <div className="bitmain-immersion-demo">
      <div className="bitmain-immersion-demo__preview">
        <h3>Live Preview</h3>
        <BitMainImmersionSettings data={DEMO_PRESET} containerSettings={customSettings} />
      </div>
    </div>
  )
}
