import { formatErrors, UNITS } from '@mdk/core'
import { MinerStatuses } from '../../../../constants/device-constants'
import { HEATMAP_MODE } from '../../../../constants/temperature-constants'
import type { Alert } from '../../../../types/alerts'
import type { Miner } from '../../../../types/miner'
import { getAlertsString } from '../../../../utils/alerts-utils'
import { getHashrateUnit } from '../../../../utils/device-utils'
import type { SocketStatus } from '../../../../utils/status-utils'
import { SOCKET_STATUSES } from '../../../../utils/status-utils'

export const getSocketTooltipText = (
  miner: Miner | null,
  enabled: boolean,
  getFormattedDate: (date: Date | number) => string,
  cooling?: boolean,
  isContainerControlSupported?: boolean,
) => {
  const coolingText = `, Cooling: ${cooling ? 'on' : 'off'}`
  const { stats, config } = miner?.snap || miner?.last?.snap || {}
  const socketStatus = enabled ? 'on' : 'off'

  const coolingStatusKnown = typeof cooling === 'boolean'

  const socketText = isContainerControlSupported
    ? `Socket: ${socketStatus}${coolingStatusKnown ? coolingText : ''}`
    : ''
  const alerts = miner?.last?.alerts

  let message: string

  if ((!miner?.snap && miner?.err) || (!miner?.last?.snap && miner?.last?.err)) {
    message = `Miner in error: ${miner?.last?.err || 'unknown'}`
  } else if (miner?.error || !miner) {
    message = 'Miner not connected'
  } else if (stats?.status === MinerStatuses.ERROR) {
    const formattedErrors = stats?.errors && formatErrors(stats.errors as Alert[], getFormattedDate)
    const formattedAlerts = alerts && getAlertsString(alerts as Alert[], getFormattedDate)

    const errorDetails = formattedErrors || formattedAlerts
    message =
      (stats?.hashrate_mhs?.t_5m ?? 0) > 0
        ? `Mining with Errors: ${errorDetails}`
        : `Errors: ${errorDetails}`
  } else if (stats?.status === MinerStatuses.MINING && config?.power_mode) {
    message = `Mining in Power mode: ${config?.power_mode}`
  } else if (stats?.status) {
    message = `Miner in ${stats.status} mode`
  } else {
    message = 'Miner is trying to connect.'
  }

  return message + (socketText ? `, ${socketText}` : '')
}

export const getSocketStatus = (miner: Miner | null) => {
  const { stats, config } = miner?.snap || miner?.last?.snap || {}

  if (stats?.are_all_errors_minor) {
    return SOCKET_STATUSES.ERROR_MINING
  }
  if ((!miner?.snap && miner?.err) || (!miner?.last?.snap && miner?.last?.err)) {
    return SOCKET_STATUSES.ERROR
  }
  if (!miner) {
    return SOCKET_STATUSES.MINER_DISCONNECTED
  }
  if (stats?.status === MinerStatuses.ERROR) {
    return (stats?.hashrate_mhs?.t_5m ?? 0) > 0 ? SOCKET_STATUSES.ERROR : stats?.status
  }
  if (stats?.status && stats.status !== MinerStatuses.MINING) {
    return stats.status
  }
  if (!!miner && !stats?.status && !miner.error) {
    return SOCKET_STATUSES.CONNECTING
  }
  return config?.power_mode
}

type HeatmapDisplayValueParams = {
  error?: boolean
  miner: Miner | null
  mode: string
  hashRate: number | null | undefined
  temperature: number | null | undefined
}

export const getHeatmapDisplayValue = ({
  error,
  miner,
  mode,
  hashRate,
  temperature,
}: HeatmapDisplayValueParams): string | number => {
  if (error || !miner) return '-'

  if (mode === HEATMAP_MODE.HASHRATE) {
    if (hashRate == null || hashRate === 0) return '-'
    const { value } = getHashrateUnit(hashRate)

    return value !== null ? value : '-'
  }

  return temperature != null ? Math.round(temperature).toString() : '-'
}

type HeatmapTooltipTextParams = {
  error?: boolean
  isHeatmapMode: boolean
  mode?: string
  status: SocketStatus
  hashRateLabel: string
  currentTemperature?: number
  miner: Miner | null
  enabled: boolean
  getFormattedDate: (date: Date | number) => string
  cooling?: boolean
  isContainerControlSupported: boolean
}

export const getHeatmapTooltipText = ({
  error,
  isHeatmapMode,
  mode,
  status,
  hashRateLabel,
  currentTemperature,
  miner,
  enabled,
  getFormattedDate,
  cooling,
  isContainerControlSupported,
}: HeatmapTooltipTextParams): string => {
  if (error) return 'Miner disconnected'

  if (isHeatmapMode && mode === HEATMAP_MODE.HASHRATE) {
    const isOffline =
      status === SOCKET_STATUSES.OFFLINE || status === SOCKET_STATUSES.MINER_DISCONNECTED
    if (isOffline || !hashRateLabel) {
      return 'Miner in offline mode'
    }
    return `Hashrate: ${hashRateLabel} `
  }

  if (isHeatmapMode && mode !== HEATMAP_MODE.HASHRATE && currentTemperature != null) {
    return `Temp: ${currentTemperature}${UNITS.TEMPERATURE_C}`
  }

  return getSocketTooltipText(
    miner,
    enabled,
    getFormattedDate,
    cooling,
    isContainerControlSupported,
  )
}
