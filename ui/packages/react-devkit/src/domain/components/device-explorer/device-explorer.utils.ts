import type { Alert, DeviceExplorerDeviceData } from './types'
import _join from 'lodash/join'
import _map from 'lodash/map'

export const getSingleAlarmMessage = (
  alarm: Alert,
  getFormattedDate?: (date: Date) => string,
): string =>
  `(${alarm.severity}) ${getFormattedDate?.(new Date(alarm.createdAt)) ?? ''}: ${alarm.name} Description: ${
    alarm.description
  } ${alarm.message || ''}`

export const getAlarms = (
  data: DeviceExplorerDeviceData = {} as DeviceExplorerDeviceData,
  getString?: VoidFunction,
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
