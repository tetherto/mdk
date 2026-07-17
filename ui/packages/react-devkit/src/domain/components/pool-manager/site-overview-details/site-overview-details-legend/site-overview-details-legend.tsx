import { cn } from '@primitives'
import { SITE_OVERVIEW_STATUSES } from '../../pool-manager-constants'
import './site-overview-details-legend.scss'

const STATUS_LABELS: Record<
  (typeof SITE_OVERVIEW_STATUSES)[keyof typeof SITE_OVERVIEW_STATUSES],
  string
> = {
  [SITE_OVERVIEW_STATUSES.OFFLINE]: 'Offline',
  [SITE_OVERVIEW_STATUSES.EMPTY]: 'Empty',
  [SITE_OVERVIEW_STATUSES.NOT_MINING]: 'Not Mining (Sleep + Error)',
  [SITE_OVERVIEW_STATUSES.MINING]: 'Online',
}

const LEGEND_ITEMS = [
  {
    status: SITE_OVERVIEW_STATUSES.OFFLINE,
    label: STATUS_LABELS[SITE_OVERVIEW_STATUSES.OFFLINE],
  },
  {
    status: SITE_OVERVIEW_STATUSES.EMPTY,
    label: STATUS_LABELS[SITE_OVERVIEW_STATUSES.EMPTY],
    hasBorder: true,
  },
  {
    status: SITE_OVERVIEW_STATUSES.NOT_MINING,
    label: STATUS_LABELS[SITE_OVERVIEW_STATUSES.NOT_MINING],
  },
  {
    status: SITE_OVERVIEW_STATUSES.MINING,
    label: STATUS_LABELS[SITE_OVERVIEW_STATUSES.MINING],
  },
]
export const SiteOverviewDetailsLegend = () => (
  <div className="mdk-site-overview-details-legend">
    {LEGEND_ITEMS.map(({ status, label, hasBorder }) => (
      <div
        key={status}
        className={cn(
          'mdk-site-overview-details-legend__item',
          `mdk-site-overview-details-legend__item--${status}`,
          hasBorder && 'mdk-site-overview-details-legend__item--bordered',
        )}
      >
        {label}
      </div>
    ))}
  </div>
)
