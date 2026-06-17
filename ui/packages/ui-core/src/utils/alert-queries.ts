/**
 * Query-parameter builders for the Alerts page. Centralised here so the
 * adapter hooks (`useCurrentAlertDevices`, `useHistoricalAlerts`) derive their
 * `list-things` / `history-log` params from one place — no Mongo-selector or
 * field strings leak into hooks or page files.
 *
 * Mirrors Moria's alerts data path: current alerts come from `list-things`
 * (devices carrying `last.alerts`), historical alerts from `history-log`
 * (`logType='alerts'`).
 *
 * @category alerts
 */

import type { HistoryLogParams, ListThingsParams } from '../types/api-mining.types'
import { getByTagsWithAlertsQuery } from './query-utils'

/** One day in milliseconds — the historical-log fetch window size. */
export const ONE_DAY_MS = 24 * 60 * 60 * 1_000

/**
 * Default historical-alerts look-back window (14 days), matching the devkit
 * `<Alerts>` feature default. Wider ranges fan out into more 24h requests —
 * see {@link fetchHistoricalAlertsInChunks}.
 */
export const DEFAULT_HISTORICAL_WINDOW_MS = 14 * ONE_DAY_MS

/**
 * Default historical-alerts range: the last {@link DEFAULT_HISTORICAL_WINDOW_MS}
 * ending now. Used by the devkit `<Alerts>` feature and the shell Alerts page
 * to seed their range state.
 *
 * @param now Upper bound of the window (ms epoch); injectable for tests.
 * @category alerts
 */
export const getDefaultHistoricalAlertsRange = (now: number = Date.now()): HistoricalAlertsRange => ({
  start: now - DEFAULT_HISTORICAL_WINDOW_MS,
  end: now,
})

/**
 * Mongo-style selector + field projection for the current-alerts table.
 * Wider than the dashboard bell's `useActiveIncidents` query because the
 * `<CurrentAlerts>` table derives filter tokens (`ip-`, `sn-`, `mac-`,
 * `firmware-`) and the row status from these extra fields.
 */
const CURRENT_ALERT_DEVICES_FIELDS = JSON.stringify({
  id: 1,
  type: 1,
  tags: 1,
  code: 1,
  info: 1,
  address: 1,
  'opts.address': 1,
  'last.alerts': 1,
  'last.snap.stats.status': 1,
  'last.snap.config.firmware_ver': 1,
})

/** Upper bound on devices fetched for the current-alerts table (matches Moria). */
const CURRENT_ALERT_DEVICES_LIMIT = 1000

/**
 * `list-things` params for the current-alerts table: every device that
 * currently carries one or more alerts, with the fields the `<CurrentAlerts>`
 * table reads. Consumed by `useCurrentAlertDevices`.
 *
 * `filterTags` (the alerts search chips) widen the selector server-side the
 * way Moria does — `$or` over `last.alerts ≠ null`, alert names, and the
 * tag-filter query — so the fetch narrows with the search instead of relying
 * on client-side filtering alone.
 *
 * @category alerts
 */
export const buildCurrentAlertDevicesParams = (filterTags: string[] = []): ListThingsParams => ({
  status: 1,
  query: getByTagsWithAlertsQuery(filterTags, false),
  fields: CURRENT_ALERT_DEVICES_FIELDS,
  limit: CURRENT_ALERT_DEVICES_LIMIT,
})

/** Time window (ms epoch) for a historical-alerts fetch. */
export type HistoricalAlertsRange = {
  start: number
  end: number
}

/**
 * `history-log` params for a single alerts window. The chunked fetch
 * (`useHistoricalAlerts`) calls this once per 24h sub-window.
 *
 * @category alerts
 */
export const buildHistoricalAlertsParams = (range: HistoricalAlertsRange): HistoryLogParams => ({
  logType: 'alerts',
  start: range.start,
  end: range.end,
})
