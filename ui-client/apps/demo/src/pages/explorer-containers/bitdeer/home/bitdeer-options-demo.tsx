import type { UnknownRecord } from '@tetherto/mdk-core-ui'
import { Button } from '@tetherto/mdk-core-ui'
import { BitdeerOptions } from '@tetherto/mdk-foundation-ui'
import type { ReactElement } from 'react'
import { useState } from 'react'
import './bitdeer-options-demo.scss'

/**
 * Dry Cooler Demo Component
 *
 * Demonstrates various states and configurations of the DryCooler component
 * including different fan states, pump configurations, and cooler statuses.
 */
export const BitdeerOptionsDemo = (): ReactElement => {
  const [activeScenario, setActiveScenario] = useState<string>('normal')

  // Scenario 1: Normal operation - both coolers running
  const normalData: UnknownRecord = {
    type: 'container-bd-d40',
    status: 'online',
    last: {
      snap: {
        stats: {
          container_specific: {
            cooling_system: {
              exhaust_fan_enabled: true,
              dry_cooler: [
                {
                  index: 0,
                  enabled: true,
                  fans: [
                    { index: 0, status: 'running', rpm: 1200, enabled: true },
                    { index: 1, status: 'running', rpm: 1180, enabled: true },
                    { index: 2, status: 'running', rpm: 1210, enabled: true },
                    { index: 3, status: 'running', rpm: 1190, enabled: true },
                    { index: 4, status: 'running', rpm: 1200, enabled: true },
                    { index: 5, status: 'running', rpm: 1185, enabled: true },
                    { index: 6, status: 'running', rpm: 1195, enabled: true },
                    { index: 7, status: 'running', rpm: 1205, enabled: true },
                  ],
                },
                {
                  index: 1,
                  enabled: true,
                  fans: [
                    { index: 0, status: 'running', rpm: 1150, enabled: true },
                    { index: 1, status: 'running', rpm: 1160, enabled: true },
                    { index: 2, status: 'running', rpm: 1170, enabled: true },
                    { index: 3, status: 'running', rpm: 1165, enabled: true },
                    { index: 4, status: 'running', rpm: 1155, enabled: true },
                    { index: 5, status: 'running', rpm: 1175, enabled: true },
                    { index: 6, status: 'running', rpm: 1158, enabled: true },
                    { index: 7, status: 'running', rpm: 1162, enabled: true },
                  ],
                },
              ],
              oil_pump: [
                { index: 0, status: 'running', enabled: true },
                { index: 1, status: 'running', enabled: true },
              ],
              water_pump: [
                { index: 0, status: 'running', enabled: true },
                { index: 1, status: 'running', enabled: true },
              ],
            },
          },
        },
      },
    },
  }

  // Scenario 2: One cooler off
  const oneCoolerOffData: UnknownRecord = {
    ...normalData,
    last: {
      snap: {
        stats: {
          container_specific: {
            cooling_system: {
              dry_cooler: [
                {
                  index: 0,
                  enabled: true,
                  fans: [
                    { index: 0, status: 'running', rpm: 1200, enabled: true },
                    { index: 1, status: 'running', rpm: 1180, enabled: true },
                    { index: 2, status: 'running', rpm: 1210, enabled: true },
                    { index: 3, status: 'running', rpm: 1190, enabled: true },
                    { index: 4, status: 'running', rpm: 1200, enabled: true },
                    { index: 5, status: 'running', rpm: 1185, enabled: true },
                    { index: 6, status: 'running', rpm: 1195, enabled: true },
                    { index: 7, status: 'running', rpm: 1205, enabled: true },
                  ],
                },
                {
                  index: 1,
                  enabled: false,
                  fans: [
                    { index: 0, status: 'off', rpm: 0, enabled: false },
                    { index: 1, status: 'off', rpm: 0, enabled: false },
                    { index: 2, status: 'off', rpm: 0, enabled: false },
                    { index: 3, status: 'off', rpm: 0, enabled: false },
                    { index: 4, status: 'off', rpm: 0, enabled: false },
                    { index: 5, status: 'off', rpm: 0, enabled: false },
                    { index: 6, status: 'off', rpm: 0, enabled: false },
                    { index: 7, status: 'off', rpm: 0, enabled: false },
                  ],
                },
              ],
              oil_pump: [
                { index: 0, status: 'running', enabled: true },
                { index: 1, status: 'off', enabled: false },
              ],
              water_pump: [
                { index: 0, status: 'running', enabled: true },
                { index: 1, status: 'off', enabled: false },
              ],
            },
          },
        },
      },
    },
  }

  // Scenario 3: Mixed fan states
  const mixedFansData: UnknownRecord = {
    ...normalData,
    last: {
      snap: {
        stats: {
          container_specific: {
            cooling_system: {
              dry_cooler: [
                {
                  index: 0,
                  enabled: true,
                  fans: [
                    { index: 0, status: 'running', rpm: 1200, enabled: true },
                    { index: 1, status: 'warning', rpm: 800, enabled: true },
                    { index: 2, status: 'running', rpm: 1210, enabled: true },
                    { index: 3, status: 'error', rpm: 0, enabled: false },
                    { index: 4, status: 'running', rpm: 1200, enabled: true },
                    { index: 5, status: 'running', rpm: 1185, enabled: true },
                    { index: 6, status: 'warning', rpm: 900, enabled: true },
                    { index: 7, status: 'running', rpm: 1205, enabled: true },
                  ],
                },
                {
                  index: 1,
                  enabled: true,
                  fans: [
                    { index: 0, status: 'running', rpm: 1150, enabled: true },
                    { index: 1, status: 'running', rpm: 1160, enabled: true },
                    { index: 2, status: 'error', rpm: 0, enabled: false },
                    { index: 3, status: 'running', rpm: 1165, enabled: true },
                    { index: 4, status: 'running', rpm: 1155, enabled: true },
                    { index: 5, status: 'warning', rpm: 850, enabled: true },
                    { index: 6, status: 'running', rpm: 1158, enabled: true },
                    { index: 7, status: 'running', rpm: 1162, enabled: true },
                  ],
                },
              ],
              oil_pump: [
                { index: 0, status: 'running', enabled: true },
                { index: 1, status: 'warning', enabled: true },
              ],
              water_pump: [
                { index: 0, status: 'running', enabled: true },
                { index: 1, status: 'running', enabled: true },
              ],
            },
          },
        },
      },
    },
  }

  // Scenario 4: Single cooler only
  const singleCoolerData: UnknownRecord = {
    ...normalData,
    container_specific: {
      cooling_system: {
        dry_cooler: [
          {
            index: 0,
            enabled: true,
            fans: [
              { index: 0, status: 'running', rpm: 1200, enabled: true },
              { index: 1, status: 'running', rpm: 1180, enabled: true },
              { index: 2, status: 'running', rpm: 1210, enabled: true },
              { index: 3, status: 'running', rpm: 1190, enabled: true },
              { index: 4, status: 'running', rpm: 1200, enabled: true },
              { index: 5, status: 'running', rpm: 1185, enabled: true },
              { index: 6, status: 'running', rpm: 1195, enabled: true },
              { index: 7, status: 'running', rpm: 1205, enabled: true },
            ],
          },
        ],
        oil_pump: [{ index: 0, status: 'running', enabled: true }],
        water_pump: [{ index: 0, status: 'running', enabled: true }],
      },
    },
  }

  // Scenario 5: No data (empty state)
  const emptyData: UnknownRecord = {
    type: 'container-bd-d40',
    status: 'offline',
    last: {
      snap: {
        stats: {
          container_specific: {
            cooling_system: {},
          },
        },
      },
    },
  }

  // Scenario 6: No status info (unavailable)
  const unavailableData: UnknownRecord = {
    ...normalData,
    last: {
      snap: {
        stats: {
          container_specific: {
            cooling_system: {
              dry_cooler: [
                {
                  index: 0,
                  fans: [
                    { index: 0, rpm: 1200 },
                    { index: 1, rpm: 1180 },
                    { index: 2, rpm: 1210 },
                    { index: 3, rpm: 1190 },
                    { index: 4, rpm: 1200 },
                    { index: 5, rpm: 1185 },
                    { index: 6, rpm: 1195 },
                    { index: 7, rpm: 1205 },
                  ],
                },
                {
                  index: 1,
                  fans: [
                    { index: 0, rpm: 1150 },
                    { index: 1, rpm: 1160 },
                    { index: 2, rpm: 1170 },
                    { index: 3, rpm: 1165 },
                    { index: 4, rpm: 1155 },
                    { index: 5, rpm: 1175 },
                    { index: 6, rpm: 1158 },
                    { index: 7, rpm: 1162 },
                  ],
                },
              ],
              oil_pump: [{}, {}],
              water_pump: [{}, {}],
            },
          },
        },
      },
    },
  }

  // Scenario 7: All systems off
  const allOffData: UnknownRecord = {
    ...normalData,
    status: 'offline',
    last: {
      snap: {
        stats: {
          container_specific: {
            cooling_system: {
              dry_cooler: [
                {
                  index: 0,
                  enabled: false,
                  fans: Array.from({ length: 8 })
                    .fill(null)
                    .map((_, i) => ({ index: i, status: 'off', rpm: 0, enabled: false })),
                },
                {
                  index: 1,
                  enabled: false,
                  fans: Array.from({ length: 8 })
                    .fill(null)
                    .map((_, i) => ({ index: i, status: 'off', rpm: 0, enabled: false })),
                },
              ],
              oil_pump: [
                { index: 0, status: 'off', enabled: false },
                { index: 1, status: 'off', enabled: false },
              ],
              water_pump: [
                { index: 0, status: 'off', enabled: false },
                { index: 1, status: 'off', enabled: false },
              ],
            },
          },
        },
      },
    },
  }

  const scenarios = {
    normal: {
      title: 'Normal Operation',
      description: 'Both dry coolers running with all fans operational',
      data: normalData,
    },
    oneCoolerOff: {
      title: 'One Cooler Off',
      description: 'Cooler 1 running, Cooler 2 is off',
      data: oneCoolerOffData,
    },
    mixedFans: {
      title: 'Mixed Fan States',
      description: 'Some fans running, some with warnings, some failed',
      data: mixedFansData,
    },
    singleCooler: {
      title: 'Single Cooler',
      description: 'Only one cooler configured',
      data: singleCoolerData,
    },
    empty: {
      title: 'No Data',
      description: 'Empty state with no cooling system data',
      data: emptyData,
    },
    unavailable: {
      title: 'Status Unavailable',
      description: 'Coolers without status information',
      data: unavailableData,
    },
    allOff: {
      title: 'All Systems Off',
      description: 'Container offline, all cooling systems stopped',
      data: allOffData,
    },
  }

  const currentScenario = scenarios[activeScenario as keyof typeof scenarios]

  return (
    <div className="dry-cooler-demo">
      {/* Scenario Selector */}
      <section className="dry-cooler-demo__scenarios">
        <h2>Select Scenario</h2>
        <div className="dry-cooler-demo__scenario-buttons">
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
      <section className="dry-cooler-demo__component">
        <h2>Component Output</h2>
        <div className="dry-cooler-demo__component-wrapper">
          <BitdeerOptions data={currentScenario.data} />
        </div>
      </section>
    </div>
  )
}
