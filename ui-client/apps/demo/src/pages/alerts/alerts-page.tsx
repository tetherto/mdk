import { useMemo, useState } from 'react'

import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'

import { Button, Checkbox, Typography } from '@tetherto/mdk-core-ui'
import type { Alert, Device } from '@tetherto/mdk-foundation-ui'
import { Alerts, devicesSlice, SEVERITY, timezoneSlice } from '@tetherto/mdk-foundation-ui'

import './alerts-page.scss'

const store = configureStore({
  reducer: {
    devices: devicesSlice.reducer,
    timezone: timezoneSlice.reducer,
  },
})

const SEVERITIES = [SEVERITY.CRITICAL, SEVERITY.HIGH, SEVERITY.MEDIUM] as const

const buildAlert = (i: number): Alert => ({
  uuid: `alert-uuid-${i + 1}`,
  id: `device-${(i % 6) + 1}`,
  name: ['Overheating', 'Hashrate drop', 'Network outage', 'Pool disconnect'][i % 4] ?? 'Unknown',
  description: 'Detected anomaly during routine telemetry sweep',
  message: i % 2 === 0 ? 'sensor value above threshold' : undefined,
  severity: SEVERITIES[i % SEVERITIES.length] as string,
  createdAt: Date.now() - i * 5 * 60_000,
  code: `code-${i}`,
})

const CONTAINERS = ['as-hk3-0001', 'as-hk3-0002', 'as-hk3-0003']

const buildDevice = (i: number, alerts: Alert[]): Device =>
  ({
    id: `device-${i + 1}`,
    code: `M-${String(i + 1).padStart(3, '0')}`,
    type: 'miner-bitmain-s19j-pro',
    address: `10.0.0.${i + 10}`,
    tags: [`code-M-${String(i + 1).padStart(3, '0')}`, 't-miner'],
    info: {
      container: CONTAINERS[i % CONTAINERS.length],
      pos: `${(i % 4) + 1}-${(i % 8) + 1}`,
      macAddress: `00:11:22:33:44:${String(i).padStart(2, '0')}`,
      serialNum: `SN-${1000 + i}`,
    },
    last: {
      ts: Date.now() - i * 60_000,
      snap: {
        config: { firmware_ver: 'v1.2.3' },
        stats: {
          status: i % 4 === 0 ? 'offline' : i % 4 === 1 ? 'sleeping' : 'mining',
        },
      },
      alerts: alerts.filter((a) => a.id === `device-${i + 1}`),
    },
  }) as unknown as Device

const buildHistoricalAlert = (i: number, devices: Device[]): Alert => {
  const device = devices[i % devices.length]
  return {
    ...buildAlert(i + 100),
    createdAt: Date.now() - (i + 1) * 6 * 60 * 60_000,
    thing: device,
  }
}

const DEMO_ALERTS: Alert[] = Array.from({ length: 18 }, (_, i) => buildAlert(i))
const DEMO_DEVICES: Device[] = Array.from({ length: 12 }, (_, i) => buildDevice(i, DEMO_ALERTS))
const DEMO_DEVICES_PAYLOAD: Device[][] = [DEMO_DEVICES]
const DEMO_HISTORICAL_ALERTS: Alert[] = Array.from({ length: 24 }, (_, i) =>
  buildHistoricalAlert(i, DEMO_DEVICES),
)

const AlertsDemoBody = (): JSX.Element => {
  const [historicalEnabled, setHistoricalEnabled] = useState(true)
  const [selectedAlertId, setSelectedAlertId] = useState<string | undefined>(undefined)

  const header = useMemo(
    () => (
      <div className="alerts-demo-toolbar">
        <Typography variant="heading2">Alerts</Typography>
        <label className="alerts-demo-toolbar__toggle">
          <Checkbox
            checked={historicalEnabled}
            onCheckedChange={(checked) => setHistoricalEnabled(checked === true)}
          />
          <Typography variant="body">Historical alerts log</Typography>
        </label>
        {selectedAlertId ? (
          <Button variant="secondary" size="sm" onClick={() => setSelectedAlertId(undefined)}>
            Clear selected alert ({selectedAlertId})
          </Button>
        ) : null}
      </div>
    ),
    [historicalEnabled, selectedAlertId],
  )

  return (
    <div className="alerts-demo-page" style={{ padding: 24 }}>
      <Alerts
        header={header}
        devices={DEMO_DEVICES_PAYLOAD}
        historicalAlerts={DEMO_HISTORICAL_ALERTS}
        isHistoricalAlertsEnabled={historicalEnabled}
        selectedAlertId={selectedAlertId}
        isDemoMode
        onAlertClick={(_id, uuid) => setSelectedAlertId(uuid)}
      />
    </div>
  )
}

export const AlertsPageDemo = (): JSX.Element => (
  <Provider store={store}>
    <AlertsDemoBody />
  </Provider>
)
