import type { UnknownRecord } from '@primitives'
import {
  FALLBACK,
  formatHashrateUnit,
  HASHRATE_LABEL_DIVISOR,
  UNITS,
} from '@primitives'
import { appendContainerToTag, appendIdToTag, appendIdToTags, isAntminer, isAvalon, isContainer, isMiner, isWhatsminer, removeContainerPrefix } from '@tetherto/mdk-ui-foundation'
import _capitalize from 'lodash/capitalize'
import _find from 'lodash/find'
import _isBoolean from 'lodash/isBoolean'
import _isEmpty from 'lodash/isEmpty'
import _isFinite from 'lodash/isFinite'
import _map from 'lodash/map'
import _orderBy from 'lodash/orderBy'
import _round from 'lodash/round'
import _slice from 'lodash/slice'
import _toUpper from 'lodash/toUpper'
import {
  MINER_MODEL_TO_TYPE_MAP,
  MinerStatuses,
} from '../constants/device-constants'
import type { Device, DeviceData } from '../types/device'
import { MINER_POWER_MODE } from './status-utils'

const FLOAT_PRECISION = 2

const DEVICE_NOT_FOUND_MESSAGE = 'Device Not Found'

export const separateByHyphenRegExp = /^([^_]+)-([^_-]+)$/

export const separateByTwoHyphensRegExp = /^([^_]+)-([^_-]+)-([^_-]+)$/

const allUnits = _orderBy(
  _map(HASHRATE_LABEL_DIVISOR, (value, unit) => ({ unit, value })),
  ['value'],
  ['desc'],
)



export const getMinerName = (type: string): string => {
  const [, name, id] = _slice(type.match(separateByTwoHyphensRegExp), 1)
  return `${_capitalize(MINER_MODEL_TO_TYPE_MAP[name as keyof typeof MINER_MODEL_TO_TYPE_MAP])} ${_toUpper(id)}`
}

const getLast = (data: UnknownRecord): UnknownRecord => (data?.last as UnknownRecord) || {}

const getSnap = (data: UnknownRecord): UnknownRecord =>
  (getLast(data)?.snap as UnknownRecord) || {}

const getStats = (data: UnknownRecord): UnknownRecord =>
  (getSnap(data)?.stats as UnknownRecord) || {}

const getConfig = (data: UnknownRecord): UnknownRecord =>
  (getSnap(data)?.config as UnknownRecord) || {}

export { removeContainerPrefix }

export const isMinerOffline = (device: UnknownRecord): boolean => {
  const stats = getStats(device)
  const isEmptyStats = _isEmpty(stats)
  const isEmptyConfig = _isEmpty(getConfig(device))
  const isOffline = (stats as UnknownRecord)?.status === MinerStatuses.OFFLINE
  return (isEmptyStats && isEmptyConfig) || isOffline
}

export const PowerModeColors: Record<
  (typeof MINER_POWER_MODE)[keyof typeof MINER_POWER_MODE],
  string
> = {
  [MINER_POWER_MODE.SLEEP]: 'rgb(var(--mdk-power-mode-sleep-color))',
  [MINER_POWER_MODE.LOW]: 'var(--mdk-power-mode-low-color)',
  [MINER_POWER_MODE.NORMAL]: 'var(--mdk-power-mode-normal-color)',
  [MINER_POWER_MODE.HIGH]: 'var(--mdk-power-mode-high-color)',
} as const

export const getPowerModeColor = (powerMode: keyof typeof PowerModeColors): string =>
  PowerModeColors[powerMode]

/**
 * Scales a power reading in watts to W / kW / MW, picking the unit from the
 * magnitude unless one is forced. The power counterpart of `getHashrateUnit`:
 * pass `forceUnit` to hold a whole chart axis on one unit.
 *
 * @param powerW - the reading, in watts
 * @param forceUnit - a `UNITS` power unit to convert to instead of auto-selecting
 */
export const formatPowerConsumption = (
  powerW: number,
  forceUnit: string | null = null,
): { value: number | null; unit: string; realValue: number } => {
  if (!_isFinite(powerW)) {
    return { value: null, unit: '', realValue: powerW }
  }

  // If a unit is forced, use it
  if (forceUnit === UNITS.ENERGY_MW) {
    return { value: powerW / 1e6, unit: UNITS.ENERGY_MW, realValue: powerW }
  }
  if (forceUnit === UNITS.POWER_KW) {
    return { value: powerW / 1e3, unit: UNITS.POWER_KW, realValue: powerW }
  }
  if (forceUnit === UNITS.POWER_W) {
    return { value: powerW, unit: UNITS.POWER_W, realValue: powerW }
  }

  // Default behavior: auto-select unit based on magnitude
  if (Math.abs(powerW) >= 1e6) {
    return { value: powerW / 1e6, unit: UNITS.ENERGY_MW, realValue: powerW }
  }
  if (Math.abs(powerW) >= 1e3) {
    return { value: powerW / 1e3, unit: UNITS.POWER_KW, realValue: powerW }
  }
  return { value: powerW, unit: UNITS.POWER_W, realValue: powerW }
}

export const getHashrateUnit = (
  hashRateMHS: number,
  decimal = FLOAT_PRECISION,
  forceUnit: string | null = null,
  treatZeroAsNoData = false,
): {
  value: number | null
  unit: string
  realValue: number
} => {
  if (!_isFinite(hashRateMHS) || (treatZeroAsNoData && hashRateMHS === 0)) {
    return { value: null, unit: '', realValue: hashRateMHS }
  }

  // If a unit is forced, use it
  if (forceUnit) {
    const divisor = HASHRATE_LABEL_DIVISOR[forceUnit as keyof typeof HASHRATE_LABEL_DIVISOR]
    if (divisor !== undefined) {
      return {
        value: _round(hashRateMHS / divisor, decimal),
        unit: forceUnit,
        realValue: hashRateMHS,
      }
    }
  }

  // Default behavior: auto-select unit based on magnitude
  const absHash = Math.abs(hashRateMHS)
  const unitToUse = _find(allUnits, (item) => absHash >= item.value) || {
    unit: UNITS.HASHRATE_MH_S,
    value: 1,
  }

  return {
    value: _round(hashRateMHS / unitToUse.value, decimal),
    unit: unitToUse.unit,
    realValue: hashRateMHS,
  }
}

export const getHashrateString = (value: number, treatZeroAsNoData = false): string =>
  formatHashrateUnit(getHashrateUnit(value, FLOAT_PRECISION, null, treatZeroAsNoData))

export const getOnOffText = (isOn: unknown, fallback = FALLBACK): string => {
  if (!_isBoolean(isOn)) {
    return fallback
  }
  if (isOn) {
    return 'On'
  }
  return 'Off'
}

/**
 * Extract and normalize device data from a Device object
 *
 * @param device - Device object to extract data from
 * @returns Tuple of [error, deviceData]
 *
 * @example
 * ```ts
 * const [error, deviceData] = getDeviceData(device)
 * if (error) {
 *   console.error('Device error:', error)
 * }
 * if (deviceData) {
 *   console.log('Device stats:', deviceData.snap.stats)
 * }
 * ```
 */
export const getDeviceData = (
  device: Device | null | undefined,
): [error: string | undefined | null, data: DeviceData | undefined] => {
  if (!device) {
    return [DEVICE_NOT_FOUND_MESSAGE, undefined]
  }

  const { id, type, tags, last, info, address } = device

  // If no last data, return error with empty snap
  if (!last) {
    return [
      undefined,
      {
        id,
        type,
        tags,
        info,
        address,
        snap: { stats: {}, config: {} },
        err: 'Last Device info not found',
      },
    ]
  }

  const { err, snap, alerts } = last

  return [
    err,
    {
      id,
      type,
      tags,
      snap: snap ?? { stats: {}, config: {} },
      alerts,
      info,
      address,
      err,
    },
  ]
}
export { appendContainerToTag }
export { isContainer, isMiner }
export { appendIdToTag, appendIdToTags }
export { isAntminer, isAvalon, isWhatsminer }

export const getMinerShortCode = (
  code: string | undefined,
  tags: string[] | undefined,
  defaultValue = 'N/A',
): string => {
  if (code) return code

  const codeTag = tags?.find((tag) => tag.startsWith('code-') && !tag.endsWith('undefined'))

  return codeTag ? codeTag.replace('code-', '') : defaultValue
}
