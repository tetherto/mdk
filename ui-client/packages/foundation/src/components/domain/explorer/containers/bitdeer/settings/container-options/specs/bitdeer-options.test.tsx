import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../../../../../types/device'
import { getBitdeerCoolingSystemData } from '../../bitdeer-settings-utils'
import { BitdeerOptions } from '../bitdeer-options'
import { BitdeerPumps } from '../bitdeer-pumps'
import { DryCooler } from '../dry-cooler/dry-cooler'

// Mock child components
vi.mock('../dry-cooler/dry-cooler', () => ({
  DryCooler: vi.fn(({ data }) => (
    <div data-testid="dry-cooler">Dry Cooler - {data?.id || 'no-data'}</div>
  )),
}))

vi.mock('../bitdeer-pumps', () => ({
  BitdeerPumps: vi.fn(({ data }) => (
    <div data-testid="bitdeer-pumps">Bitdeer Pumps - {data?.id || 'no-data'}</div>
  )),
}))

// Mock utils
vi.mock('../../bitdeer-settings-utils', () => ({
  getBitdeerCoolingSystemData: vi.fn((data) => ({
    dryCooler: data?.last?.snap?.stats?.container_specific?.dry_cooler ?? false,
  })),
}))

describe('bitdeerOptions', () => {
  const mockDeviceWithDryCooler: Device = {
    id: 'device-1',
    type: 'bitdeer',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            dry_cooler: true,
          },
        },
        config: {},
      },
    },
  }

  const mockDeviceWithoutDryCooler: Device = {
    id: 'device-2',
    type: 'bitdeer',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            dry_cooler: false,
          },
        },
        config: {},
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<BitdeerOptions />)
      expect(document.querySelector('.mdk-bitdeer-options')).toBeInTheDocument()
    })

    it('renders BitdeerPumps component', () => {
      render(<BitdeerOptions data={mockDeviceWithDryCooler} />)
      expect(screen.getByTestId('bitdeer-pumps')).toBeInTheDocument()
    })

    it('renders DryCooler when dry_cooler is true', () => {
      render(<BitdeerOptions data={mockDeviceWithDryCooler} />)
      expect(screen.getByTestId('dry-cooler')).toBeInTheDocument()
    })

    it('does not render DryCooler when dry_cooler is false', () => {
      render(<BitdeerOptions data={mockDeviceWithoutDryCooler} />)
      expect(screen.queryByTestId('dry-cooler')).not.toBeInTheDocument()
    })
  })

  describe('data passing', () => {
    it('passes data to DryCooler component', () => {
      render(<BitdeerOptions data={mockDeviceWithDryCooler} />)

      expect(DryCooler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockDeviceWithDryCooler,
        }),
        expect.anything(),
      )
    })

    it('passes data to BitdeerPumps component', () => {
      render(<BitdeerOptions data={mockDeviceWithDryCooler} />)

      expect(BitdeerPumps).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockDeviceWithDryCooler,
        }),
        expect.anything(),
      )
    })

    it('passes undefined when no data provided', () => {
      render(<BitdeerOptions />)

      expect(BitdeerPumps).toHaveBeenCalledWith(
        expect.objectContaining({
          data: undefined,
        }),
        expect.anything(),
      )
    })
  })

  describe('utils integration', () => {
    it('calls getBitdeerCoolingSystemData with device data', () => {
      render(<BitdeerOptions data={mockDeviceWithDryCooler} />)

      expect(getBitdeerCoolingSystemData).toHaveBeenCalledWith(mockDeviceWithDryCooler)
    })

    it('calls getBitdeerCoolingSystemData with empty object when no data', () => {
      render(<BitdeerOptions />)

      expect(getBitdeerCoolingSystemData).toHaveBeenCalledWith({})
    })

    it('uses dryCooler value from utils to determine rendering', () => {
      vi.mocked(getBitdeerCoolingSystemData).mockReturnValueOnce({
        dryCooler: true,
      })

      render(<BitdeerOptions data={mockDeviceWithDryCooler} />)

      expect(screen.getByTestId('dry-cooler')).toBeInTheDocument()
    })

    it('hides DryCooler when utils returns false', () => {
      vi.mocked(getBitdeerCoolingSystemData).mockReturnValueOnce({
        dryCooler: false,
      })

      render(<BitdeerOptions data={mockDeviceWithDryCooler} />)

      expect(screen.queryByTestId('dry-cooler')).not.toBeInTheDocument()
    })
  })

  describe('component composition', () => {
    it('renders both components when dryCooler is enabled', () => {
      render(<BitdeerOptions data={mockDeviceWithDryCooler} />)

      expect(screen.getByTestId('dry-cooler')).toBeInTheDocument()
      expect(screen.getByTestId('bitdeer-pumps')).toBeInTheDocument()
    })

    it('renders only pumps when dryCooler is disabled', () => {
      render(<BitdeerOptions data={mockDeviceWithoutDryCooler} />)

      expect(screen.queryByTestId('dry-cooler')).not.toBeInTheDocument()
      expect(screen.getByTestId('bitdeer-pumps')).toBeInTheDocument()
    })

    it('always renders BitdeerPumps regardless of dryCooler status', () => {
      const { rerender } = render(<BitdeerOptions data={mockDeviceWithDryCooler} />)
      expect(screen.getByTestId('bitdeer-pumps')).toBeInTheDocument()

      rerender(<BitdeerOptions data={mockDeviceWithoutDryCooler} />)
      expect(screen.getByTestId('bitdeer-pumps')).toBeInTheDocument()
    })
  })

  describe('structure', () => {
    it('has correct wrapper class', () => {
      const { container } = render(<BitdeerOptions data={mockDeviceWithDryCooler} />)

      expect(container.querySelector('.mdk-bitdeer-options')).toBeInTheDocument()
    })

    it('renders DryCooler before BitdeerPumps when present', () => {
      const { container } = render(<BitdeerOptions data={mockDeviceWithDryCooler} />)

      const wrapper = container.querySelector('.mdk-bitdeer-options')
      const children = wrapper?.children

      expect(children?.[0]).toHaveAttribute('data-testid', 'dry-cooler')
      expect(children?.[1]).toHaveAttribute('data-testid', 'bitdeer-pumps')
    })
  })

  describe('edge cases', () => {
    it('handles null data gracefully', () => {
      render(<BitdeerOptions data={null as any} />)

      expect(document.querySelector('.mdk-bitdeer-options')).toBeInTheDocument()
      expect(screen.getByTestId('bitdeer-pumps')).toBeInTheDocument()
    })

    it('handles missing container_specific', () => {
      const deviceNoSpecific = {
        ...mockDeviceWithDryCooler,
        last: {
          snap: {
            stats: {},
            config: {},
          },
        },
      }

      render(<BitdeerOptions data={deviceNoSpecific} />)

      expect(document.querySelector('.mdk-bitdeer-options')).toBeInTheDocument()
      expect(screen.getByTestId('bitdeer-pumps')).toBeInTheDocument()
    })

    it('handles missing stats', () => {
      const deviceNoStats = {
        ...mockDeviceWithDryCooler,
        last: {
          snap: {
            stats: undefined,
            config: {},
          },
        },
      }

      render(<BitdeerOptions data={deviceNoStats as any} />)

      expect(document.querySelector('.mdk-bitdeer-options')).toBeInTheDocument()
    })
  })

  describe('re-rendering', () => {
    it('updates when data changes', () => {
      const { rerender } = render(<BitdeerOptions data={mockDeviceWithDryCooler} />)
      expect(screen.getByTestId('dry-cooler')).toBeInTheDocument()

      rerender(<BitdeerOptions data={mockDeviceWithoutDryCooler} />)
      expect(screen.queryByTestId('dry-cooler')).not.toBeInTheDocument()
    })

    it('updates when dryCooler status changes', () => {
      vi.mocked(getBitdeerCoolingSystemData).mockReturnValueOnce({
        dryCooler: true,
      })

      const { rerender } = render(<BitdeerOptions data={mockDeviceWithDryCooler} />)
      expect(screen.getByTestId('dry-cooler')).toBeInTheDocument()

      vi.mocked(getBitdeerCoolingSystemData).mockReturnValueOnce({
        dryCooler: false,
      })

      rerender(<BitdeerOptions data={mockDeviceWithDryCooler} />)
      expect(screen.queryByTestId('dry-cooler')).not.toBeInTheDocument()
    })
  })

  describe('component calls', () => {
    it('calls DryCooler component once when enabled', () => {
      render(<BitdeerOptions data={mockDeviceWithDryCooler} />)

      expect(DryCooler).toHaveBeenCalledTimes(1)
    })

    it('does not call DryCooler when disabled', () => {
      render(<BitdeerOptions data={mockDeviceWithoutDryCooler} />)

      expect(DryCooler).not.toHaveBeenCalled()
    })

    it('calls BitdeerPumps component once', () => {
      render(<BitdeerOptions data={mockDeviceWithDryCooler} />)

      expect(BitdeerPumps).toHaveBeenCalledTimes(1)
    })
  })
})
