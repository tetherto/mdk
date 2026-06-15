/**
 * Map raw `list-things` device payloads into `ActiveIncidentsCard` rows.
 *
 * Adapted from Moria's `src/app/utils/alertUtils.ts` (`getAlertsForDevices` +
 * `getAlertsSortedByGeneralFields`) but cut down to the dashboard-card path:
 * no SEVERITY_LEVELS import, no deviceUtils coupling, no leakage/pressure
 * classification.
 */

import type { AlertSeverity, DeviceAlert, ListThingsDevice } from '../types/api-mining.types'
import { normalizeAlertSeverity, SEVERITY_WEIGHT } from './dashboard-mappers'

/**
 * Row shape consumed by `ActiveIncidentsCard`. Mirrors `TIncidentRowProps`
 * in `packages/react-devkit/src/foundation/components/active-incidents-card/`
 * (without the `onClick` callback, which is wired by the card itself).
 *
 * @category alerts
 */
export type IncidentRow = {
  id: string
  title: string
  subtitle: string
  body: string
  severity: AlertSeverity
}

const formatTimestamp = (value: number | string, format: (date: Date) => string): string => {
  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return format(date)
}

const buildSubtitle = (device: ListThingsDevice): string => {
  const container = device.info?.container ?? ''
  const pos = device.info?.pos ?? ''
  if (container && pos) return `${container} · ${pos}`
  return container || pos || device.type
}

const buildBody = (alert: DeviceAlert, formatDate: (d: Date) => string): string => {
  const ts = formatTimestamp(alert.createdAt, formatDate)
  const message = alert.message ? ` — ${alert.message}` : ''
  return `${ts} · ${alert.description}${message}`.trim()
}

/**
 * Flatten an array of devices into a list of incident rows, one per alert.
 * Devices without `last.alerts` are skipped. The output is **not yet sorted**;
 * pair with {@link sortIncidentsBySeverity} for the final list-view order.
 *
 * @category alerts
 */
export const getAlertsForDevices = (
  devices: ListThingsDevice[],
  formatDate: (d: Date) => string = (d) => d.toISOString(),
): IncidentRow[] => {
  const rows: IncidentRow[] = []
  for (const device of devices) {
    const alerts = device.last?.alerts
    if (!Array.isArray(alerts) || alerts.length === 0) continue
    for (const alert of alerts) {
      if (!alert?.name) continue
      rows.push({
        id: alert.uuid ?? `${device.id}:${alert.createdAt}:${alert.name}`,
        title: alert.name,
        subtitle: buildSubtitle(device),
        body: buildBody(alert, formatDate),
        severity: normalizeAlertSeverity(alert.severity),
      })
    }
  }
  return rows
}

/**
 * Sort rows by severity (critical → high → medium), then by `id` for
 * deterministic ordering when severities tie. Returns a new array.
 *
 * @category alerts
 */
export const sortIncidentsBySeverity = (rows: IncidentRow[]): IncidentRow[] =>
  [...rows].sort((a, b) => {
    const delta = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]
    if (delta !== 0) return delta
    return a.id.localeCompare(b.id)
  })

/**
 * One-shot helper: `devices → sorted rows`. Used by the
 * `useActiveIncidents` hook's `select` projection.
 *
 * @category alerts
 */
export const mapDevicesToIncidents = (
  devices: ListThingsDevice[],
  formatDate?: (d: Date) => string,
): IncidentRow[] => sortIncidentsBySeverity(getAlertsForDevices(devices, formatDate))
