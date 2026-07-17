import { type ListThingsDevice, listThingsQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { headOrEmpty } from './list-things-utils'
import { POOL_MANAGER_POLL_INTERVAL_MS } from './poll-intervals'
import { useAuthToken } from './use-auth-token'
import { useCurrentAlertDevices } from './use-current-alert-devices'
import { useSiteStatusLive } from './use-site-status-live'

/** `t-miner` devices with an assigned `info.poolConfig`. Only id projected for count. */
const CONFIGURED_MINERS_QUERY = JSON.stringify({
  $and: [{ 'info.poolConfig': { $ne: null } }, { tags: { $in: ['t-miner'] } }],
})
const CONFIGURED_MINERS_FIELDS = JSON.stringify({ id: 1 })

/** Structurally identical to the devkit `StatItem` (`dashboard-types.ts`); kept
 * local so the adapter layer stays free of a devkit dependency. The shell
 * passes the result straight to `<PoolManager stats={...} />`. */
export type PoolManagerDashboardStatItem = {
  label: string
  value: number
  type?: 'ERROR' | 'SUCCESS'
  secondaryValue?: string
}

/** Top-of-page stat blocks rendered by the dashboard header. */
export type PoolManagerDashboardStats = {
  items: PoolManagerDashboardStatItem[]
}

/** Structurally identical to the devkit `Alert` (`foundation/types/alerts.ts`). */
export type PoolManagerAlert = {
  id?: string
  uuid?: string
  severity: string
  createdAt: number | string
  name: string
  description: string
  message?: string
  code?: string | number
}

export type UsePoolManagerDashboardOptions = {
  /** Poll interval (ms) for the slow reads (configured-miner count, alerts). Defaults to 60s. */
  refetchInterval?: number
  /**
   * Poll interval (ms) for the live site-status snapshot (total miners /
   * errors). Defaults to the live 5s cadence — kept separate so the slow
   * `refetchInterval` doesn't override it.
   */
  liveRefetchInterval?: number
  /** Disable all queries. Defaults to running whenever an auth token is present. */
  enabled?: boolean
}

export type UsePoolManagerDashboardResult = {
  /** Top-of-page stat blocks: total / configured miners and the live error count. */
  stats: PoolManagerDashboardStats
  /** Recent alerts feed flattened from the current alert-bearing devices. */
  alerts: PoolManagerAlert[]
  isLoading: boolean
}

type AlertBearingDevice = ListThingsDevice & {
  last?: { alerts?: PoolManagerAlert[] | null }
}

const toPercent = (part: number, total: number): string =>
  total > 0 ? `${((part / total) * 100).toFixed(2)}%` : '0%'

/** Flatten the per-device alert arrays into a single recent-first feed, stamping
 * each alert with its owning device id so the row stays traceable. */
const flattenDeviceAlerts = (devices: AlertBearingDevice[]): PoolManagerAlert[] => {
  const alerts: PoolManagerAlert[] = []
  for (const device of devices) {
    for (const alert of device.last?.alerts ?? []) {
      alerts.push({
        ...alert,
        id: alert.uuid ?? alert.id,
        code: alert.code ?? device.id,
      })
    }
  }
  return alerts.sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  )
}

/**
 * Composes the Pool Manager dashboard view-model:
 *
 * - **Total Miners** — `miners.total` from the live site-status snapshot.
 * - **Configured Miners** — `list-things` count of `t-miner` with `info.poolConfig`.
 * - **Errors** — `miners.error` from the live site-status snapshot.
 * - **Alerts** — flattened from `useCurrentAlertDevices`.
 *
 * Miner counts come from the consolidated `GET /auth/site/status/live` poll
 * (via {@link useSiteStatusLive}) rather than aggregating several tail-log
 * queries client-side.
 *
 * @category dashboard
 */
export const usePoolManagerDashboard = (
  options: UsePoolManagerDashboardOptions = {},
): UsePoolManagerDashboardResult => {
  const { refetchInterval, liveRefetchInterval, enabled } = options
  const queryClient = useQueryClient()
  const token = useAuthToken()
  const effectiveEnabled = enabled ?? !!token

  // Live snapshot keeps its short cadence (its own 5s default) unless the
  // caller explicitly overrides it via `liveRefetchInterval`.
  const siteStatus = useSiteStatusLive({
    refetchInterval: liveRefetchInterval,
    enabled: effectiveEnabled,
  })
  const alertDevices = useCurrentAlertDevices({
    ...(refetchInterval === undefined ? {} : { refetchInterval }),
    enabled: effectiveEnabled,
  })

  const configuredFactory = listThingsQuery(queryClient, {
    query: CONFIGURED_MINERS_QUERY,
    fields: CONFIGURED_MINERS_FIELDS,
  })
  const configured = useQuery({
    ...configuredFactory,
    refetchInterval: refetchInterval ?? POOL_MANAGER_POLL_INTERVAL_MS,
    enabled: effectiveEnabled,
    select: (raw: ListThingsDevice[][]) => headOrEmpty(raw).length,
  })

  const miners = siteStatus.data?.miners
  const total = miners?.total ?? 0
  const errorCount = miners?.error ?? 0
  const configuredCount = configured.data ?? 0

  const stats: PoolManagerDashboardStats = {
    items: [
      { label: 'Total Miners', value: total, type: 'SUCCESS' },
      {
        label: 'Configured Miners',
        value: configuredCount,
        secondaryValue: toPercent(configuredCount, total),
        type: 'SUCCESS',
      },
      {
        label: 'Errors',
        value: errorCount,
        type: errorCount > 0 ? 'ERROR' : 'SUCCESS',
      },
    ],
  }

  const alerts = flattenDeviceAlerts(headOrEmpty(alertDevices.data) as AlertBearingDevice[])

  return {
    stats,
    alerts,
    isLoading: siteStatus.isLoading || configured.isLoading || alertDevices.isLoading,
  }
}
