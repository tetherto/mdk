import { MicroBTSettings } from '@tetherto/foundation'
import type { ReactElement } from 'react'
import './micro-bt-settings-demo.scss'

/**
 * Demo data preset with complete MicroBT cooling system data
 */
const DEMO_PRESET = {
  id: 'demo-microbt',
  type: 'microbt',
  status: 'active',
  thresholds: {
    waterTemperature: {
      COLD: 25,
      LIGHT_WARM: 33,
      WARM: 37,
      HOT: 39,
    },
  },
  last: {
    snap: {
      stats: {
        container_specific: {
          cdu: {
            cycle_pump_control: true,
            circulation_pump_running_status: 'Running',
            circulation_pump_switch: 'ON',
            circulation_pump_speed: 50,
            cooling_fan_control: true,
            cooling_system_status: 'Normal',
            cooling_fan_switch: 'ON',
            makeup_water_pump_control: true,
            makeup_water_pump_fault: false,
            makeup_water_pump_switch: 'ON',
            cooling_fan_running_speed_threshold: 80,
            cooling_fan_start_temperature_threshold: 30,
            cooling_fan_stop_temperature_threshold: 25,
          },
          power_meters: [
            {
              status: 1,
              voltage_ab: 230,
              voltage_bc: 235,
              voltage_ca: 232,
              total_power_factor: 0.95,
              freq: 50,
              total_active_power: 100,
              total_apparent_power: 105,
              total_active_energy: 1000,
            },
          ],
        },
      },
      config: {},
    },
  },
} as const

/**
 * MicroBT Settings Demo
 *
 * Interactive demonstration of MicroBT container settings with water temperature thresholds
 */
export const MicroBTSettingsDemo = (): ReactElement => {
  const customSettings = {
    thresholds: {
      waterTemperature: {
        COLD: 20,
        LIGHT_WARM: 30,
        WARM: 35,
        HOT: 40,
      },
    },
  }

  return (
    <div className="micro-bt-settings-demo">
      <div className="micro-bt-settings-demo__preview">
        <h3>Live Preview</h3>
        <MicroBTSettings data={DEMO_PRESET} containerSettings={customSettings} />
      </div>
    </div>
  )
}
