import { formatNumber, unitToKilo } from '@tetherto/core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../../../../types/device'
import { ContentBox } from '../../../../../container/content-box/content-box'
import { BitMainPowerAndPositioning } from '../settings/power-and-positioning/bitmain-power-and-positioning'

// Mock dependencies
vi.mock('@tetherto/core', () => ({
  formatNumber: vi.fn((num) => num.toFixed(2)),
  unitToKilo: vi.fn((num) => num / 1000),
  safeNumber: vi.fn((number) => number ?? 0),
  safeString: vi.fn((str) => str ?? ''),
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

vi.mock('../../../../../container/content-box/content-box', () => ({
  ContentBox: vi.fn(({ title, children }) => (
    <div data-testid="content-box">
      <h3>{title}</h3>
      {children}
    </div>
  )),
}))

describe('bitMainPowerAndPositioning', () => {
  const mockDevice: Device = {
    id: 'device-1',
    last: {
      snap: {
        stats: {
          distribution_box1_power_w: 50000,
          distribution_box2_power_w: 48000,
          container_specific: {
            latitude: '37.7749',
            latitude_direction: 'N',
            longitude: '122.4194',
            longitude_direction: 'W',
          },
        },
        config: {},
      },
    },
  } as unknown as Device

  describe('rendering', () => {
    it('should render Power and Location sections', () => {
      render(<BitMainPowerAndPositioning data={mockDevice} />)

      expect(screen.getByText('Power')).toBeInTheDocument()
      expect(screen.getByText('Location')).toBeInTheDocument()
    })

    it('should render two ContentBox components', () => {
      render(<BitMainPowerAndPositioning data={mockDevice} />)

      expect(ContentBox).toHaveBeenCalledTimes(2)
      expect(ContentBox).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Power' }),
        expect.anything(),
      )
      expect(ContentBox).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Location' }),
        expect.anything(),
      )
    })
  })

  describe('power section', () => {
    it('should render power distribution labels', () => {
      render(<BitMainPowerAndPositioning data={mockDevice} />)

      expect(screen.getByText('#1 Power Distribution:')).toBeInTheDocument()
      expect(screen.getByText('#2 Power Distribution:')).toBeInTheDocument()
    })

    it('should display power values in kW', () => {
      render(<BitMainPowerAndPositioning data={mockDevice} />)

      expect(screen.getByText(/Power: 50.00 kW/)).toBeInTheDocument()
      expect(screen.getByText(/Power: 48.00 kW/)).toBeInTheDocument()
    })

    it('should call unitToKilo for power conversion', () => {
      render(<BitMainPowerAndPositioning data={mockDevice} />)

      expect(unitToKilo).toHaveBeenCalledWith(50000)
      expect(unitToKilo).toHaveBeenCalledWith(48000)
    })

    it('should call formatNumber for display', () => {
      render(<BitMainPowerAndPositioning data={mockDevice} />)

      expect(formatNumber).toHaveBeenCalled()
    })
  })

  describe('location section', () => {
    it('should render location labels', () => {
      render(<BitMainPowerAndPositioning data={mockDevice} />)

      expect(screen.getByText('Latitude')).toBeInTheDocument()
      expect(screen.getByText('Longitude')).toBeInTheDocument()
    })

    it('should display latitude coordinates', () => {
      render(<BitMainPowerAndPositioning data={mockDevice} />)

      expect(screen.getByText(/Latitude: 37.7749/)).toBeInTheDocument()
      expect(screen.getByText(/Direction: N/)).toBeInTheDocument()
    })

    it('should display longitude coordinates', () => {
      render(<BitMainPowerAndPositioning data={mockDevice} />)

      expect(screen.getByText(/Longitude: 122.4194/)).toBeInTheDocument()
      expect(screen.getByText(/Direction: W/)).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should render without data', () => {
      render(<BitMainPowerAndPositioning />)

      expect(screen.getByText('Power')).toBeInTheDocument()
      expect(screen.getByText('Location')).toBeInTheDocument()
    })

    it('should handle missing location values', () => {
      const deviceWithoutLocation: Device = {
        id: 'device-2',
        last: {
          snap: {
            stats: {
              distribution_box1_power_w: 50000,
              distribution_box2_power_w: 48000,
              container_specific: {},
            },
            config: {},
          },
        },
      } as unknown as Device

      render(<BitMainPowerAndPositioning data={deviceWithoutLocation} />)

      expect(screen.getByText(/Latitude:/)).toBeInTheDocument()
      expect(screen.getByText(/Longitude:/)).toBeInTheDocument()
    })

    it('should handle null container_specific', () => {
      const deviceWithoutContainerSpecific: Device = {
        id: 'device-3',
        last: {
          snap: {
            stats: {
              distribution_box1_power_w: 50000,
              distribution_box2_power_w: 48000,
            },
            config: {},
          },
        },
      } as unknown as Device

      render(<BitMainPowerAndPositioning data={deviceWithoutContainerSpecific} />)

      expect(screen.getByText('Latitude')).toBeInTheDocument()
      expect(screen.getByText('Longitude')).toBeInTheDocument()
    })
  })

  describe('structure', () => {
    it('should have correct CSS classes', () => {
      const { container } = render(<BitMainPowerAndPositioning data={mockDevice} />)

      expect(container.querySelector('.mdk-bitmain-power-positioning')).toBeInTheDocument()
      expect(container.querySelectorAll('.mdk-bitmain-power-positioning__panel')).toHaveLength(2)
      expect(container.querySelectorAll('.mdk-bitmain-power-positioning__section')).toHaveLength(2)
    })
  })
})
