import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../../../types/device'
import { BitMainControlsTab } from '../controls-tab/bitmain-immersion-controls-tab'

vi.mock('@tetherto/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/core')>()
  return {
    ...actual,
    Indicator: vi.fn(({ color, children }) => (
      <div data-testid="indicator" data-color={color}>
        {children}
      </div>
    )),
  }
})

describe('bitMainControlsTab', () => {
  const mockDevice: Device = {
    id: 'device-1',
    type: 'bitmain-immersion',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            container_fan: true,
            fan_fault: false,
            tank_a_level: 100,
            tank_b_level: 95,
            tank_c_level: 90,
            tank_d_level: 85,
            latitude: '37.7749',
            latitude_direction: 'N',
            longitude: '122.4194',
            longitude_direction: 'W',
          },
        },
        config: {},
      },
    },
  }

  it('renders without crashing', () => {
    render(<BitMainControlsTab data={mockDevice} />)
    expect(document.querySelector('.mdk-bitmain-controls-tab')).toBeInTheDocument()
  })

  describe('fan status', () => {
    it('shows running status when fan is on', () => {
      render(<BitMainControlsTab data={mockDevice} />)
      expect(screen.getByText('Container Fan')).toBeInTheDocument()
      expect(screen.getByText('Running')).toBeInTheDocument()
    })

    it('shows off status when fan is off', () => {
      const offDevice = {
        ...mockDevice,
        last: {
          snap: {
            stats: {
              container_specific: { container_fan: false, fan_fault: false },
            },
            config: {},
          },
        },
      }
      render(<BitMainControlsTab data={offDevice} />)
      expect(screen.getByText('Off')).toBeInTheDocument()
    })

    it('shows fault status when fan has fault', () => {
      const faultDevice = {
        ...mockDevice,
        last: {
          snap: {
            stats: {
              container_specific: { container_fan: true, fan_fault: true },
            },
            config: {},
          },
        },
      }
      render(<BitMainControlsTab data={faultDevice} />)
      expect(screen.getByText('Fault')).toBeInTheDocument()
      expect(screen.getByTestId('indicator')).toHaveAttribute('data-color', 'red')
    })

    it('uses green indicator when running', () => {
      render(<BitMainControlsTab data={mockDevice} />)
      expect(screen.getByTestId('indicator')).toHaveAttribute('data-color', 'green')
    })

    it('uses gray indicator when off', () => {
      const offDevice = {
        ...mockDevice,
        last: {
          snap: {
            stats: {
              container_specific: { container_fan: false, fan_fault: false },
            },
            config: {},
          },
        },
      }
      render(<BitMainControlsTab data={offDevice} />)
      expect(screen.getByTestId('indicator')).toHaveAttribute('data-color', 'gray')
    })
  })

  describe('tank levels', () => {
    it('displays all tank levels', () => {
      render(<BitMainControlsTab data={mockDevice} />)
      expect(screen.getByText('Tank A')).toBeInTheDocument()
      expect(screen.getByText('100 cm')).toBeInTheDocument()
      expect(screen.getByText('Tank B')).toBeInTheDocument()
      expect(screen.getByText('95 cm')).toBeInTheDocument()
      expect(screen.getByText('Tank C')).toBeInTheDocument()
      expect(screen.getByText('90 cm')).toBeInTheDocument()
      expect(screen.getByText('Tank D')).toBeInTheDocument()
      expect(screen.getByText('85 cm')).toBeInTheDocument()
    })

    it('shows -- for missing tank levels', () => {
      const noTanksDevice = {
        ...mockDevice,
        last: {
          snap: {
            stats: {
              container_specific: {},
            },
            config: {},
          },
        },
      }
      render(<BitMainControlsTab data={noTanksDevice} />)
      const dashes = screen.getAllByText('--')
      expect(dashes.length).toBeGreaterThan(0)
    })

    it('handles zero tank levels', () => {
      const zeroTanksDevice = {
        ...mockDevice,
        last: {
          snap: {
            stats: {
              container_specific: {
                tank_a_level: 0,
                tank_b_level: 0,
                tank_c_level: 0,
                tank_d_level: 0,
              },
            },
            config: {},
          },
        },
      }
      render(<BitMainControlsTab data={zeroTanksDevice} />)
      expect(screen.getAllByText('0 cm')).toHaveLength(4)
    })
  })

  describe('GPS location', () => {
    it('displays latitude and longitude', () => {
      render(<BitMainControlsTab data={mockDevice} />)
      expect(screen.getByText('37.7749')).toBeInTheDocument()
      expect(screen.getByText('122.4194')).toBeInTheDocument()
    })

    it('displays latitude and longitude directions', () => {
      render(<BitMainControlsTab data={mockDevice} />)
      const directions = screen.getAllByText(/N|W/)
      expect(directions.length).toBeGreaterThan(0)
    })

    it('shows -- for missing GPS data', () => {
      const noGpsDevice = {
        ...mockDevice,
        last: {
          snap: {
            stats: {
              container_specific: {},
            },
            config: {},
          },
        },
      }
      render(<BitMainControlsTab data={noGpsDevice} />)
      const dashes = screen.getAllByText('--')
      expect(dashes.length).toBeGreaterThan(4)
    })
  })

  describe('structure', () => {
    it('has three main sections', () => {
      const { container } = render(<BitMainControlsTab data={mockDevice} />)
      const sections = container.querySelectorAll('.mdk-bitmain-controls-tab__section')
      expect(sections).toHaveLength(3)
    })

    it('renders Tank Levels title', () => {
      render(<BitMainControlsTab data={mockDevice} />)
      expect(screen.getByText('Tank Levels')).toBeInTheDocument()
    })

    it('renders GPS Location title', () => {
      render(<BitMainControlsTab data={mockDevice} />)
      expect(screen.getByText('GPS Location')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles missing container_specific', () => {
      const noSpecificDevice = {
        ...mockDevice,
        last: {
          snap: {
            stats: {},
            config: {},
          },
        },
      }
      render(<BitMainControlsTab data={noSpecificDevice} />)
      expect(document.querySelector('.mdk-bitmain-controls-tab')).toBeInTheDocument()
    })

    it('handles missing stats', () => {
      const noStatsDevice = {
        ...mockDevice,
        last: {
          snap: {
            stats: undefined,
            config: {},
          },
        },
      }
      render(<BitMainControlsTab data={noStatsDevice as any} />)
      expect(document.querySelector('.mdk-bitmain-controls-tab')).toBeInTheDocument()
    })
  })
})
