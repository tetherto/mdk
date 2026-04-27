import { Tag } from '@mdk/core'
import type { ReactElement } from 'react'
import './bitmain-immersion-pump-station-control-box.scss'

type BitMainImmersionPumpStationControlBoxProps = {
  /** Box title */
  title?: string
  /** Alarm/fault status */
  alarmStatus?: boolean
  /** Ready status */
  ready?: boolean
  /** Operation status */
  operation?: boolean
  /** Start status */
  start?: boolean
  /** Custom className */
  className?: string
}

/**
 * Get status label with "Not" prefix if false
 */
const getStatusLabel = (status: boolean | undefined, label: string): string => {
  if (status === undefined) return ''
  return status ? label : `Not ${label}`
}

/**
 * BitMain Immersion Pump Station Control Box Component
 *
 * Displays pump station status including:
 * - Alarm/Normal status
 * - Ready state
 * - Operating state
 * - Started state
 *
 * @example
 * ```tsx
 * <BitMainImmersionPumpStationControlBox
 *   title="Pump Station #1"
 *   alarmStatus={false}
 *   ready={true}
 *   operation={true}
 *   start={true}
 * />
 *
 * <BitMainImmersionPumpStationControlBox
 *   title="Pump Station #2"
 *   alarmStatus={true}
 *   ready={false}
 * />
 * ```
 */
export const BitMainImmersionPumpStationControlBox = ({
  title,
  alarmStatus = false,
  ready,
  operation,
  start,
  className,
}: BitMainImmersionPumpStationControlBoxProps): ReactElement => {
  return (
    <div className={`mdk-bitmain-immersion-pump-station-control-box ${className || ''}`}>
      {title && <h3 className="mdk-bitmain-immersion-pump-station-control-box__title">{title}</h3>}

      <div className="mdk-bitmain-immersion-pump-station-control-box__content">
        {/* Alarm Status */}
        <div className="mdk-bitmain-immersion-pump-station-control-box__status">
          <Tag color={alarmStatus ? 'red' : 'green'}>{alarmStatus ? 'Fault' : 'Normal'}</Tag>
        </div>

        {/* Ready Status */}
        {ready !== undefined && (
          <div
            className={`mdk-bitmain-immersion-pump-station-control-box__state ${
              ready
                ? 'mdk-bitmain-immersion-pump-station-control-box__state--on'
                : 'mdk-bitmain-immersion-pump-station-control-box__state--off'
            }`}
          >
            {getStatusLabel(ready, 'Ready')}
          </div>
        )}

        {/* Operation Status */}
        {operation !== undefined && (
          <div
            className={`mdk-bitmain-immersion-pump-station-control-box__state ${
              operation
                ? 'mdk-bitmain-immersion-pump-station-control-box__state--on'
                : 'mdk-bitmain-immersion-pump-station-control-box__state--off'
            }`}
          >
            {getStatusLabel(operation, 'Operating')}
          </div>
        )}

        {/* Start Status */}
        {start !== undefined && (
          <div
            className={`mdk-bitmain-immersion-pump-station-control-box__state ${
              start
                ? 'mdk-bitmain-immersion-pump-station-control-box__state--on'
                : 'mdk-bitmain-immersion-pump-station-control-box__state--off'
            }`}
          >
            {getStatusLabel(start, 'Started')}
          </div>
        )}
      </div>
    </div>
  )
}
