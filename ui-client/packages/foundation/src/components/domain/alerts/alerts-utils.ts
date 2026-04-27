import _compact from 'lodash/compact'
import _concat from 'lodash/concat'
import _filter from 'lodash/filter'
import _head from 'lodash/head'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _reduce from 'lodash/reduce'
import _some from 'lodash/some'
import _toLower from 'lodash/toLower'

import type { Alert } from '../../../types/alerts'
import type { Device } from '../../../types/device'
import { getContainerName } from '../../../utils/container-utils'
import { getDeviceData, getMinerShortCode } from '../../../utils/device-utils'
import { getByTagsWithAlertsQuery, getDeviceByAlertId } from '../../../utils/query-utils'

import type { AlertLocalFilters, ParsedAlertEntry } from './alerts-types'

type DeviceStats = Record<string, unknown> &
  Partial<{
    id: string
    type: string
    address: string
    info: Record<string, unknown> &
      Partial<{
        container: string
        pos: string
        macAddress: string
        serialNum: string
      }>
    tags: string[]
    snap: Partial<{
      config: {
        firmware_ver?: string
      }
      stats: {
        status?: string
      }
    }>
    alerts: Alert[]
    last: {
      snap?: {
        stats?: {
          status?: string
        }
      }
    }
  }>

type GetAlertsArgs = {
  filterTags?: string[]
  localFilters: AlertLocalFilters
  onAlertClick?: (id: string, uuid: string) => void
}

type GetCurrentAlertsArgs = GetAlertsArgs & {
  id?: string
}

const parseAlertEntry = (
  alert: Alert,
  device: Device | undefined,
  onAlertClick?: (id: string, uuid: string) => void,
): ParsedAlertEntry | null => {
  if (!device) return null

  const [, deviceStats] = getDeviceData(device) as [unknown, DeviceStats]

  const type = (deviceStats?.type ?? '') as string
  const info =
    deviceStats?.info ||
    ({
      container: '',
      pos: '',
      macAddress: '',
      serialNum: '',
    } as { container?: string; pos?: string; macAddress?: string; serialNum?: string })

  const firmwareVersion = deviceStats?.snap?.config?.firmware_ver
  const id = deviceStats?.id ?? ''
  const shortCode = getMinerShortCode(device.code, device?.tags || [])

  const containerName = getContainerName(info?.container as string | undefined, type)
  const positionLabel = [containerName, info?.pos]
    .map((part) => (part == null ? '' : String(part)))
    .filter((part) => part && !part.includes('undefined'))
    .join(' ')
    .trim()

  return {
    shortCode,
    device: positionLabel,
    tags: _compact([
      ...(deviceStats?.tags || []),
      deviceStats?.address && `ip-${deviceStats.address}`,
      info.macAddress && `mac-${String(info.macAddress)}`,
      info.serialNum && `sn-${String(info.serialNum)}`,
      firmwareVersion && `firmware-${firmwareVersion}`,
    ]),
    alertName: alert.name as string,
    alertCode: alert.code as string,
    severity: alert.severity as string,
    description: alert.description as string,
    message: alert.message as string,
    createdAt: alert.createdAt as string | number,
    status: device.last?.snap?.stats?.status as string,
    uuid: alert.uuid as string,
    id,
    type,
    actions: { onAlertClick, id, uuid: alert.uuid as string },
  }
}

const getDeviceAlertsData = (
  device: Device,
  onAlertClick?: (id: string, uuid: string) => void,
): ParsedAlertEntry[] => {
  const [err, deviceStats] = getDeviceData(device) as [unknown, DeviceStats]

  if (err) return []

  return _compact(
    _map(deviceStats?.alerts, (alert) => parseAlertEntry(alert, device, onAlertClick)),
  )
}

export const applyAlertsLocalFilters = (
  allAlerts: ParsedAlertEntry[] = [],
  localFilters: AlertLocalFilters = {},
): ParsedAlertEntry[] => {
  let filteredAlerts = [...allAlerts]

  if (localFilters?.severity) {
    filteredAlerts = _filter(filteredAlerts, (alert) =>
      _includes(localFilters.severity, alert.severity),
    )
  }

  if (localFilters?.status) {
    filteredAlerts = _filter(filteredAlerts, (alert) =>
      _includes(localFilters.status, alert.status),
    )
  }

  if (localFilters?.type) {
    filteredAlerts = _filter(filteredAlerts, (alert) =>
      _some(localFilters.type, (searchLookup) => {
        const lowerLookup = _toLower(searchLookup)

        const fastAccessValues = _map(
          [alert.type, alert.alertCode, alert.alertName, alert.uuid, alert.shortCode, alert.device],
          (value) => _toLower(value),
        )

        if (_some(fastAccessValues, (value) => _includes(value, lowerLookup))) {
          return true
        }

        return _some(alert.tags, (tag) => _includes(_toLower(tag), lowerLookup))
      }),
    )
  }

  if (localFilters?.id) {
    filteredAlerts = _filter(filteredAlerts, (alert) => _includes(localFilters.id, alert.uuid))
  }

  return filteredAlerts
}

const composeFilters = (
  localFilters: AlertLocalFilters,
  filterTags?: string[],
): AlertLocalFilters => {
  if (_isEmpty(filterTags)) {
    return localFilters
  }

  return {
    ...localFilters,
    type: [...(localFilters?.type || []), ...(filterTags || [])],
  }
}

export const getHistoricalAlertsData = (
  alerts: Alert[],
  { filterTags, localFilters, onAlertClick }: GetAlertsArgs,
): ParsedAlertEntry[] => {
  const allAlerts = _compact(
    _map(alerts, (alert) => parseAlertEntry(alert, alert?.thing as Device, onAlertClick)),
  )
  const filters = composeFilters(localFilters, filterTags)
  return applyAlertsLocalFilters(allAlerts, filters)
}

export const getAlertsForDevices = (
  data: Device[][],
  localFilters: AlertLocalFilters,
  onAlertClick?: (id: string, uuid: string) => void,
): ParsedAlertEntry[] => {
  const allAlerts = _reduce(
    _head(data),
    (alerts: ParsedAlertEntry[], device: Device) => {
      const deviceAlerts = getDeviceAlertsData(device, onAlertClick)
      if (deviceAlerts) {
        return _concat(alerts, deviceAlerts)
      }
      return alerts
    },
    [],
  )

  return applyAlertsLocalFilters(allAlerts, localFilters)
}

export const onLogClicked = (navigate?: (path: string) => void, id?: string): void => {
  if (!navigate || !id) return
  navigate(`/alerts/${id}`)
}

export const getAlertsThingsQuery = (
  id?: string,
  filterTags?: string[],
  allowEmptyArray?: boolean,
): string => {
  if (id) return getDeviceByAlertId(id)
  return getByTagsWithAlertsQuery(filterTags || [], allowEmptyArray)
}

export const getCurrentAlerts = (
  data: Device[][],
  { filterTags, localFilters, onAlertClick, id }: GetCurrentAlertsArgs,
): ParsedAlertEntry[] => {
  const alertFilters = composeFilters(localFilters, id ? [] : filterTags)
  const devicesAlerts = getAlertsForDevices(data, alertFilters, onAlertClick)
  return id ? _filter(devicesAlerts, { uuid: id }) : devicesAlerts
}
