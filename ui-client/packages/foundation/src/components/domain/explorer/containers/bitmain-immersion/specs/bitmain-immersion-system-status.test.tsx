import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../../../types/device'
import { BitMainImmersionSystemStatus } from '../system-status/bitmain-immersion-system-status'

vi.mock('@tetherto/mdk-core-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/mdk-core-ui')>()
  return {
    ...actual,
    Indicator: vi.fn(({ color, children }) => (
      <div data-testid="indicator" data-color={color}>
        {children}
      </div>
    )),
  }
})

describe('BitMainImmersionSystemStatus', () => {
  const mockDevice: Device = {
    id: 'device-1',
    type: 'bitmain-immersion',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            server_on: true,
            disconnect: false,
          },
        },
        config: {},
      },
    },
  }

  it('renders without crashing', () => {
    render(<BitMainImmersionSystemStatus data={mockDevice} />)
    expect(document.querySelector('.mdk-bitmain-immersion-system-status')).toBeInTheDocument()
  })

  it('renders System Status title', () => {
    render(<BitMainImmersionSystemStatus data={mockDevice} />)
    expect(screen.getByText('System Status')).toBeInTheDocument()
  })

  it('shows Connected status when not disconnected', () => {
    render(<BitMainImmersionSystemStatus data={mockDevice} />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('shows Disconnected status when disconnected', () => {
    const disconnectedDevice = {
      ...mockDevice,
      last: {
        snap: {
          stats: {
            container_specific: {
              server_on: false,
              disconnect: true,
            },
          },
          config: {},
        },
      },
    }
    render(<BitMainImmersionSystemStatus data={disconnectedDevice} />)
    expect(screen.getByText('Disconnected')).toBeInTheDocument()
  })

  it('shows Server Start Allowed when server_on is true', () => {
    render(<BitMainImmersionSystemStatus data={mockDevice} />)
    expect(screen.getByText('Server Start')).toBeInTheDocument()
    expect(screen.getByText('Allowed')).toBeInTheDocument()
  })

  it('does not show Server Start when server_on is false', () => {
    const noServerDevice = {
      ...mockDevice,
      last: {
        snap: {
          stats: {
            container_specific: {
              server_on: false,
              disconnect: false,
            },
          },
          config: {},
        },
      },
    }
    render(<BitMainImmersionSystemStatus data={noServerDevice} />)
    expect(screen.queryByText('Server Start')).not.toBeInTheDocument()
    expect(screen.queryByText('Allowed')).not.toBeInTheDocument()
  })

  it('uses green indicator for connected status', () => {
    render(<BitMainImmersionSystemStatus data={mockDevice} />)
    const indicators = screen.getAllByTestId('indicator')
    const connectionIndicator = indicators.find((ind) => ind.textContent === 'Connected')
    expect(connectionIndicator).toHaveAttribute('data-color', 'green')
  })

  it('uses red indicator for disconnected status', () => {
    const disconnectedDevice = {
      ...mockDevice,
      last: {
        snap: {
          stats: {
            container_specific: {
              server_on: false,
              disconnect: true,
            },
          },
          config: {},
        },
      },
    }
    render(<BitMainImmersionSystemStatus data={disconnectedDevice} />)
    const indicator = screen.getByTestId('indicator')
    expect(indicator).toHaveAttribute('data-color', 'red')
  })

  it('uses green indicator for Server Start Allowed', () => {
    render(<BitMainImmersionSystemStatus data={mockDevice} />)
    const indicators = screen.getAllByTestId('indicator')
    const serverIndicator = indicators.find((ind) => ind.textContent === 'Allowed')
    expect(serverIndicator).toHaveAttribute('data-color', 'green')
  })

  it('renders without data', () => {
    render(<BitMainImmersionSystemStatus />)
    expect(screen.getByText('System Status')).toBeInTheDocument()
  })

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
    render(<BitMainImmersionSystemStatus data={noSpecificDevice} />)
    expect(screen.getByText('System Status')).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('has correct structure with header and content', () => {
    const { container } = render(<BitMainImmersionSystemStatus data={mockDevice} />)
    expect(
      container.querySelector('.mdk-bitmain-immersion-system-status__header'),
    ).toBeInTheDocument()
    expect(
      container.querySelector('.mdk-bitmain-immersion-system-status__content'),
    ).toBeInTheDocument()
  })
})
