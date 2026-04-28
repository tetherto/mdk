import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ContainerFanLegend } from '../container-fans-legend'

vi.mock('@tetherto/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/core')>()
  return {
    ...actual,
    FanIcon: () => <svg data-testid="fan-icon">Fan</svg>,
  }
})

describe('containerFanLegend', () => {
  it('renders with index and enabled', () => {
    const { container } = render(<ContainerFanLegend index={1} enabled={true} />)
    expect(container.querySelector('.mdk-container-fan-legend')).toBeInTheDocument()
  })

  it('displays fan index', () => {
    const { container } = render(<ContainerFanLegend index={5} enabled={true} />)
    expect(container.textContent).toContain('5')
  })

  it('displays nothing when index is null', () => {
    const { container } = render(<ContainerFanLegend index={null} enabled={true} />)
    const number = container.querySelector('.mdk-container-fan-legend__number')
    expect(number?.textContent).toBe('')
  })

  it('applies on class when enabled', () => {
    const { container } = render(<ContainerFanLegend index={1} enabled={true} />)
    expect(container.firstChild).toHaveClass('mdk-container-fan-legend--on')
  })

  it('applies off class when disabled', () => {
    const { container } = render(<ContainerFanLegend index={1} enabled={false} />)
    expect(container.firstChild).toHaveClass('mdk-container-fan-legend--off')
  })

  it('applies on class to icon when enabled', () => {
    const { container } = render(<ContainerFanLegend index={1} enabled={true} />)
    const icon = container.querySelector('.mdk-container-fan-legend__icon')
    expect(icon).toHaveClass('mdk-container-fan-legend__icon--on')
  })

  it('applies off class to icon when disabled', () => {
    const { container } = render(<ContainerFanLegend index={1} enabled={false} />)
    const icon = container.querySelector('.mdk-container-fan-legend__icon')
    expect(icon).toHaveClass('mdk-container-fan-legend__icon--off')
  })

  it('renders FanIcon', () => {
    const { getByTestId } = render(<ContainerFanLegend index={1} enabled={true} />)
    expect(getByTestId('fan-icon')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<ContainerFanLegend index={1} enabled={true} className="custom" />)
    expect(container.firstChild).toHaveClass('custom')
  })

  it('defaults enabled to false', () => {
    const { container } = render(<ContainerFanLegend index={1} />)
    expect(container.firstChild).toHaveClass('mdk-container-fan-legend--off')
  })
})
