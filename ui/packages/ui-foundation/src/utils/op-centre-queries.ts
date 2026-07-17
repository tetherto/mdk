/**
 * Operational Centre query parameter builders — the Explorer list tabs and
 * the Container Widgets realtime snapshot. Centralised so the adapter hooks
 * derive identical params from the same inputs and no `t-*` tag or
 * aggregate-field string leaks past the data layer.
 *
 * Tag sets and field projections mirror the reference app's Explorer / Site Overview
 * queries (verified against staging 2026-07-01).
 *
 * @category op-centre
 */

import type { ListThingsParams, TailLogParams } from '../types/api-mining.types'
import { appendContainerToTag } from './device-tags'
import {
  CONTAINER_LIST_THINGS_LIMIT,
  getByTagsQuery,
  getContainerByContainerTagsQuery,
  getLvCabinetDevicesByRoot,
} from './query-utils'

/** Explorer list-view tabs. */
export const EXPLORER_TAB = {
  MINER: 'miner',
  CABINET: 'cabinet',
  CONTAINER: 'container',
} as const

export type ExplorerTabValue = (typeof EXPLORER_TAB)[keyof typeof EXPLORER_TAB]

/**
 * Thing tags each Explorer tab lists. The cabinet tab unions powermeters
 * and sensors — there is no dedicated `t-cabinet` tag.
 */
export const EXPLORER_TAB_TAGS: Record<ExplorerTabValue, readonly string[]> = {
  [EXPLORER_TAB.CONTAINER]: ['t-container'],
  [EXPLORER_TAB.MINER]: ['t-miner'],
  [EXPLORER_TAB.CABINET]: ['t-powermeter', 't-sensor'],
}

/**
 * The list-things field projection the Explorer tables and Container
 * Widgets cards read — the reference app's `LIST_THINGS_FIELDS`, kept as one projection
 * so every consumer sees the same row shape.
 */
export const OP_CENTRE_LIST_THINGS_FIELDS = JSON.stringify({
  id: 1,
  info: 1,
  code: 1,
  type: 1,
  comments: 1,
  tags: 1,
  rack: 1,
  containerId: 1,
  'last.alerts': 1,
  'last.err': 1,
  'opts.username': 1,
  'opts.address': 1,
  'opts.port': 1,
  'opts.containerId': 1,
  'last.snap.stats.status': 1,
  'last.snap.stats.power_w': 1,
  'last.snap.stats.hashrate_mhs': 1,
  'last.snap.stats.temperature_c': 1,
  'last.snap.stats.uptime_ms': 1,
  'last.snap.stats.ambient_temp_c': 1,
  'last.snap.stats.humidity_percent': 1,
  'last.snap.stats.hashrate': 1,
  'last.snap.stats.revenue_24h': 1,
  'last.snap.stats.active_workers_count': 1,
  'last.snap.stats.errors': 1,
  'last.snap.stats.temp_c': 1,
  'last.snap.config.firmware_ver': 1,
  'last.snap.config.power_mode': 1,
  'last.snap.config.led_status': 1,
  'last.snap.config.pool_config': 1,
})

/**
 * List-things params for one Explorer tab: tag-filtered, status-enriched,
 * projected to {@link OP_CENTRE_LIST_THINGS_FIELDS}.
 */
export const buildExplorerListThingsParams = (
  tab: ExplorerTabValue,
  options: { limit?: number; offset?: number } = {},
): ListThingsParams => ({
  query: getByTagsQuery([...EXPLORER_TAB_TAGS[tab]]),
  status: 1,
  fields: OP_CENTRE_LIST_THINGS_FIELDS,
  limit: options.limit ?? CONTAINER_LIST_THINGS_LIMIT,
  offset: options.offset,
})

/**
 * Container list projection for the Site Overview widgets — the lean list
 * fields plus `last.snap.stats.container_specific` (cooling system: oil / water
 * pumps, tanks) and `last.snap.config` (per-vendor thresholds), which the
 * vendor boxes (e.g. the Bitdeer immersion tanks box) read. Mirrors the reference app's
 * ContainerWidgets query.
 */
export const OP_CENTRE_CONTAINER_WIDGETS_FIELDS = JSON.stringify({
  id: 1,
  info: 1,
  type: 1,
  rack: 1,
  'last.err': 1,
  'last.alerts': 1,
  'last.snap.stats.status': 1,
  'last.snap.stats.power_w': 1,
  'last.snap.stats.error_msg': 1,
  'last.snap.stats.container_specific': 1,
  'last.snap.config': 1,
})

/** List-things params for the Site Overview container widgets grid. */
export const buildContainerWidgetsListParams = (): ListThingsParams => ({
  query: getByTagsQuery(['t-container']),
  status: 1,
  fields: OP_CENTRE_CONTAINER_WIDGETS_FIELDS,
  limit: CONTAINER_LIST_THINGS_LIMIT,
})

/**
 * The container-detail field projection — a superset of the list projection
 * that also pulls the full `last.snap.stats` (so the socket transform sees
 * `container_specific.pdu_data`, ambient temp, humidity, …) and the full
 * `last.snap.config` (power mode, tank / cooling / LED state the controls
 * read). The Explorer list projection omits these to keep list rows lean.
 */
export const OP_CENTRE_CONTAINER_DETAIL_FIELDS = JSON.stringify({
  id: 1,
  info: 1,
  code: 1,
  type: 1,
  comments: 1,
  tags: 1,
  rack: 1,
  containerId: 1,
  'last.alerts': 1,
  'last.err': 1,
  'opts.username': 1,
  'opts.address': 1,
  'opts.port': 1,
  'opts.containerId': 1,
  'last.snap.stats': 1,
  'last.snap.config': 1,
})

/**
 * List-things params for the selected containers' detail snapshots. Takes the
 * raw container keys (the `selectedDevicesTags` outer keys / `info.container`
 * names), tags them with `container-` and filters to `t-container` things —
 * mirrors the reference app's `getContainerByContainerTagsQuery(keys.map(appendContainerToTag))`.
 */
export const buildContainerDetailParams = (containerKeys: string[]): ListThingsParams => {
  const tags = containerKeys.map(appendContainerToTag)
  return {
    query: getContainerByContainerTagsQuery(tags),
    status: 1,
    fields: OP_CENTRE_CONTAINER_DETAIL_FIELDS,
    limit: tags.length || CONTAINER_LIST_THINGS_LIMIT,
  }
}

/**
 * The cabinet-detail field projection — the sensor/powermeter fields the LV
 * cabinet detail reads: each device's `power_w` / `temp_c` reading, status
 * (for the offline marker) and `last.alerts` (for the warnings timeline).
 */
export const OP_CENTRE_CABINET_DETAIL_FIELDS = JSON.stringify({
  id: 1,
  info: 1,
  code: 1,
  type: 1,
  tags: 1,
  rack: 1,
  'last.alerts': 1,
  'last.snap.stats.status': 1,
  'last.snap.stats.power_w': 1,
  'last.snap.stats.tension_v': 1,
  'last.snap.stats.temp_c': 1,
  'last.snap.stats.powermeter_specific': 1,
})

/**
 * List-things params for one LV cabinet's family of devices — the powermeters
 * and temperature sensors whose `info.pos` sits under the cabinet `root`.
 * Mirrors the reference app's `getLvCabinetDevicesByRoot(root)`; the detail hook groups the
 * result back into a single cabinet ({@link OP_CENTRE_CABINET_DETAIL_FIELDS}).
 */
export const buildCabinetDetailParams = (root: string): ListThingsParams => ({
  query: getLvCabinetDevicesByRoot(root),
  status: 1,
  fields: OP_CENTRE_CABINET_DETAIL_FIELDS,
})

/* Per-miner realtime groups the Container Widgets cards aggregate into
 * per-container summaries (hashrate, power, status, power-mode) plus the
 * vendor-specific stats group. Mirrors the reference app's widget tail-log query. */
const CONTAINER_WIDGETS_FIELDS = JSON.stringify({
  power_w_sum: 1,
  power_w_group: 1,
  status_group: 1,
  power_mode_group: 1,
  hashrate_mhs_5m_sum: 1,
  hashrate_mhs_1m_group: 1,
  container_specific_stats_group: 1,
})

const CONTAINER_WIDGETS_AGGR_FIELDS = JSON.stringify({
  power_w_sum_aggr: 1,
  power_w_group_aggr: 1,
  status_group_aggr: 1,
  power_mode_group_aggr: 1,
  hashrate_mhs_5m_sum_aggr: 1,
  hashrate_mhs_1m_group_aggr: 1,
  container_specific_stats_group_aggr: 1,
  // Per-container-model counts + summary aggregates the widget cards actually
  // slice (the reference app's widget tail-log query — see `container-widgets-derive.ts`).
  // Requested alongside the group aggregates above as a non-breaking superset;
  // the App Node returns whichever fields it emits.
  offline_cnt: 1,
  not_mining_cnt: 1,
  power_mode_normal_include_error_cnt: 1,
  power_mode_low_cnt: 1,
  power_mode_normal_cnt: 1,
  power_mode_high_cnt: 1,
  hashrate_mhs_1m_group_sum_aggr: 1,
  temperature_c_group_max_aggr: 1,
  temperature_c_group_avg_aggr: 1,
})

/**
 * Tail-log params for the Container Widgets realtime snapshot — the latest
 * `stat-realtime` sample across all miners, grouped so the cards can slice
 * per container.
 */
export const buildContainerWidgetsRealtimeTailLogParams = (): TailLogParams => ({
  key: 'stat-realtime',
  type: 'miner',
  tag: 't-miner',
  limit: 1,
  fields: CONTAINER_WIDGETS_FIELDS,
  aggrFields: CONTAINER_WIDGETS_AGGR_FIELDS,
})
