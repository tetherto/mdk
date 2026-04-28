import type { ContainerStats } from '@tetherto/foundation'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MinerChip } from '../miner-chip/miner-chip'
import { MinerChipsCard } from '../miner-chips-card'

vi.mock('../miner-chip/miner-chip', () => ({
  MinerChip: vi.fn(({ index, frequency, temperature }) => (
    <div data-testid={`miner-chip-${index}`}>
      Chip {index}: Freq {frequency.current}MHz, Temp {temperature.avg}°C (min: {temperature.min},
      max: {temperature.max})
    </div>
  )),
}))

describe('MinerChipsCard', () => {
  const mockData: ContainerStats = {
    frequency_mhz: {
      chips: [
        { index: 0, current: 850 },
        { index: 1, current: 860 },
        { index: 2, current: 855 },
      ],
    },
    temperature_c: {
      chips: [
        { index: 0, avg: 65, min: 60, max: 70 },
        { index: 1, avg: 66, min: 61, max: 71 },
        { index: 2, avg: 64, min: 59, max: 69 },
      ],
    },
  } as ContainerStats

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders card container when chips exist', () => {
      const { container } = render(<MinerChipsCard data={mockData} />)
      expect(container.querySelector('.mdk-miner-chips-card')).toBeInTheDocument()
    })

    it('renders Chips label', () => {
      render(<MinerChipsCard data={mockData} />)
      expect(screen.getByText('Chips')).toBeInTheDocument()
    })

    it('renders chips container', () => {
      const { container } = render(<MinerChipsCard data={mockData} />)
      expect(container.querySelector('.mdk-miner-chips-card__chips')).toBeInTheDocument()
    })

    it('applies correct CSS class to label', () => {
      const { container } = render(<MinerChipsCard data={mockData} />)
      expect(container.querySelector('.mdk-miner-chips-card__label')).toBeInTheDocument()
    })

    it('renders all chips', () => {
      render(<MinerChipsCard data={mockData} />)
      expect(screen.getByTestId('miner-chip-0')).toBeInTheDocument()
      expect(screen.getByTestId('miner-chip-1')).toBeInTheDocument()
      expect(screen.getByTestId('miner-chip-2')).toBeInTheDocument()
    })

    it('renders correct number of chips', () => {
      render(<MinerChipsCard data={mockData} />)
      expect(screen.getAllByTestId(/miner-chip-/)).toHaveLength(3)
    })
  })

  describe('chip data mapping', () => {
    it('passes correct index to MinerChip', () => {
      render(<MinerChipsCard data={mockData} />)
      expect(screen.getByTestId('miner-chip-0')).toHaveTextContent('Chip 0')
      expect(screen.getByTestId('miner-chip-1')).toHaveTextContent('Chip 1')
      expect(screen.getByTestId('miner-chip-2')).toHaveTextContent('Chip 2')
    })

    it('passes correct frequency to MinerChip', () => {
      render(<MinerChipsCard data={mockData} />)
      expect(screen.getByTestId('miner-chip-0')).toHaveTextContent('Freq 850MHz')
      expect(screen.getByTestId('miner-chip-1')).toHaveTextContent('Freq 860MHz')
      expect(screen.getByTestId('miner-chip-2')).toHaveTextContent('Freq 855MHz')
    })

    it('passes correct temperature avg to MinerChip', () => {
      render(<MinerChipsCard data={mockData} />)
      expect(screen.getByTestId('miner-chip-0')).toHaveTextContent('Temp 65°C')
      expect(screen.getByTestId('miner-chip-1')).toHaveTextContent('Temp 66°C')
      expect(screen.getByTestId('miner-chip-2')).toHaveTextContent('Temp 64°C')
    })

    it('passes correct temperature min to MinerChip', () => {
      render(<MinerChipsCard data={mockData} />)
      expect(screen.getByTestId('miner-chip-0')).toHaveTextContent('min: 60')
      expect(screen.getByTestId('miner-chip-1')).toHaveTextContent('min: 61')
      expect(screen.getByTestId('miner-chip-2')).toHaveTextContent('min: 59')
    })

    it('passes correct temperature max to MinerChip', () => {
      render(<MinerChipsCard data={mockData} />)
      expect(screen.getByTestId('miner-chip-0')).toHaveTextContent('max: 70')
      expect(screen.getByTestId('miner-chip-1')).toHaveTextContent('max: 71')
      expect(screen.getByTestId('miner-chip-2')).toHaveTextContent('max: 69')
    })

    it('matches frequency and temperature by index', () => {
      const dataWithMismatchedOrder: ContainerStats = {
        frequency_mhz: {
          chips: [
            { index: 2, current: 855 },
            { index: 0, current: 850 },
            { index: 1, current: 860 },
          ],
        },
        temperature_c: {
          chips: [
            { index: 1, avg: 66, min: 61, max: 71 },
            { index: 2, avg: 64, min: 59, max: 69 },
            { index: 0, avg: 65, min: 60, max: 70 },
          ],
        },
      } as ContainerStats

      render(<MinerChipsCard data={dataWithMismatchedOrder} />)

      expect(screen.getByTestId('miner-chip-0')).toHaveTextContent('Freq 850MHz')
      expect(screen.getByTestId('miner-chip-0')).toHaveTextContent('Temp 65°C')
      expect(screen.getByTestId('miner-chip-1')).toHaveTextContent('Freq 860MHz')
      expect(screen.getByTestId('miner-chip-1')).toHaveTextContent('Temp 66°C')
      expect(screen.getByTestId('miner-chip-2')).toHaveTextContent('Freq 855MHz')
      expect(screen.getByTestId('miner-chip-2')).toHaveTextContent('Temp 64°C')
    })
  })

  describe('filtering incomplete chips', () => {
    it('filters out chips with missing temperature max', () => {
      const dataWithMissingMax: ContainerStats = {
        frequency_mhz: {
          chips: [
            { index: 0, current: 850 },
            { index: 1, current: 860 },
          ],
        },
        temperature_c: {
          chips: [
            { index: 0, avg: 65, min: 60, max: 70 },
            { index: 1, avg: 66, min: 61, max: undefined },
          ],
        },
      } as ContainerStats

      render(<MinerChipsCard data={dataWithMissingMax} />)

      expect(screen.getByTestId('miner-chip-0')).toBeInTheDocument()
      expect(screen.queryByTestId('miner-chip-1')).not.toBeInTheDocument()
    })

    it('filters out chips with missing temperature min', () => {
      const dataWithMissingMin: ContainerStats = {
        frequency_mhz: {
          chips: [
            { index: 0, current: 850 },
            { index: 1, current: 860 },
          ],
        },
        temperature_c: {
          chips: [
            { index: 0, avg: 65, min: 60, max: 70 },
            { index: 1, avg: 66, min: undefined, max: 71 },
          ],
        },
      } as ContainerStats

      render(<MinerChipsCard data={dataWithMissingMin} />)

      expect(screen.getByTestId('miner-chip-0')).toBeInTheDocument()
      expect(screen.queryByTestId('miner-chip-1')).not.toBeInTheDocument()
    })

    it('filters out chips with missing temperature avg', () => {
      const dataWithMissingAvg: ContainerStats = {
        frequency_mhz: {
          chips: [
            { index: 0, current: 850 },
            { index: 1, current: 860 },
          ],
        },
        temperature_c: {
          chips: [
            { index: 0, avg: 65, min: 60, max: 70 },
            { index: 1, avg: undefined, min: 61, max: 71 },
          ],
        },
      } as ContainerStats

      render(<MinerChipsCard data={dataWithMissingAvg} />)

      expect(screen.getByTestId('miner-chip-0')).toBeInTheDocument()
      expect(screen.queryByTestId('miner-chip-1')).not.toBeInTheDocument()
    })

    it('filters out chips with no matching temperature data', () => {
      const dataWithMissingTempChip: ContainerStats = {
        frequency_mhz: {
          chips: [
            { index: 0, current: 850 },
            { index: 1, current: 860 },
          ],
        },
        temperature_c: {
          chips: [{ index: 0, avg: 65, min: 60, max: 70 }],
        },
      } as ContainerStats

      render(<MinerChipsCard data={dataWithMissingTempChip} />)

      expect(screen.getByTestId('miner-chip-0')).toBeInTheDocument()
      expect(screen.queryByTestId('miner-chip-1')).not.toBeInTheDocument()
    })

    it('keeps chips with 0 values', () => {
      const dataWithZeroValues: ContainerStats = {
        frequency_mhz: {
          chips: [{ index: 0, current: 0 }],
        },
        temperature_c: {
          chips: [{ index: 0, avg: 0, min: 0, max: 0 }],
        },
      } as ContainerStats

      render(<MinerChipsCard data={dataWithZeroValues} />)

      expect(screen.getByTestId('miner-chip-0')).toBeInTheDocument()
    })
  })

  describe('empty data handling', () => {
    it('does not render when frequency chips is empty', () => {
      const emptyData: ContainerStats = {
        frequency_mhz: {
          chips: [],
        },
        temperature_c: {
          chips: [],
        },
      } as ContainerStats

      const { container } = render(<MinerChipsCard data={emptyData} />)

      expect(container.querySelector('.mdk-miner-chips-card')).not.toBeInTheDocument()
    })

    it('does not render when frequency_mhz is undefined', () => {
      const dataWithoutFrequency: ContainerStats = {
        temperature_c: {
          chips: [{ index: 0, avg: 65, min: 60, max: 70 }],
        },
      } as ContainerStats

      const { container } = render(<MinerChipsCard data={dataWithoutFrequency} />)

      expect(container.querySelector('.mdk-miner-chips-card')).not.toBeInTheDocument()
    })

    it('does not render when frequency chips is undefined', () => {
      const dataWithoutChips: ContainerStats = {
        frequency_mhz: {},
        temperature_c: {
          chips: [{ index: 0, avg: 65, min: 60, max: 70 }],
        },
      } as ContainerStats

      const { container } = render(<MinerChipsCard data={dataWithoutChips} />)

      expect(container.querySelector('.mdk-miner-chips-card')).not.toBeInTheDocument()
    })

    it('does not render when all chips filtered out', () => {
      const dataWithInvalidChips: ContainerStats = {
        frequency_mhz: {
          chips: [{ index: 0, current: 850 }],
        },
        temperature_c: {
          chips: [{ index: 0, avg: undefined, min: undefined, max: undefined }],
        },
      } as ContainerStats

      const { container } = render(<MinerChipsCard data={dataWithInvalidChips} />)

      expect(container.querySelector('.mdk-miner-chips-card')).not.toBeInTheDocument()
    })

    it('renders empty fragment when no chips', () => {
      const emptyData: ContainerStats = {
        frequency_mhz: { chips: [] },
        temperature_c: { chips: [] },
      } as ContainerStats

      const { container } = render(<MinerChipsCard data={emptyData} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('single chip', () => {
    it('renders single chip correctly', () => {
      const singleChipData: ContainerStats = {
        frequency_mhz: {
          chips: [{ index: 0, current: 850 }],
        },
        temperature_c: {
          chips: [{ index: 0, avg: 65, min: 60, max: 70 }],
        },
      } as ContainerStats

      render(<MinerChipsCard data={singleChipData} />)

      expect(screen.getAllByTestId(/miner-chip-/)).toHaveLength(1)
      expect(screen.getByTestId('miner-chip-0')).toBeInTheDocument()
    })
  })

  describe('many chips', () => {
    it('renders many chips correctly', () => {
      const manyChipsData: ContainerStats = {
        frequency_mhz: {
          chips: Array.from({ length: 10 }, (_, i) => ({ index: i, current: 850 + i })),
        },
        temperature_c: {
          chips: Array.from({ length: 10 }, (_, i) => ({
            index: i,
            avg: 65 + i,
            min: 60 + i,
            max: 70 + i,
          })),
        },
      } as ContainerStats

      render(<MinerChipsCard data={manyChipsData} />)

      expect(screen.getAllByTestId(/miner-chip-/)).toHaveLength(10)
      for (let i = 0; i < 10; i++) {
        expect(screen.getByTestId(`miner-chip-${i}`)).toBeInTheDocument()
      }
    })
  })

  describe('key prop', () => {
    it('uses chip index as key', () => {
      render(<MinerChipsCard data={mockData} />)

      const calls = vi.mocked(MinerChip).mock.calls
      calls.forEach((call, index) => {
        expect(call[0].index).toBe(mockData.frequency_mhz.chips![index].index)
      })
    })
  })

  describe('temperature_c chips undefined', () => {
    it('filters out all chips when temperature_c.chips is undefined', () => {
      const dataWithoutTempChips: ContainerStats = {
        frequency_mhz: {
          chips: [{ index: 0, current: 850 }],
        },
        temperature_c: {},
      } as ContainerStats

      const { container } = render(<MinerChipsCard data={dataWithoutTempChips} />)

      expect(container.querySelector('.mdk-miner-chips-card')).not.toBeInTheDocument()
    })

    it('filters out all chips when temperature_c is undefined', () => {
      const dataWithoutTemp: ContainerStats = {
        frequency_mhz: {
          chips: [{ index: 0, current: 850 }],
        },
      } as ContainerStats

      const { container } = render(<MinerChipsCard data={dataWithoutTemp} />)

      expect(container.querySelector('.mdk-miner-chips-card')).not.toBeInTheDocument()
    })
  })

  describe('partial data', () => {
    it('renders only chips with complete data', () => {
      const partialData: ContainerStats = {
        frequency_mhz: {
          chips: [
            { index: 0, current: 850 },
            { index: 1, current: 860 },
            { index: 2, current: 855 },
          ],
        },
        temperature_c: {
          chips: [
            { index: 0, avg: 65, min: 60, max: 70 },
            { index: 2, avg: 64, min: 59, max: 69 },
          ],
        },
      } as ContainerStats

      render(<MinerChipsCard data={partialData} />)

      expect(screen.getByTestId('miner-chip-0')).toBeInTheDocument()
      expect(screen.queryByTestId('miner-chip-1')).not.toBeInTheDocument()
      expect(screen.getByTestId('miner-chip-2')).toBeInTheDocument()
    })
  })

  describe('integration', () => {
    it('passes all required props to MinerChip', () => {
      render(<MinerChipsCard data={mockData} />)

      const firstCall = vi.mocked(MinerChip).mock.calls[0][0]
      expect(firstCall).toHaveProperty('index')
      expect(firstCall).toHaveProperty('frequency')
      expect(firstCall).toHaveProperty('temperature')
      expect(firstCall.frequency).toHaveProperty('current')
      expect(firstCall.temperature).toHaveProperty('avg')
      expect(firstCall.temperature).toHaveProperty('min')
      expect(firstCall.temperature).toHaveProperty('max')
    })

    it('calls MinerChip for each valid chip', () => {
      render(<MinerChipsCard data={mockData} />)

      expect(MinerChip).toHaveBeenCalledTimes(3)
    })
  })

  describe('edge cases with decimal values', () => {
    it('handles decimal frequency values', () => {
      const decimalData: ContainerStats = {
        frequency_mhz: {
          chips: [{ index: 0, current: 850.5 }],
        },
        temperature_c: {
          chips: [{ index: 0, avg: 65, min: 60, max: 70 }],
        },
      } as ContainerStats

      render(<MinerChipsCard data={decimalData} />)

      expect(screen.getByTestId('miner-chip-0')).toHaveTextContent('Freq 850.5MHz')
    })

    it('handles decimal temperature values', () => {
      const decimalData: ContainerStats = {
        frequency_mhz: {
          chips: [{ index: 0, current: 850 }],
        },
        temperature_c: {
          chips: [{ index: 0, avg: 65.5, min: 60.25, max: 70.75 }],
        },
      } as ContainerStats

      render(<MinerChipsCard data={decimalData} />)

      expect(screen.getByTestId('miner-chip-0')).toHaveTextContent('Temp 65.5°C')
    })
  })
})
