// @vitest-environment jsdom
import { devicesStore } from '@tetherto/mdk-ui-foundation'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Device } from '@domain/types'
import { StatsGroupCard } from '../stats-group-card'

vi.mock('@domain/components/explorer/details-view/miner-metric-card/miner-metric-card', () => ({
  MinerMetricCard: vi.fn(({ primaryStats, secondaryStats, showSecondaryStats }) => (
    <div data-testid="miner-metric-card">
      <div data-testid="primary-stats">{JSON.stringify(primaryStats)}</div>
      <div data-testid="secondary-stats">{JSON.stringify(secondaryStats)}</div>
      <div data-testid="show-secondary">{String(showSecondaryStats)}</div>
    </div>
  )),
}))
vi.mock('@domain/components/explorer/details-view/single-stat-card/single-stat-card', () => ({
  SingleStatCard: vi.fn((props) => (
    <div data-testid="single-stat-card" data-name={props.name}>
      {props.name}: {props.value} {props.unit}
    </div>
  )),
}))

vi.mock('@domain/components/explorer/details-view/secondary-stat-card/secondary-stat-card', () => ({
  SecondaryStatCard: vi.fn((props) => (
    <div data-testid="secondary-stat-card" data-name={props.name}>
      {props.name}: {props.value}
    </div>
  )),
}))

vi.mock('@domain/utils/device-utils', () => ({
  getDeviceData: vi.fn((device) => {
    if (!device) return ['error', null]
    return [
      null,
      {
        snap: device.last?.snap || {
          stats: {
            hashrate_mhs: { t_5m: 95500 },
            temperature_c: { max: 65 },
            frequency_mhz: { avg: 850 },
            power_w: 3250,
            uptime_ms: 432000000,
            status: 'active',
          },
          config: {
            power_mode: 'normal',
            led_status: true,
          },
        },
        type: device.type || 'antminer-s19',
      },
    ]
  }),
  isMiner: vi.fn((type) => type?.includes('miner') || type?.includes('antminer')),
  getHashrateUnit: vi.fn((value) => ({
    value: (value / 1000000).toFixed(2),
    unit: 'TH/s',
  })),
  formatPowerConsumption: vi.fn((value) => ({
    value: value?.toFixed(2),
    unit: 'W',
  })),
  getIsMinerPowerReadingAvailable: vi.fn(() => true),
  megaToTera: vi.fn((value) => value / 1000000),
  getOnOffText: vi.fn((status) => (status ? 'On' : 'Off')),
}))

vi.mock('date-fns/formatDistanceStrict', () => ({
  formatDistanceStrict: vi.fn(() => '5 days ago'),
}))

const setSelectedDevices = (devices: Device[]) => {
  devicesStore.getState().setSelectedDevices(devices as never[])
}

const renderCard = (props: { isMinerMetrics?: boolean; miners?: Device[] } = {}) =>
  render(<StatsGroupCard {...props} />)

describe('StatsGroupCard', () => {
  const mockDevice: Device = {
    id: 'device-1',
    type: 'antminer-s19',
    last: {
      snap: {
        stats: {
          hashrate_mhs: { t_5m: 95500 },
          temperature_c: { max: 65 },
          frequency_mhz: { avg: 850 },
          power_w: 3250,
          uptime_ms: 432000000,
          status: 'active',
        },
        config: {
          power_mode: 'normal',
          led_status: true,
        },
      },
    },
  } as Device

  const mockDevices: Device[] = [
    mockDevice,
    {
      id: 'device-2',
      type: 'antminer-s19',
      last: {
        snap: {
          stats: {
            hashrate_mhs: { t_5m: 100000 },
            temperature_c: { max: 70 },
            frequency_mhz: { avg: 900 },
            power_w: 3500,
          },
          config: {},
        },
      },
    } as Device,
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    devicesStore.getState().setResetSelections()
  })

  afterEach(() => {
    devicesStore.getState().setResetSelections()
  })

  describe('rendering modes', () => {
    it('renders stats grid by default', () => {
      setSelectedDevices([mockDevice])
      renderCard()
      expect(screen.getAllByTestId('single-stat-card')).toHaveLength(5)
    })

    it('renders MinerMetricCard when isMinerMetrics is true', () => {
      setSelectedDevices([mockDevice])
      renderCard({ isMinerMetrics: true })
      expect(screen.getByTestId('miner-metric-card')).toBeInTheDocument()
    })

    it('uses miners prop when provided', () => {
      renderCard({ miners: mockDevices })
      expect(screen.getAllByTestId('single-stat-card')).toHaveLength(5)
    })

    it('uses selected devices from the devices store when miners not provided', () => {
      setSelectedDevices([mockDevice])
      renderCard()
      expect(screen.getAllByTestId('single-stat-card')).toHaveLength(5)
    })
  })

  describe('primary stats calculation', () => {
    it('calculates temperature (max) correctly', async () => {
      setSelectedDevices(mockDevices)
      renderCard()
      await waitFor(() => {
        const tempCards = screen.getAllByTestId('single-stat-card')
        const tempCard = tempCards.find((card) => card.getAttribute('data-name') === 'Temperature')
        expect(tempCard?.textContent).toContain('70')
      })
    })

    it('calculates frequency (average) correctly', async () => {
      setSelectedDevices(mockDevices)
      renderCard()
      await waitFor(() => {
        const cards = screen.getAllByTestId('single-stat-card')
        const freqCard = cards.find((card) => card.getAttribute('data-name') === 'Frequency')
        expect(freqCard?.textContent).toContain('875')
      })
    })

    it('calculates consumption correctly', async () => {
      setSelectedDevices([mockDevice])
      renderCard()
      await waitFor(() => {
        const cards = screen.getAllByTestId('single-stat-card')
        const consCard = cards.find((card) => card.getAttribute('data-name') === 'Consumption')
        expect(consCard).toBeTruthy()
      })
    })

    it('includes efficiency when consumption and hashrate exist', async () => {
      setSelectedDevices([mockDevice])
      renderCard()
      await waitFor(() => {
        const cards = screen.getAllByTestId('single-stat-card')
        const effCard = cards.find((card) => card.getAttribute('data-name') === 'Efficiency')
        expect(effCard).toBeTruthy()
      })
    })

    it('displays dash for temperature when no devices', () => {
      renderCard()
      const tempCard = screen.getAllByTestId('single-stat-card')[1]
      expect(tempCard!.textContent).toContain('-')
    })

    it('displays dash for frequency when no devices', () => {
      renderCard()
      const freqCard = screen.getAllByTestId('single-stat-card')[2]
      expect(freqCard!.textContent).toContain('-')
    })
  })

  describe('secondary stats', () => {
    it('renders secondary stats for single device', async () => {
      setSelectedDevices([mockDevice])
      renderCard()
      await waitFor(() => {
        expect(screen.getAllByTestId('secondary-stat-card')).toHaveLength(4)
      })
    })

    it('does not render secondary stats for multiple devices', () => {
      setSelectedDevices(mockDevices)
      renderCard()
      expect(screen.queryByTestId('secondary-stat-card')).not.toBeInTheDocument()
    })

    it('displays power mode', async () => {
      setSelectedDevices([mockDevice])
      renderCard()
      await waitFor(() => {
        const cards = screen.getAllByTestId('secondary-stat-card')
        const powerModeCard = cards.find((card) => card.getAttribute('data-name') === 'Power mode')
        expect(powerModeCard?.textContent).toContain('normal')
      })
    })

    it('displays uptime', async () => {
      setSelectedDevices([mockDevice])
      renderCard()
      await waitFor(() => {
        const cards = screen.getAllByTestId('secondary-stat-card')
        const uptimeCard = cards.find((card) => card.getAttribute('data-name') === 'Uptime')
        expect(uptimeCard?.textContent).toContain('5 days ago')
      })
    })

    it('displays LED status', async () => {
      setSelectedDevices([mockDevice])
      renderCard()
      await waitFor(() => {
        const cards = screen.getAllByTestId('secondary-stat-card')
        const ledCard = cards.find((card) => card.getAttribute('data-name') === 'LED')
        expect(ledCard?.textContent).toContain('On')
      })
    })

    it('displays status', async () => {
      setSelectedDevices([mockDevice])
      renderCard()
      await waitFor(() => {
        const cards = screen.getAllByTestId('secondary-stat-card')
        const statusCard = cards.find((card) => card.getAttribute('data-name') === 'Status')
        expect(statusCard?.textContent).toContain('active')
      })
    })

    it('displays dash when power mode is missing', async () => {
      const deviceWithoutConfig: Device = {
        id: 'device-3',
        type: 'antminer-s19',
        last: { snap: { stats: {}, config: {} } },
      } as Device
      setSelectedDevices([deviceWithoutConfig])
      renderCard()
      await waitFor(() => {
        const cards = screen.getAllByTestId('secondary-stat-card')
        const powerModeCard = cards.find((card) => card.getAttribute('data-name') === 'Power mode')
        expect(powerModeCard?.textContent).toContain('-')
      })
    })
  })

  describe('miner metrics mode', () => {
    it('shows secondary stats when single miner selected', () => {
      setSelectedDevices([mockDevice])
      renderCard({ isMinerMetrics: true })
      expect(screen.getByTestId('show-secondary')).toHaveTextContent('true')
    })

    it('hides secondary stats when multiple miners selected', () => {
      setSelectedDevices(mockDevices)
      renderCard({ isMinerMetrics: true })
      expect(screen.getByTestId('show-secondary')).toHaveTextContent('false')
    })

    it('passes primary stats to MinerMetricCard', () => {
      setSelectedDevices([mockDevice])
      renderCard({ isMinerMetrics: true })
      const primaryStats = screen.getByTestId('primary-stats')
      expect(primaryStats.textContent).toContain('Hash rate')
      expect(primaryStats.textContent).toContain('Temperature')
      expect(primaryStats.textContent).toContain('Frequency')
    })

    it('passes secondary stats to MinerMetricCard', async () => {
      setSelectedDevices([mockDevice])
      renderCard({ isMinerMetrics: true })
      await waitFor(() => {
        const secondaryStats = screen.getByTestId('secondary-stats')
        expect(secondaryStats.textContent).toContain('Power mode')
        expect(secondaryStats.textContent).toContain('Uptime')
        expect(secondaryStats.textContent).toContain('LED')
        expect(secondaryStats.textContent).toContain('Status')
      })
    })
  })

  describe('CSS classes', () => {
    it('applies correct wrapper class', () => {
      setSelectedDevices([mockDevice])
      const { container } = renderCard()
      expect(container.querySelector('.mdk-stats-group-card')).toBeInTheDocument()
    })

    it('applies correct row class', () => {
      setSelectedDevices([mockDevice])
      const { container } = renderCard()
      expect(container.querySelector('.mdk-stats-group-card__row')).toBeInTheDocument()
    })

    it('renders two rows for single device', async () => {
      setSelectedDevices([mockDevice])
      const { container } = renderCard()
      await waitFor(() => {
        const rows = container.querySelectorAll('.mdk-stats-group-card__row')
        expect(rows).toHaveLength(2)
      })
    })

    it('renders one row for multiple devices', () => {
      setSelectedDevices(mockDevices)
      const { container } = renderCard()
      const rows = container.querySelectorAll('.mdk-stats-group-card__row')
      expect(rows).toHaveLength(1)
    })
  })

  describe('useEffect', () => {
    it('updates stats when devicesToUse changes', async () => {
      const { rerender } = render(<StatsGroupCard miners={[mockDevice]} />)

      const newDevice: Device = {
        id: 'device-new',
        type: 'antminer-s19',
        last: {
          snap: {
            stats: {
              hashrate_mhs: { t_5m: 200000 },
              temperature_c: { max: 80 },
              frequency_mhz: { avg: 1000 },
              power_w: 4000,
            },
            config: {},
          },
        },
      } as Device

      rerender(<StatsGroupCard miners={[newDevice]} />)

      await waitFor(() => {
        expect(screen.getAllByTestId('single-stat-card')).toHaveLength(5)
      })
    })
  })

  describe('filtering miners', () => {
    it('counts only miners in selected devices', () => {
      const mixedDevices: Device[] = [
        mockDevice,
        {
          id: 'container-1',
          type: 'container',
          last: { snap: { stats: {}, config: {} } },
        } as Device,
      ]
      setSelectedDevices(mixedDevices)
      renderCard({ isMinerMetrics: true })
      expect(screen.getByTestId('show-secondary')).toHaveTextContent('true')
    })
  })
})
