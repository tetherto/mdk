import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../../../types'
import { GenericDataBox } from '../../../../container/generic-data-box/generic-data-box'
import { PowerMeters } from '../power-meters/power-meters'

vi.mock('../../../../../../utils/device-utils', () => ({
  getContainerSpecificStats: vi.fn((data) => ({
    power_meters: data?.last?.snap?.stats?.container_specific?.power_meters,
  })),
}))

vi.mock('../../../../container/content-box/content-box', () => ({
  ContentBox: vi.fn(({ title, children }) => (
    <div data-testid="content-box">
      <h3>{title}</h3>
      {children}
    </div>
  )),
}))

vi.mock('../../../../container/generic-data-box/generic-data-box', () => ({
  GenericDataBox: vi.fn(() => <div data-testid="generic-data-box" />),
}))

describe('PowerMeters', () => {
  const mockDevice: Device = {
    id: '1',
    type: 'container',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            power_meters: [
              { status: 1, voltage_ab: 230, freq: 50 },
              { status: 0, voltage_ab: 220, freq: 50 },
            ],
          },
        },
        config: {},
      },
    },
  }

  it('returns null without data', () => {
    const { container } = render(<PowerMeters />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null without power meters', () => {
    const device = { ...mockDevice, last: { snap: { stats: {}, config: {} } } }
    const { container } = render(<PowerMeters data={device as any} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders all meters', () => {
    render(<PowerMeters data={mockDevice} />)
    expect(screen.getAllByTestId('content-box')).toHaveLength(2)
    expect(screen.getByText('Power Meter 1')).toBeInTheDocument()
    expect(screen.getByText('Power Meter 2')).toBeInTheDocument()
  })

  it('passes correct status', () => {
    render(<PowerMeters data={mockDevice} />)
    const calls = vi.mocked(GenericDataBox).mock.calls
    expect(calls[0][0].data?.[0]).toMatchObject({ value: 'Normal', color: 'green' })
    expect(calls[1][0].data?.[0]).toMatchObject({ value: 'Error', color: 'red' })
  })

  it('passes all data fields', () => {
    render(<PowerMeters data={mockDevice} />)
    const call = vi.mocked(GenericDataBox).mock.calls[0][0]
    expect(call.data).toHaveLength(9)
    expect(call.data!.map((d: any) => d.label)).toEqual([
      'Communication Status',
      'Voltage A-B',
      'Voltage B-C',
      'Voltage C-A',
      'Total Power Factor',
      'Frequency',
      'Total Active Power',
      'Total Apparent Power',
      'Total Active Energy',
    ])
  })
})
