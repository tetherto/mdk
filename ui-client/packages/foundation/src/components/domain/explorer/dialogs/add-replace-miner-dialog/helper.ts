import type { UnknownRecord } from '@tetherto/core'
import { ACTION_TYPES } from '../../../../../constants/actions'
import { POSITION_CHANGE_DIALOG_FLOWS } from '../../../../../constants/dialog'
import { MINER_STATUSES } from '../../../../../constants/miner-constants'
import { getExistedActions } from '../../../../../utils/action-utils'
import { getContainerName } from '../../../../../utils/container-utils'

/**
 * Extracts container, PDU, and socket info from either a replacement or edit record.
 */
const getData = (replace?: UnknownRecord, edit?: UnknownRecord) => {
  const replaceInfo = replace?.containerInfo as UnknownRecord | undefined
  const editInfo = edit?.containerInfo as UnknownRecord | undefined

  return {
    container: (replaceInfo?.container || editInfo?.container || '') as string,
    pdu: (replace?.pdu || edit?.pdu || '') as string,
    socket: (replace?.socket || edit?.socket || '') as string,
  }
}

type GetTitleParams = {
  selectedSocketToReplace: UnknownRecord
  selectedEditSocket: UnknownRecord
  currentDialogFlow: string
  isDirectToMaintenanceMode: boolean
}

export const getTitle = ({
  selectedSocketToReplace,
  selectedEditSocket,
  currentDialogFlow,
  isDirectToMaintenanceMode,
}: Partial<GetTitleParams>): string => {
  if (isDirectToMaintenanceMode) {
    return 'Register miner directly in maintenance mode'
  }

  if (currentDialogFlow === POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO) {
    return 'Change Miner info'
  }

  if (!selectedEditSocket && !selectedSocketToReplace) return ''

  const { container, pdu, socket } = getData(selectedSocketToReplace, selectedEditSocket)

  return `Add miner to socket: ${getContainerName(container)} ${pdu}_${socket}`
}

/**
 * Check if there's an existing action for this MAC or Serial Number
 * in the pending submissions queue.
 */
type IsActionExistsParams = {
  pendingSubmissions: unknown[]
  macAddress?: string
  serialNumber?: string
}

export const isActionExists = ({
  pendingSubmissions,
  macAddress,
  serialNumber,
}: IsActionExistsParams): boolean => {
  if (!pendingSubmissions?.length) return false

  const existedActions = getExistedActions(ACTION_TYPES.REGISTER_THING, pendingSubmissions as [])

  if (!existedActions?.length) return false

  return existedActions.some((action) => {
    const actionRecord = action as UnknownRecord | undefined
    const params = (actionRecord?.params as UnknownRecord[] | undefined)?.[0]
    const paramsInfo = params?.info as UnknownRecord | undefined

    return (
      (paramsInfo?.macAddress && paramsInfo?.macAddress === macAddress) ||
      (paramsInfo?.serialNum && paramsInfo?.serialNum === serialNumber)
    )
  })
}

type GetSiteParams = {
  containerInfo: UnknownRecord
  currentSite: string
  isDirectToMaintenanceMode: boolean
}

const getSite = ({
  containerInfo,
  currentSite,
  isDirectToMaintenanceMode,
}: Partial<GetSiteParams>): string | null => {
  if (containerInfo?.site) return containerInfo.site as string
  if (isDirectToMaintenanceMode && currentSite) return currentSite
  return null
}

type BuildParamsInput = {
  selectedEditSocket: UnknownRecord
  serialNumber: string
  macAddress: string
  isDirectToMaintenanceMode: boolean
  containerMinerRackId: string
  username: string
  password: string
  forceSetIp: boolean
  isChangeInfo: boolean
  tags: string[]
  currentSite: string
  isStaticIpAssignment: boolean
  minerIp: string
  shortCode: string
}

export const buildAddReplaceMinerParams = ({
  selectedEditSocket,
  serialNumber,
  macAddress,
  isDirectToMaintenanceMode,
  containerMinerRackId,
  username,
  password,
  forceSetIp,
  isChangeInfo,
  tags = [],
  currentSite,
  isStaticIpAssignment,
  minerIp,
  shortCode,
}: Partial<BuildParamsInput>): UnknownRecord[] => {
  const containerInfo = selectedEditSocket?.containerInfo as UnknownRecord | undefined
  const pdu = selectedEditSocket?.pdu as string
  const socket = selectedEditSocket?.socket as string

  const posTag = selectedEditSocket ? `pos-${pdu}_${socket}` : null
  const containerTag = containerInfo ? `container-${containerInfo.container}` : null
  const site = getSite({ containerInfo, currentSite, isDirectToMaintenanceMode })
  const siteTag = site ? `site-${site}` : null

  const baseInfo: UnknownRecord = {
    serialNum: serialNumber,
    macAddress,
    container: isDirectToMaintenanceMode
      ? ACTION_TYPES.MAINTENANCE
      : (containerInfo?.container as string),
    subnet: containerInfo?.subnet as string,
  }

  if (isDirectToMaintenanceMode) {
    baseInfo.status = MINER_STATUSES.ON_HOLD
  }

  const credentials = username && password ? { username, password } : {}
  const address = isStaticIpAssignment && forceSetIp ? { address: minerIp } : {}
  const advancedOpts = forceSetIp ? { forceSetIp } : {}

  const opts = { ...credentials, ...advancedOpts, ...address }
  const updatedOpts = Object.keys(opts).length > 0 ? { opts } : {}

  // "Change Info" mode (editing existing)
  if (isChangeInfo) {
    return [
      {
        id: (selectedEditSocket?.miner as UnknownRecord | undefined)?.id as string,
        rackId: containerMinerRackId,
        ...(shortCode && { code: shortCode }),
        info: baseInfo,
        ...updatedOpts,
        tags: tags.filter(Boolean),
      },
    ]
  }

  // "Add/Replace" mode
  return [
    {
      rackId: containerMinerRackId,
      info: {
        ...baseInfo,
        pos: selectedEditSocket ? `${pdu}_${socket}` : '',
        site,
      },
      ...(shortCode && { code: shortCode }),
      ...updatedOpts,
      tags: [...tags, posTag, containerTag, siteTag].filter(Boolean) as string[],
    },
  ]
}

export const isValidMacAddress = (mac?: string): boolean => {
  if (!mac) return true
  const macRegex = /^(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}$/i
  return macRegex.test(mac)
}
