/**
 * Runnable example for the Alerts feature page.
 *
 * Wrap the app in `<MdkProvider>` — the embedded tables read filter tags from
 * the devices store and the historical log uses the timezone formatter hook.
 */
import type { Alert } from '@tetherto/mdk-react-devkit'
import { Alerts } from '@tetherto/mdk-react-devkit'

const NOW = Date.now()
const MIN = 60 * 1000
const DAY = 24 * 60 * MIN

// The current-alerts table derives rows from `device.last.alerts`. We cast to
// `never` to avoid duplicating the full `Device` type in the example.
const mockDevices = [
  [
    {
      id: 'miner-A1',
      last: {
        alerts: [
          {
            id: '1',
            uuid: 'alrt-1',
            severity: 'critical',
            name: 'miner_offline',
            description: 'Miner 0xA1 has stopped reporting.',
            code: '001',
            createdAt: NOW - 2 * MIN,
          },
        ],
      },
    },
  ],
]

const mockHistorical: Alert[] = [
  {
    id: '2',
    uuid: 'alrt-2',
    severity: 'warning',
    name: 'temp_high',
    description: 'Container 03 exceeded 78°C.',
    code: '002',
    createdAt: NOW - 3 * DAY,
    thing: { id: 'container-03' },
  },
]

export const AlertsExample = () => {
  return (
    <Alerts
      devices={mockDevices as never}
      historicalAlerts={mockHistorical}
      isHistoricalAlertsEnabled
      isDemoMode
      onAlertClick={(id, uuid) => {
        // eslint-disable-next-line no-console
        console.log('open alert', { id, uuid })
      }}
      onDateRangeChange={(range) => {
        // eslint-disable-next-line no-console
        console.log('historical range changed', range)
      }}
    />
  )
}
