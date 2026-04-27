import type { ReactNode } from 'react'

import _isArray from 'lodash/isArray'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _split from 'lodash/split'

import { SimpleTooltip } from '@mdk/core'

import type { Alert } from '../../../types/alerts'
import { useTimezone } from '../../../hooks/use-timezone'
import { getAlertsDescription } from '../../../utils/alerts-utils'

export type AlarmInfoItem = Alert

export type AlarmInfoProps = {
  title: string
  icon: ReactNode
  items?: AlarmInfoItem[]
}

export const AlarmInfo = ({ title, icon, items }: AlarmInfoProps): JSX.Element | null => {
  const { getFormattedDate } = useTimezone()

  if (_isEmpty(items)) {
    return null
  }

  const alertsArray: AlarmInfoItem[] = _isArray(items) ? items : []

  const tooltipContent = (
    <>
      <h4 className="mdk-widget-top-row__alarm-info-title">{`${title} issues`}</h4>
      {_map(_split(getAlertsDescription(alertsArray, getFormattedDate), '\n\n'), (line, index) => (
        <div key={index}>{line}</div>
      ))}
    </>
  )

  return (
    <SimpleTooltip content={tooltipContent}>
      <div className="mdk-widget-top-row__alarm-info-icon">{icon}</div>
    </SimpleTooltip>
  )
}

AlarmInfo.displayName = 'AlarmInfo'
