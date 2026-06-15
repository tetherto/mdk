import { cn } from '@core'
import type { TIncidentSeverity } from './types'

import type { JSX } from 'react'

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
