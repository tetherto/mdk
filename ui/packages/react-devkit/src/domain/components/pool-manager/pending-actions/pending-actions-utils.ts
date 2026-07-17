import type { LiveAction } from '@tetherto/mdk-ui-foundation'
import _get from 'lodash/get'

import { ACTION_NAMES_MAP, ACTION_TYPES, type ActionNameKey } from '../../../constants/actions'
import { ACTION_SIDEBAR_STATUS_LABELS, POOL_ACTION_LABELS } from '../pool-manager-constants'

/**
 * The fields of a staged `actionsStore` submission the tray needs to render a
 * human-readable summary. Mirrors the pool-action payloads enqueued by the
 * add/edit/assign modals.
 */
export type PendingActionLike = {
  id?: number
  action?: string
  params?: Array<{
    data?: {
      poolConfigName?: string
      /** Pool stratum URLs — present on create/update pool-config actions. */
      poolUrls?: Array<{ url?: string }>
    }
    poolConfigId?: string
    configType?: string
  }>
  query?: { id?: { $in?: unknown[] }; tags?: { $in?: unknown[] } }
  /** Pool name — set by assign-pool actions (SETUP_POOLS) alongside params. */
  poolName?: string
  /** Miner serial codes — set by site-overview-details and miner-explorer assign actions. */
  codesList?: string[]
  /** Container names — set by sites-overview assign actions. */
  containersList?: string[]
  /** Device id / container tags an Explorer control action targets. */
  tags?: string[]
  /**
   * The specific pool URL that was added or edited. Client-side display field
   * only — whitelisted out of the API payload by `toVotingPayload`. Used by
   * `describePendingActionExpanded` to show the edited endpoint rather than
   * the full `poolUrls` list.
   */
  editedPoolUrl?: string
}

/** The container / miner control actions the Explorer detail panel queues. */
const DEVICE_ACTION_KEYS = new Set<string>([
  ACTION_TYPES.SWITCH_CONTAINER,
  ACTION_TYPES.SWITCH_COOLING_SYSTEM,
  ACTION_TYPES.SET_TANK_ENABLED,
  ACTION_TYPES.SET_AIR_EXHAUST_ENABLED,
  ACTION_TYPES.SWITCH_SOCKET,
  ACTION_TYPES.RESET_ALARM,
  ACTION_TYPES.RESET_CONTAINER,
  ACTION_TYPES.EMERGENCY_STOP,
  ACTION_TYPES.REBOOT,
  ACTION_TYPES.SET_POWER_MODE,
  ACTION_TYPES.SETUP_FREQUENCY_SPEED,
  ACTION_TYPES.SET_LED,
])

const onOffLabel = (value: unknown): string => (value ? 'On' : 'Off')

/** `pluralize(3, 'device')` → `'3 devices'`; `pluralize(1, 'device')` → `'1 device'`. */
const pluralize = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? '' : 's'}`

/**
 * The "what" of a container / miner control action, read from its positional
 * params — e.g. `Turn container On`, `Tank 1 Off`, `Power mode high`.
 */
const describeDeviceActionParams = (key: string, params: unknown[]): string => {
  switch (key) {
    case ACTION_TYPES.SWITCH_CONTAINER:
      return `Turn container ${onOffLabel(params[0])}`
    case ACTION_TYPES.SWITCH_COOLING_SYSTEM:
      return `Turn cooling ${onOffLabel(params[0])}`
    case ACTION_TYPES.SET_TANK_ENABLED:
      return `Tank ${params[0]} ${onOffLabel(params[1])}`
    case ACTION_TYPES.SET_AIR_EXHAUST_ENABLED:
      return `Air exhaust ${onOffLabel(params[0])}`
    case ACTION_TYPES.SWITCH_SOCKET:
      return `Power all sockets ${onOffLabel(_get(params, [0, 0, 2]))}`
    case ACTION_TYPES.RESET_ALARM:
      return 'Reset alarm'
    case ACTION_TYPES.RESET_CONTAINER:
      return 'Reset container'
    case ACTION_TYPES.EMERGENCY_STOP:
      return 'Emergency stop'
    case ACTION_TYPES.REBOOT:
      return 'Reboot'
    case ACTION_TYPES.SET_POWER_MODE:
      return `Power mode ${String(params[0] ?? '')}`.trim()
    case ACTION_TYPES.SETUP_FREQUENCY_SPEED:
      return `Frequency ${String(params[0] ?? '')}`.trim()
    case ACTION_TYPES.SET_LED:
      return `LED ${onOffLabel(params[0])}`
    default:
      return ''
  }
}

/** The affected targets of a staged device action, for the draft card body. */
const describeDeviceActionTargets = (action: PendingActionLike): string => {
  if (action.codesList?.length) return `MINERS: ${action.codesList.join(', ')}`
  if (action.containersList?.length) return `UNITS: ${action.containersList.join(', ')}`
  const count = action.tags?.length ?? 0
  if (count > 0) return pluralize(count, 'device')
  return ''
}

/**
 * Derives a `{ label, detail }` summary for a single staged action so the
 * review tray can show what each queued submission will do before it is sent
 * to the voting workflow.
 *
 * - Create / update → the target pool's config name.
 * - Assign miners → the affected miner count (from the device query, falling
 *   back to the params length).
 */
export const describePendingAction = (
  action: PendingActionLike,
): { label: string; detail: string } => {
  const key = action.action ?? ''
  const label =
    POOL_ACTION_LABELS[key] ?? ACTION_NAMES_MAP[key as ActionNameKey] ?? (key || 'Action')

  let detail = ''
  if (key === ACTION_TYPES.REGISTER_POOL_CONFIG || key === ACTION_TYPES.UPDATE_POOL_CONFIG) {
    detail = action.params?.[0]?.data?.poolConfigName ?? ''
  } else if (key === ACTION_TYPES.SETUP_POOLS) {
    const ids = action.query?.id?.$in
    const count = Array.isArray(ids) ? ids.length : (action.params?.length ?? 0)
    detail = `${count} miner${count === 1 ? '' : 's'}`
  }

  return { label, detail }
}

/**
 * Derives an expanded card description:
 * - `title`       — "{N} MINER(S) - ASSIGN POOLS", "CREATE POOL: name", etc.
 * - `badge`       — always "Pending Submission" for draft actions.
 * - `description` — "ASSIGN POOL : {pool} TO MINERS: {serials}" etc.
 */
export const describePendingActionExpanded = (
  action: PendingActionLike,
): { title: string; badge: string; description: string } => {
  const key = action.action ?? ''
  const badge = 'Pending Submission'

  if (key === ACTION_TYPES.SETUP_POOLS) {
    const minerIds = action.query?.id?.$in
    const containerTags = action.query?.tags?.$in
    const poolName = action.poolName ?? ''

    if (Array.isArray(minerIds) && minerIds.length > 0) {
      const minerCount = minerIds.length
      const title = `${minerCount} ${minerCount === 1 ? 'MINER' : 'MINERS'} - ASSIGN POOLS`
      const codes = action.codesList?.join(', ') ?? ''
      const description = `ASSIGN POOL : ${poolName} TO MINERS: ${codes}`
      return { title, badge, description }
    }

    if (Array.isArray(containerTags) && containerTags.length > 0) {
      const containerCount = containerTags.length
      const title = `${containerCount} ${containerCount === 1 ? 'CONTAINER' : 'CONTAINERS'} - ASSIGN POOLS`
      const containers = action.containersList?.join(', ') ?? ''
      const description = `ASSIGN POOL : ${poolName} TO UNITS: ${containers}`
      return { title, badge, description }
    }

    return { title: 'ASSIGN POOLS', badge, description: `ASSIGN POOL : ${poolName}` }
  }

  if (key === ACTION_TYPES.REGISTER_POOL_CONFIG) {
    const data = action.params?.[0]?.data
    const poolConfigName = data?.poolConfigName ?? ''
    const urls = (data?.poolUrls ?? []).map((entry) => entry.url).filter(Boolean)
    const urlSuffix = urls.length > 0 ? ` — ${urls.join(', ')}` : ''
    return {
      title: 'ADD POOL CONFIG',
      badge,
      description: `ADD POOL CONFIG: ${poolConfigName}${urlSuffix}`,
    }
  }

  if (key === ACTION_TYPES.UPDATE_POOL_CONFIG) {
    const poolConfigName = action.params?.[0]?.data?.poolConfigName ?? ''
    const url = action.editedPoolUrl ?? ''
    const urlSuffix = url ? ` — ${url}` : ''
    return {
      title: 'UPDATE POOL CONFIG',
      badge,
      description: `UPDATE POOL CONFIG: ${poolConfigName}${urlSuffix}`,
    }
  }

  if (DEVICE_ACTION_KEYS.has(key)) {
    const label = ACTION_NAMES_MAP[key as ActionNameKey] ?? key
    const what = describeDeviceActionParams(key, (action.params ?? []) as unknown[])
    const targets = describeDeviceActionTargets(action)
    const description = [what, targets].filter(Boolean).join(' — ')
    return { title: label.toUpperCase(), badge, description }
  }

  const fallbackLabel =
    POOL_ACTION_LABELS[key] ?? ACTION_NAMES_MAP[key as ActionNameKey] ?? key ?? 'Action'
  return { title: fallbackLabel.toUpperCase(), badge, description: '' }
}

/**
 * Whether an action is an assign-pool (`SETUP_POOLS`) action. Accepts either a
 * staged draft (`action`) or a server-confirmed live action (`action` / `type`).
 */
export const isAssignPoolAction = (action: { action?: string; type?: string }): boolean =>
  (action.action ?? action.type) === ACTION_TYPES.SETUP_POOLS

/**
 * Best-effort human-readable message from a thrown submit / vote / cancel error.
 * Prefers the API's embedded `body.message`, falls back to the `Error.message`,
 * then the provided default.
 */
export const getActionErrorMessage = (err: unknown, fallback: string): string =>
  _get(err, 'body.message') || _get(err, 'message') || fallback

/**
 * Extracts the server-assigned action id from a submit response. The API returns
 * an array whose first element carries the new `id`; returns `undefined` when the
 * shape is empty or the id is missing.
 */
export const extractSubmittedActionId = (resp: unknown): string | undefined => {
  const id = _get(resp, '[0].id')
  if (id == null) return undefined
  return String(id) || undefined
}

/**
 * Formats a Unix-ms timestamp into a readable display string:
 * `"18 Jun 2026, 20:15:42"`.
 */
export const formatActionTimestamp = (createdAt?: number): string => {
  if (!createdAt) return ''
  const date = new Date(createdAt)
  const day = date.getDate()
  const month = date.toLocaleString('en-GB', { month: 'short' })
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`
}

/**
 * Derives a `{ title, detail, statusBadge }` summary for a server-confirmed live
 * action, used by the `ActionsSidebar` "In review" and "Requested" cards.
 *
 * - `title`  — primary heading (e.g. `Add Pool Config: Dev-6. Description: …`).
 * - `detail` — secondary line (e.g. `URLS: ["stratum+tcp://…"]`).
 * - `statusBadge` — human-readable status label.
 */
export const describeLiveAction = (
  action: LiveAction,
): { title: string; detail: string; statusBadge: string } => {
  const key = action.action ?? action.type ?? ''
  const statusBadge =
    ACTION_SIDEBAR_STATUS_LABELS[action.status?.toLowerCase() ?? ''] ?? (action.status ?? '')

  if (key === ACTION_TYPES.REGISTER_POOL_CONFIG || key === ACTION_TYPES.UPDATE_POOL_CONFIG) {
    // Params are action-specific (device actions carry primitives) — pool
    // config actions always carry an object param, so narrow before reading.
    const firstParam = action.params?.[0]
    const data =
      (typeof firstParam === 'object' && firstParam !== null
        ? (firstParam.data as
            | { poolConfigName?: string; description?: string; poolUrls?: Array<{ url?: string }> }
            | undefined)
        : undefined) ?? {}
    const name = data.poolConfigName ?? ''
    const description = data.description ?? ''
    const urls = (data.poolUrls ?? []).map((entry) => entry.url).filter(Boolean)
    const verb =
      key === ACTION_TYPES.REGISTER_POOL_CONFIG ? 'Add Pool Config' : 'Update Pool Config'
    return {
      title: `${verb}: ${name}. Description: ${description}`,
      detail: `URLS: ${JSON.stringify(urls)}`,
      statusBadge,
    }
  }

  if (key === ACTION_TYPES.SETUP_POOLS) {
    const ids = (action.query as { id?: { $in?: unknown[] } } | undefined)?.id?.$in
    const count = Array.isArray(ids) ? ids.length : (action.params?.length ?? 0)
    const poolName = typeof action.poolName === 'string' ? action.poolName : ''
    return {
      title: `${count} ${count === 1 ? 'Miner' : 'Miners'} - Assign pools`,
      detail: poolName ? `Assign Pool : ${poolName}` : '',
      statusBadge,
    }
  }

  if (DEVICE_ACTION_KEYS.has(key)) {
    const title = ACTION_NAMES_MAP[key as ActionNameKey] ?? key
    const params = (action.params ?? []) as unknown[]
    const what = describeDeviceActionParams(key, params)
    const ids = (action.query as { id?: { $in?: unknown[] } } | undefined)?.id?.$in
    const tags = (action.query as { tags?: { $in?: unknown[] } } | undefined)?.tags?.$in
    const count = Array.isArray(ids)
      ? ids.length
      : Array.isArray(tags)
        ? tags.length
        : params.length
    const detail = [what, count > 0 ? pluralize(count, 'device') : ''].filter(Boolean).join(' — ')
    return { title, detail, statusBadge }
  }

  const title = POOL_ACTION_LABELS[key] ?? ACTION_NAMES_MAP[key as ActionNameKey] ?? (key || 'Action')
  return { title, detail: '', statusBadge }
}
