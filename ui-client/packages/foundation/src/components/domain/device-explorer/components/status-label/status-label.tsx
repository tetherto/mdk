import { cn } from '@mdk/core'

export type StatusLabelProps = {
  status?: 'error' | 'sleep' | 'offline'
  children: React.ReactNode
}

export const StatusLabel = ({ status, children }: StatusLabelProps): JSX.Element => {
  return (
    <div
      className={cn('mdk-device-explorer__status-label', {
        'mdk-device-explorer__status-label--error': status === 'error',
        'mdk-device-explorer__status-label--offline': status === 'offline',
        'mdk-device-explorer__status-label--sleep': status === 'sleep',
      })}
    >
      {children}
    </div>
  )
}
