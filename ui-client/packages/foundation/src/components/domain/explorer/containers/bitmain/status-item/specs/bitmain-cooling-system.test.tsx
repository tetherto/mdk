import { Indicator } from '@mdk/core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../../../../types/device'
import { BitMainCoolingSystem } from '../settings/cooling-system/bitmain-cooling-system'

// Mock dependencies
vi.mock('@mdk/core', () => ({
  Indicator: vi.fn(({ color, size, children }) => (
    <div data-testid="indicator" data-color={color} data-size={size}>
      {children}
    </div>
  )),
}))

vi.mock('../../../../../../../utils/device-utils', () => ({
  getDeviceData: vi.fn((device) => [
    undefined,
    device
      ? {
          snap: device.last?.snap,
        }
      : undefined,
  ]),
}))

describe('bitMainCoolingSystem', () => {
  const mockDevice: Device = {
    id: 'device-1',
    last: {
      snap: {
        stats: {
          container_specific: {
            circulating_pump: true,
            circulating_pump_fault: false,
            fluid_infusion_pump: false,
            fluid_infusion_pump_fault: false,
            fan1: true,
            fan1_fault: false,
            fan2: false,
            fan2_fault: true,
            cooling_tower_fan1: true,
            cooling_tower_fan1_fault: false,
            cooling_tower_fan2: false,
            cooling_tower_fan2_fault: false,
            cooling_tower_fan3: true,
            cooling_tower_fan3_fault: true,
          },
        },
        config: {},
      },
    },
  } as unknown as Device

  describe('rendering', () => {
    it('should render all component labels', () => {
      render(<BitMainCoolingSystem data={mockDevice} />)

      expect(screen.getByText('Circulating pump')).toBeInTheDocument()
      expect(screen.getByText('Fluid Infusion pump')).toBeInTheDocument()
      expect(screen.getByText('Fan #1')).toBeInTheDocument()
      expect(screen.getByText('Fan #2')).toBeInTheDocument()
      expect(screen.getByText('Cooling tower fan #1')).toBeInTheDocument()
      expect(screen.getByText('Cooling tower fan #2')).toBeInTheDocument()
      expect(screen.getByText('Cooling tower fan #3')).toBeInTheDocument()
    })

    it('should render 7 indicators', () => {
      render(<BitMainCoolingSystem data={mockDevice} />)

      expect(screen.getAllByTestId('indicator')).toHaveLength(7)
    })
  })

  describe('status labels', () => {
    it('should show "Running" for active devices', () => {
      render(<BitMainCoolingSystem data={mockDevice} />)

      const runningStatuses = screen.getAllByText('Running')
      expect(runningStatuses.length).toBeGreaterThan(0)
    })

    it('should show "Off" for inactive devices without faults', () => {
      render(<BitMainCoolingSystem data={mockDevice} />)

      const offStatuses = screen.getAllByText('Off')
      expect(offStatuses.length).toBeGreaterThan(0)
    })

    it('should show "Fault" for devices with faults', () => {
      render(<BitMainCoolingSystem data={mockDevice} />)

      const faultStatuses = screen.getAllByText('Fault')
      expect(faultStatuses).toHaveLength(2) // fan2 and cooling_tower_fan3
    })
  })

  describe('indicator colors', () => {
    it('should use green color for running devices', () => {
      render(<BitMainCoolingSystem data={mockDevice} />)

      const indicators = screen.getAllByTestId('indicator')
      const greenIndicators = indicators.filter((ind) => ind.getAttribute('data-color') === 'green')
      expect(greenIndicators.length).toBeGreaterThan(0)
    })

    it('should use red color for faulted devices', () => {
      render(<BitMainCoolingSystem data={mockDevice} />)

      const indicators = screen.getAllByTestId('indicator')
      const redIndicators = indicators.filter((ind) => ind.getAttribute('data-color') === 'red')
      expect(redIndicators).toHaveLength(2) // fan2 and cooling_tower_fan3 have faults
    })

    it('should use gray color for off devices', () => {
      render(<BitMainCoolingSystem data={mockDevice} />)

      const indicators = screen.getAllByTestId('indicator')
      const grayIndicators = indicators.filter((ind) => ind.getAttribute('data-color') === 'gray')
      expect(grayIndicators.length).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('should render without data', () => {
      render(<BitMainCoolingSystem />)

      expect(screen.getByText('Circulating pump')).toBeInTheDocument()
      expect(screen.getAllByTestId('indicator')).toHaveLength(7)
    })

    it('should handle missing container_specific', () => {
      const deviceWithoutContainerSpecific: Device = {
        id: 'device-2',
        last: {
          snap: {
            stats: {},
            config: {},
          },
        },
      } as unknown as Device

      render(<BitMainCoolingSystem data={deviceWithoutContainerSpecific} />)

      expect(screen.getAllByText('Off')).toHaveLength(7)
    })

    it('should pass correct size prop to Indicator', () => {
      render(<BitMainCoolingSystem data={mockDevice} />)

      expect(Indicator).toHaveBeenCalledWith(
        expect.objectContaining({ size: 'md' }),
        expect.anything(),
      )
    })
  })

  describe('structure', () => {
    it('should have correct CSS classes', () => {
      const { container } = render(<BitMainCoolingSystem data={mockDevice} />)

      expect(container.querySelector('.mdk-bitmain-cooling-system')).toBeInTheDocument()
      expect(container.querySelector('.mdk-bitmain-cooling-system__wrapper')).toBeInTheDocument()
      expect(container.querySelectorAll('.mdk-bitmain-cooling-system__row')).toHaveLength(2)
      expect(container.querySelectorAll('.mdk-bitmain-cooling-system__item')).toHaveLength(7)
    })

    it('should have 4 items in first row', () => {
      const { container } = render(<BitMainCoolingSystem data={mockDevice} />)

      const firstRow = container.querySelectorAll('.mdk-bitmain-cooling-system__row')[0]
      const items = firstRow.querySelectorAll('.mdk-bitmain-cooling-system__item')
      expect(items).toHaveLength(4)
    })

    it('should have 3 items in second row', () => {
      const { container } = render(<BitMainCoolingSystem data={mockDevice} />)

      const secondRow = container.querySelectorAll('.mdk-bitmain-cooling-system__row')[1]
      const items = secondRow.querySelectorAll('.mdk-bitmain-cooling-system__item')
      expect(items).toHaveLength(3)
    })
  })
})
