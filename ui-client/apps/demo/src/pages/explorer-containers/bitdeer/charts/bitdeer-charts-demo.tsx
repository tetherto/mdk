import type { UnknownRecord } from '@mdk/core'
import { Button } from '@mdk/core'
import type { ReactElement } from 'react'
import { useState } from 'react'

import { BitdeerTankPressureCharts, BitdeerTankTempCharts } from '@mdk/foundation'
import './bitdeer-charts-demo.scss'

const CHART_HEIGHT = 300
/**
 * Bitdeer Charts Demo Component
 *
 * Demonstrates Tank Pressure and Tank Temperature charts
 * with various data scenarios and timelines.
 */
export const BitdeerChartsDemo = (): ReactElement => {
  const defaultTimeline = '5m'
  const [activeScenario, setActiveScenario] = useState<string>('normal')

  // Generate mock time-series data in the correct format for ContainerChartsBuilder
  const generateMockData = (
    scenario: string,
    containerTag: string = 'demo-container',
  ): UnknownRecord[] => {
    const dataPoints = 100
    const interval = 15 * 60 * 1000 // 15 minutes in milliseconds
    const endTime = Date.now()
    const startTime = endTime - dataPoints * interval

    const data: UnknownRecord[] = []

    for (let i = 0; i < dataPoints; i++) {
      const timestamp = startTime + i * interval
      const ts = Math.floor(timestamp / 1000) // Unix timestamp in seconds

      // Base values based on scenario
      let baseTemp = 40
      let basePressure = 2.3

      switch (scenario) {
        case 'high':
          baseTemp = 50
          basePressure = 2.8
          break
        case 'low':
          baseTemp = 30
          basePressure = 1.8
          break
        case 'fluctuating':
          baseTemp = 40 + Math.sin(i / 10) * 10
          basePressure = 2.3 + Math.sin(i / 10) * 0.5
          break
        default:
          baseTemp = 40
          basePressure = 2.3
      }

      // Add realistic variation
      const tempVariation = (Math.random() - 0.5) * 3
      const pressureVariation = (Math.random() - 0.5) * 0.2

      // Create data point in the expected nested structure
      data.push({
        ts, // Timestamp in seconds
        container_specific_stats_group_aggr: {
          [containerTag]: {
            // Tank 1 temperatures
            cold_temp_c_1_group: Number((baseTemp - 5 + tempVariation).toFixed(1)),
            hot_temp_c_1_group: Number((baseTemp + 5 + tempVariation).toFixed(1)),
            cold_temp_c_w_1_group: Number((baseTemp - 8 + tempVariation).toFixed(1)),
            hot_temp_c_w_1_group: Number((baseTemp + 3 + tempVariation).toFixed(1)),

            // Tank 2 temperatures
            cold_temp_c_2_group: Number((baseTemp - 4 + tempVariation).toFixed(1)),
            hot_temp_c_2_group: Number((baseTemp + 6 + tempVariation).toFixed(1)),
            cold_temp_c_w_2_group: Number((baseTemp - 7 + tempVariation).toFixed(1)),
            hot_temp_c_w_2_group: Number((baseTemp + 4 + tempVariation).toFixed(1)),

            // Tank pressures
            tank1_bar_group: Number((basePressure + pressureVariation).toFixed(1)),
            tank2_bar_group: Number((basePressure - 0.1 + pressureVariation).toFixed(1)),
          },
        },
      })
    }
    return data
  }

  const scenarios = {
    normal: {
      title: 'Normal Operation',
      description: 'Typical operating conditions with stable temperatures and pressure',
      data: generateMockData('normal'),
    },
    high: {
      title: 'High Temperature',
      description: 'Elevated temperatures with increased pressure',
      data: generateMockData('high'),
    },
    low: {
      title: 'Low Temperature',
      description: 'Reduced temperatures with lower pressure',
      data: generateMockData('low'),
    },
    fluctuating: {
      title: 'Fluctuating Conditions',
      description: 'Variable temperatures and pressure readings',
      data: generateMockData('fluctuating'),
    },
  }

  const currentScenario = scenarios[activeScenario as keyof typeof scenarios]

  return (
    <div className="bitdeer-charts-demo">
      {/* Scenario Selector */}
      <section className="bitdeer-charts-demo__scenarios">
        <h2>Select Scenario</h2>
        <div className="bitdeer-charts-demo__scenario-buttons">
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

      {/* Charts Demo */}
      <section className="bitdeer-charts-demo__charts">
        {/* Tank Pressure Chart */}
        <div className="bitdeer-charts-demo__chart-card">
          <div className="bitdeer-charts-demo__chart-wrapper">
            <BitdeerTankPressureCharts
              tag="demo-container"
              chartTitle="Tank Pressure"
              data={currentScenario.data}
              timeline={defaultTimeline}
              height={CHART_HEIGHT}
            />
          </div>
        </div>

        {/* Tank 1 Temperature Chart */}
        <div className="bitdeer-charts-demo__chart-card">
          <div className="bitdeer-charts-demo__chart-wrapper">
            <BitdeerTankTempCharts
              tag="demo-container"
              tankNumber={1}
              data={currentScenario.data}
              timeline={defaultTimeline}
              height={CHART_HEIGHT}
            />
          </div>
        </div>

        {/* Tank 2 Temperature Chart */}
        <div className="bitdeer-charts-demo__chart-card">
          <div className="bitdeer-charts-demo__chart-wrapper">
            <BitdeerTankTempCharts
              tag="demo-container"
              tankNumber={2}
              data={currentScenario.data}
              timeline={defaultTimeline}
              height={CHART_HEIGHT}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

export default BitdeerChartsDemo
