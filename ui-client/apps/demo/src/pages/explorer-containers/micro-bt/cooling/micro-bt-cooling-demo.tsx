import { Button } from '@tetherto/mdk-core-ui'
import type { Device } from '@tetherto/mdk-foundation-ui'
import { MicroBTCooling } from '@tetherto/mdk-foundation-ui'
import type { ReactElement } from 'react'
import { useState } from 'react'
import './micro-bt-cooling-demo.scss'

/**
 * Demo presets for different cooling scenarios
 */
const DEMO_PRESETS = {
  normal: {
    id: 'demo-normal',
    type: 'microbt',
    status: 'active',
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
            },
          },
        },
        config: {},
      },
    },
  },
  kehua: {
    id: 'demo-kehua',
    type: 'container-mbt-kehua',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            cdu: {
              cycle_pump_control: true,
              circulation_pump_running_status: 'Running',
              circulation_pump_switch: 'ON',
              circulation_pump_speed: 75,
              cooling_fan_control: true,
              cooling_system_status: 'High Speed',
              cooling_fan_switch: 'ON',
              makeup_water_pump_control: false,
              makeup_water_pump_fault: false,
              makeup_water_pump_switch: 'OFF',
            },
          },
        },
        config: {},
      },
    },
  },
  highSpeed: {
    id: 'demo-high-speed',
    type: 'microbt',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            cdu: {
              cycle_pump_control: true,
              circulation_pump_running_status: 'Running',
              circulation_pump_switch: 'ON',
              circulation_pump_speed: 95,
              cooling_fan_control: true,
              cooling_system_status: 'High Speed',
              cooling_fan_switch: 'ON',
              makeup_water_pump_control: true,
              makeup_water_pump_fault: false,
              makeup_water_pump_switch: 'ON',
            },
          },
        },
        config: {},
      },
    },
  },
  fault: {
    id: 'demo-fault',
    type: 'microbt',
    status: 'error',
    last: {
      snap: {
        stats: {
          container_specific: {
            cdu: {
              cycle_pump_control: false,
              circulation_pump_running_status: 'Stopped',
              circulation_pump_switch: 'OFF',
              circulation_pump_speed: 0,
              cooling_fan_control: false,
              cooling_system_status: 'Stopped',
              cooling_fan_switch: 'OFF',
              makeup_water_pump_control: true,
              makeup_water_pump_fault: true,
              makeup_water_pump_switch: 'ON',
            },
          },
        },
        config: {},
      },
    },
  },
  lowSpeed: {
    id: 'demo-low-speed',
    type: 'microbt',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            cdu: {
              cycle_pump_control: true,
              circulation_pump_running_status: 'Running',
              circulation_pump_switch: 'ON',
              circulation_pump_speed: 25,
              cooling_fan_control: true,
              cooling_system_status: 'Low Speed',
              cooling_fan_switch: 'ON',
              makeup_water_pump_control: false,
              makeup_water_pump_fault: false,
              makeup_water_pump_switch: 'OFF',
            },
          },
        },
        config: {},
      },
    },
  },
  partialShutdown: {
    id: 'demo-partial',
    type: 'microbt',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            cdu: {
              cycle_pump_control: false,
              circulation_pump_running_status: 'Stopped',
              circulation_pump_switch: 'OFF',
              circulation_pump_speed: 0,
              cooling_fan_control: true,
              cooling_system_status: 'Running',
              cooling_fan_switch: 'ON',
              makeup_water_pump_control: false,
              makeup_water_pump_fault: false,
              makeup_water_pump_switch: 'OFF',
            },
          },
        },
        config: {},
      },
    },
  },
} as const

/**
 * MicroBT Cooling Demo
 *
 * Interactive demonstration of MicroBT cooling system with various operational scenarios
 */
export const MicroBTCoolingDemo = (): ReactElement => {
  const [scenario, setScenario] = useState<keyof typeof DEMO_PRESETS>('normal')

  return (
    <div className="micro-bt-cooling-demo">
      <div className="micro-bt-cooling-demo__controls">
        <h3>Select Scenario</h3>
        <div className="micro-bt-cooling-demo__buttons">
          <Button
            variant={scenario === 'normal' ? 'primary' : 'secondary'}
            onClick={() => setScenario('normal')}
          >
            Normal Operation
          </Button>
          <Button
            variant={scenario === 'kehua' ? 'primary' : 'secondary'}
            onClick={() => setScenario('kehua')}
          >
            Kehua Type
          </Button>
          <Button
            variant={scenario === 'highSpeed' ? 'primary' : 'secondary'}
            onClick={() => setScenario('highSpeed')}
          >
            High Speed
          </Button>
          <Button
            variant={scenario === 'lowSpeed' ? 'primary' : 'secondary'}
            onClick={() => setScenario('lowSpeed')}
          >
            Low Speed
          </Button>
          <Button
            variant={scenario === 'partialShutdown' ? 'primary' : 'secondary'}
            onClick={() => setScenario('partialShutdown')}
          >
            Partial Shutdown
          </Button>
          <Button
            variant={scenario === 'fault' ? 'primary' : 'secondary'}
            onClick={() => setScenario('fault')}
          >
            Fault Condition
          </Button>
        </div>
      </div>

      <div className="micro-bt-cooling-demo__preview">
        <div className="micro-bt-cooling-demo__info">
          <h3>Scenario Details</h3>
          <div className="micro-bt-cooling-demo__details">
            {scenario === 'normal' && (
              <>
                <p>✅ All systems operational</p>
                <p>📊 Circulation pump at 50 Hz</p>
                <p>🌡️ Normal cooling mode</p>
              </>
            )}
            {scenario === 'kehua' && (
              <>
                <p>🔵 Kehua-type container</p>
                <p>📊 Circulation pump at 75%</p>
                <p>⚡ High speed cooling</p>
                <p>ℹ️ Speed shown in percentage</p>
              </>
            )}
            {scenario === 'highSpeed' && (
              <>
                <p>⚡ Maximum cooling performance</p>
                <p>📊 Circulation pump at 95 Hz</p>
                <p>🔥 High temperature response</p>
              </>
            )}
            {scenario === 'lowSpeed' && (
              <>
                <p>🐢 Energy-saving mode</p>
                <p>📊 Circulation pump at 25 Hz</p>
                <p>❄️ Low temperature operation</p>
              </>
            )}
            {scenario === 'partialShutdown' && (
              <>
                <p>⚠️ Partial system shutdown</p>
                <p>⏸️ Cycle pump stopped</p>
                <p>✅ Cooling fan still running</p>
              </>
            )}
            {scenario === 'fault' && (
              <>
                <p>🔴 System fault detected</p>
                <p>❌ Make-up water pump error</p>
                <p>⏹️ All pumps stopped</p>
                <p>🚨 Requires immediate attention</p>
              </>
            )}
          </div>
        </div>

        <div className="micro-bt-cooling-demo__component">
          <MicroBTCooling data={DEMO_PRESETS[scenario] as Device} />
        </div>
      </div>
    </div>
  )
}
