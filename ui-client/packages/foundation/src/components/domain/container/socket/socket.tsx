import { cn, FanIcon, formatValueUnit, SimpleTooltip, UNITS, unitToKilo } from '@mdk/core'
import { ClockIcon, PlusIcon } from '@radix-ui/react-icons'
import type { ForwardedRef } from 'react'
import { HEATMAP_MODE } from '../../../../constants/temperature-constants'
import { useTimezone } from '../../../../hooks/use-timezone'
import type { Miner } from '../../../../types/miner'
import type { PowerModeColors } from '../../../../utils/device-utils'
import {
  getHashrateString,
  getPowerModeColor,
  getTemperatureColor,
} from '../../../../utils/device-utils'
import type { SocketStatus } from '../../../../utils/status-utils'
import { SOCKET_STATUSES } from '../../../../utils/status-utils'
import { getHeatmapDisplayValue, getHeatmapTooltipText, getSocketStatus } from './socket-utils'
import './socket.scss'

type Heatmap = {
  isHeatmapMode?: boolean
  mode?: string
  ranges?: Record<string, { min?: number; max?: number }>
}

type Pdu = {
  pdu?: string | number
  [key: string]: unknown
}

export type SocketProps = {
  /** Current in amperes */
  current_a?: number | null
  /** Power in watts */
  power_w?: number | null
  /** Whether socket is enabled */
  enabled?: boolean
  /** Socket number/index */
  socket?: number | null
  /** Whether socket is selected */
  selected?: boolean
  /** Forwarded ref for the container */
  innerRef?: ForwardedRef<HTMLDivElement>
  /** Miner data */
  miner?: Miner | null
  /** Heatmap configuration */
  heatmap?: Heatmap | null
  /** Whether in edit flow mode */
  isEditFlow?: boolean
  /** Whether click is disabled */
  clickDisabled?: boolean
  /** Cooling status */
  cooling?: boolean | undefined
  /** Whether to show dashed border for empty power */
  isEmptyPowerDashed?: boolean
  /** Whether container control is supported */
  isContainerControlSupported?: boolean
  /** PDU information */
  pdu?: Pdu
}

/**
 * Socket Component
 *
 * Displays a socket in a PDU with power/current info, miner status, and heatmap visualization
 *
 * Features:
 * - Power and current display
 * - Miner status indicators
 * - Heatmap mode with temperature/hashrate
 * - Cooling fan indicator
 * - Socket enable/disable states
 * - Add miner flow
 *
 * @example
 * ```tsx
 * <Socket
 *   socket={1}
 *   enabled={true}
 *   power_w={3250}
 *   current_a={14.5}
 *   miner={minerData}
 * />
 * ```
 */
export const Socket = ({
  current_a = null,
  power_w = null,
  enabled = false,
  socket = null,
  selected = false,
  innerRef,
  miner = null,
  heatmap = null,
  isEditFlow = false,
  clickDisabled = false,
  cooling = undefined,
  isEmptyPowerDashed = false,
  isContainerControlSupported = false,
  pdu,
}: SocketProps) => {
  const { getFormattedDate } = useTimezone()

  const { error } = miner || ({} as Miner)
  const { isHeatmapMode = false, mode, ranges } = heatmap || {}
  const currentTemperature = mode ? miner?.temperature?.[mode] : undefined
  const { min, max } = ranges && mode ? ranges[mode] || {} : {}

  const snap = miner?.snap || miner?.last?.snap
  const hashRate = snap?.stats?.hashrate_mhs?.t_5m
  const hashRateLabel =
    hashRate !== null && hashRate !== undefined ? getHashrateString(hashRate) : ''
  const powerMode = snap?.config?.power_mode as keyof typeof PowerModeColors
  const powerModeColor = powerMode ? getPowerModeColor(powerMode) : ''

  const status = (
    !miner
      ? SOCKET_STATUSES.MINER_DISCONNECTED
      : (getSocketStatus(miner) ?? SOCKET_STATUSES.MINER_DISCONNECTED)
  ) as SocketStatus

  const tooltipText = getHeatmapTooltipText({
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
  })

  const getColor = (): string | null => {
    if (!isHeatmapMode) return null
    if (error || !miner) return null
    const value = mode === HEATMAP_MODE.HASHRATE ? (hashRate ?? undefined) : currentTemperature
    if (value === null || value === undefined) return null

    return getTemperatureColor(min ?? 0, max ?? 0, value ?? 0)
  }

  const heatmapDisplayValue = getHeatmapDisplayValue({
    error,
    miner,
    mode: mode ?? '',
    hashRate,
    temperature: currentTemperature,
  })

  const hasCooling = typeof cooling === 'boolean'
  const color = getColor()

  const showEmptyText =
    !hasCooling && status === SOCKET_STATUSES.MINER_DISCONNECTED && enabled && !isEditFlow

  const showPowerCurrent =
    !hasCooling && !(status === SOCKET_STATUSES.MINER_DISCONNECTED && enabled)

  return (
    <SimpleTooltip content={tooltipText}>
      <div
        ref={innerRef}
        className={cn(
          'mdk-socket',
          hasCooling && 'mdk-socket--has-cooling',
          isHeatmapMode && 'mdk-socket--heatmap',
          selected && 'mdk-socket--selected',
          clickDisabled && 'mdk-socket--disabled',
        )}
        data-socket-index={socket !== null && socket !== undefined ? String(socket) : undefined}
        data-pdu-index={pdu?.pdu !== null && pdu?.pdu !== undefined ? String(pdu?.pdu) : undefined}
        data-status={status}
        data-enabled={enabled}
        style={{
          backgroundColor: color || undefined,
          borderColor: powerModeColor || undefined,
        }}
      >
        {isHeatmapMode ? (
          <div className="mdk-socket__index">{heatmapDisplayValue}</div>
        ) : (
          <div className="mdk-socket__wrapper">
            {SOCKET_STATUSES.CONNECTING === status && (
              <ClockIcon className="mdk-socket__connection-icon" />
            )}

            {isEditFlow && status === SOCKET_STATUSES.MINER_DISCONNECTED ? (
              <div className="mdk-socket__add-icon">
                <PlusIcon />
              </div>
            ) : (
              <div className="mdk-socket__consumption-box">
                {hasCooling && (
                  <div
                    className={`mdk-socket__fan-icon ${cooling ? 'mdk-socket__fan-icon--on' : ''}`}
                  >
                    <FanIcon />
                  </div>
                )}

                {showEmptyText && (
                  <div className="mdk-socket__value" data-status={status}>
                    Empty
                  </div>
                )}

                {showPowerCurrent && (
                  <>
                    <div className="mdk-socket__value" data-status={status}>
                      {formatValueUnit(
                        !power_w && isEmptyPowerDashed ? 0 : unitToKilo(power_w ?? 0),
                        UNITS.POWER_KW,
                      )}
                    </div>
                    <div className="mdk-socket__value" data-status={status}>
                      {formatValueUnit(current_a ?? 0, 'A')}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="mdk-socket__index" data-status={status} data-enabled={enabled}>
              {socket}
            </div>
          </div>
        )}
      </div>
    </SimpleTooltip>
  )
}
