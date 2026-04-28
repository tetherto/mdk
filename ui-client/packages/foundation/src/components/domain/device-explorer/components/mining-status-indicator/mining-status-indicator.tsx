import {
  AlertTriangleIcon,
  ErrorStatusIcon,
  formatErrors,
  MiningStatusIcon,
  OfflineStatusIcon,
  SimpleTooltip,
  SleepStatusIcon,
} from '@tetherto/core'
import type { UnknownRecord } from '@tetherto/core'
import { getAlertsString } from '../../../../../utils/alerts-utils'
import type { Alert } from '../../types'
import _isObject from 'lodash/isObject'
import { StatusLabel } from '../status-label/status-label'
import { MinerStatuses } from '../../../../../constants/device-constants'

const MinerStatusIcon = ({ status = '' }): JSX.Element => {
  switch (status) {
    case MinerStatuses.ALERT:
      return (
        <div className="mdk-mining-status-indicator--alert">
          <AlertTriangleIcon />
        </div>
      )
    case MinerStatuses.MINING:
      return (
        <StatusLabel>
          <MiningStatusIcon width={14} height={14} />
        </StatusLabel>
      )
    case MinerStatuses.SLEEPING:
      return (
        <StatusLabel status="sleep">
          <SleepStatusIcon width={14} height={14} />
        </StatusLabel>
      )
    case MinerStatuses.OFFLINE:
      return (
        <StatusLabel status="offline">
          <OfflineStatusIcon width={14} height={14} />
        </StatusLabel>
      )
    case MinerStatuses.ERROR:
      return (
        <StatusLabel status="offline">
          <ErrorStatusIcon width={14} height={14} />
        </StatusLabel>
      )
    default:
      return <></>
  }
}

export type MinerStats = {
  status?: string
  [key: string]: unknown
}

export type MinerStatusIndicatorProps = {
  stats?: MinerStats | UnknownRecord
  alerts?: Alert[]
  hideTooltip?: boolean
  getFormattedDate: (date: Date) => string
}

export const MinerStatusIndicator = ({
  stats,
  alerts = [],
  hideTooltip = false,
  getFormattedDate,
}: MinerStatusIndicatorProps): JSX.Element => {
  // Convert unknown[] to Alert[] if needed
  const alertsTyped: Alert[] = Array.isArray(alerts)
    ? alerts.filter(
        (alert): alert is Alert =>
          _isObject(alert) &&
          alert !== null &&
          'severity' in alert &&
          'createdAt' in alert &&
          'name' in alert &&
          'description' in alert,
      )
    : []
  const errors = getAlertsString(alertsTyped, getFormattedDate)
  const status = alertsTyped?.length ? MinerStatuses.ALERT : String(stats?.status || '')

  const iconContent = (
    <div className="mdk-mining-status-indicator">
      <MinerStatusIcon status={status} />
    </div>
  )

  return !hideTooltip ? (
    <SimpleTooltip
      content={
        errors !== null
          ? `Miner Status : ${stats?.status}\n${formatErrors(errors, getFormattedDate)}`
          : `Miner Status : ${stats?.status}`
      }
    >
      {iconContent}
    </SimpleTooltip>
  ) : (
    iconContent
  )
}
