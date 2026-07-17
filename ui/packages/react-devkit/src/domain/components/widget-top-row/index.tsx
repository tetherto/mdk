import _map from 'lodash/map'

import { cn, formatErrors, formatNumber, SimpleTooltip, unitToKilo } from '@primitives'
import type { ErrorWithTimestamp } from '@primitives'

import { useTimezoneFormatter } from '@tetherto/mdk-react-adapter'
import { AlarmInfo } from './alarm-info'
import type { AlarmInfoItem } from './alarm-info'
import { WIDGET_ALARMS } from './constants'
import type { AlarmPropKey, WidgetAlarmItem } from './constants'

import type { JSX } from 'react'

type AlarmsMap = Partial<Record<AlarmPropKey, AlarmInfoItem[]>>

export type WidgetTopRowProps = {
  title: string
  power?: number
  unit?: string
  statsErrorMessage?: string | ErrorWithTimestamp[] | null
  alarms?: AlarmsMap
  className?: string
}

/**
 * Compact header row used at the top of container / miner widgets — shows the
 * title, per-category alarm badges, and the current power reading (or an
 * error tooltip).
 *
 * @category widgets
 * @kernelCapability device-telemetry
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * <WidgetTopRow title="Container A" power={power} unit="kW" alarms={alarms} />
 * ```
 * @tier agent-ready
 */
export const WidgetTopRow = ({
  title,
  power,
  unit,
  statsErrorMessage,
  alarms,
  className,
}: WidgetTopRowProps): JSX.Element => {
  const { getFormattedDate } = useTimezoneFormatter()

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
