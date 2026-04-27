import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../../../../types/device'
import { BitMainBasicSettings } from '../settings'
import { BitMainCoolingSystem } from '../settings/cooling-system/bitmain-cooling-system'
import { BitMainPowerAndPositioning } from '../settings/power-and-positioning/bitmain-power-and-positioning'

// Mock child components
vi.mock('../settings/cooling-system/bitmain-cooling-system', () => ({
  BitMainCoolingSystem: vi.fn(({ data }) => (
    <div data-testid="cooling-system">Cooling System Mock - {data?.id || 'no-data'}</div>
  )),
}))

vi.mock('../settings/power-and-positioning/bitmain-power-and-positioning', () => ({
  BitMainPowerAndPositioning: vi.fn(({ data }) => (
    <div data-testid="power-positioning">Power & Positioning Mock - {data?.id || 'no-data'}</div>
  )),
}))

describe('bitMainBasicSettings', () => {
  const mockDevice: Device = {
    id: 'device-1',
    type: 'bitmain-hydro',
    last: {
      snap: {
        stats: {
          container_specific: {
            circulating_pump: true,
            fan1: true,
          },
          distribution_box1_power_w: 50000,
          distribution_box2_power_w: 48000,
        },
        config: {},
      },
    },
  } as unknown as Device

  it('should render section title', () => {
    render(<BitMainBasicSettings data={mockDevice} />)

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Power & Positioning')
  })

  it('should render BitMainCoolingSystem component', () => {
    render(<BitMainBasicSettings data={mockDevice} />)

    expect(screen.getByTestId('cooling-system')).toBeInTheDocument()
  })

  it('should render BitMainPowerAndPositioning component', () => {
    render(<BitMainBasicSettings data={mockDevice} />)

    expect(screen.getByTestId('power-positioning')).toBeInTheDocument()
  })

  it('should pass data to BitMainCoolingSystem', () => {
    render(<BitMainBasicSettings data={mockDevice} />)

    expect(BitMainCoolingSystem).toHaveBeenCalledWith({ data: mockDevice }, expect.anything())
  })

  it('should pass data to BitMainPowerAndPositioning', () => {
    render(<BitMainBasicSettings data={mockDevice} />)

    expect(BitMainPowerAndPositioning).toHaveBeenCalledWith({ data: mockDevice }, expect.anything())
  })

  it('should render without data', () => {
    render(<BitMainBasicSettings />)

    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    expect(screen.getByTestId('cooling-system')).toHaveTextContent('no-data')
    expect(screen.getByTestId('power-positioning')).toHaveTextContent('no-data')
  })

  it('should have correct structure', () => {
    const { container } = render(<BitMainBasicSettings data={mockDevice} />)

    expect(container.querySelector('.mdk-bitmain-basic-settings')).toBeInTheDocument()
    expect(container.querySelectorAll('.mdk-bitmain-basic-settings__section')).toHaveLength(2)
    expect(container.querySelector('.mdk-bitmain-basic-settings__title')).toBeInTheDocument()
  })

  it('should render sections in correct order', () => {
    const { container } = render(<BitMainBasicSettings data={mockDevice} />)

    const sections = container.querySelectorAll('.mdk-bitmain-basic-settings__section')
    const title = container.querySelector('.mdk-bitmain-basic-settings__title')

    // Cooling system should be in first section
    expect(sections[0]).toContainElement(screen.getByTestId('cooling-system'))

    // Title should be between sections
    expect(title).toBeInTheDocument()

    // Power & Positioning should be in second section
    expect(sections[1]).toContainElement(screen.getByTestId('power-positioning'))
  })
})
