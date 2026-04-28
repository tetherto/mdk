import { formatNumber, UNITS } from '@tetherto/mdk-core-ui'
import type { ReactElement } from 'react'
import './miner-metric-card.scss'

export type StatItem = {
  name?: string
  value?: number | string
  unit?: string
  tooltipText?: string
}

type MinerMetricCardProps = {
  /** Primary statistics (efficiency, hashrate, temperature, frequency, consumption) */
  primaryStats: StatItem[]
  /** Secondary statistics to display in grid */
  secondaryStats: StatItem[]
  /** Whether to show secondary stats section */
  showSecondaryStats: boolean
}

const labels = {
  efficiency: 'Efficiency',
  hashRate: 'Hash rate',
  temperature: 'Temperature',
  frequency: 'Frequency',
  consumption: 'Consumption',
} as const

/**
 * Get stat by label name
 */
const getStatByLabel = (stats: StatItem[] | undefined, label: string): StatItem | undefined => {
  return stats?.find(({ name }) => name === label)
}

/**
 * Miner Metric Card Component
 *
 * Displays key metrics for a miner including:
 * - Efficiency (fixed position top-right)
 * - Hash rate, Temperature
 * - Frequency, Consumption
 * - Optional secondary stats in grid
 *
 * @example
 * ```tsx
 * <MinerMetricCard
 *   primaryStats={[
 *     { name: 'Hash rate', value: 95.5, unit: 'TH/s' },
 *     { name: 'Temperature', value: 65, unit: '°C' }
 *   ]}
 *   secondaryStats={[
 *     { name: 'Fan Speed', value: '6000 RPM' }
 *   ]}
 * />
 * ```
 */
export const MinerMetricCard = ({
  primaryStats,
  secondaryStats,
  showSecondaryStats = true,
}: Partial<MinerMetricCardProps>): ReactElement => {
  const efficiencyValue = getStatByLabel(primaryStats, labels.efficiency)
  const hashRateValue = getStatByLabel(primaryStats, labels.hashRate)
  const temperatureValue = getStatByLabel(primaryStats, labels.temperature)
  const frequencyValue = getStatByLabel(primaryStats, labels.frequency)
  const consumptionValue = getStatByLabel(primaryStats, labels.consumption)

  // Format frequency from temperature value
  const tempValue = typeof temperatureValue?.value === 'number' ? temperatureValue.value : undefined
  const formattedFrequency = formatNumber(Math.round((tempValue || 0) * 100) / 100)

  // Format consumption with 3 decimal places
  const formattedConsumptionValue = formatNumber(consumptionValue?.value, {
    maximumFractionDigits: 3,
    minimumFractionDigits: consumptionValue?.value ? 3 : 0,
  })

  // Show efficiency if it exists and is a number
  const showEfficiency =
    efficiencyValue &&
    efficiencyValue.value !== undefined &&
    typeof efficiencyValue.value === 'number'

  return (
    <div className="mdk-miner-metric-card" data-testid="card">
      <div className="mdk-miner-metric-card__title">Miner Metrics</div>
      <div className="mdk-miner-metric-card__body">
        {showEfficiency && (
          <div className="mdk-miner-metric-card__efficiency">
            <div className="mdk-miner-metric-card__label">{labels.efficiency}</div>
            <div className="mdk-miner-metric-card__value">
              {`${formatNumber(efficiencyValue.value)} ${efficiencyValue.unit || ''}`}
            </div>
          </div>
        )}

        <div className="mdk-miner-metric-card__content">
          <div className="mdk-miner-metric-card__box">
            <div className="mdk-miner-metric-card__item">
              <div className="mdk-miner-metric-card__label">{labels.hashRate}</div>
              <div className="mdk-miner-metric-card__value">
                {hashRateValue ? `${hashRateValue.value || '-'} ${hashRateValue.unit}` : '-'}
              </div>
            </div>
            <div className="mdk-miner-metric-card__item">
              <div className="mdk-miner-metric-card__label">{labels.temperature}</div>
              <div className="mdk-miner-metric-card__value">
                {`${temperatureValue?.value || ''} ${temperatureValue?.unit || ''}`}
              </div>
            </div>
          </div>

          <div className="mdk-miner-metric-card__box">
            <div className="mdk-miner-metric-card__item">
              <div className="mdk-miner-metric-card__label">{labels.frequency}</div>
              <div className="mdk-miner-metric-card__value">
                {`${formattedFrequency || ''} ${frequencyValue?.unit || ''}`}
              </div>
            </div>
            <div className="mdk-miner-metric-card__item">
              <div className="mdk-miner-metric-card__label">{labels.consumption}</div>
              <div className="mdk-miner-metric-card__value">
                {`${formattedConsumptionValue || ''} ${
                  consumptionValue?.value === 0 ? UNITS.ENERGY_KWH : consumptionValue?.unit || ''
                }`}
              </div>
            </div>
          </div>

          {showSecondaryStats && secondaryStats && secondaryStats.length > 0 && (
            <div className="mdk-miner-metric-card__grid-box">
              {secondaryStats.map(({ name, value }) => (
                <div key={name} className="mdk-miner-metric-card__item">
                  <div className="mdk-miner-metric-card__label">{name}</div>
                  <div className="mdk-miner-metric-card__value">{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
