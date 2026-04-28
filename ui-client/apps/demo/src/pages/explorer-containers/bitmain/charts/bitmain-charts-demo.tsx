import type { UnknownRecord } from '@tetherto/core'
import { Button } from '@tetherto/core'
import {
  BitMainHydroLiquidTemperatureCharts,
  BitMainLiquidPressureCharts,
  BitMainLiquidTempCharts,
  BitMainPowerCharts,
  BitMainSupplyLiquidFlowCharts,
} from '@tetherto/foundation'
import type { ReactElement } from 'react'
import { useState } from 'react'
import './bitmain-charts-demo.scss'

/**
 * Bitmain Charts Demo Component
 *
 * Demonstrates all Bitmain container charts:
 * - Hydro Liquid Temperature
 * - Liquid Pressure
 * - Liquid Temperature
 * - Power Consumption
 * - Supply Liquid Flow
 */
export const BitmainChartsDemo = (): ReactElement => {
  const defaultTimeline = '5m'
  const [activeScenario, setActiveScenario] = useState<string>('normal')

  // Generate mock time-series data
  const generateMockData = (
    scenario: string,
    containerTag: string = 'bitmain-demo-container',
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
      let baseSupplyTemp = 22
      let baseReturnTemp = 25
      let baseSecSupplyTemp1 = 20
      let baseSecSupplyTemp2 = 19.5
      let baseSupplyPressure = 0.25 // MPa (2.5 bar)
      let baseReturnPressure = 0.23 // MPa (2.3 bar)
      let baseBox1Power = 50 // kW
      let baseBox2Power = 48 // kW
      let baseFlow = 48 // m³/h

      switch (scenario) {
        case 'high':
          baseSupplyTemp = 30
          baseReturnTemp = 33
          baseSecSupplyTemp1 = 28
          baseSecSupplyTemp2 = 27.5
          baseSupplyPressure = 0.35
          baseReturnPressure = 0.33
          baseBox1Power = 70
          baseBox2Power = 68
          baseFlow = 65
          break
        case 'low':
          baseSupplyTemp = 15
          baseReturnTemp = 18
          baseSecSupplyTemp1 = 15
          baseSecSupplyTemp2 = 14.5
          baseSupplyPressure = 0.15
          baseReturnPressure = 0.13
          baseBox1Power = 30
          baseBox2Power = 28
          baseFlow = 30
          break
        case 'fluctuating':
          baseSupplyTemp = 22 + Math.sin(i / 10) * 5
          baseReturnTemp = 25 + Math.sin(i / 10) * 5
          baseSecSupplyTemp1 = 20 + Math.sin(i / 10) * 5
          baseSecSupplyTemp2 = 19.5 + Math.sin(i / 10) * 5
          baseSupplyPressure = 0.25 + Math.sin(i / 10) * 0.1
          baseReturnPressure = 0.23 + Math.sin(i / 10) * 0.1
          baseBox1Power = 50 + Math.sin(i / 10) * 15
          baseBox2Power = 48 + Math.sin(i / 10) * 15
          baseFlow = 48 + Math.sin(i / 10) * 10
          break
        case 'imbalanced':
          baseSupplyTemp = 22
          baseReturnTemp = 25
          baseSecSupplyTemp1 = 20
          baseSecSupplyTemp2 = 19.5
          baseSupplyPressure = 0.25
          baseReturnPressure = 0.23
          baseBox1Power = 65
          baseBox2Power = 35
          baseFlow = 48
          break
        default:
          // normal - use defaults
          break
      }

      // Add realistic variation
      const tempVariation = (Math.random() - 0.5) * 2
      const pressureVariation = (Math.random() - 0.5) * 0.02
      const powerVariation = (Math.random() - 0.5) * 4
      const flowVariation = (Math.random() - 0.5) * 3

      data.push({
        ts,
        container_specific_stats_group_aggr: {
          [containerTag]: {
            // Liquid temperatures
            supply_liquid_temp_group: Number((baseSupplyTemp + tempVariation).toFixed(1)),
            return_liquid_temp_group: Number((baseReturnTemp + tempVariation).toFixed(1)),

            // Hydro liquid temperatures
            second_supply_temp1_group: Number((baseSecSupplyTemp1 + tempVariation).toFixed(1)),
            second_supply_temp2_group: Number((baseSecSupplyTemp2 + tempVariation).toFixed(1)),

            // Pressures (in MPa)
            supply_liquid_pressure_group: Number(
              (baseSupplyPressure + pressureVariation).toFixed(3),
            ),
            return_liquid_pressure_group: Number(
              (baseReturnPressure + pressureVariation).toFixed(3),
            ),

            // Power (in kW)
            distribution_box1_power_group: Number((baseBox1Power + powerVariation).toFixed(2)),
            distribution_box2_power_group: Number((baseBox2Power + powerVariation).toFixed(2)),

            // Flow (in m³/h)
            supply_liquid_flow_group: Number((baseFlow + flowVariation).toFixed(2)),
          },
        },
      })
    }
    return data
  }

  const scenarios = {
    normal: {
      title: 'Normal Operation',
      description: 'Typical operating conditions with stable readings across all metrics',
      data: generateMockData('normal'),
    },
    high: {
      title: 'High Load',
      description: 'Elevated temperatures, pressures, power consumption, and flow rates',
      data: generateMockData('high'),
    },
    low: {
      title: 'Low Load',
      description: 'Reduced temperatures, pressures, power consumption, and flow rates',
      data: generateMockData('low'),
    },
    fluctuating: {
      title: 'Fluctuating Conditions',
      description: 'Variable readings across all metrics simulating dynamic load changes',
      data: generateMockData('fluctuating'),
    },
    imbalanced: {
      title: 'Imbalanced Power',
      description: 'Uneven power distribution between distribution boxes',
      data: generateMockData('imbalanced'),
    },
  }

  const currentScenario = scenarios[activeScenario as keyof typeof scenarios]

  return (
    <div className="bitmain-charts-demo">
      {/* Scenario Selector */}
      <section className="bitmain-charts-demo__scenarios">
        <h2>Select Scenario</h2>
        <div className="bitmain-charts-demo__scenario-buttons">
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
      <section className="bitmain-charts-demo__charts">
        {/* Power Consumption Chart */}
        <div className="bitmain-charts-demo__chart-card">
          <div className="bitmain-charts-demo__chart-wrapper">
            <BitMainPowerCharts
              tag="bitmain-demo-container"
              chartTitle="Power Consumption"
              data={currentScenario.data}
              timeline={defaultTimeline}
              showLegend={true}
              showRangeSelector={true}
            />
          </div>
        </div>

        {/* Liquid Temperature Chart */}
        <div className="bitmain-charts-demo__chart-card">
          <div className="bitmain-charts-demo__chart-wrapper">
            <BitMainLiquidTempCharts
              tag="bitmain-demo-container"
              chartTitle="Liquid Temperature"
              data={currentScenario.data}
              timeline={defaultTimeline}
              showLegend={true}
              showRangeSelector={true}
            />
          </div>
        </div>

        {/* Hydro Liquid Temperature Chart */}
        <div className="bitmain-charts-demo__chart-card">
          <div className="bitmain-charts-demo__chart-wrapper">
            <BitMainHydroLiquidTemperatureCharts
              tag="bitmain-demo-container"
              chartTitle="Hydro Liquid Temperature"
              data={currentScenario.data}
              timeline={defaultTimeline}
              showLegend={true}
              showRangeSelector={true}
            />
          </div>
        </div>

        {/* Liquid Pressure Chart */}
        <div className="bitmain-charts-demo__chart-card">
          <div className="bitmain-charts-demo__chart-wrapper">
            <BitMainLiquidPressureCharts
              tag="bitmain-demo-container"
              chartTitle="Liquid Pressure"
              data={currentScenario.data}
              timeline={defaultTimeline}
              showLegend={true}
              showRangeSelector={true}
            />
          </div>
        </div>

        {/* Supply Liquid Flow Chart */}
        <div className="bitmain-charts-demo__chart-card">
          <div className="bitmain-charts-demo__chart-wrapper">
            <BitMainSupplyLiquidFlowCharts
              tag="bitmain-demo-container"
              chartTitle="Supply Liquid Flow"
              data={currentScenario.data}
              timeline={defaultTimeline}
              showLegend={false}
              showRangeSelector={true}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

export default BitmainChartsDemo
