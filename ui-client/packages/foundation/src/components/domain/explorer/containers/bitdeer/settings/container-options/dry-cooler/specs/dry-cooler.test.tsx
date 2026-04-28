import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DryCooler } from '../dry-cooler'

vi.mock('@/utils/device-utils', () => ({
  getContainerSpecificStats: vi.fn((data) => data?.container_specific),
}))

vi.mock('@/constants/devices', () => ({
  DEVICE_STATUS: {
    RUNNING: 'Running',
    OFF: 'Off',
  },
}))

vi.mock('@tetherto/mdk-core-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/mdk-core-ui')>()
  return {
    ...actual,
    Indicator: vi.fn(({ children, color }) => (
      <div data-testid="indicator" data-color={color}>
        {children}
      </div>
    )),
  }
})

vi.mock('../../pump-box/pump-box', () => ({
  PumpBox: vi.fn(() => <div data-testid="pump-box">Pump</div>),
}))

vi.mock('./container-fans-card/container-fans-card', () => ({
  ContainerFansCard: vi.fn(() => <div data-testid="fans-card">Fans</div>),
}))

describe('dryCooler', () => {
  it('renders empty coolers when no data', () => {
    render(<DryCooler />)
    expect(screen.getByText('Dry Cooler 1')).toBeInTheDocument()
    expect(screen.getByText('Dry Cooler 2')).toBeInTheDocument()
  })

  it('renders unavailable when enabled is not boolean', () => {
    const data = {
      container_specific: {
        cooling_system: {
          dry_cooler: [{ index: 0, fans: [] }],
        },
      },
    }

    render(<DryCooler data={data} />)
    expect(screen.getAllByText('Unavailable')).toHaveLength(2)
  })

  it('renders running status when enabled is true', () => {
    const data = {
      container_specific: {
        cooling_system: {
          dry_cooler: [
            { index: 0, enabled: true, fans: [] },
            { index: 1, enabled: true, fans: [] },
          ],
        },
      },
    }

    render(<DryCooler data={data} />)
    expect(screen.getAllByText('Running')).toHaveLength(2)
  })

  it('renders off status when enabled is false', () => {
    const data = {
      container_specific: {
        cooling_system: {
          dry_cooler: [
            { index: 0, enabled: false, fans: [] },
            { index: 1, enabled: false, fans: [] },
          ],
        },
      },
    }

    render(<DryCooler data={data} />)
    expect(screen.getAllByText('Off')).toHaveLength(2)
  })

  it('renders pumps for each cooler', () => {
    const data = {
      container_specific: {
        cooling_system: {
          dry_cooler: [
            { index: 0, enabled: true, fans: [] },
            { index: 1, enabled: true, fans: [] },
          ],
          oil_pump: [
            { index: 0, enabled: true },
            { index: 1, enabled: true },
          ],
          water_pump: [
            { index: 0, enabled: true },
            { index: 1, enabled: true },
          ],
        },
      },
    }

    render(<DryCooler data={data} />)
    expect(screen.getAllByTestId('pump-box')).toHaveLength(4)
  })

  it('fills missing cooler when only one exists', () => {
    const data = {
      container_specific: {
        cooling_system: {
          dry_cooler: [{ index: 0, enabled: true, fans: [] }],
        },
      },
    }

    render(<DryCooler data={data} />)
    expect(screen.getByText('Dry Cooler 1')).toBeInTheDocument()
    expect(screen.getByText('Dry Cooler 2')).toBeInTheDocument()
  })

  it('handles non-array pump data', () => {
    const data = {
      container_specific: {
        cooling_system: {
          dry_cooler: [{ index: 0, enabled: true, fans: [] }],
          oil_pump: 'not-an-array',
          water_pump: 'not-an-array',
        },
      },
    }

    render(<DryCooler data={data} />)
    expect(screen.getAllByTestId('pump-box')).toHaveLength(4)
  })
})
