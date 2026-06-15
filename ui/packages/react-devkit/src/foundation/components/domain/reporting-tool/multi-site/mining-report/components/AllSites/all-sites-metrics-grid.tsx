import { FALLBACK, formatNumber } from '@core'
import _map from 'lodash/map'

import type { MetricCardData } from '../../mining-report.types'
import { ReportMetricCard } from '../../report-metric-card/report-metric-card'

export const formatAllSitesMetricValue = (metric: MetricCardData): string => {
  if (!metric?.value) return FALLBACK

  if (metric.formatter) {
    return metric.formatter(metric.value as number)
  }

  return formatNumber(metric.value as number)
}

type AllSitesMetricsGridProps = {
  metrics: MetricCardData[]
  noMinWidth?: boolean
}

export const AllSitesMetricsGrid = ({ metrics, noMinWidth = false }: AllSitesMetricsGridProps) => (
  <div
    className={
      noMinWidth
        ? 'mdk-mining-report__metrics-grid mdk-mining-report__metrics-grid--site'
        : 'mdk-mining-report__metrics-grid'
    }
  >
    {_map(metrics, (metricItem) => (
      <ReportMetricCard
        key={metricItem.label}
        label={metricItem.label}
        unit={metricItem.unit ?? ''}
        value={formatAllSitesMetricValue(metricItem)}
        isHighlighted={metricItem.isHighlighted}
        noMinWidth={noMinWidth}
        showDashForZero
      />
    ))}
  </div>
)

type AllSitesMetricsSectionProps = {
  title: string
  metrics: MetricCardData[]
  noMinWidth?: boolean
  wrapper?: 'section' | 'site-card'
  sectionKey?: string
}

export const AllSitesMetricsSection = ({
  title,
  metrics,
  noMinWidth = false,
  wrapper = 'section',
  sectionKey,
}: AllSitesMetricsSectionProps) => {
  const heading = <h2 className="mdk-mining-report__site-title">{title}</h2>
  const grid = <AllSitesMetricsGrid metrics={metrics} noMinWidth={noMinWidth} />

  if (wrapper === 'site-card') {
    return (
      <div className="mdk-mining-report__individual-site-card">
        {heading}
        {grid}
      </div>
    )
  }

  return (
    <section className="mdk-mining-report__site-metrics-section" key={sectionKey}>
      {heading}
      {grid}
    </section>
  )
}
