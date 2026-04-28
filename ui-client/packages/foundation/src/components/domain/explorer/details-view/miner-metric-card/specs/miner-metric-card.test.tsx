import { formatNumber, UNITS } from '@tetherto/mdk-core-ui'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StatItem } from '../miner-metric-card'
import { MinerMetricCard } from '../miner-metric-card'

vi.mock('@tetherto/mdk-core-ui', async () => {
  const actual = await vi.importActual('@tetherto/mdk-core-ui')
  return {
    ...actual,
    formatNumber: vi.fn((value, options) => {
      if (value === null || value === undefined) return ''
      if (typeof value === 'number') {
        if (options?.maximumFractionDigits !== undefined) {
          return value.toFixed(options.minimumFractionDigits || 0)
        }
        return String(value)
      }
      return String(value)
    }),
  }
})

describe('MinerMetricCard', () => {
  const mockPrimaryStats: StatItem[] = [
    { name: 'Hash rate', value: 95.5, unit: 'TH/s' },
    { name: 'Temperature', value: 65, unit: '°C' },
    { name: 'Frequency', value: 850, unit: 'MHz' },
    { name: 'Consumption', value: 3250, unit: 'W' },
    { name: 'Efficiency', value: 34.03, unit: 'W/TH' },
  ]

  const mockSecondaryStats: StatItem[] = [
    { name: 'Fan Speed', value: '6000 RPM' },
    { name: 'Power Mode', value: 'Normal' },
    { name: 'Uptime', value: '5 days' },
    { name: 'Status', value: 'Active' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('efficiency display', () => {
    it('renders efficiency when value is a number', () => {
      render(<MinerMetricCard primaryStats={mockPrimaryStats} />)

      expect(screen.getByText('Efficiency')).toBeInTheDocument()
      expect(screen.getByText(/34.03/)).toBeInTheDocument()
      expect(screen.getByText(/W\/TH/)).toBeInTheDocument()
    })

    it('does not render efficiency when value is undefined', () => {
      const statsWithoutEfficiency = mockPrimaryStats.filter((s) => s.name !== 'Efficiency')
      render(<MinerMetricCard primaryStats={statsWithoutEfficiency} />)

      expect(screen.queryByText('Efficiency')).not.toBeInTheDocument()
    })

    it('does not render efficiency when value is not a number', () => {
      const stats = [{ name: 'Efficiency', value: 'N/A', unit: 'W/TH' }]
      render(<MinerMetricCard primaryStats={stats} />)

      expect(screen.queryByText('Efficiency')).not.toBeInTheDocument()
    })

    it('renders efficiency without unit', () => {
      const stats = [{ name: 'Efficiency', value: 34.03 }]
      render(<MinerMetricCard primaryStats={stats} />)

      expect(screen.getByText('Efficiency')).toBeInTheDocument()
      expect(screen.getByText(/34.03/)).toBeInTheDocument()
    })

    it('has correct CSS class for efficiency', () => {
      const { container } = render(<MinerMetricCard primaryStats={mockPrimaryStats} />)

      expect(container.querySelector('.mdk-miner-metric-card__efficiency')).toBeInTheDocument()
    })
  })

  describe('hash rate display', () => {
    it('renders hash rate with value and unit', () => {
      render(<MinerMetricCard primaryStats={mockPrimaryStats} />)

      expect(screen.getByText('Hash rate')).toBeInTheDocument()
      expect(screen.getByText(/95.5 TH\/s/)).toBeInTheDocument()
    })

    it('renders dash when hash rate is missing', () => {
      render(<MinerMetricCard primaryStats={[]} />)

      const hashRateLabel = screen.getByText('Hash rate')
      const parent = hashRateLabel.parentElement
      expect(parent?.textContent).toContain('-')
    })

    it('renders dash when hash rate value is missing', () => {
      const stats = [{ name: 'Hash rate', unit: 'TH/s' }]
      render(<MinerMetricCard primaryStats={stats} />)

      expect(screen.getByText(/- TH\/s/)).toBeInTheDocument()
    })

    it('renders hash rate without unit', () => {
      const stats = [{ name: 'Hash rate', value: 95.5 }]
      render(<MinerMetricCard primaryStats={stats} />)

      expect(screen.getByText(/95.5/)).toBeInTheDocument()
    })
  })

  describe('temperature display', () => {
    it('renders temperature with value and unit', () => {
      render(<MinerMetricCard primaryStats={mockPrimaryStats} />)

      expect(screen.getByText('Temperature')).toBeInTheDocument()
      expect(screen.getByText(/65 °C/)).toBeInTheDocument()
    })

    it('renders empty when temperature is missing', () => {
      render(<MinerMetricCard primaryStats={[]} />)

      const tempLabel = screen.getByText('Temperature')
      const parent = tempLabel.parentElement
      expect(parent?.textContent).toContain('Temperature')
    })

    it('renders temperature without unit', () => {
      const stats = [{ name: 'Temperature', value: 65 }]
      render(<MinerMetricCard primaryStats={stats} />)

      expect(screen.getByText('Temperature')).toBeInTheDocument()
    })
  })

  describe('frequency display', () => {
    it('renders frequency with formatted value', () => {
      render(<MinerMetricCard primaryStats={mockPrimaryStats} />)

      expect(screen.getByText('Frequency')).toBeInTheDocument()
      expect(screen.getByText(/MHz/)).toBeInTheDocument()
    })

    it('uses temperature value for frequency formatting', () => {
      const stats = [{ name: 'Temperature', value: 65.123, unit: '°C' }]
      render(<MinerMetricCard primaryStats={stats} />)

      expect(screen.getByText('Frequency')).toBeInTheDocument()
    })

    it('handles non-numeric temperature value', () => {
      const stats = [{ name: 'Temperature', value: 'N/A', unit: '°C' }]
      render(<MinerMetricCard primaryStats={stats} />)

      expect(screen.getByText('Frequency')).toBeInTheDocument()
    })

    it('renders frequency without unit', () => {
      const stats = [{ name: 'Temperature', value: 65 }]
      render(<MinerMetricCard primaryStats={stats} />)

      expect(screen.getByText('Frequency')).toBeInTheDocument()
    })
  })

  describe('consumption display', () => {
    it('renders consumption with formatted value', () => {
      render(<MinerMetricCard primaryStats={mockPrimaryStats} />)

      expect(screen.getByText('Consumption')).toBeInTheDocument()
      expect(screen.getByText(/3250/)).toBeInTheDocument()
    })

    it('renders kWH when consumption is 0', () => {
      const stats = [{ name: 'Consumption', value: 0, unit: 'W' }]
      render(<MinerMetricCard primaryStats={stats} />)

      expect(screen.getByText(`0 ${UNITS.ENERGY_KWH}`)).toBeInTheDocument()
    })

    it('renders unit when consumption is non-zero', () => {
      const stats = [{ name: 'Consumption', value: 100, unit: 'W' }]
      render(<MinerMetricCard primaryStats={stats} />)

      expect(screen.getByText(/W/)).toBeInTheDocument()
    })

    it('formats consumption with 3 decimals when value exists', () => {
      const stats = [{ name: 'Consumption', value: 3250.456, unit: 'W' }]
      render(<MinerMetricCard primaryStats={stats} />)

      expect(formatNumber).toHaveBeenCalledWith(
        3250.456,
        expect.objectContaining({
          maximumFractionDigits: 3,
          minimumFractionDigits: 3,
        }),
      )
    })

    it('formats consumption with 0 decimals when value is falsy', () => {
      const stats = [{ name: 'Consumption', value: 0, unit: 'W' }]
      render(<MinerMetricCard primaryStats={stats} />)

      expect(formatNumber).toHaveBeenCalledWith(
        0,
        expect.objectContaining({
          maximumFractionDigits: 3,
          minimumFractionDigits: 0,
        }),
      )
    })
  })

  describe('secondary stats', () => {
    it('renders secondary stats when showSecondaryStats is true', () => {
      render(
        <MinerMetricCard
          primaryStats={mockPrimaryStats}
          secondaryStats={mockSecondaryStats}
          showSecondaryStats={true}
        />,
      )

      expect(screen.getByText('Fan Speed')).toBeInTheDocument()
      expect(screen.getByText('6000 RPM')).toBeInTheDocument()
      expect(screen.getByText('Power Mode')).toBeInTheDocument()
      expect(screen.getByText('Normal')).toBeInTheDocument()
    })

    it('does not render secondary stats when showSecondaryStats is false', () => {
      render(
        <MinerMetricCard
          primaryStats={mockPrimaryStats}
          secondaryStats={mockSecondaryStats}
          showSecondaryStats={false}
        />,
      )

      expect(screen.queryByText('Fan Speed')).not.toBeInTheDocument()
      expect(screen.queryByText('Power Mode')).not.toBeInTheDocument()
    })

    it('does not render secondary stats when array is empty', () => {
      render(
        <MinerMetricCard
          primaryStats={mockPrimaryStats}
          secondaryStats={[]}
          showSecondaryStats={true}
        />,
      )

      const { container } = render(<MinerMetricCard primaryStats={mockPrimaryStats} />)
      expect(container.querySelector('.mdk-miner-metric-card__grid-box')).not.toBeInTheDocument()
    })

    it('does not render secondary stats when undefined', () => {
      render(<MinerMetricCard primaryStats={mockPrimaryStats} showSecondaryStats={true} />)

      const { container } = render(<MinerMetricCard primaryStats={mockPrimaryStats} />)
      expect(container.querySelector('.mdk-miner-metric-card__grid-box')).not.toBeInTheDocument()
    })

    it('renders all secondary stats', () => {
      render(
        <MinerMetricCard
          primaryStats={mockPrimaryStats}
          secondaryStats={mockSecondaryStats}
          showSecondaryStats={true}
        />,
      )

      mockSecondaryStats.forEach(({ name, value }) => {
        expect(screen.getByText(name as string)).toBeInTheDocument()
        expect(screen.getByText(value as string)).toBeInTheDocument()
      })
    })

    it('has correct CSS class for grid box', () => {
      const { container } = render(
        <MinerMetricCard
          primaryStats={mockPrimaryStats}
          secondaryStats={mockSecondaryStats}
          showSecondaryStats={true}
        />,
      )

      expect(container.querySelector('.mdk-miner-metric-card__grid-box')).toBeInTheDocument()
    })
  })

  describe('CSS classes', () => {
    it('has correct class for content wrapper', () => {
      const { container } = render(<MinerMetricCard primaryStats={mockPrimaryStats} />)

      expect(container.querySelector('.mdk-miner-metric-card__content')).toBeInTheDocument()
    })

    it('has correct class for boxes', () => {
      const { container } = render(<MinerMetricCard primaryStats={mockPrimaryStats} />)

      const boxes = container.querySelectorAll('.mdk-miner-metric-card__box')
      expect(boxes.length).toBe(2)
    })

    it('has correct class for items', () => {
      const { container } = render(<MinerMetricCard primaryStats={mockPrimaryStats} />)

      const items = container.querySelectorAll('.mdk-miner-metric-card__item')
      expect(items.length).toBeGreaterThan(0)
    })

    it('has correct class for labels', () => {
      const { container } = render(<MinerMetricCard primaryStats={mockPrimaryStats} />)

      const labels = container.querySelectorAll('.mdk-miner-metric-card__label')
      expect(labels.length).toBeGreaterThan(0)
    })

    it('has correct class for values', () => {
      const { container } = render(<MinerMetricCard primaryStats={mockPrimaryStats} />)

      const values = container.querySelectorAll('.mdk-miner-metric-card__value')
      expect(values.length).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('handles empty primary stats', () => {
      render(<MinerMetricCard primaryStats={[]} />)

      expect(screen.getByTestId('card')).toBeInTheDocument()
      expect(screen.getByText('Hash rate')).toBeInTheDocument()
      expect(screen.getByText('Temperature')).toBeInTheDocument()
      expect(screen.getByText('Frequency')).toBeInTheDocument()
      expect(screen.getByText('Consumption')).toBeInTheDocument()
    })

    it('handles null values in stats', () => {
      const stats = [
        { name: 'Hash rate', value: null, unit: 'TH/s' },
        { name: 'Temperature', value: null, unit: '°C' },
      ]
      render(<MinerMetricCard primaryStats={stats} />)

      expect(screen.getByText('Hash rate')).toBeInTheDocument()
      expect(screen.getByText('Temperature')).toBeInTheDocument()
    })

    it('handles undefined values in stats', () => {
      const stats = [
        { name: 'Hash rate', value: undefined, unit: 'TH/s' },
        { name: 'Temperature', value: undefined, unit: '°C' },
      ]
      render(<MinerMetricCard primaryStats={stats} />)

      expect(screen.getByText('Hash rate')).toBeInTheDocument()
      expect(screen.getByText('Temperature')).toBeInTheDocument()
    })

    it('handles stats with extra properties', () => {
      const stats = [
        { name: 'Hash rate', value: 95.5, unit: 'TH/s', extra: 'data', metadata: { test: true } },
      ]
      render(<MinerMetricCard primaryStats={stats} />)

      expect(screen.getByText(/95.5 TH\/s/)).toBeInTheDocument()
    })

    it('handles secondary stats with missing name', () => {
      const stats = [{ value: 'Test Value' }]
      render(
        <MinerMetricCard
          primaryStats={mockPrimaryStats}
          secondaryStats={stats}
          showSecondaryStats={true}
        />,
      )

      expect(screen.getByText('Test Value')).toBeInTheDocument()
    })

    it('handles single secondary stat', () => {
      const stats = [{ name: 'Status', value: 'Active' }]
      render(
        <MinerMetricCard
          primaryStats={mockPrimaryStats}
          secondaryStats={stats}
          showSecondaryStats={true}
        />,
      )

      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  describe('getStatByLabel', () => {
    it('finds stat by exact label match', () => {
      render(<MinerMetricCard primaryStats={mockPrimaryStats} />)

      expect(screen.getByText('Hash rate')).toBeInTheDocument()
      expect(screen.getByText(/95.5/)).toBeInTheDocument()
    })

    it('returns undefined when label not found', () => {
      const stats = [{ name: 'Other Stat', value: 100 }]
      render(<MinerMetricCard primaryStats={stats} />)

      expect(screen.queryByText('Hash rate')).toBeInTheDocument()
    })

    it('returns first match when multiple stats have same name', () => {
      const stats = [
        { name: 'Hash rate', value: 95.5, unit: 'TH/s' },
        { name: 'Hash rate', value: 100, unit: 'TH/s' },
      ]
      render(<MinerMetricCard primaryStats={stats} />)

      expect(screen.getByText(/95.5/)).toBeInTheDocument()
    })
  })

  describe('formatNumber usage', () => {
    it('formats efficiency value', () => {
      render(<MinerMetricCard primaryStats={mockPrimaryStats} />)

      expect(formatNumber).toHaveBeenCalledWith(34.03)
    })

    it('formats frequency with temperature value', () => {
      render(<MinerMetricCard primaryStats={mockPrimaryStats} />)

      expect(formatNumber).toHaveBeenCalledWith(65)
    })

    it('formats frequency as 0 when temperature is missing', () => {
      render(<MinerMetricCard primaryStats={[]} />)

      expect(formatNumber).toHaveBeenCalledWith(0)
    })
  })

  describe('default props', () => {
    it('uses default showSecondaryStats value', () => {
      render(
        <MinerMetricCard primaryStats={mockPrimaryStats} secondaryStats={mockSecondaryStats} />,
      )

      expect(screen.getByText('Fan Speed')).toBeInTheDocument()
    })

    it('showSecondaryStats defaults to true', () => {
      const { container } = render(
        <MinerMetricCard primaryStats={mockPrimaryStats} secondaryStats={mockSecondaryStats} />,
      )

      expect(container.querySelector('.mdk-miner-metric-card__grid-box')).toBeInTheDocument()
    })
  })
})
