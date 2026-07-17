/**
 * Synthetic fixture builders for the Alerts demo page.
 *
 * IMPORTANT — this file is the "mock factory" the page demo consumes
 * in lieu of a real adapter hook. In a production app the page would
 * replace these arrays with the output of:
 *
 *   - `useActiveIncidents()` from `@tetherto/mdk-react-adapter`
 *     (live alerts feed, polls the list-things endpoint)
 *   - your own ext-data hook for historical alerts
 *
 * Tag strings such as `t-miner` and `code-…` live here intentionally —
 * they're fixture data, not production guidance. Real callers should
 * never hand-build a `Device` payload.
 */

import type { Alert, Device } from '@tetherto/mdk-react-devkit/domain'
import { SEVERITY } from '@tetherto/mdk-react-devkit/domain'

const SEVERITIES = [SEVERITY.CRITICAL, SEVERITY.HIGH, SEVERITY.MEDIUM] as const

const CONTAINERS = ['as-hk3-0001', 'as-hk3-0002', 'as-hk3-0003']

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

export const DEMO_ALERTS: Alert[] = Array.from({ length: 18 }, (_, i) => buildAlert(i))
export const DEMO_DEVICES: Device[] = Array.from({ length: 12 }, (_, i) =>
  buildDevice(i, DEMO_ALERTS),
)
export const DEMO_DEVICES_PAYLOAD: Device[][] = [DEMO_DEVICES]
export const DEMO_HISTORICAL_ALERTS: Alert[] = Array.from({ length: 24 }, (_, i) =>
  buildHistoricalAlert(i, DEMO_DEVICES),
)
