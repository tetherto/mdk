import { cn } from '@tetherto/core'
import type { TIncidentSeverity } from './types'

type TIncidentSeverityProps = {
  severity: TIncidentSeverity
}

const IncidentSeverity = ({ severity }: TIncidentSeverityProps): JSX.Element => (
  <div
    className={cn('mdk-active-incidents-card__dot', `mdk-active-incidents-card__dot--${severity}`)}
  />
)

IncidentSeverity.displayName = 'IncidentSeverity'

export { IncidentSeverity }
