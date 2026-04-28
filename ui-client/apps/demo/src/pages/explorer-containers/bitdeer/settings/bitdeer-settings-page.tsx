import type { UnknownRecord } from '@tetherto/core'
import { Button } from '@tetherto/core'
import type { ReactElement } from 'react'
import { useState } from 'react'

import { BitdeerSettings } from '@tetherto/foundation'
import './bitdeer-settings-page.scss'

/**
 * Bitdeer Settings Demo Component
 *
 * Demonstrates various usage scenarios of the BitdeerSettings component
 * with different data configurations and states.
 */
export const BitdeerSettingsPage = (): ReactElement => {
  const [activeScenario, setActiveScenario] = useState<string>('normal')

  // Scenario 1: Normal Operation
  const normalData: UnknownRecord = {
    type: 'container-bd-d40',
    status: 'online',
    name: 'Bitdeer Container D40',
    macAddress: '00:1B:44:11:3A:B7',
    serialNumber: 'BD-D40-2024-001',

    // Current readings
    oilTemperature: 42,
    tankPressure: 2.3,
    flowRate: 150,

    // Thresholds
    thresholds: {
      oilTemperature: {
        criticalLow: 33,
        alert: 39,
        normal: 42,
        alarm: 46,
        criticalHigh: 48,
      },
      tankPressure: {
        criticalLow: 2.0,
        alert: 2.2,
        normal: 2.3,
        alarm: 2.4,
        criticalHigh: 2.5,
      },
    },

    // Alarms configuration
    alarms: {
      oil_temp: { low_c: 33, high_c: 48 },
      water_temp: { low_c: 30, high_c: 45 },
      pressure_bar: 2.5,
    },

    // Set temperatures
    set_temps: {
      cold_oil_temp_c: 35,
      exhaust_fan_temp_c: 40,
    },
  }

  // Scenario 2: High Temperature Warning
  const highTempData: UnknownRecord = {
    ...normalData,
    oilTemperature: 47,
    status: 'warning',
  }

  // Scenario 3: Critical High Temperature
  const criticalHighData: UnknownRecord = {
    ...normalData,
    oilTemperature: 50,
    status: 'critical',
  }

  // Scenario 4: Low Pressure Warning
  const lowPressureData: UnknownRecord = {
    ...normalData,
    tankPressure: 1.8,
    status: 'warning',
  }

  // Scenario 5: Multiple Alerts
  const multipleAlertsData: UnknownRecord = {
    ...normalData,
    oilTemperature: 47,
    tankPressure: 1.9,
    status: 'warning',
  }

  // Scenario 6: Offline Container
  const offlineData: UnknownRecord = {
    ...normalData,
    status: 'offline',
    oilTemperature: 0,
    tankPressure: 0,
  }

  // Scenario 7: Minimal Data
  const minimalData: UnknownRecord = {
    type: 'container-bd-d40',
    status: 'online',
  }

  const scenarios = {
    normal: {
      title: 'Normal Operation',
      description: 'Container operating within normal parameters',
      data: normalData,
    },
    highTemp: {
      title: 'High Temperature Warning',
      description: 'Oil temperature approaching critical level',
      data: highTempData,
    },
    criticalHigh: {
      title: 'Critical High Temperature',
      description: 'Oil temperature in critical zone with sound alerts',
      data: criticalHighData,
    },
    lowPressure: {
      title: 'Low Pressure Warning',
      description: 'Tank pressure below normal range',
      data: lowPressureData,
    },
    multipleAlerts: {
      title: 'Multiple Alerts',
      description: 'Both temperature and pressure warnings active',
      data: multipleAlertsData,
    },
    offline: {
      title: 'Offline Container',
      description: 'Container is offline with no readings',
      data: offlineData,
    },
    minimal: {
      title: 'Minimal Data',
      description: 'Container with minimal configuration',
      data: minimalData,
    },
  }

  const currentScenario = scenarios[activeScenario as keyof typeof scenarios]

  return (
    <div className="bitdeer-settings-demo">
      {/* Scenario Selector */}
      <section className="bitdeer-settings-demo__scenarios">
        <h2>Select Scenario</h2>
        <div className="bitdeer-settings-demo__scenario-buttons">
          {Object.entries(scenarios).map(([key, scenario]) => (
            <Button
              key={key}
              onClick={() => setActiveScenario(key)}
              variant={activeScenario === key ? 'primary' : 'secondary'}
            >
              {scenario.title}
            </Button>
          ))}
        </div>
      </section>

      {/* Component Demo */}
      <section className="bitdeer-settings-demo__component">
        <h2>Component Output</h2>
        <div className="bitdeer-settings-demo__component-wrapper">
          <BitdeerSettings data={currentScenario.data} />
        </div>
      </section>
    </div>
  )
}
