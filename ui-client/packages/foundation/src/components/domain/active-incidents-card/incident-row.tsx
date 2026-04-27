import { cn } from '@mdk/core'
import { IncidentSeverity } from './incident-severity'
import type { TIncidentSeverity } from './types'

export type TIncidentRowProps = {
  id: string
  title: string
  body: string
  subtitle: string
  severity: TIncidentSeverity
  onClick?: (id: string) => void
}

const IncidentRow = ({
  id,
  body,
  title,
  onClick,
  severity,
  subtitle,
}: TIncidentRowProps): JSX.Element => {
  const handleClick = (): void => {
    onClick?.(id)
  }

  return (
    <div
      className={cn(
        'mdk-active-incidents-card__row',
        onClick && 'mdk-active-incidents-card__row--clickable',
      )}
    >
      <IncidentSeverity severity={severity} />
      <div className="mdk-active-incidents-card__row-content" onClick={handleClick}>
        <div className="mdk-active-incidents-card__row-data">
          <div className="mdk-active-incidents-card__row-title">{title}</div>
          <div className="mdk-active-incidents-card__row-subtitle">{subtitle}</div>
          <div className="mdk-active-incidents-card__row-body">{body}</div>
        </div>
        {onClick && <div className="mdk-active-incidents-card__arrow">&#x2192;</div>}
      </div>
    </div>
  )
}

IncidentRow.displayName = 'IncidentRow'

export { IncidentRow }
