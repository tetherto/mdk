import type { LogData, UnknownRecord } from '@tetherto/core'
import { LOG_TYPES, LogDot, LogItem } from '@tetherto/core'
import _join from 'lodash/join'
import _map from 'lodash/map'
import type {
  AlarmItemData,
  TimelineItemData,
} from '../components/domain/alarm/alarm-row/alarm-row'
import { SEVERITY_LEVELS } from '../constants/alerts'
import type { Alert, LogFormattedAlertData } from '../types/alerts'
import type { Device, DeviceData } from '../types/device'
import { getContainerName } from './container-utils'
import { getDeviceData, getMinerShortCode } from './device-utils'
import { getByTagsWithAlertsQuery, getDeviceByAlertId } from './query-utils'

type AlertClickParams = {
  id: string
  uuid: string
}

export type LocalFilters = {
  severity: string[] | string
  status: string[]
  type: string[]
  id: string[]
  thing: { id?: string }
  [key: string]: unknown
}

export type ParsedAlertEntry = {
  shortCode: string
  device: string
  tags: string[]
  alertName: string
  alertCode: string
  severity: string
  description?: string
  message?: string
  createdAt: string | number
  status?: string
  uuid: string
  id?: string
  type?: string
  actions: {
    onAlertClick?: (params: AlertClickParams) => void
    id?: string
    uuid: string
  }
  [key: string]: unknown
}

export const getAlertsDescription = (
  alerts: Alert[],
  getFormattedDate?: (date: Date) => string,
): string => {
  const formattedMessages = _map(
    alerts,
    (alert: Alert) =>
      `${
        getFormattedDate
          ? getFormattedDate(new Date(alert.createdAt))
          : new Date(alert.createdAt).toLocaleString()
      } : ${alert.description}`,
  )
  return _join(formattedMessages, ',\n\n')
}

export const getAlertsString = (
  alerts: Alert[],
  getFormattedDate?: (date: Date) => string,
): string => {
  const formattedMessages = _map(
    alerts,
    (alert: Alert) =>
      `(${alert.severity}) ${
        getFormattedDate
          ? getFormattedDate(new Date(alert.createdAt))
          : new Date(alert.createdAt).toLocaleString()
      } : ${alert.name} Description: ${alert.description} ${alert.message ? alert.message : ''}`,
  )
  return _join(formattedMessages, ',\n\n')
}

export const getSingleAlarmMessage = (
  alarm: Alert,
  getFormattedDate?: (date: Date) => string,
): string =>
  `(${alarm.severity}) ${getFormattedDate?.(new Date(alarm.createdAt)) ?? ''}: ${alarm.name} Description: ${
    alarm.description
  } ${alarm.message || ''}`

export const getAlarms = (
  data: Device = {} as Device,
  getString?: boolean,
  getFormattedDate?: (date: Date) => string,
): string | Alert[] => {
  const alarms = data?.last?.alerts as Alert[]

  if (!getString || !alarms) {
    return alarms
  }
  return _join(
    _map(alarms, (alarm) => getSingleAlarmMessage(alarm, getFormattedDate)),
    ',\n',
  )
}

const parseAlertEntry = (
  alert: Alert,
  device: Device | undefined,
  onAlertClick?: (params: Partial<AlertClickParams>) => void,
): ParsedAlertEntry | null => {
  if (!device) return null

  const [, deviceStats] = getDeviceData(device) as [unknown, DeviceData]

  const type = (deviceStats?.type || '') as string
  const info = deviceStats?.info || {
    container: '',
    pos: '',
    macAddress: '',
    serialNum: '',
  }

  const firmwareVersion = deviceStats?.snap?.config?.firmware_ver
  const id = deviceStats?.id || ''
  const shortCode = getMinerShortCode(device.code, device?.tags || [])

  const tags = [
    ...(deviceStats?.tags || []),
    deviceStats?.address ? `ip-${deviceStats.address}` : null,
    info.macAddress ? `mac-${String(info.macAddress)}` : null,
    info.serialNum ? `sn-${String(info.serialNum)}` : null,
    firmwareVersion ? `firmware-${firmwareVersion}` : null,
  ].filter((tag): tag is string => Boolean(tag))

  return {
    shortCode,
    device: `${getContainerName(info?.container as string | undefined, type)} ${info?.pos || ''}`,
    tags,
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
  onAlertClick?: (params: Partial<AlertClickParams>) => void,
): ParsedAlertEntry[] => {
  const [err, deviceStats] = getDeviceData(device) as [unknown, DeviceData]

  if (!err) {
    return (deviceStats?.alerts || [])
      .map((alert) => parseAlertEntry(alert as Alert, device, onAlertClick))
      .filter((entry): entry is ParsedAlertEntry => entry !== null)
  }

  return []
}

export const applyAlertsLocalFilters = (
  allAlerts: ParsedAlertEntry[] = [],
  localFilters: LocalFilters = {} as LocalFilters,
): ParsedAlertEntry[] => {
  let filteredAlerts = [...allAlerts]

  if (localFilters?.severity) {
    filteredAlerts = filteredAlerts.filter((alert) =>
      localFilters.severity!.includes(alert.severity),
    )
  }

  if (localFilters?.status) {
    filteredAlerts = filteredAlerts.filter((alert) => localFilters.status!.includes(alert.status!))
  }

  if (localFilters?.type) {
    filteredAlerts = filteredAlerts.filter((alert) =>
      localFilters.type!.some((searchLookup) => {
        const lowerLookup = searchLookup.toLowerCase()

        const fastAccessValues = [
          alert.type,
          alert.alertCode,
          alert.alertName,
          alert.uuid,
          alert.shortCode,
          alert.device,
        ].map((value) => (value ?? '').toLowerCase())

        if (fastAccessValues.some((value) => value.includes(lowerLookup))) {
          return true
        }

        return alert.tags.some((tag) => tag.toLowerCase().includes(lowerLookup))
      }),
    )
  }

  if (localFilters?.id) {
    filteredAlerts = filteredAlerts.filter((alert) => localFilters.id!.includes(alert.uuid))
  }

  return filteredAlerts
}

const composeFilters = (localFilters: LocalFilters, filterTags?: string[]): LocalFilters => {
  if (!filterTags || filterTags.length === 0) {
    return localFilters
  }

  return {
    ...localFilters,
    type: [...(localFilters?.type || []), ...filterTags],
  }
}

export const getHistoricalAlertsData = (
  alerts: Alert[],
  {
    filterTags,
    localFilters,
    onAlertClick,
  }: {
    filterTags?: string[]
    localFilters: LocalFilters
    onAlertClick?: (params: Partial<AlertClickParams>) => void
  },
): ParsedAlertEntry[] => {
  const allAlerts = alerts
    .map((alert) => parseAlertEntry(alert, alert?.thing as Device, onAlertClick))
    .filter((entry): entry is ParsedAlertEntry => entry !== null)

  const filters = composeFilters(localFilters, filterTags)

  return applyAlertsLocalFilters(allAlerts, filters)
}

export const getAlertsForDevices = (
  data: Device[][],
  localFilters: LocalFilters,
  onAlertClick?: (params: Partial<AlertClickParams>) => void,
): ParsedAlertEntry[] => {
  const allAlerts = (data[0] || []).reduce<ParsedAlertEntry[]>((alerts, device) => {
    const deviceAlerts = getDeviceAlertsData(device, onAlertClick)
    return deviceAlerts.length > 0 ? [...alerts, ...deviceAlerts] : alerts
  }, [])

  return applyAlertsLocalFilters(allAlerts, localFilters)
}

export const onLogClicked = (navigate?: (path: string) => void, id?: string) => {
  if (!navigate || !id) return
  navigate(`/alerts/${id}`)
}

export const getAlertsThingsQuery = (
  id?: string,
  filterTags?: string[],
  allowEmptyArray?: boolean,
) => {
  if (id) return getDeviceByAlertId(id)
  return getByTagsWithAlertsQuery(filterTags || [], allowEmptyArray)
}

export const getCurrentAlerts = (
  data: Device[][],
  {
    filterTags,
    localFilters,
    onAlertClick,
    id,
  }: {
    filterTags?: string[]
    localFilters: LocalFilters
    onAlertClick?: (params: Partial<AlertClickParams>) => void
    id?: string
  },
): ParsedAlertEntry[] => {
  const alertFilters = composeFilters(localFilters, id ? [] : filterTags)
  const devicesAlerts = getAlertsForDevices(data, alertFilters, onAlertClick)
  return id ? devicesAlerts.filter((alert) => alert.uuid === id) : devicesAlerts
}

type AlertDataParams = {
  alert: Alert
  info?: UnknownRecord
  type: string
  id: string
}
export const getLogFormattedAlertData = (
  { alert, info, type, id }: AlertDataParams,
  getFormattedDate: (date: Date) => string,
): LogFormattedAlertData => ({
  title: alert?.name,
  subtitle: `${alert?.description} ${alert?.message || ''}`,
  status: alert?.severity,
  severityLevel: SEVERITY_LEVELS[alert?.severity as keyof typeof SEVERITY_LEVELS],
  creationDate: alert?.createdAt,
  body: `${getFormattedDate(new Date(alert?.createdAt))}  | ${getContainerName(
    info?.container as string,
    type,
  )} ${info?.pos ?? ''}`,
  id,
  uuid: alert?.uuid,
})

export const getAlertTimelineItems = (
  formattedAlerts: LogData[],
  onNavigate: (path: string) => void,
): TimelineItemData[] =>
  formattedAlerts.map((log) => ({
    item: log as unknown as AlarmItemData,
    children: <LogItem onLogClicked={(id) => onLogClicked(onNavigate, id)} data={log} />,
    dot: <LogDot status={log.status as string} type={LOG_TYPES.INCIDENTS} />,
  }))
