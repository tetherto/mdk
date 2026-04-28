import _map from 'lodash/map'

import { cn, formatErrors, formatNumber, SimpleTooltip, unitToKilo } from '@tetherto/core'
import type { ErrorWithTimestamp } from '@tetherto/core'

import { useTimezone } from '../../../hooks/use-timezone'
import { AlarmInfo } from './alarm-info'
import type { AlarmInfoItem } from './alarm-info'
import { WIDGET_ALARMS } from './constants'
import type { AlarmPropKey, WidgetAlarmItem } from './constants'

type AlarmsMap = Partial<Record<AlarmPropKey, AlarmInfoItem[]>>

export type WidgetTopRowProps = {
  title: string
  power?: number
  unit?: string
  statsErrorMessage?: string | ErrorWithTimestamp[] | null
  alarms?: AlarmsMap
  className?: string
}

export const WidgetTopRow = ({
  title,
  power,
  unit,
  statsErrorMessage,
  alarms,
  className,
}: WidgetTopRowProps): JSX.Element => {
  const { getFormattedDate } = useTimezone()

  const powerLabel = power ? (
    <>
      {formatNumber(unitToKilo(power))}
      &nbsp;
      <span>{unit}</span>
    </>
  ) : null

  return (
    <div className={cn('mdk-widget-top-row', className)}>
      <div className="mdk-widget-top-row__inner">
        <div className="mdk-widget-top-row__title">{title}</div>
        {_map(WIDGET_ALARMS, (alarm: WidgetAlarmItem) => (
          <AlarmInfo
            title={alarm.title}
            icon={<alarm.Icon />}
            items={alarms?.[alarm.propKey]}
            key={alarm.title}
          />
        ))}
        <div className="mdk-widget-top-row__power">
          {statsErrorMessage ? (
            <SimpleTooltip content={formatErrors(statsErrorMessage, getFormattedDate)}>
              <span>-</span>
            </SimpleTooltip>
          ) : (
            powerLabel
          )}
        </div>
      </div>
    </div>
  )
}

WidgetTopRow.displayName = 'WidgetTopRow'
