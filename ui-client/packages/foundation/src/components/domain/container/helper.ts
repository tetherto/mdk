import type { ContainerStats, Device } from '../../../types/device'
import { appendContainerToTag, appendIdToTag } from '../../../utils/device-utils'
import { CONTAINER_STATUS } from '../../../utils/status-utils'

export const getAllSelectedContainerInfo = (devices: Device[], isTag: boolean): string[] =>
  devices
    .map((device) => {
      const container = device?.info?.container
      return container && isTag ? appendContainerToTag(container) : (container ?? undefined)
    })
    .filter((item): item is string => item !== undefined)

export const getAllSelectedContainerIds = (devices: Device[]): string[] =>
  devices
    .map((device) => {
      const id = device?.id
      return id ? appendIdToTag(id) : undefined
    })
    .filter((item): item is string => item !== undefined)

export const getContainerActionPayload = (
  isBatch: boolean,
  selectedDevices: Device[],
  data: Device,
): { idTags: string[]; containerInfo: (string | undefined)[] | string[] } => {
  if (isBatch) {
    return {
      idTags: getAllSelectedContainerIds(selectedDevices),
      containerInfo: getAllSelectedContainerInfo(selectedDevices, false),
    }
  }

  const id = data?.id
  const container = data?.info?.container

  return {
    idTags: id ? [appendIdToTag(id)] : [],
    containerInfo: container ? [container] : [],
  }
}

export const getContainerState = (
  containerData: ContainerStats,
): { isStarted: boolean; isAllSocketsOn: boolean } => {
  const { pdu_data } = containerData?.container_specific || {}
  const { status } = containerData || {}

  return {
    isStarted: status === CONTAINER_STATUS.RUNNING,
    isAllSocketsOn: (pdu_data ?? []).every(
      ({ power_w, status }) => status === 1 || (power_w ?? 0) > 0,
    ),
  }
}
