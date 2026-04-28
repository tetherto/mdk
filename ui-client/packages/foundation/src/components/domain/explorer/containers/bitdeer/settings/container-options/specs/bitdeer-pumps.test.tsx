import { Indicator } from '@tetherto/mdk-core-ui'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEVICE_STATUS } from '../../../../../../../../constants/devices'
import type { Device } from '../../../../../../../../types/device'
import { getBitdeerCoolingSystemData } from '../../bitdeer-settings-utils'
import { BitdeerPumps } from '../bitdeer-pumps'

// Mock Indicator component
vi.mock('@tetherto/mdk-core-ui', () => ({
  Indicator: vi.fn(({ color, children }) => (
    <div data-testid="indicator" data-color={color}>
      {children}
    </div>
  )),
}))

// Mock utils
vi.mock('../../bitdeer-settings-utils', () => ({
  getBitdeerCoolingSystemData: vi.fn((data) => ({
    exhaustFanEnabled: data?.last?.snap?.stats?.container_specific?.exhaust_fan_enabled,
  })),
}))

describe('bitdeerPumps', () => {
  const mockDeviceWithFanEnabled: Device = {
    id: 'device-1',
    type: 'bitdeer',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            exhaust_fan_enabled: true,
          },
        },
        config: {},
      },
    },
  }

  const mockDeviceWithFanDisabled: Device = {
    id: 'device-2',
    type: 'bitdeer',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            exhaust_fan_enabled: false,
          },
        },
        config: {},
      },
    },
  }

  const mockDeviceWithNoFanData: Device = {
    id: 'device-3',
    type: 'bitdeer',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {},
        },
        config: {},
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders when exhaust fan is enabled', () => {
      render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      expect(document.querySelector('.mdk-bitdeer-pumps')).toBeInTheDocument()
    })

    it('renders when exhaust fan is disabled', () => {
      render(<BitdeerPumps data={mockDeviceWithFanDisabled} />)
      expect(document.querySelector('.mdk-bitdeer-pumps')).toBeInTheDocument()
    })

    it('does not render when exhaustFanEnabled is undefined', () => {
      render(<BitdeerPumps data={mockDeviceWithNoFanData} />)
      expect(document.querySelector('.mdk-bitdeer-pumps')).not.toBeInTheDocument()
    })

    it('does not render when exhaustFanEnabled is null', () => {
      vi.mocked(getBitdeerCoolingSystemData).mockReturnValueOnce({
        exhaustFanEnabled: null as any,
      })

      render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      expect(document.querySelector('.mdk-bitdeer-pumps')).not.toBeInTheDocument()
    })

    it('does not render when no data provided', () => {
      render(<BitdeerPumps />)
      expect(document.querySelector('.mdk-bitdeer-pumps')).not.toBeInTheDocument()
    })

    it('returns null when exhaustFanEnabled is not a boolean', () => {
      vi.mocked(getBitdeerCoolingSystemData).mockReturnValueOnce({
        exhaustFanEnabled: 'invalid' as any,
      })

      const { container } = render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('exhaust fan status', () => {
    it('displays "Exhaust Fan" title', () => {
      render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      expect(screen.getByText('Exhaust Fan')).toBeInTheDocument()
    })

    it('shows RUNNING status when fan is enabled', () => {
      render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      expect(screen.getByText(DEVICE_STATUS.RUNNING)).toBeInTheDocument()
    })

    it('shows OFF status when fan is disabled', () => {
      render(<BitdeerPumps data={mockDeviceWithFanDisabled} />)
      expect(screen.getByText(DEVICE_STATUS.OFF)).toBeInTheDocument()
    })

    it('uses green indicator when fan is running', () => {
      render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      const indicator = screen.getByTestId('indicator')
      expect(indicator).toHaveAttribute('data-color', 'green')
    })

    it('uses gray indicator when fan is off', () => {
      render(<BitdeerPumps data={mockDeviceWithFanDisabled} />)
      const indicator = screen.getByTestId('indicator')
      expect(indicator).toHaveAttribute('data-color', 'gray')
    })
  })

  describe('indicator component', () => {
    it('renders Indicator with correct props when running', () => {
      render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)

      expect(Indicator).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'green',
          size: 'md',
          children: DEVICE_STATUS.RUNNING,
        }),
        expect.anything(),
      )
    })

    it('renders Indicator with correct props when off', () => {
      render(<BitdeerPumps data={mockDeviceWithFanDisabled} />)

      expect(Indicator).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'gray',
          size: 'md',
          children: DEVICE_STATUS.OFF,
        }),
        expect.anything(),
      )
    })

    it('calls Indicator component once', () => {
      render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      expect(Indicator).toHaveBeenCalledTimes(1)
    })

    it('does not call Indicator when component does not render', () => {
      render(<BitdeerPumps data={mockDeviceWithNoFanData} />)
      expect(Indicator).not.toHaveBeenCalled()
    })
  })

  describe('utils integration', () => {
    it('calls getBitdeerCoolingSystemData with device data', () => {
      render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      expect(getBitdeerCoolingSystemData).toHaveBeenCalledWith(mockDeviceWithFanEnabled)
    })

    it('calls getBitdeerCoolingSystemData with empty object when no data', () => {
      render(<BitdeerPumps />)
      expect(getBitdeerCoolingSystemData).toHaveBeenCalledWith({})
    })

    it('uses exhaustFanEnabled value from utils', () => {
      vi.mocked(getBitdeerCoolingSystemData).mockReturnValueOnce({
        exhaustFanEnabled: true,
      })

      render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      expect(screen.getByText(DEVICE_STATUS.RUNNING)).toBeInTheDocument()
    })

    it('respects false value from utils', () => {
      vi.mocked(getBitdeerCoolingSystemData).mockReturnValueOnce({
        exhaustFanEnabled: false,
      })

      render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      expect(screen.getByText(DEVICE_STATUS.OFF)).toBeInTheDocument()
    })
  })

  describe('structure', () => {
    it('has correct wrapper class', () => {
      const { container } = render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      expect(container.querySelector('.mdk-bitdeer-pumps')).toBeInTheDocument()
    })

    it('has status container class', () => {
      const { container } = render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      expect(container.querySelector('.mdk-bitdeer-pumps__status')).toBeInTheDocument()
    })

    it('has title element with correct class', () => {
      const { container } = render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      const title = container.querySelector('.mdk-bitdeer-pumps__title')
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('Exhaust Fan')
    })

    it('renders title and indicator in status container', () => {
      const { container } = render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      const status = container.querySelector('.mdk-bitdeer-pumps__status')
      expect(status?.children).toHaveLength(2)
    })
  })

  describe('edge cases', () => {
    it('handles null data gracefully', () => {
      render(<BitdeerPumps data={null as any} />)
      expect(document.querySelector('.mdk-bitdeer-pumps')).not.toBeInTheDocument()
    })

    it('handles missing container_specific', () => {
      const deviceNoSpecific = {
        ...mockDeviceWithFanEnabled,
        last: {
          snap: {
            stats: {},
            config: {},
          },
        },
      }

      render(<BitdeerPumps data={deviceNoSpecific} />)
      expect(document.querySelector('.mdk-bitdeer-pumps')).not.toBeInTheDocument()
    })

    it('handles missing stats', () => {
      const deviceNoStats = {
        ...mockDeviceWithFanEnabled,
        last: {
          snap: {
            stats: undefined,
            config: {},
          },
        },
      }

      render(<BitdeerPumps data={deviceNoStats as any} />)
      expect(document.querySelector('.mdk-bitdeer-pumps')).not.toBeInTheDocument()
    })

    it('handles boolean false correctly', () => {
      vi.mocked(getBitdeerCoolingSystemData).mockReturnValueOnce({
        exhaustFanEnabled: false,
      })

      render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      expect(document.querySelector('.mdk-bitdeer-pumps')).toBeInTheDocument()
      expect(screen.getByText(DEVICE_STATUS.OFF)).toBeInTheDocument()
    })

    it('handles boolean true correctly', () => {
      vi.mocked(getBitdeerCoolingSystemData).mockReturnValueOnce({
        exhaustFanEnabled: true,
      })

      render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      expect(document.querySelector('.mdk-bitdeer-pumps')).toBeInTheDocument()
      expect(screen.getByText(DEVICE_STATUS.RUNNING)).toBeInTheDocument()
    })
  })

  describe('re-rendering', () => {
    it('updates when fan status changes from enabled to disabled', () => {
      const { rerender } = render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      expect(screen.getByText(DEVICE_STATUS.RUNNING)).toBeInTheDocument()

      rerender(<BitdeerPumps data={mockDeviceWithFanDisabled} />)
      expect(screen.getByText(DEVICE_STATUS.OFF)).toBeInTheDocument()
    })

    it('updates when fan status changes from disabled to enabled', () => {
      const { rerender } = render(<BitdeerPumps data={mockDeviceWithFanDisabled} />)
      expect(screen.getByText(DEVICE_STATUS.OFF)).toBeInTheDocument()

      rerender(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      expect(screen.getByText(DEVICE_STATUS.RUNNING)).toBeInTheDocument()
    })

    it('unmounts when exhaustFanEnabled becomes undefined', () => {
      const { rerender } = render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      expect(document.querySelector('.mdk-bitdeer-pumps')).toBeInTheDocument()

      rerender(<BitdeerPumps data={mockDeviceWithNoFanData} />)
      expect(document.querySelector('.mdk-bitdeer-pumps')).not.toBeInTheDocument()
    })

    it('mounts when exhaustFanEnabled becomes defined', () => {
      const { rerender } = render(<BitdeerPumps data={mockDeviceWithNoFanData} />)
      expect(document.querySelector('.mdk-bitdeer-pumps')).not.toBeInTheDocument()

      rerender(<BitdeerPumps data={mockDeviceWithFanEnabled} />)
      expect(document.querySelector('.mdk-bitdeer-pumps')).toBeInTheDocument()
    })
  })

  describe('type checking', () => {
    it('only renders when exhaustFanEnabled is exactly a boolean', () => {
      const testCases = [
        { value: true, shouldRender: true },
        { value: false, shouldRender: true },
        { value: undefined, shouldRender: false },
        { value: null, shouldRender: false },
        { value: 0, shouldRender: false },
        { value: 1, shouldRender: false },
        { value: '', shouldRender: false },
        { value: 'true', shouldRender: false },
      ]

      testCases.forEach(({ value, shouldRender }) => {
        vi.mocked(getBitdeerCoolingSystemData).mockReturnValueOnce({
          exhaustFanEnabled: value as any,
        })

        const { container } = render(<BitdeerPumps data={mockDeviceWithFanEnabled} />)

        if (shouldRender) {
          expect(container.querySelector('.mdk-bitdeer-pumps')).toBeInTheDocument()
        } else {
          expect(container.querySelector('.mdk-bitdeer-pumps')).not.toBeInTheDocument()
        }

        vi.clearAllMocks()
      })
    })
  })
})
