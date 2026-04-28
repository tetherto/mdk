import type { IndicatorColor } from '@tetherto/mdk-core-ui'
import { Indicator } from '@tetherto/mdk-core-ui'
import type { ReactElement } from 'react'
import './status-item.scss'

const StatusLabels = {
  normal: 'Normal',
  warning: 'Warning',
  fault: 'Fault',
  unavailable: 'Unavailable',
} as const

const StatusColors: Record<StatusType, IndicatorColor> = {
  normal: 'green',
  warning: 'amber',
  fault: 'red',
  unavailable: 'gray',
} as const

type StatusType = keyof typeof StatusLabels

type StatusItemProps = {
  /** Status label text */
  label?: string
  /** Status type */
  status?: StatusType
}

/**
 * Status Item Component
 *
 * Displays a label with a colored status indicator.
 *
 * @example
 * ```tsx
 * <StatusItem label="Temperature" status="normal" />
 * <StatusItem label="Pressure" status="warning" />
 * <StatusItem label="Flow" status="fault" />
 * ```
 */
export const StatusItem = ({ label, status }: StatusItemProps): ReactElement => {
  const currentStatus = status || 'unavailable'
  const statusColor = StatusColors[currentStatus]
  const statusLabel = StatusLabels[currentStatus]

  return (
    <div className="mdk-status-item">
      <div className="mdk-status-item__content">
        <div className="mdk-status-item__label">{label}</div>
        <Indicator color={statusColor} size="md">
          {statusLabel}
        </Indicator>
      </div>
    </div>
  )
}
