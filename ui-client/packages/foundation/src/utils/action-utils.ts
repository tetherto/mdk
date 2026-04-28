import type { ApiError } from '@tetherto/core'
import type { ContainerActionValue, MinerActionValue, ThingActionValue } from '../constants/actions'
import {
  ACTION_TYPES,
  ActionErrorMessages,
  BATCH_ACTION_TYPE,
  CONTAINER_ACTIONS,
  MINER_ACTIONS,
  SUBMIT_ACTION_TYPES,
  THING_ACTIONS,
} from '../constants/actions'
import { COMPLETE_CONTAINER_TYPE, CONTAINER_TYPE_NAME_MAP } from '../constants/container-constants'
import {
  ALERT_TYPE_POOL_NAME,
  ALERT_TYPE_POOL_VALUE,
  CABINET_DEVICES_TYPES_NAME_MAP,
  COMPLETE_MINER_TYPES,
  LV_CABINET_DEVICES_TYPE,
  MINER_TYPE_NAME_MAP,
} from '../constants/device-constants'
import { CROSS_THING_TYPES } from '../constants/devices'
import type { Device } from '../types'
import { appendIdToTag, getRackNameFromId, isMiner } from './device-utils'

type FilterOption = {
  label: string
  value: string
}

type TypeFilter = {
  value: string
  label: string
  children: FilterOption[]
}

export type AvailableDevices = {
  availableContainerTypes?: string[]
  availableMinerTypes?: string[]
}

type PendingSubmission = {
  action: string
}

export type ActionPayload = {
  action?: string
  tags?: string[]
  minerId?: string
  targets?: Record<string, { calls: Array<{ id: string }> }>
  create?: {
    tags?: string[]
    action?: string
    metadata?: unknown
    codesList?: unknown
  }
  batchActionsPayload?: Array<{
    tags?: string[]
    params?: Array<{ rackId?: string; info?: { parentDeviceId?: string | null }; comment?: string }>
  }>
}

export type ActionData = {
  errors?: string | string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getFilterOptions = (
  types: string[] | Record<string, string>,
  names: Record<string, string>,
): FilterOption[] => {
  const valuesList = Array.isArray(types) ? types : Object.values(types)

  return valuesList.map((value) => ({
    label: names[value] as string,
    value,
  }))
}

export const TYPE_FILTER_MAP: Record<string, TypeFilter> = {
  CONTAINER: {
    value: CROSS_THING_TYPES.CONTAINER,
    label: 'Container',
    children: getFilterOptions(COMPLETE_CONTAINER_TYPE, CONTAINER_TYPE_NAME_MAP),
  },
  MINER: {
    value: CROSS_THING_TYPES.MINER,
    label: 'Miner',
    children: getFilterOptions(COMPLETE_MINER_TYPES, MINER_TYPE_NAME_MAP),
  },
  LV_CABINET: {
    value: CROSS_THING_TYPES.CABINET,
    label: 'LV cabinet',
    children: getFilterOptions(LV_CABINET_DEVICES_TYPE, CABINET_DEVICES_TYPES_NAME_MAP),
  },
  POOL: {
    value: CROSS_THING_TYPES.POOL,
    label: 'Pool',
    children: getFilterOptions(ALERT_TYPE_POOL_VALUE, ALERT_TYPE_POOL_NAME),
  },
}

export const getTypeFiltersForSite = (
  site: unknown,
  availableDevices?: AvailableDevices,
): TypeFilter[] => {
  if (!site) {
    return Object.values(TYPE_FILTER_MAP)
  }

  const typeFilterMapPerSite: Record<string, TypeFilter> = {
    CONTAINER: {
      value: TYPE_FILTER_MAP.CONTAINER!.value,
      label: TYPE_FILTER_MAP.CONTAINER!.label,
      children: getFilterOptions(
        availableDevices?.availableContainerTypes ?? [],
        CONTAINER_TYPE_NAME_MAP,
      ),
    },
    MINER: {
      value: TYPE_FILTER_MAP.MINER!.value,
      label: TYPE_FILTER_MAP.MINER!.label,
      children: getFilterOptions(availableDevices?.availableMinerTypes ?? [], MINER_TYPE_NAME_MAP),
    },
    LV_CABINET: TYPE_FILTER_MAP.LV_CABINET!,
    POOL: TYPE_FILTER_MAP.POOL!,
  }

  return Object.values(typeFilterMapPerSite)
}

export const isContainerAction = (action: string): boolean =>
  CONTAINER_ACTIONS.includes(action as ContainerActionValue)

export const isMinerAction = (action: string): boolean =>
  MINER_ACTIONS.includes(action as MinerActionValue)

export const isThingAction = (action: string): boolean =>
  THING_ACTIONS.includes(action as ThingActionValue)

export const isRackAction = (action: string): boolean => action === ACTION_TYPES.RACK_REBOOT

export const isBatchAction = (action: string): boolean =>
  BATCH_ACTION_TYPE.has(action as typeof BATCH_ACTION_TYPE extends Set<infer T> ? T : never)

export const getSwitchAllSocketsParams = (
  isOn: boolean,
): Array<Array<[string, string, boolean]>> => [[['-1', '-1', isOn]]]

export const getIsAllSocketsAction = (sockets: Array<Array<string | boolean>>): boolean => {
  const firstSocket = sockets[0]
  return (firstSocket?.length ?? 0) > 1 && firstSocket?.[0] === '-1' && firstSocket?.[1] === '-1'
}

export const getMinerNumber = (str: string): string | undefined => {
  const regex = /(\d+)/
  return str.match(regex)?.[0]
}

export const getExistedActions = (
  actionType: string,
  pendingSubmissions: PendingSubmission[],
): PendingSubmission[] => pendingSubmissions.filter(({ action }) => action === actionType)

export const getErrorMessage = (
  data: ActionData | ActionData[],
  error?: ApiError,
): string | undefined => {
  const errorData = Array.isArray(data) ? data[0] : data

  if (Array.isArray(errorData?.errors)) {
    return errorData.errors.join(',')
  }
  if (errorData?.errors) {
    return errorData.errors as string
  }

  const messageKey = error?.data?.message ?? ''
  return ActionErrorMessages[messageKey as keyof typeof ActionErrorMessages] || messageKey
}

export const extractActionErrors = (action: {
  targets?: Record<string, { calls?: Array<{ error?: string; [key: string]: unknown }> }>
  [key: string]: unknown
}): string[] => {
  const errors: string[] = []
  const targets = action.targets
  if (!targets) return errors

  Object.values(targets).forEach((target) => {
    target.calls?.forEach((call) => {
      if (call.error) {
        errors.push(call.error)
      }
    })
  })

  return errors
}

export const getSelectedDevicesTags = (selectedDevices: Device[]): string[] =>
  selectedDevices.map((device) => appendIdToTag(device.id))

export const getDevicesIdList = ({
  tags,
  minerId,
  targets,
}: Pick<ActionPayload, 'tags' | 'minerId' | 'targets'>): string[] | undefined => {
  if (tags) return tags

  if (minerId) return [appendIdToTag(minerId)]

  if (targets) {
    return Object.values(targets).reduce<string[]>(
      (acc, item) => acc.concat(item.calls.map((call) => appendIdToTag(call.id))),
      [],
    )
  }

  return undefined
}

export const getRepairActionSummary = (
  batchActionParams: ActionPayload['batchActionsPayload'],
): string => {
  let commentAction = batchActionParams?.find((actionPayload) => actionPayload.params?.[0]?.comment)

  const minerAction = batchActionParams?.find((actionPayload) => {
    const rackId = actionPayload.params?.[0]?.rackId
    if (!rackId) return false
    return isMiner(getRackNameFromId(rackId))
  })

  if (minerAction === commentAction) {
    commentAction = undefined
  }

  const numRemoved = (batchActionParams ?? []).filter(
    (actionPayload) => actionPayload.params?.[0]?.info?.parentDeviceId === null,
  ).length

  let numAttached = (batchActionParams?.length ?? 0) - numRemoved

  if (commentAction !== undefined && commentAction !== null) {
    numAttached = numAttached - 1
  }

  if (minerAction !== undefined && minerAction !== null) {
    numAttached = numAttached - 1
  }

  return `${numAttached} Additions, ${numRemoved} Removals`
}

export const enhanceAction = ({
  actionPayload,
}: {
  actionPayload: ActionPayload
}): ActionPayload => {
  const { tags, targets, action, minerId } = actionPayload

  if (action && isBatchAction(action)) {
    return actionPayload
  }

  return {
    ...actionPayload,
    tags: getDevicesIdList({ tags, minerId, targets }),
  }
}

export const executeCreateAction = async ({
  addNewAction,
  action,
  addNewBatchAction,
}: {
  addNewAction: (payload: unknown) => Promise<{ data?: unknown; error?: unknown }>
  action: ActionPayload
  addNewBatchAction: (payload: unknown) => Promise<{ data?: unknown; error?: unknown }>
}): Promise<{
  newActionPayload: ActionPayload
  isBatch: boolean
  data?: unknown
  error?: unknown
}> => {
  let apiDelegate = addNewAction

  const newActionPayload = structuredClone(action.create) as ActionPayload &
    ActionPayload['create'] & {
      actionType?: string
      query?: unknown
    }

  const isBatch = newActionPayload?.action ? isBatchAction(newActionPayload.action) : false
  newActionPayload.actionType ??= 'miner'

  if (isBatch) {
    apiDelegate = addNewBatchAction
    newActionPayload.batchActionsPayload = (newActionPayload.batchActionsPayload ?? []).map(
      (actionPayload) => ({
        ...actionPayload,
        query: { tags: { $in: actionPayload.tags ?? [] } },
      }),
    )

    delete newActionPayload.action
    delete newActionPayload.metadata
  } else {
    const overrideQuery = (newActionPayload as Record<string, unknown>).overrideQuery ?? true

    if (overrideQuery) {
      newActionPayload.query = { tags: { $in: action.create?.tags } }
    }

    delete newActionPayload.codesList
  }

  const { data, error } = await apiDelegate({
    ...newActionPayload,
    type: SUBMIT_ACTION_TYPES.VOTING,
  })

  return { newActionPayload, isBatch, data, error }
}
