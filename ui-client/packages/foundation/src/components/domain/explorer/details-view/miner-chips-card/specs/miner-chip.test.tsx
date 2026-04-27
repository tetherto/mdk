import { formatNumber, UNITS } from '@mdk/core'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MinerChip } from '../miner-chip/miner-chip'

vi.mock('@mdk/core', async () => {
  const actual = await vi.importActual('@mdk/core')
  return {
    ...actual,
    formatNumber: vi.fn((value) => {
      if (value === null || value === undefined) return ''
      if (typeof value === 'number') return value.toFixed(2)
      return String(value)
    }),
    UNITS: {
      TEMPERATURE_C: '°C',
      FREQUENCY_MHZ: 'MHz',
    },
  }
})

describe('MinerChip', () => {
  const mockProps = {
    index: 1,
    frequency: {
      current: 850,
    },
    temperature: {
      avg: 65,
      min: 60,
      max: 70,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders chip container', () => {
      const { container } = render(<MinerChip {...mockProps} />)
      expect(container.querySelector('.mdk-miner-chip')).toBeInTheDocument()
    })

    it('displays chip index in title', () => {
      render(<MinerChip {...mockProps} />)
      expect(screen.getByText('Chip 1')).toBeInTheDocument()
    })

    it('displays Temperature label', () => {
      render(<MinerChip {...mockProps} />)
      expect(screen.getByText('Temperature')).toBeInTheDocument()
    })

    it('displays Frequency label', () => {
      render(<MinerChip {...mockProps} />)
      expect(screen.getByText('Frequency')).toBeInTheDocument()
    })

    it('has correct CSS class for title', () => {
      const { container } = render(<MinerChip {...mockProps} />)
      expect(container.querySelector('.mdk-miner-chip__title')).toBeInTheDocument()
    })

    it('has correct CSS class for property labels', () => {
      const { container } = render(<MinerChip {...mockProps} />)
      const properties = container.querySelectorAll('.mdk-miner-chip__property')
      expect(properties).toHaveLength(2)
    })

    it('has correct CSS class for values', () => {
      const { container } = render(<MinerChip {...mockProps} />)
      const values = container.querySelectorAll('.mdk-miner-chip__value')
      expect(values.length).toBeGreaterThan(0)
    })

    it('has correct CSS class for minmax container', () => {
      const { container } = render(<MinerChip {...mockProps} />)
      expect(container.querySelector('.mdk-miner-chip__minmax')).toBeInTheDocument()
    })
  })

  describe('temperature display', () => {
    it('displays average temperature', () => {
      render(<MinerChip {...mockProps} />)
      expect(screen.getByText(`65.00 ${UNITS.TEMPERATURE_C}`)).toBeInTheDocument()
    })

    it('displays temperature unit for average', () => {
      render(<MinerChip {...mockProps} />)
      const avgValue = screen.getByText(`65.00 ${UNITS.TEMPERATURE_C}`).parentElement
      expect(avgValue?.textContent).toContain(UNITS.TEMPERATURE_C)
    })

    it('displays minimum temperature', () => {
      render(<MinerChip {...mockProps} />)
      expect(screen.getByText('60.00')).toBeInTheDocument()
    })

    it('displays maximum temperature', () => {
      render(<MinerChip {...mockProps} />)
      expect(screen.getByText('70.00')).toBeInTheDocument()
    })

    it('displays min label', () => {
      render(<MinerChip {...mockProps} />)
      expect(screen.getByText(/min/)).toBeInTheDocument()
    })

    it('displays max label', () => {
      render(<MinerChip {...mockProps} />)
      expect(screen.getByText(/max/)).toBeInTheDocument()
    })

    it('includes temperature unit in min label', () => {
      render(<MinerChip {...mockProps} />)
      const minLabel = screen.getByText(/min/)
      expect(minLabel.textContent).toContain('°C')
    })

    it('includes temperature unit in max label', () => {
      render(<MinerChip {...mockProps} />)
      const maxLabel = screen.getByText(/max/)
      expect(maxLabel.textContent).toContain('°C')
    })

    it('formats average temperature correctly', () => {
      render(<MinerChip {...mockProps} />)

      expect(formatNumber).toHaveBeenCalledWith(65)
    })

    it('formats min temperature correctly', () => {
      render(<MinerChip {...mockProps} />)

      expect(formatNumber).toHaveBeenCalledWith(60)
    })

    it('formats max temperature correctly', () => {
      render(<MinerChip {...mockProps} />)

      expect(formatNumber).toHaveBeenCalledWith(70)
    })

    it('displays decimal temperatures', () => {
      const propsWithDecimals = {
        ...mockProps,
        temperature: {
          avg: 65.5,
          min: 60.25,
          max: 70.75,
        },
      }
      render(<MinerChip {...propsWithDecimals} />)

      expect(screen.getByText(`65.50 ${UNITS.TEMPERATURE_C}`)).toBeInTheDocument()
    })

    it('displays zero temperature', () => {
      const propsWithZero = {
        ...mockProps,
        temperature: {
          avg: 0,
          min: 0,
          max: 0,
        },
      }
      render(<MinerChip {...propsWithZero} />)

      expect(screen.getAllByText(`0.00 ${UNITS.TEMPERATURE_C}`)).toHaveLength(1)
    })

    it('displays negative temperature', () => {
      const propsWithNegative = {
        ...mockProps,
        temperature: {
          avg: -5,
          min: -10,
          max: 0,
        },
      }
      render(<MinerChip {...propsWithNegative} />)

      expect(screen.getByText(`-5.00 ${UNITS.TEMPERATURE_C}`)).toBeInTheDocument()
    })
  })

  describe('frequency display', () => {
    it('displays current frequency', () => {
      render(<MinerChip {...mockProps} />)
      expect(screen.getByText(`850.00 ${UNITS.FREQUENCY_MHZ}`)).toBeInTheDocument()
    })

    it('displays frequency unit', () => {
      render(<MinerChip {...mockProps} />)
      const freqValue = screen.getByText(`850.00 ${UNITS.FREQUENCY_MHZ}`).parentElement
      expect(freqValue?.textContent).toContain('MHz')
    })

    it('formats frequency correctly', () => {
      render(<MinerChip {...mockProps} />)

      expect(formatNumber).toHaveBeenCalledWith(850)
    })

    it('displays decimal frequency', () => {
      const propsWithDecimal = {
        ...mockProps,
        frequency: {
          current: 850.5,
        },
      }
      render(<MinerChip {...propsWithDecimal} />)

      expect(screen.getByText(`850.50 ${UNITS.FREQUENCY_MHZ}`)).toBeInTheDocument()
    })

    it('displays zero frequency', () => {
      const propsWithZero = {
        ...mockProps,
        frequency: {
          current: 0,
        },
      }
      render(<MinerChip {...propsWithZero} />)

      expect(screen.getByText(`0.00 ${UNITS.FREQUENCY_MHZ}`)).toBeInTheDocument()
    })

    it('displays high frequency value', () => {
      const propsWithHighFreq = {
        ...mockProps,
        frequency: {
          current: 1500,
        },
      }
      render(<MinerChip {...propsWithHighFreq} />)

      expect(screen.getByText(`1500.00 ${UNITS.FREQUENCY_MHZ}`)).toBeInTheDocument()
    })
  })

  describe('chip index', () => {
    it('displays index 0', () => {
      render(<MinerChip {...mockProps} index={0} />)
      expect(screen.getByText('Chip 0')).toBeInTheDocument()
    })

    it('displays index 1', () => {
      render(<MinerChip {...mockProps} index={1} />)
      expect(screen.getByText('Chip 1')).toBeInTheDocument()
    })

    it('displays high index number', () => {
      render(<MinerChip {...mockProps} index={99} />)
      expect(screen.getByText('Chip 99')).toBeInTheDocument()
    })

    it('displays three digit index', () => {
      render(<MinerChip {...mockProps} index={123} />)
      expect(screen.getByText('Chip 123')).toBeInTheDocument()
    })
  })

  describe('CSS classes', () => {
    it('applies value-type class to min label', () => {
      const { container } = render(<MinerChip {...mockProps} />)
      const minLabel = Array.from(container.querySelectorAll('.mdk-miner-chip__value-type')).find(
        (el) => el.textContent?.includes('min'),
      )
      expect(minLabel).toBeInTheDocument()
    })

    it('applies value-type class to max label', () => {
      const { container } = render(<MinerChip {...mockProps} />)
      const maxLabel = Array.from(container.querySelectorAll('.mdk-miner-chip__value-type')).find(
        (el) => el.textContent?.includes('max'),
      )
      expect(maxLabel).toBeInTheDocument()
    })

    it('has exactly 2 property labels', () => {
      const { container } = render(<MinerChip {...mockProps} />)
      const properties = container.querySelectorAll('.mdk-miner-chip__property')
      expect(properties).toHaveLength(2)
    })

    it('has temperature as first property', () => {
      const { container } = render(<MinerChip {...mockProps} />)
      const properties = container.querySelectorAll('.mdk-miner-chip__property')
      expect(properties[0]).toHaveTextContent('Temperature')
    })

    it('has frequency as second property', () => {
      const { container } = render(<MinerChip {...mockProps} />)
      const properties = container.querySelectorAll('.mdk-miner-chip__property')
      expect(properties[1]).toHaveTextContent('Frequency')
    })
  })

  describe('structure', () => {
    it('renders title before temperature', () => {
      const { container } = render(<MinerChip {...mockProps} />)
      const elements = Array.from(container.querySelectorAll('.mdk-miner-chip > *'))
      const titleIndex = elements.findIndex((el) => el.classList.contains('mdk-miner-chip__title'))
      const tempIndex = elements.findIndex(
        (el) =>
          el.textContent === 'Temperature' && el.classList.contains('mdk-miner-chip__property'),
      )
      expect(titleIndex).toBeLessThan(tempIndex)
    })

    it('renders temperature before frequency', () => {
      const { container } = render(<MinerChip {...mockProps} />)
      const properties = container.querySelectorAll('.mdk-miner-chip__property')
      expect(properties[0]).toHaveTextContent('Temperature')
      expect(properties[1]).toHaveTextContent('Frequency')
    })

    it('renders minmax container between temperature sections', () => {
      const { container } = render(<MinerChip {...mockProps} />)
      const minmax = container.querySelector('.mdk-miner-chip__minmax')
      expect(minmax).toBeInTheDocument()
    })

    it('minmax container has two value children', () => {
      const { container } = render(<MinerChip {...mockProps} />)
      const minmax = container.querySelector('.mdk-miner-chip__minmax')
      const values = minmax?.querySelectorAll('.mdk-miner-chip__value')
      expect(values).toHaveLength(2)
    })
  })

  describe('formatNumber calls', () => {
    it('calls formatNumber for all numeric values', () => {
      render(<MinerChip {...mockProps} />)

      expect(formatNumber).toHaveBeenCalledWith(65) // avg temp
      expect(formatNumber).toHaveBeenCalledWith(60) // min temp
      expect(formatNumber).toHaveBeenCalledWith(70) // max temp
      expect(formatNumber).toHaveBeenCalledWith(850) // frequency
    })

    it('calls formatNumber exactly 4 times', () => {
      render(<MinerChip {...mockProps} />)

      expect(formatNumber).toHaveBeenCalledTimes(4)
    })
  })

  describe('accessibility', () => {
    it('uses paragraph tags for labels', () => {
      const { container } = render(<MinerChip {...mockProps} />)
      const paragraphs = container.querySelectorAll('p')
      expect(paragraphs.length).toBeGreaterThan(0)
    })

    it('title is in a paragraph', () => {
      render(<MinerChip {...mockProps} />)
      const title = screen.getByText('Chip 1')
      expect(title.tagName).toBe('P')
    })

    it('property labels are in paragraphs', () => {
      render(<MinerChip {...mockProps} />)
      const tempLabel = screen.getByText('Temperature')
      const freqLabel = screen.getByText('Frequency')
      expect(tempLabel.tagName).toBe('P')
      expect(freqLabel.tagName).toBe('P')
    })

    it('min/max labels are in paragraphs', () => {
      render(<MinerChip {...mockProps} />)
      const minLabel = screen.getByText(/min/)
      const maxLabel = screen.getByText(/max/)
      expect(minLabel.tagName).toBe('P')
      expect(maxLabel.tagName).toBe('P')
    })
  })
})
