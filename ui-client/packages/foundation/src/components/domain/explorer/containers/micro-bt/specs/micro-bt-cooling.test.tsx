import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../../../types'
import { MicroBTCooling } from '../cooling/micro-bt-cooling'

vi.mock('@tetherto/core', () => ({
  Indicator: vi.fn(({ color, children }) => <div data-color={color}>{children}</div>),
  UNITS: { PERCENT: '%', FREQUENCY_HERTZ: 'Hz' },
}))

vi.mock('../../../../../../utils/container-utils', () => ({
  isMicroBTKehua: vi.fn((type) => type?.includes('kehua')),
}))

vi.mock('../../../../../../utils/device-utils', () => ({
  getContainerSpecificStats: vi.fn((data) => data?.last?.snap?.stats?.container_specific || {}),
}))

describe('MicroBTCooling', () => {
  const baseDevice: Device = {
    id: '1',
    type: 'microbt',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            cdu: {
              cycle_pump_control: true,
              circulation_pump_running_status: 'Running',
              circulation_pump_switch: 'ON',
              circulation_pump_speed: 50,
              cooling_fan_control: true,
              cooling_fan_switch: 'ON',
              cooling_system_status: 50,
              makeup_water_pump_control: true,
              makeup_water_pump_fault: false,
              makeup_water_pump_switch: 'ON',
            },
          },
        },
        config: {},
      },
    },
  }

  it('returns null without data', () => {
    const { container } = render(<MicroBTCooling />)
    expect(container.firstChild).toBeNull()
  })

  it('renders all sections', () => {
    render(<MicroBTCooling data={baseDevice} />)
    expect(screen.getByText('Cycle Pump')).toBeInTheDocument()
    expect(screen.getByText('Main Circulation Pump')).toBeInTheDocument()
    expect(screen.getByText('Cooling Fan')).toBeInTheDocument()
    expect(screen.getByText('Make Up Pump')).toBeInTheDocument()
  })

  it('shows correct Cycle Pump status', () => {
    // simulate OFF
    render(
      <MicroBTCooling
        data={{
          ...baseDevice,
          last: {
            snap: {
              stats: { container_specific: { cdu: { cycle_pump_control: false } } },
              config: {},
            },
          },
        }}
      />,
    )
    const offDevices = screen.getAllByText('Off')
    expect(offDevices.length).toBeGreaterThan(0)
  })

  it('shows circulation pump switch and speed', () => {
    render(<MicroBTCooling data={baseDevice} />)
    const onDevices = screen.getAllByText('ON')
    expect(onDevices[0]).toBeInTheDocument()
    expect(screen.getByText(/50.*Hz/)).toBeInTheDocument()

    // Kehua type
    render(<MicroBTCooling data={{ ...baseDevice, type: 'microbt-kehua' }} />)
    expect(screen.getByText(/50.*%/)).toBeInTheDocument()
  })

  it('shows cooling fan status and switch', () => {
    // simulate fan OFF
    const fanOffDevice = {
      ...baseDevice,
      last: {
        snap: {
          stats: {
            container_specific: { cdu: { cooling_fan_control: false, cooling_fan_switch: null } },
          },
          config: {},
        },
      },
    }
    render(<MicroBTCooling data={fanOffDevice} />)

    const offDevices = screen.getAllByText('Off')
    const switchValues = screen.getAllByText('--')
    expect(offDevices[0]).toBeInTheDocument()
    expect(switchValues[0]).toBeInTheDocument()
  })

  it('shows make-up pump fault and running/off', () => {
    render(<MicroBTCooling data={baseDevice} />)

    const runningDevices = screen.getAllByText('Running')
    expect(runningDevices[0]).toBeInTheDocument()

    // simulate fault
    const faultDevice = {
      ...baseDevice,
      last: {
        snap: {
          stats: {
            container_specific: { cdu: { makeup_water_pump_fault: true } },
          },
          config: {},
        },
      },
    }
    render(<MicroBTCooling data={faultDevice} />)
    expect(screen.getByText('Error')).toBeInTheDocument()

    // simulate OFF
    const offDevice = {
      ...baseDevice,
      last: {
        snap: {
          stats: {
            container_specific: {
              cdu: { makeup_water_pump_control: false, makeup_water_pump_fault: false },
            },
          },
          config: {},
        },
      },
    }
    render(<MicroBTCooling data={offDevice} />)

    const offDevices = screen.getAllByText('Off')
    expect(offDevices[0]).toBeInTheDocument()
  })

  it('handles missing optional CDU fields gracefully', () => {
    const minimalDevice = {
      ...baseDevice,
      last: {
        snap: {
          stats: { container_specific: { cdu: {} } },
          config: {},
        },
      },
    }
    render(<MicroBTCooling data={minimalDevice} />)
    expect(screen.getAllByText('--').length).toBeGreaterThan(0)
  })
})
