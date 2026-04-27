import { UNITS } from '@mdk/core'
import { formatDistanceStrict } from 'date-fns/formatDistanceStrict'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { selectSelectedDevices } from '../../../../../state'
import type { Device, DeviceData } from '../../../../../types'
import {
  formatPowerConsumption,
  getDeviceData,
  getHashrateUnit,
  getIsMinerPowerReadingAvailable,
  getOnOffText,
  isMiner,
  megaToTera,
} from '../../../../../utils/device-utils'
import type { StatItem } from '../miner-metric-card/miner-metric-card'
import { MinerMetricCard } from '../miner-metric-card/miner-metric-card'
import { SecondaryStatCard } from '../secondary-stat-card/secondary-stat-card'
import { SingleStatCard } from '../single-stat-card/single-stat-card'
import './stats-group-card.scss'

type StatsGroupCardProps = {
  /** Array of miners to display stats for */
  miners?: DeviceData[] | Device[]
  /** Whether to show miner metrics card layout */
  isMinerMetrics?: boolean
}

type MinerStats = {
  hashRate: number
  temperature: number
  frequency: number
  consumption: number
}

/**
 * Calculate aggregated stats from multiple miners
 */
const getMinersStats = (devices: DeviceData[] | Device[] | undefined): MinerStats => {
  const stats: MinerStats = {
    hashRate: 0,
    temperature: Number.MIN_SAFE_INTEGER,
    frequency: 0,
    consumption: 0,
  }

  if (!devices || devices.length === 0) {
    return stats
  }

  let totalAvgFrequency = 0

  devices.forEach((device) => {
    const [err, deviceStats] = getDeviceData(device as Device) as [string, Device['last']]

    if (!err && deviceStats) {
      const { snap, type } = deviceStats

      // Hash rate
      const hashrateMhs = snap?.stats?.hashrate_mhs as { t_5m?: number } | undefined
      if (hashrateMhs?.t_5m) {
        stats.hashRate += hashrateMhs.t_5m
      }

      // Temperature (max)
      const tempC = snap?.stats?.temperature_c as { max?: number } | undefined
      if (tempC?.max && tempC.max > stats.temperature) {
        stats.temperature = tempC.max
      }

      // Frequency (average)
      const freqMhz = snap?.stats?.frequency_mhz as { avg?: number } | undefined
      if (freqMhz?.avg) {
        totalAvgFrequency += freqMhz.avg
      }

      // Power consumption
      const powerW = snap?.stats?.power_w as number | undefined
      if (powerW) {
        stats.consumption += powerW
      }

      // Reset consumption if power reading not available
      if (type && !getIsMinerPowerReadingAvailable(type)) {
        stats.consumption = 0
      }
    }
  })

  stats.frequency = totalAvgFrequency / devices.length

  return stats
}

/**
 * Stats Group Card Component
 *
 * Displays aggregated statistics for selected miners:
 * - Hash rate, Temperature, Frequency, Consumption
 * - Optional: Power mode, Uptime, LED, Status (for single miner)
 *
 * Can render in two modes:
 * - Miner Metrics: Uses MinerMetricCard layout
 * - Stats Grid: Uses SingleStatCard and SecondaryStatCard in rows
 *
 * @example
 * ```tsx
 * <StatsGroupCard miners={selectedMiners} />
 * <StatsGroupCard isMinerMetrics />
 * ```
 */
export const StatsGroupCard = ({
  miners,
  isMinerMetrics = false,
}: StatsGroupCardProps): ReactElement => {
  const selectedDevices = useSelector(selectSelectedDevices) as Device[]

  const devicesToUse = miners || (selectedDevices as DeviceData[] | Device[] | undefined)

  const numMinersSelected = selectedDevices.filter((device) => isMiner(device.type)).length

  const [stats, setStats] = useState<StatItem[]>([
    { name: 'Hash rate', value: '', unit: UNITS.HASHRATE_TH_S },
    { name: 'Temperature', value: '', unit: UNITS.TEMPERATURE_C },
    { name: 'Frequency', value: '', unit: UNITS.FREQUENCY_MHZ },
    { name: 'Consumption', value: '', unit: UNITS.POWER_W },
  ])

  const [secStats, setSecStats] = useState<StatItem[]>([
    { name: 'Power mode', value: '', unit: '' },
    { name: 'Uptime', value: '', unit: '' },
    { name: 'LED', value: '', unit: '' },
    { name: 'Status', value: '', unit: '' },
  ])

  const setSelectedDevicesStats = (): void => {
    const { hashRate, temperature, frequency, consumption } = getMinersStats(devicesToUse)
    const formattedHashRate = getHashrateUnit(hashRate)
    const formattedConsumption = formatPowerConsumption(consumption)

    const newStats: StatItem[] = [
      {
        name: 'Hash rate',
        value: formattedHashRate?.value || '-',
        unit: formattedHashRate?.unit || UNITS.HASHRATE_TH_S,
      },
      {
        name: 'Temperature',
        value: temperature !== Number.MIN_SAFE_INTEGER ? temperature : '-',
        unit: UNITS.TEMPERATURE_C,
        tooltipText: 'Max Miners Temperature',
      },
      {
        name: 'Frequency',
        value: frequency || '-',
        unit: UNITS.FREQUENCY_MHZ,
      },
    ]

    if (consumption) {
      newStats.push({
        name: 'Consumption',
        value: formattedConsumption?.value || '-',
        unit: formattedConsumption?.unit || UNITS.POWER_W,
      })
    }

    if (consumption && hashRate && hashRate > 0) {
      newStats.push({
        name: 'Efficiency',
        value: String(consumption / megaToTera(hashRate)),
        unit: UNITS.EFFICIENCY_W_PER_TH_S,
      })
    }

    setStats(newStats)

    // Secondary stats (only for single device)
    const singleDevice: Device | undefined =
      devicesToUse && devicesToUse.length > 0 ? (devicesToUse[0] as Device) : undefined

    const [err, deviceStats] = getDeviceData(singleDevice ?? null) as [string, Device['last']]

    if (!err && deviceStats) {
      const { snap } = deviceStats
      const config = snap?.config as { power_mode?: string; led_status?: boolean } | undefined
      const statsData = snap?.stats as { uptime_ms?: number; status?: string } | undefined

      const uptimeValue = statsData?.uptime_ms
        ? formatDistanceStrict(new Date(Date.now() - statsData.uptime_ms), new Date(), {
            addSuffix: true,
          }).replace('minute', 'min')
        : '-'

      setSecStats([
        { name: 'Power mode', value: config?.power_mode ?? '-', unit: '' },
        { name: 'Uptime', value: uptimeValue, unit: '' },
        { name: 'LED', value: getOnOffText(config?.led_status), unit: '' },
        { name: 'Status', value: statsData?.status ?? '-', unit: '' },
      ])
    }
  }

  useEffect(() => {
    setSelectedDevicesStats()
  }, [devicesToUse])

  const primaryStatsForMinerMetric = stats.map(({ name, value, unit }) => ({
    name,
    unit,
    value: value !== null && value !== undefined ? value : undefined,
  }))

  const secondaryStatsForMinerMetric = secStats.map(({ name, value, unit }) => ({
    name,
    unit,
    value: value !== null && value !== undefined ? value : undefined,
  }))

  if (isMinerMetrics) {
    return (
      <MinerMetricCard
        primaryStats={primaryStatsForMinerMetric}
        secondaryStats={secondaryStatsForMinerMetric}
        showSecondaryStats={numMinersSelected === 1}
      />
    )
  }

  return (
    <div className="mdk-stats-group-card">
      <div className="mdk-stats-group-card__row">
        {stats.map((stat) => (
          <SingleStatCard key={stat.name} {...stat} />
        ))}
      </div>

      {devicesToUse?.length === 1 && (
        <div className="mdk-stats-group-card__row">
          {secStats.map((stat) => (
            <SecondaryStatCard key={stat.name} {...stat} />
          ))}
        </div>
      )}
    </div>
  )
}
