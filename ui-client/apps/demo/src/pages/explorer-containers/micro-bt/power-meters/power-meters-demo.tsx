import { Button } from '@tetherto/mdk-core-ui'
import type { Device } from '@tetherto/mdk-foundation-ui'
import { PowerMeters } from '@tetherto/mdk-foundation-ui'
import type { ReactElement } from 'react'
import { useState } from 'react'
import './power-meters-demo.scss'

/**
 * Demo presets for different power meter scenarios
 */
const DEMO_PRESETS = {
  singleMeter: {
    id: 'demo-single',
    type: 'container',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
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
  },
  dualMeters: {
    id: 'demo-dual',
    type: 'container',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            power_meters: [
              {
                status: 1,
                voltage_ab: 230,
                voltage_bc: 235,
                voltage_ca: 232,
                total_power_factor: 0.95,
                freq: 50,
                total_active_power: 150,
                total_apparent_power: 158,
                total_active_energy: 2500,
              },
              {
                status: 1,
                voltage_ab: 228,
                voltage_bc: 233,
                voltage_ca: 230,
                total_power_factor: 0.92,
                freq: 50,
                total_active_power: 120,
                total_apparent_power: 130,
                total_active_energy: 2000,
              },
            ],
          },
        },
        config: {},
      },
    },
  },
  highLoad: {
    id: 'demo-high-load',
    type: 'container',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            power_meters: [
              {
                status: 1,
                voltage_ab: 238,
                voltage_bc: 240,
                voltage_ca: 239,
                total_power_factor: 0.98,
                freq: 50,
                total_active_power: 450,
                total_apparent_power: 459,
                total_active_energy: 15000,
              },
            ],
          },
        },
        config: {},
      },
    },
  },
  lowPowerFactor: {
    id: 'demo-low-pf',
    type: 'container',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            power_meters: [
              {
                status: 1,
                voltage_ab: 225,
                voltage_bc: 227,
                voltage_ca: 226,
                total_power_factor: 0.75,
                freq: 50,
                total_active_power: 80,
                total_apparent_power: 107,
                total_active_energy: 1200,
              },
            ],
          },
        },
        config: {},
      },
    },
  },
  communicationError: {
    id: 'demo-comm-error',
    type: 'container',
    status: 'error',
    last: {
      snap: {
        stats: {
          container_specific: {
            power_meters: [
              {
                status: 0,
                voltage_ab: 0,
                voltage_bc: 0,
                voltage_ca: 0,
                total_power_factor: 0,
                freq: 0,
                total_active_power: 0,
                total_apparent_power: 0,
                total_active_energy: 0,
              },
            ],
          },
        },
        config: {},
      },
    },
  },
  mixedStatus: {
    id: 'demo-mixed',
    type: 'container',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            power_meters: [
              {
                status: 1,
                voltage_ab: 230,
                voltage_bc: 235,
                voltage_ca: 232,
                total_power_factor: 0.95,
                freq: 50,
                total_active_power: 150,
                total_apparent_power: 158,
                total_active_energy: 2500,
              },
              {
                status: 0,
                voltage_ab: 0,
                voltage_bc: 0,
                voltage_ca: 0,
                total_power_factor: 0,
                freq: 0,
                total_active_power: 0,
                total_apparent_power: 0,
                total_active_energy: 0,
              },
              {
                status: 1,
                voltage_ab: 228,
                voltage_bc: 233,
                voltage_ca: 230,
                total_power_factor: 0.92,
                freq: 50,
                total_active_power: 120,
                total_apparent_power: 130,
                total_active_energy: 2000,
              },
            ],
          },
        },
        config: {},
      },
    },
  },
  usFrequency: {
    id: 'demo-us',
    type: 'container',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            power_meters: [
              {
                status: 1,
                voltage_ab: 208,
                voltage_bc: 210,
                voltage_ca: 209,
                total_power_factor: 0.94,
                freq: 60,
                total_active_power: 180,
                total_apparent_power: 191,
                total_active_energy: 3200,
              },
            ],
          },
        },
        config: {},
      },
    },
  },
} as const

/**
 * Power Meters Demo
 *
 * Interactive demonstration of power meter monitoring with various scenarios
 */
export const PowerMetersDemo = (): ReactElement => {
  const [scenario, setScenario] = useState<keyof typeof DEMO_PRESETS>('singleMeter')

  return (
    <div className="power-meters-demo">
      <div className="power-meters-demo__controls">
        <h3>Select Scenario</h3>
        <div className="power-meters-demo__buttons">
          <Button
            variant={scenario === 'singleMeter' ? 'primary' : 'secondary'}
            onClick={() => setScenario('singleMeter')}
          >
            Single Meter
          </Button>
          <Button
            variant={scenario === 'dualMeters' ? 'primary' : 'secondary'}
            onClick={() => setScenario('dualMeters')}
          >
            Dual Meters
          </Button>
          <Button
            variant={scenario === 'highLoad' ? 'primary' : 'secondary'}
            onClick={() => setScenario('highLoad')}
          >
            High Load
          </Button>
          <Button
            variant={scenario === 'lowPowerFactor' ? 'primary' : 'secondary'}
            onClick={() => setScenario('lowPowerFactor')}
          >
            Low Power Factor
          </Button>
          <Button
            variant={scenario === 'communicationError' ? 'primary' : 'secondary'}
            onClick={() => setScenario('communicationError')}
          >
            Comm Error
          </Button>
          <Button
            variant={scenario === 'mixedStatus' ? 'primary' : 'secondary'}
            onClick={() => setScenario('mixedStatus')}
          >
            Mixed Status
          </Button>
          <Button
            variant={scenario === 'usFrequency' ? 'primary' : 'secondary'}
            onClick={() => setScenario('usFrequency')}
          >
            US 60Hz
          </Button>
        </div>
      </div>

      <div className="power-meters-demo__preview">
        <PowerMeters data={DEMO_PRESETS[scenario] as Device} />
      </div>
    </div>
  )
}
