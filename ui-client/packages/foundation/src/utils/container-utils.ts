import _capitalize from 'lodash/capitalize'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import _slice from 'lodash/slice'
import _split from 'lodash/split'
import _toLower from 'lodash/toLower'
import _toUpper from 'lodash/toUpper'
import {
  COMPLETE_CONTAINER_TYPE,
  CONTAINER_MODEL,
  CONTAINER_SETTINGS_MODEL,
  CONTAINER_TYPE,
  CONTAINER_TYPE_NAME_MAP,
  MAINTENANCE_CONTAINER,
} from '../constants/container-constants'
import { CONTAINERS_MINER_TYPE, MINER_TYPE } from '../constants/device-constants'
import type { ContainerPosInfo, Device } from '../types/device'
import {
  getContainerSpecificStats,
  getCoolingSystem,
  isContainer,
  separateByHyphenRegExp,
  separateByTwoHyphensRegExp,
} from './device-utils'
import { CONTAINER_STATUS } from './status-utils'

export const isContainerOffline = (snap: { stats?: { status?: string } } | undefined): boolean =>
  snap?.stats?.status === CONTAINER_STATUS.OFFLINE

export const isBitdeer = (type: string | undefined): boolean =>
  _includes(_toLower(type), CONTAINER_TYPE.BITDEER) ||
  _includes(_toLower(type), CONTAINER_MODEL.BITDEER)

export const isAntspaceHydro = (type: string): boolean =>
  _includes(_toLower(type), CONTAINER_TYPE.ANTSPACE_HYDRO) ||
  _includes(_toLower(type), CONTAINER_MODEL.ANTSPACE_HYDRO) ||
  _includes(_toLower(type), CONTAINER_MODEL.BITMAIN_HYDRO)

export const isMicroBT = (type: string | undefined): boolean =>
  _includes(_toLower(type), CONTAINER_TYPE.MICROBT) ||
  _includes(_toLower(type), CONTAINER_MODEL.MICROBT)

export const isMicroBTKehua = (type: string): boolean =>
  _includes(_toLower(type), COMPLETE_CONTAINER_TYPE.MICROBT_KEHUA)

export const isAntspaceImmersion = (type: string): boolean =>
  _includes(_toLower(type), CONTAINER_TYPE.ANTSPACE_IMMERSION) ||
  _includes(_toLower(type), CONTAINER_MODEL.ANTSPACE_IMMERSION) ||
  _includes(_toLower(type), CONTAINER_MODEL.BITMAIN_IMMERSION) ||
  _includes(_toLower(type), CONTAINER_MODEL.BITMAIN_IMM)

export const isBitmainImmersion = (type: string): boolean =>
  _includes(_toLower(type), CONTAINER_MODEL.BITMAIN_IMMERSION) ||
  _includes(_toLower(type), CONTAINER_MODEL.BITMAIN_IMM) ||
  _includes(_toLower(type), CONTAINER_MODEL.IMMERSION_CONTAINER)

export const getContainerName = (container: string | undefined, type?: string): string => {
  if (_isEmpty(container)) {
    return ''
  }
  if (container === MAINTENANCE_CONTAINER) {
    return 'Maintenance'
  }
  const isBitdeerContainer = isBitdeer(container) || isBitdeer(type)
  const isMicroBTContainer = isMicroBT(container) || isMicroBT(type)

  if (isBitdeerContainer || isMicroBTContainer) {
    const [name, id] = _slice((container || '').match(separateByHyphenRegExp) || [], 1)
    const containerName = `${_capitalize(name)} ${id}`
    if (!type) {
      return containerName
    }
    const [, containerModel] = _slice((type || '').match(separateByHyphenRegExp) || [], 1)
    if (isMicroBTContainer) {
      let typeKey

      if (_includes(COMPLETE_CONTAINER_TYPE.MICROBT_KEHUA, containerModel)) {
        typeKey = COMPLETE_CONTAINER_TYPE.MICROBT_KEHUA
      } else if (_includes(COMPLETE_CONTAINER_TYPE.MICROBT_WONDERINT, containerModel)) {
        typeKey = COMPLETE_CONTAINER_TYPE.MICROBT_WONDERINT
      }

      if (!typeKey) {
        return `MicroBT ${id}`
      }

      const [name, model] = _split(CONTAINER_TYPE_NAME_MAP[typeKey], ' ')
      return `${name} ${id} ${model}`
    }
    // Bitdeer labels
    return `${containerName} ${_toUpper(containerModel)}`
  }
  const [name, model, id] = _slice((container || '').match(separateByTwoHyphensRegExp) || [], 1)
  return `${_capitalize(name)} ${_capitalize(model)} ${id}`
}

/**
 * Maps a container type to its corresponding settings model
 * Used for fetching container settings from the API
 * @param {string} containerType - The container type (e.g., 'bd', 'mbt', 'as-hk3', etc.)
 * @returns {string|null} - The settings model ('bd', 'mbt', 'hydro', 'immersion') or null
 */
export const getContainerSettingsModel = (containerType: string): string | null => {
  if (!containerType) return null

  if (isBitdeer(containerType)) {
    return CONTAINER_SETTINGS_MODEL.BITDEER
  }
  if (isMicroBT(containerType)) {
    return CONTAINER_SETTINGS_MODEL.MICROBT
  }
  if (isAntspaceHydro(containerType)) {
    return CONTAINER_SETTINGS_MODEL.HYDRO
  }
  if (isBitmainImmersion(containerType) || isAntspaceImmersion(containerType)) {
    return CONTAINER_SETTINGS_MODEL.IMMERSION
  }

  return null
}

export const isAvalonContainer = (type: string | undefined): boolean =>
  isContainer(type) && _includes(type || '', CONTAINERS_MINER_TYPE.A1346)

export const isWhatsminerContainer = (type: string | undefined): boolean =>
  isContainer(type) &&
  (_includes(type || '', CONTAINERS_MINER_TYPE.M56) ||
    _includes(type || '', CONTAINERS_MINER_TYPE.M30) ||
    isMicroBT(type || ''))

export const isAntminerContainer = (type: string | undefined): boolean =>
  isContainer(type) &&
  (_includes(type || '', CONTAINERS_MINER_TYPE.S19XP) ||
    isAntspaceImmersion(type || '') ||
    isAntspaceHydro(type || ''))

export const getMinerTypeFromContainerType = (type: string): string | undefined => {
  if (isAvalonContainer(type)) {
    return MINER_TYPE.AVALON
  }
  if (isWhatsminerContainer(type)) {
    return MINER_TYPE.WHATSMINER
  }
  if (isAntminerContainer(type)) {
    return MINER_TYPE.ANTMINER
  }
  return undefined
}

export const getDeviceContainerPosText = (containerPosInfo: Partial<ContainerPosInfo>): string => {
  const { containerInfo, pdu, socket, pos } = containerPosInfo || {}
  if ((!pdu || !socket) && !pos) {
    return `${getContainerName(containerInfo?.container)}`
  }
  const destination = pos || `${pdu}_${socket}`
  return `${getContainerName(containerInfo?.container)} ${destination}`
}

export const getNumberSelected = (
  selectedSockets: Record<string, any>,
): {
  nContainers: number
  nSockets: number
} => {
  const containers = Object.keys(selectedSockets)

  const nSockets = containers.reduce((acc, container) => {
    const sockets = selectedSockets[container]?.sockets

    const socketCount = sockets ? Object.keys(sockets).length : 0

    return acc + socketCount
  }, 0)

  return {
    nContainers: containers.length,
    nSockets,
  }
}

export const isContainerControlNotSupported = (container: string): boolean =>
  isAntspaceHydro(container) || isAntspaceImmersion(container)

export const getAntspaceContainerControlsBoxData = (data: Device = {} as Device) => {
  const { id } = data

  return {
    id,
    pidModeEnabled: getContainerSpecificStats(data)?.pid_mode,
    runningModeEnabled: getContainerSpecificStats(data)?.running_mode,
  }
}

export const getBitdeerContainerControlsBoxData = (data: Device = {} as Device) => {
  const { id } = data
  const { exhaust_fan_enabled, oil_pump = [] } = getCoolingSystem(data)

  const pumpArray = Array.isArray(oil_pump) ? oil_pump : []

  return {
    id,
    exhaustFanEnabled: exhaust_fan_enabled,
    tank1Enabled: pumpArray[0]?.tank,
    tank2Enabled: pumpArray[1]?.tank,
  }
}
