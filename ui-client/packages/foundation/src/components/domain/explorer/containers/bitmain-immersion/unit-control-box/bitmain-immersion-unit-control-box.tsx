import { Indicator, Tag, UNITS } from '@mdk/core'
import type { ReactElement } from 'react'
import { DEVICE_STATUS } from '../../../../../../constants/devices'
import { BitMainImmersionControlBox } from '../control-box/bitmain-immersion-control-box'
import './bitmain-immersion-unit-control-box.scss'

type BitMainImmersionUnitControlBoxProps = {
  /** Box title */
  title?: string
  /** Alarm/fault status */
  alarmStatus?: boolean
  /** Frequency value in Hz */
  frequency?: number
  /** Whether this is a dry cooler unit */
  isDryCooler?: boolean
  /** Whether the unit is running */
  running?: boolean
  /** Show frequency in left column instead of right */
  showFrequencyInLeftColumn?: boolean
  /** Secondary variant (no border) */
  secondary?: boolean
  /** Custom className */
  className?: string
}

/**
 * BitMain Immersion Unit Control Box Component
 */
export const BitMainImmersionUnitControlBox = ({
  title,
  alarmStatus = false,
  frequency,
  isDryCooler = false,
  running = false,
  showFrequencyInLeftColumn = false,
  secondary = false,
  className,
}: BitMainImmersionUnitControlBoxProps): ReactElement => {
  const unitTitle = isDryCooler ? 'Dry Cooler' : title

  const FrequencyItem = frequency != null && (
    <div className="mdk-bitmain-immersion-unit-control-box__item">
      <span className="mdk-bitmain-immersion-unit-control-box__item-label">Frequency</span>
      <span className="mdk-bitmain-immersion-unit-control-box__item-value">
        {frequency} {UNITS.FREQUENCY_HERTZ}
      </span>
    </div>
  )

  return (
    <BitMainImmersionControlBox
      secondary={secondary}
      title={title}
      className={className}
      leftContent={showFrequencyInLeftColumn ? FrequencyItem : undefined}
      rightContent={
        <div className="mdk-bitmain-immersion-unit-control-box">
          <Tag color={alarmStatus ? 'red' : 'green'}>{alarmStatus ? 'Fault' : 'Normal'}</Tag>

          <div className="mdk-bitmain-immersion-unit-control-box__item">
            <span className="mdk-bitmain-immersion-unit-control-box__item-label">
              {unitTitle || 'Status'}
            </span>
            <Indicator color={running ? 'green' : 'gray'} size="sm">
              {running ? DEVICE_STATUS.RUNNING : DEVICE_STATUS.OFF}
            </Indicator>
          </div>

          {!showFrequencyInLeftColumn && FrequencyItem}
        </div>
      }
    />
  )
}
